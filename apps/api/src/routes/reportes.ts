import { Hono } from "hono";
import { sql } from "@suites/db";
import { adminOnly } from "../middleware/auth.js";

export const reportesRoutes = new Hono();
reportesRoutes.use("*", adminOnly);

/** Filas crudas de neon vienen como strings/loose; helper para numerar. */
const n = (v: unknown) => Number(v ?? 0);

/**
 * Resumen del período [desde, hasta). Métricas (excluyen canceladas y bloqueos
 * de mantenimiento, salvo la ocupación que cuenta noches de huéspedes):
 * - ocupación %: noches de huéspedes solapadas con el período / (habitaciones × días)
 * - ingresos y reservas: reservas con check-in dentro del período
 * - por habitación: ingresos/noches/reservas del período
 * - frecuentes: ranking histórico de huéspedes por # de estadías
 */
reportesRoutes.get("/resumen", async (c) => {
  const desde = c.req.query("desde");
  const hasta = c.req.query("hasta");
  if (!desde || !hasta) {
    return c.json({ error: "Faltan 'desde' y 'hasta' (YYYY-MM-DD)" }, 400);
  }

  const dias = Math.max(
    1,
    Math.round(
      (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000,
    ),
  );

  const [habs] = (await sql`SELECT count(*)::int AS c FROM habitaciones`) as {
    c: number;
  }[];
  const totalHabs = n(habs?.c);

  const [ocup] = (await sql`
    SELECT COALESCE(SUM(
      LEAST(checkout, ${hasta}::date) - GREATEST(checkin, ${desde}::date)
    ), 0)::int AS noches
    FROM reservas
    WHERE estado NOT IN ('cancelada', 'mantenimiento')
      AND checkin < ${hasta}::date AND checkout > ${desde}::date
  `) as { noches: number }[];
  const nochesOcupadas = n(ocup?.noches);

  const [tot] = (await sql`
    SELECT COALESCE(SUM(total), 0) AS ingresos, COUNT(*)::int AS reservas
    FROM reservas
    WHERE estado NOT IN ('cancelada', 'mantenimiento')
      AND checkin >= ${desde}::date AND checkin < ${hasta}::date
  `) as { ingresos: string; reservas: number }[];

  const porHabitacion = (await sql`
    SELECT h.nombre AS habitacion,
           COUNT(r.id)::int AS reservas,
           COALESCE(SUM(r.checkout - r.checkin), 0)::int AS noches,
           COALESCE(SUM(r.total), 0) AS ingresos
    FROM habitaciones h
    LEFT JOIN reservas r ON r.habitacion_id = h.id
      AND r.estado NOT IN ('cancelada', 'mantenimiento')
      AND r.checkin >= ${desde}::date AND r.checkin < ${hasta}::date
    GROUP BY h.id, h.nombre
    ORDER BY ingresos DESC, h.nombre
  `) as { habitacion: string; reservas: number; noches: number; ingresos: string }[];

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

  const capacidad = totalHabs * dias;
  const ocupacionPct =
    capacidad > 0 ? Math.round((nochesOcupadas / capacidad) * 1000) / 10 : 0;

  return c.json({
    periodo: { desde, hasta, dias },
    ocupacionPct,
    nochesOcupadas,
    ingresos: n(tot?.ingresos),
    reservas: n(tot?.reservas),
    porHabitacion: porHabitacion.map((r) => ({
      habitacion: r.habitacion,
      reservas: n(r.reservas),
      noches: n(r.noches),
      ingresos: n(r.ingresos),
    })),
    frecuentes: frecuentes.map((r) => ({
      huesped: r.huesped,
      estadias: n(r.estadias),
      total: n(r.total),
    })),
  });
});
