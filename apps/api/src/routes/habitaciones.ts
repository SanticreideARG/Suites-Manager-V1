import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db, habitaciones } from "@suites/db";
import { habitacionCreate, habitacionUpdate } from "@suites/shared";

export const habitacionesRoutes = new Hono();

habitacionesRoutes.get("/", async (c) => {
  const rows = await db.select().from(habitaciones).orderBy(habitaciones.id);
  return c.json(rows);
});

habitacionesRoutes.post("/", zValidator("json", habitacionCreate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db
    .insert(habitaciones)
    .values({ ...data, tarifaBase: String(data.tarifaBase) })
    .returning();
  return c.json(row, 201);
});

habitacionesRoutes.patch(
  "/:id",
  zValidator("json", habitacionUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const { tarifaBase, ...resto } = c.req.valid("json");
    const [row] = await db
      .update(habitaciones)
      .set({
        ...resto,
        ...(tarifaBase !== undefined ? { tarifaBase: String(tarifaBase) } : {}),
      })
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json(row);
  },
);

habitacionesRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db
      .delete(habitaciones)
      .where(eq(habitaciones.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrada" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    // 23503 = foreign_key_violation (tiene reservas asociadas)
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23503"
    ) {
      return c.json(
        {
          error: "en_uso",
          message:
            "No se puede eliminar: la habitación tiene reservas asociadas.",
        },
        409,
      );
    }
    throw err;
  }
});
