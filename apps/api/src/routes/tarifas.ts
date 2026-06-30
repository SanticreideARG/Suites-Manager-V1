import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, desc, eq, tarifaReglas } from "@suites/db";
import { tarifaReglaCreate, tarifaReglaUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";

export const tarifasRoutes = new Hono();
tarifasRoutes.use("*", adminOnly);

tarifasRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(tarifaReglas)
    .orderBy(desc(tarifaReglas.prioridad), tarifaReglas.id);
  return c.json(rows);
});

tarifasRoutes.post("/", zValidator("json", tarifaReglaCreate), async (c) => {
  const data = c.req.valid("json");
  const values = {
    nombre: data.nombre,
    tipo: data.tipo,
    desde: data.desde ?? null,
    hasta: data.hasta ?? null,
    factor: String(data.factor),
    monto: String(data.monto ?? 0),
    prioridad: data.prioridad,
    activa: data.activa,
  };
  const [row] = await db.insert(tarifaReglas).values(values).returning();
  return c.json(row, 201);
});

tarifasRoutes.patch("/:id", zValidator("json", tarifaReglaUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const { factor, monto, ...resto } = c.req.valid("json");
  const [row] = await db
    .update(tarifaReglas)
    .set({
      ...resto,
      ...(factor !== undefined ? { factor: String(factor) } : {}),
      ...(monto !== undefined ? { monto: String(monto) } : {}),
    })
    .where(eq(tarifaReglas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json(row);
});

tarifasRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db
    .delete(tarifaReglas)
    .where(eq(tarifaReglas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  return c.json({ ok: true });
});
