import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, desc, eq, politicasCancelacion } from "@suites/db";
import { politicaCancelacionCreate, politicaCancelacionUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";
import { logAudit, computeDiff, diffEliminar } from "../lib/audit.js";

export const politicasCancelacionRoutes = new Hono();
politicasCancelacionRoutes.use("*", adminOnly);

politicasCancelacionRoutes.get("/", async (c) => {
  const rows = await db
    .select()
    .from(politicasCancelacion)
    .orderBy(desc(politicasCancelacion.diasMinimos));
  return c.json(rows);
});

politicasCancelacionRoutes.post("/", zValidator("json", politicaCancelacionCreate), async (c) => {
  const data = c.req.valid("json");
  const values = {
    nombre: data.nombre,
    diasMinimos: data.diasMinimos,
    porcentaje: String(data.porcentaje),
    activa: data.activa,
  };
  const [row] = await db.insert(politicasCancelacion).values(values).returning();
  await logAudit(c, {
    accion: "crear",
    entidad: "politicas-cancelacion",
    entidadId: row.id,
    entidadLabel: row.nombre,
    diff: { nombre: { antes: null, despues: row.nombre }, diasMinimos: { antes: null, despues: row.diasMinimos }, porcentaje: { antes: null, despues: row.porcentaje } },
  });
  return c.json(row, 201);
});

politicasCancelacionRoutes.patch("/:id", zValidator("json", politicaCancelacionUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const { porcentaje, ...resto } = c.req.valid("json");
  const [antes] = await db.select().from(politicasCancelacion).where(eq(politicasCancelacion.id, id));
  if (!antes) return c.json({ error: "No encontrada" }, 404);

  const [row] = await db
    .update(politicasCancelacion)
    .set({
      ...resto,
      ...(porcentaje !== undefined ? { porcentaje: String(porcentaje) } : {}),
    })
    .where(eq(politicasCancelacion.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "editar",
    entidad: "politicas-cancelacion",
    entidadId: id,
    entidadLabel: row.nombre,
    diff: computeDiff(antes as any, row as any, ["nombre", "diasMinimos", "porcentaje", "activa"]),
  });
  return c.json(row);
});

politicasCancelacionRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [antes] = await db.select().from(politicasCancelacion).where(eq(politicasCancelacion.id, id));
  const [row] = await db
    .delete(politicasCancelacion)
    .where(eq(politicasCancelacion.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "politicas-cancelacion",
    entidadId: id,
    entidadLabel: antes?.nombre ?? String(id),
    diff: antes ? diffEliminar(antes as any, ["nombre", "diasMinimos", "porcentaje"]) : undefined,
  });
  return c.json({ ok: true });
});
