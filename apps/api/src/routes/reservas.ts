import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gte, lt, ne } from "drizzle-orm";
import {
  db,
  pool,
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

  // Transacción: crear huésped + reserva. Si la reserva pisa fechas, el
  // EXCLUDE constraint aborta todo y devolvemos 409.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const huespedRes = await client.query<{ id: number }>(
      `INSERT INTO huespedes (nombre, documento, email, telefono)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [
        data.huesped.nombre,
        data.huesped.documento ?? null,
        data.huesped.email ?? null,
        data.huesped.telefono ?? null,
      ],
    );
    const huespedId = huespedRes.rows[0]!.id;

    const reservaRes = await client.query(
      `INSERT INTO reservas
         (habitacion_id, huesped_id, checkin, checkout, total, notas)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        data.habitacionId,
        huespedId,
        data.checkin,
        data.checkout,
        total,
        data.notas ?? null,
      ],
    );
    await client.query("COMMIT");
    return c.json(reservaRes.rows[0], 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if (esViolacionOverbooking(err)) {
      return c.json(
        {
          error: "overbooking",
          message:
            "Esas fechas ya están ocupadas para esta habitación.",
        },
        409,
      );
    }
    throw err;
  } finally {
    client.release();
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
  const [row] = await db
    .update(reservas)
    .set({ estado: "ocupada", checkinAt: new Date() })
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

// Check-out
reservasRoutes.post("/:id/checkout", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .update(reservas)
    .set({ estado: "checkout", checkoutAt: new Date() })
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

// Cancelar
reservasRoutes.post("/:id/cancelar", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .update(reservas)
    .set({ estado: "cancelada" })
    .where(eq(reservas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});
