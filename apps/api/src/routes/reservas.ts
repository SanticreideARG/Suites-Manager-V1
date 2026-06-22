import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  and,
  eq,
  gte,
  lt,
  ne,
  db,
  sql,
  habitaciones,
  huespedes,
  reservas,
  PG_EXCLUSION_VIOLATION,
} from "@suites/db";
import { reservaCreate, reservaUpdate } from "@suites/shared";

export const reservasRoutes = new Hono();

/** Noches entre dos fechas YYYY-MM-DD. */
function noches(checkin: string, checkout: string): number {
  const ms = new Date(checkout).getTime() - new Date(checkin).getTime();
  return Math.round(ms / 86_400_000);
}

function esViolacionOverbooking(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === PG_EXCLUSION_VIOLATION
  );
}

// Listado, opcionalmente filtrado por rango de fechas (para el planner).
reservasRoutes.get("/", async (c) => {
  const desde = c.req.query("desde");
  const hasta = c.req.query("hasta");
  const conditions = [ne(reservas.estado, "cancelada")];
  if (desde) conditions.push(gte(reservas.checkout, desde));
  if (hasta) conditions.push(lt(reservas.checkin, hasta));

  const rows = await db
    .select({
      id: reservas.id,
      habitacionId: reservas.habitacionId,
      huespedId: reservas.huespedId,
      checkin: reservas.checkin,
      checkout: reservas.checkout,
      estado: reservas.estado,
      total: reservas.total,
      huesped: huespedes.nombre,
    })
    .from(reservas)
    .innerJoin(huespedes, eq(reservas.huespedId, huespedes.id))
    .where(and(...conditions))
    .orderBy(reservas.checkin);

  return c.json(rows);
});

reservasRoutes.post("/", zValidator("json", reservaCreate), async (c) => {
  const data = c.req.valid("json");

  const [hab] = await db
    .select()
    .from(habitaciones)
    .where(eq(habitaciones.id, data.habitacionId));
  if (!hab) return c.json({ error: "Habitación inexistente" }, 404);

  const total = noches(data.checkin, data.checkout) * Number(hab.tarifaBase);

  // Alta de huésped + reserva en UNA sola sentencia (CTE), por lo tanto
  // atómica sin necesidad de transacción interactiva (que el driver HTTP no
  // soporta). Si la reserva pisa fechas, el EXCLUDE aborta toda la sentencia
  // (incluido el alta del huésped) → devolvemos 409.
  const h = data.huesped;
  try {
    const rows = (await sql`
      WITH nuevo_huesped AS (
        INSERT INTO huespedes (nombre, documento, email, telefono, notas)
        VALUES (${h.nombre}, ${h.documento ?? null}, ${h.email ?? null},
                ${h.telefono ?? null}, ${h.notas ?? null})
        RETURNING id
      )
      INSERT INTO reservas
        (habitacion_id, huesped_id, checkin, checkout, total, notas)
      SELECT ${data.habitacionId}, nuevo_huesped.id, ${data.checkin},
             ${data.checkout}, ${total}, ${data.notas ?? null}
      FROM nuevo_huesped
      RETURNING *;
    `) as unknown[];
    return c.json(rows[0], 201);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json(
        {
          error: "overbooking",
          message: "Esas fechas ya están ocupadas para esta habitación.",
        },
        409,
      );
    }
    throw err;
  }
});

reservasRoutes.patch("/:id", zValidator("json", reservaUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const data = c.req.valid("json");

  // Si cambian las fechas, recalculamos el total con la tarifa de la habitación.
  let total: string | undefined;
  if (data.checkin || data.checkout) {
    const [actual] = await db
      .select()
      .from(reservas)
      .where(eq(reservas.id, id));
    if (!actual) return c.json({ error: "No encontrada" }, 404);

    const checkin = data.checkin ?? actual.checkin;
    const checkout = data.checkout ?? actual.checkout;
    const [hab] = await db
      .select()
      .from(habitaciones)
      .where(eq(habitaciones.id, actual.habitacionId));
    total = String(noches(checkin, checkout) * Number(hab?.tarifaBase ?? 0));
  }

  try {
    const [row] = await db
      .update(reservas)
      .set({ ...data, ...(total !== undefined ? { total } : {}) })
      .where(eq(reservas.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json(row);
  } catch (err) {
    if (esViolacionOverbooking(err)) {
      return c.json(
        { error: "overbooking", message: "Las nuevas fechas se solapan." },
        409,
      );
    }
    throw err;
  }
});

// Check-in
reservasRoutes.post("/:id/checkin", async (c) => {
  const id = Number(c.req.param("id"));
  // Payload como variable (no objeto literal) a propósito: la inferencia de
  // tipos de Drizzle sobre la tabla puede degradarse en algunos entornos de
  // build (p.ej. Vercel) y disparar un falso "excess property" sobre el
  // literal. Con una variable se chequea por asignabilidad estructural y el
  // runtime es idéntico.
  const cambios = { estado: "ocupada" as const, checkinAt: new Date() };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

// Check-out
reservasRoutes.post("/:id/checkout", async (c) => {
  const id = Number(c.req.param("id"));
  const cambios = { estado: "checkout" as const, checkoutAt: new Date() };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

// Cancelar
reservasRoutes.post("/:id/cancelar", async (c) => {
  const id = Number(c.req.param("id"));
  const cambios = { estado: "cancelada" as const };
  const [row] = await db
    .update(reservas)
    .set(cambios)
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});
