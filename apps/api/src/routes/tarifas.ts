import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, desc, eq, tarifaReglas } from "@suites/db";
import { tarifaReglaCreate, tarifaReglaUpdate } from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";
import { logAudit, computeDiff, diffEliminar } from "../lib/audit.js";

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
  await logAudit(c, {
    accion: "crear",
    entidad: "tarifas",
    entidadId: row.id,
    entidadLabel: row.nombre,
    diff: { nombre: { antes: null, despues: row.nombre }, tipo: { antes: null, despues: row.tipo }, factor: { antes: null, despues: row.factor }, monto: { antes: null, despues: row.monto } },
  });
  return c.json(row, 201);
});

tarifasRoutes.patch("/:id", zValidator("json", tarifaReglaUpdate), async (c) => {
  const id = Number(c.req.param("id"));
  const { factor, monto, ...resto } = c.req.valid("json");
  const [antes] = await db.select().from(tarifaReglas).where(eq(tarifaReglas.id, id));
  if (!antes) return c.json({ error: "No encontrada" }, 404);

  const factorFinal = factor ?? Number(antes.factor);
  const montoFinal = monto ?? Number(antes.monto);
  if (factorFinal !== 1 && montoFinal !== 0) {
    return c.json(
      {
        error: "regla_no_excluyente",
        message: "Una regla es de un solo tipo: coeficiente o monto fijo, no ambos.",
      },
      400,
    );
  }

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
  await logAudit(c, {
    accion: "editar",
    entidad: "tarifas",
    entidadId: id,
    entidadLabel: row.nombre,
    diff: computeDiff(antes as any, row as any, ["nombre", "tipo", "factor", "monto", "prioridad", "activa", "desde", "hasta"]),
  });
  return c.json(row);
});

tarifasRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [antes] = await db.select().from(tarifaReglas).where(eq(tarifaReglas.id, id));
  const [row] = await db
    .delete(tarifaReglas)
    .where(eq(tarifaReglas.id, id))
    .returning();
  if (!row) return c.json({ error: "No encontrada" }, 404);
  await logAudit(c, {
    accion: "eliminar",
    entidad: "tarifas",
    entidadId: id,
    entidadLabel: antes?.nombre ?? String(id),
    diff: antes ? diffEliminar(antes as any, ["nombre", "tipo", "factor", "monto"]) : undefined,
  });
  return c.json({ ok: true });
});
