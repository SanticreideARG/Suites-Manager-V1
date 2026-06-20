# Crear la base de datos en Vercel (Postgres / Neon)

Vercel ya no tiene su propio Postgres: lo provee **Neon** a través del Marketplace.
Cuando creás una "Postgres database" en Vercel, en realidad estás creando un proyecto
Neon gestionado desde el panel de Vercel. Es 100% Postgres, así que nuestro stack
(Drizzle + `pg` + el constraint `EXCLUDE`) funciona sin cambios.

> Plan free de Neon: ~0.5 GB de storage y compute que se suspende al estar inactivo.
> Más que suficiente para el MVP.

---

## Paso 1 — Crear la base

### Opción A: desde el panel de Vercel (recomendada)

1. Entrá a <https://vercel.com> e iniciá sesión (o creá la cuenta).
2. En el menú superior andá a **Storage** → **Create Database**.
3. Elegí **Neon — Serverless Postgres** (en el Marketplace de Vercel).
4. Configurá:
   - **Database name**: `suites-manager` (o el que prefieras).
   - **Region**: elegí la más cercana a Argentina → **South America (São Paulo) `gru1`**
     si está disponible; si no, **US East**.
   - **Plan**: Free.
5. Confirmá. Vercel crea la base y te muestra la pantalla de conexión.

### Opción B: directamente en Neon

Si preferís el panel de Neon (<https://neon.tech>), creás el proyecto ahí y después,
si querés deploy en Vercel, conectás la integración. Para desarrollo local da igual:
lo único que necesitamos son las **connection strings**.

---

## Paso 2 — Copiar las connection strings

En la pantalla de la base (Vercel: pestaña **Quickstart** / **.env.local**; Neon:
**Connection Details**) vas a ver varias variables. Las dos que nos importan:

| Variable                                  | Qué es                          | La usamos para            |
|-------------------------------------------|---------------------------------|---------------------------|
| `DATABASE_URL` (host con `-pooler`)       | conexión **pooled** (pgbouncer) | la API en runtime         |
| `DATABASE_URL_UNPOOLED` (host sin pooler) | conexión **directa**            | correr migraciones (DDL)  |

> Vercel también expone `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, etc.
> Equivalencias: `POSTGRES_URL` → pooled, `POSTGRES_URL_NON_POOLING` → directa.

Ambas terminan en `?sslmode=require`. **No las compartas ni las subas al repo**
(el `.gitignore` ya excluye `.env`).

---

## Paso 3 — Configurar el proyecto

En la raíz `E:\www\SuitesManager`:

```bash
cp .env.example .env
```

Editá `.env` y pegá las dos cadenas:

```env
DATABASE_URL="postgres://...-pooler.../suites-manager?sslmode=require"
DATABASE_URL_UNPOOLED="postgres://.../suites-manager?sslmode=require"
```

> **Atajo con Vercel CLI** (si conectaste la base a un proyecto de Vercel):
> ```bash
> npm i -g vercel
> vercel link
> vercel env pull .env
> ```
> Esto baja todas las variables automáticamente. Después renombrá/duplicá las que
> haga falta para que existan `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.

---

## Paso 4 — Crear las tablas y el constraint anti-overbooking

```bash
pnpm install        # si no lo corriste aún
pnpm db:migrate     # aplica migrations/0000_init.sql
```

Esto crea la extensión `btree_gist`, las tablas y el `EXCLUDE` que impide overbooking.
Neon soporta `btree_gist` sin pasos extra.

(Opcional) cargar habitaciones de ejemplo:

```bash
pnpm db:seed
```

---

## Paso 5 — Levantar la app

```bash
pnpm dev
```

- Web: <http://localhost:5180>
- API: <http://localhost:3001> (probá <http://localhost:3001/health>)

---

## Verificar que quedó bien

```bash
# Lista de habitaciones (vacía o con el seed)
curl http://localhost:3001/habitaciones
```

Para confirmar el anti-overbooking, creá dos reservas con fechas que se pisen en la
misma habitación desde el planner: la segunda debe rechazarse con el aviso
"Esas fechas ya están ocupadas".

---

## Notas

- La conexión **pooled** es para la app (muchas conexiones cortas). La **directa** es
  para migraciones porque el DDL (`CREATE EXTENSION`, `ALTER TABLE`) no se lleva bien
  con el pooler. El runner ya usa `DATABASE_URL_UNPOOLED` si existe.
- En el plan free, la compute de Neon **se suspende** tras inactividad; la primera
  query después de dormir tarda ~1 s en despertar. Es normal.
- Cuando hagamos deploy de la API en Vercel, las variables ya quedan inyectadas por
  la integración; no hay que copiarlas a mano en producción.
- `drizzle-kit studio` (`pnpm db:studio`) te da una UI para inspeccionar la base.
