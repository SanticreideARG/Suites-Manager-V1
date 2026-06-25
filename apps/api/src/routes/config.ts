import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, config } from "@suites/db";
import { configUpdate } from "@suites/shared";
import { staff, adminOnly } from "../middleware/auth.js";

export const configRoutes = new Hono();

// Configuración del alojamiento (fila única id=1). Leer: staff (lo usa el PDF).
configRoutes.get("/", staff, async (c) => {
  const [row] = await db.select().from(config).where(eq(config.id, 1));
  return c.json(row ?? null);
});

// Modificar reglas de negocio: solo admin.
configRoutes.put("/", adminOnly, zValidator("json", configUpdate), async (c) => {
  const data = c.req.valid("json");
  const [row] = await db
    .update(config)
    .set(data)
    .where(eq(config.id, 1))
    .returning();
  if (!row) return c.json({ error: "Config no inicializada" }, 404);
  return c.json(row);
});
