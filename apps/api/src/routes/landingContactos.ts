import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, landingContactos, eq, asc } from "@suites/db";
import { landingContactoCreate, landingContactoUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";

export const landingContactosRoutes = new Hono();

// GET /landing-contactos — público
landingContactosRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(landingContactos)
    .orderBy(asc(landingContactos.orden), asc(landingContactos.id));
  return c.json(rows);
});

landingContactosRoutes.post(
  "/",
  adminOnly,
  zValidator("json", landingContactoCreate),
  async (c) => {
    const data = c.req.valid("json");
    const [row] = await db
      .insert(landingContactos)
      .values(data as any)
      .returning();
    return c.json(row, 201);
  },
);

landingContactosRoutes.patch(
  "/:id",
  adminOnly,
  zValidator("json", landingContactoUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    const [row] = await db
      .update(landingContactos)
      .set(data as any)
      .where(eq(landingContactos.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    return c.json(row);
  },
);

landingContactosRoutes.delete("/:id", adminOnly, async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .delete(landingContactos)
    .where(eq(landingContactos.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});
