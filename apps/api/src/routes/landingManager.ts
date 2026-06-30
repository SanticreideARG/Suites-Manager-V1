import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db, eq, config, landingFotos, landingLinks } from "@suites/db";
import {
  landingConfigUpdate,
  landingLinkCreate,
  landingLinkUpdate,
  landingLinksOrden,
} from "@suites/shared";
import { adminOnly } from "../middleware/auth.js";
import { put, del } from "@vercel/blob";
import { z } from "zod";

export const landingManagerRoutes = new Hono();
landingManagerRoutes.use("*", adminOnly);

// ── Textos del hero ──────────────────────────────────────────────
landingManagerRoutes.get("/config", async (c) => {
  const [row] = await db
    .select({
      landingTagline: config.landingTagline,
      landingSubtitulo: config.landingSubtitulo,
      landingCtaTexto: config.landingCtaTexto,
      landingCtaUrl: config.landingCtaUrl,
    })
    .from(config)
    .where(eq(config.id, 1));
  return c.json(row ?? null);
});

landingManagerRoutes.put(
  "/config",
  zValidator("json", landingConfigUpdate),
  async (c) => {
    const data = c.req.valid("json");
    const [row] = await db
      .update(config)
      .set(data)
      .where(eq(config.id, 1))
      .returning({
        landingTagline: config.landingTagline,
        landingSubtitulo: config.landingSubtitulo,
        landingCtaTexto: config.landingCtaTexto,
        landingCtaUrl: config.landingCtaUrl,
      });
    if (!row) return c.json({ error: "Config no inicializada" }, 404);
    return c.json(row);
  },
);

// ── Fotos del hero ───────────────────────────────────────────────
landingManagerRoutes.get("/fotos", async (c) => {
  const rows = await db
    .select()
    .from(landingFotos)
    .orderBy(landingFotos.orden);
  return c.json(rows);
});

landingManagerRoutes.post("/fotos", async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return c.json({ error: "Campo 'file' requerido" }, 400);

  const altTexto = form.get("altTexto");

  const existentes = await db.select({ id: landingFotos.id }).from(landingFotos);
  const orden = existentes.length;

  const ext = file.name.split(".").pop() ?? "jpg";
  const nombre = `landing/${Date.now()}.${ext}`;
  const { url } = await put(nombre, file.stream(), {
    access: "public",
    contentType: file.type || "image/jpeg",
    token,
  });

  const [row] = await db
    .insert(landingFotos)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .values({ url, altTexto: typeof altTexto === "string" ? altTexto : null, orden } as any)
    .returning();
  return c.json(row, 201);
});

landingManagerRoutes.delete("/fotos/:id", async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const id = Number(c.req.param("id"));
  const [foto] = await db.select().from(landingFotos).where(eq(landingFotos.id, id));
  if (!foto) return c.json({ error: "No encontrada" }, 404);

  await del(foto.url, { token }).catch(() => {});
  await db.delete(landingFotos).where(eq(landingFotos.id, id));
  return c.json({ ok: true });
});

const fotosOrdenSchema = z.object({ ids: z.array(z.number()) });
landingManagerRoutes.patch("/fotos/orden", zValidator("json", fotosOrdenSchema), async (c) => {
  const { ids } = c.req.valid("json");
  for (let i = 0; i < ids.length; i++) {
    const fid = ids[i];
    if (fid === undefined) continue;
    await db.update(landingFotos).set({ orden: i }).where(eq(landingFotos.id, fid));
  }
  const rows = await db.select().from(landingFotos).orderBy(landingFotos.orden);
  return c.json(rows);
});

// ── Links del footer ─────────────────────────────────────────────
landingManagerRoutes.get("/links", async (c) => {
  const rows = await db.select().from(landingLinks).orderBy(landingLinks.orden);
  return c.json(rows);
});

landingManagerRoutes.post("/links", zValidator("json", landingLinkCreate), async (c) => {
  const data = c.req.valid("json");
  const existentes = await db.select({ id: landingLinks.id }).from(landingLinks);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [row] = await db.insert(landingLinks).values({ ...data, orden: existentes.length } as any).returning();
  return c.json(row, 201);
});

landingManagerRoutes.patch(
  "/links/:id",
  zValidator("json", landingLinkUpdate),
  async (c) => {
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");
    const [row] = await db
      .update(landingLinks)
      .set(data)
      .where(eq(landingLinks.id, id))
      .returning();
    if (!row) return c.json({ error: "No encontrado" }, 404);
    return c.json(row);
  },
);

landingManagerRoutes.delete("/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.delete(landingLinks).where(eq(landingLinks.id, id)).returning();
  if (!row) return c.json({ error: "No encontrado" }, 404);
  return c.json({ ok: true });
});

// ── Upload genérico de imagen (para servicios / contactos landing) ─
landingManagerRoutes.post("/upload-imagen", async (c) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return c.json({ error: "BLOB_READ_WRITE_TOKEN no configurado" }, 500);

  const form = await c.req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return c.json({ error: "Campo 'file' requerido" }, 400);

  const ext = file.name.split(".").pop() ?? "png";
  const nombre = `landing-misc/${Date.now()}.${ext}`;
  const { url } = await put(nombre, file.stream(), {
    access: "public",
    contentType: file.type || "image/png",
    token,
  });
  return c.json({ url });
});

landingManagerRoutes.patch("/links/orden", zValidator("json", landingLinksOrden), async (c) => {
  const { ids } = c.req.valid("json");
  for (let i = 0; i < ids.length; i++) {
    const lid = ids[i];
    if (lid === undefined) continue;
    await db.update(landingLinks).set({ orden: i }).where(eq(landingLinks.id, lid));
  }
  const rows = await db.select().from(landingLinks).orderBy(landingLinks.orden);
  return c.json(rows);
});
