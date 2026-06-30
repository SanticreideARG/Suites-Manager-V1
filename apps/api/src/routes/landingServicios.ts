import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, landingServicios, eq, asc } from "@suites/db";
import { landingServicioCreate, landingServicioUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";

export const landingServiciosRoutes = new Hono();

// GET /landing-servicios — público
landingServiciosRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(landingServicios)
    .orderBy(asc(landingServicios.orden), asc(landingServicios.id));
  return c.json(rows);
});

landingServiciosRoutes.post(
  "/",
  adminOnly,
  zValidator("json", landingServicioCreate),
  async (c) => {
    const data = c.req.valid("json");
    const [row] = await db
      .insert(landingServicios)
      .values(data as any)
      .returning();
    return c.json(row, 201);
  },
);

landingServiciosRoutes.patch(
  "/:id",
  adminOnly,
  zValidator("json", landingServicioUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    const [row] = await db
      .update(landingServicios)
      .set(data as any)
      .where(eq(landingServicios.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    return c.json(row);
  },
);

landingServiciosRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .delete(landingServicios)
    .where(eq(landingServicios.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});
