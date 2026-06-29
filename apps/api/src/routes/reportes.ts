import { Hono } from "hono";
import { sql } from "@suites/db";
import { adminOnly } from "../middleware/auth.js";

export const reportesRoutes = new Hono();
reportesRoutes.use("*", adminOnly);

const n = (v: unknown) => Number(v ?? 0);

// ─── Helper reutilizable ─────────────────────────────────────────
async function resumenData(desde: string, hasta: string) {
  const dias = Math.max(
    1,
    Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000),
  );

  const [habs] = (await sql`SELECT count(*)::int AS c FROM habitaciones`) as { c: number }[];
  const totalHabs = n(habs?.c);

  const [ocup] = (await sql`
    SELECT COALESCE(SUM(
      LEAST(checkout, ${hasta}::date) - GREATEST(checkin, ${desde}::date)
    ), 0)::int AS noches
    FROM reservas
    WHERE estado NOT IN ('cancelada', 'mantenimiento')
      AND checkin < ${hasta}::date AND checkout > ${desde}::date
  `) as { noches: number }[];

  const [tot] = (await sql`
    SELECT COALESCE(SUM(total), 0) AS ingresos,
           COUNT(*)::int AS reservas,
           COALESCE(AVG(checkout - checkin), 0) AS estadia_promedio
    FROM reservas
    WHERE estado NOT IN ('cancelada', 'mantenimiento')
      AND checkin >= ${desde}::date AND checkin < ${hasta}::date
  `) as { ingresos: string; reservas: number; estadia_promedio: string }[];

  const [canc] = (await sql`
    SELECT COUNT(*)::int AS cancelaciones
    FROM reservas
    WHERE estado = 'cancelada'
      AND checkin >= ${desde}::date AND checkin < ${hasta}::date
  `) as { cancelaciones: number }[];

  const porHabitacion = (await sql`
    SELECT h.nombre AS habitacion, h.tipo,
           COUNT(r.id)::int AS reservas,
           COALESCE(SUM(r.checkout - r.checkin), 0)::int AS noches,
           COALESCE(SUM(r.total), 0) AS ingresos
    FROM habitaciones h
    LEFT JOIN reservas r ON r.habitacion_id = h.id
      AND r.estado NOT IN ('cancelada', 'mantenimiento')
      AND r.checkin >= ${desde}::date AND r.checkin < ${hasta}::date
    GROUP BY h.id, h.nombre, h.tipo
    ORDER BY ingresos DESC, h.nombre
  `) as { habitacion: string; tipo: string; reservas: number; noches: number; ingresos: string }[];

  const nochesOcupadas = n(ocup?.noches);
  const capacidad = totalHabs * dias;
  const ocupacionPct = capacidad > 0 ? Math.round((nochesOcupadas / capacidad) * 1000) / 10 : 0;

  return {
    dias,
    totalHabs,
    ocupacionPct,
    nochesOcupadas,
    ingresos: n(tot?.ingresos),
    reservas: n(tot?.reservas),
    cancelaciones: n(canc?.cancelaciones),
    estadiaPromedio: Math.round(n(tot?.estadia_promedio) * 10) / 10,
    porHabitacion: porHabitacion.map((r) => ({
      habitacion: r.habitacion,
      tipo: r.tipo,
      reservas: n(r.reservas),
      noches: n(r.noches),
      ingresos: n(r.ingresos),
      ocupacionPct: dias > 0 ? Math.round((n(r.noches) / dias) * 1000) / 10 : 0,
    })),
  };
}

// ─── GET /resumen ────────────────────────────────────────────────
reportesRoutes.get("/resumen", async (c) => {
  const desde = c.req.query("desde");
  const hasta = c.req.query("hasta");
  if (!desde || !hasta) return c.json({ error: "Faltan 'desde' y 'hasta' (YYYY-MM-DD)" }, 400);

  const datos = await resumenData(desde, hasta);

  const frecuentes = (await sql`
    SELECT hu.nombre AS huesped,
           COUNT(r.id)::int AS estadias,
           COALESCE(SUM(r.total), 0) AS total
    FROM huespedes hu
    JOIN reservas r ON r.huesped_id = hu.id
      AND r.estado NOT IN ('cancelada', 'mantenimiento')
    GROUP BY hu.id, hu.nombre
    ORDER BY estadias DESC, total DESC
    LIMIT 5
  `) as { huesped: string; estadias: number; total: string }[];

  return c.json({
    periodo: { desde, hasta, dias: datos.dias },
    ocupacionPct: datos.ocupacionPct,
    nochesOcupadas: datos.nochesOcupadas,
    ingresos: datos.ingresos,
    reservas: datos.reservas,
    cancelaciones: datos.cancelaciones,
    estadiaPromedio: datos.estadiaPromedio,
    porHabitacion: datos.porHabitacion,
    frecuentes: frecuentes.map((r) => ({
      huesped: r.huesped,
      estadias: n(r.estadias),
      total: n(r.total),
    })),
  });
});

// ─── GET /comparativa ────────────────────────────────────────────
reportesRoutes.get("/comparativa", async (c) => {
  const { desde1, hasta1, desde2, hasta2 } = c.req.query();
  if (!desde1 || !hasta1 || !desde2 || !hasta2) {
    return c.json({ error: "Faltan desde1, hasta1, desde2, hasta2" }, 400);
  }

  const [p1, p2] = await Promise.all([
    resumenData(desde1, hasta1),
    resumenData(desde2, hasta2),
  ]);

  return c.json({
    periodo1: { desde: desde1, hasta: hasta1, dias: p1.dias },
    periodo2: { desde: desde2, hasta: hasta2, dias: p2.dias },
    metricas: {
      ingresos: [p1.ingresos, p2.ingresos] as [number, number],
      reservas: [p1.reservas, p2.reservas] as [number, number],
      ocupacionPct: [p1.ocupacionPct, p2.ocupacionPct] as [number, number],
      nochesOcupadas: [p1.nochesOcupadas, p2.nochesOcupadas] as [number, number],
      cancelaciones: [p1.cancelaciones, p2.cancelaciones] as [number, number],
      estadiaPromedio: [p1.estadiaPromedio, p2.estadiaPromedio] as [number, number],
    },
  });
});

// ─── GET /forecast ───────────────────────────────────────────────
reportesRoutes.get("/forecast", async (c) => {
  const horizonte = Math.min(365, Math.max(7, parseInt(c.req.query("dias") ?? "30")));
  const hoy = new Date().toISOString().slice(0, 10);
  const limite = new Date();
  limite.setDate(limite.getDate() + horizonte);
  const limiteStr = limite.toISOString().slice(0, 10);

  const rows = (await sql`
    SELECT h.nombre AS habitacion,
           COALESCE(SUM(r.total), 0) AS ingresos,
           COALESCE(SUM(r.checkout - r.checkin), 0)::int AS noches,
           COUNT(r.id)::int AS reservas
    FROM habitaciones h
    LEFT JOIN reservas r ON r.habitacion_id = h.id
      AND r.estado IN ('reservada', 'ocupada')
      AND r.checkout > ${hoy}::date
      AND r.checkin < ${limiteStr}::date
    GROUP BY h.id, h.nombre
    ORDER BY ingresos DESC
  `) as { habitacion: string; ingresos: string; noches: number; reservas: number }[];

  const ingresosFuturos = rows.reduce((s, r) => s + n(r.ingresos), 0);
  const reservasFuturas = rows.reduce((s, r) => s + n(r.reservas), 0);

  return c.json({
    diasHorizonte: horizonte,
    ingresosFuturos,
    reservasFuturas,
    porHabitacion: rows.map((r) => ({
      habitacion: r.habitacion,
      ingresos: n(r.ingresos),
      noches: n(r.noches),
      reservas: n(r.reservas),
    })),
  });
});
