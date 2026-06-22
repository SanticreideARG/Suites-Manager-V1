# Suites Manager — Contexto para agentes

Gestor para hoteles, alojamientos y cabañas: habitaciones, reservas, calendario de
ocupación, check-in/out y facturación mínima. Mercado Argentina (AFIP en fases futuras).

> Este archivo es el contexto compartido del proyecto. Mantenelo actualizado cuando
> cambien decisiones, comandos, o el estado del deploy.

## Stack y arquitectura

Monorepo **pnpm workspaces**:

```
apps/
  web/   → Vite + React 19 + TS + Tailwind v4 + TanStack Query + Zustand
  api/   → Hono + Zod (Node local / funciones serverless en Vercel)
packages/
  db/      → Drizzle ORM + Postgres (driver serverless de Neon) + migraciones SQL
  shared/  → esquemas Zod y tipos compartidos front ↔ back
```

- **DB**: PostgreSQL en **Neon** (gestionado vía Vercel). NO es Turso: se evaluó y se
  descartó porque SQLite no soporta el constraint anti-overbooking (ver abajo).
- **Estado en el front**: TanStack Query = estado de servidor; Zustand = estado de UI.
  No mezclar.

## ⭐ Decisión de diseño clave: anti-overbooking en la DB

El solapamiento de reservas se previene **a nivel base de datos**, no en código:

```sql
ALTER TABLE reservas ADD CONSTRAINT reservas_sin_solapamiento
  EXCLUDE USING gist (
    habitacion_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (estado <> 'cancelada');
```

- Requiere la extensión `btree_gist` (Neon la soporta).
- El rango `[)` incluye check-in y excluye check-out → checkout y check-in el mismo día
  NO chocan.
- La API traduce la violación (código PG `23P01`) a un **HTTP 409 `overbooking`**.
- El estado de ocupación se DERIVA de las reservas; no se duplica.

## Comandos

```bash
pnpm install
pnpm db:migrate      # aplica packages/db/migrations/*.sql (runner propio, no drizzle-kit)
pnpm db:seed         # 5 habitaciones de ejemplo
pnpm dev             # web (:5180) + api (:3001) en paralelo
pnpm dev:api         # solo API
pnpm dev:web         # solo web
pnpm dev:mock        # web con datos en memoria, SIN DB (VITE_MOCK=1)
pnpm typecheck       # tsc --noEmit en los 4 workspaces
pnpm --filter @suites/web build
```

## Base de datos

- **Migraciones**: runner propio en `packages/db/src/migrate.ts` (NO drizzle-kit para el
  DDL, porque el `EXCLUDE` va en SQL crudo). Aplica los `.sql` de `packages/db/migrations`
  en orden y registra en la tabla `_migrations`. Usa `pg` + `DATABASE_URL_UNPOOLED`.
- **Runtime**: `packages/db/src/index.ts` usa el driver **serverless de Neon**
  (`@neondatabase/serverless` Pool + `drizzle-orm/neon-serverless`), que soporta
  transacciones (las usamos en el alta de reserva) y funciona en serverless.
- **Schema Drizzle** (`packages/db/src/schema.ts`) es la fuente de tipos para queries.
  El `EXCLUDE` vive solo en el SQL (Drizzle no lo expresa); mantener ambos en sync.
- **Env**: `.env` en la RAÍZ del repo (gitignored). `packages/db/src/load-env.ts` lo
  carga apunte donde apunte el cwd. Variables: `DATABASE_URL` (pooled, runtime) y
  `DATABASE_URL_UNPOOLED` (directa, migraciones). En Vercel las inyecta la integración
  de Neon (no hay `.env`).

## ⚠️ Gotcha: degradación de tipos de Drizzle en builds

En algunos entornos de build (notablemente el `tsc` de Vercel sin nuestro
`skipLibCheck`), la inferencia de tipos de Drizzle **se degrada**: el tipo de una tabla
pierde columnas (las opcionales/con default) e incluso `$inferInsert` queda roto. Esto
NO pasa en el typecheck local.

Reglas para escribir queries de escritura sin romper builds:
- En `.values()` / `.set()` **nunca uses un objeto literal con propiedades explícitas**
  → usá una **variable** o **spread** (`{ ...data }`). El chequeo de "excess property"
  solo aplica a literales.
- Si el insert exige columnas que la inferencia degradada no ve (ej. habitaciones),
  castear el payload con **`as any`** en la llamada (el payload ya está validado por Zod,
  así que es seguro). Ver `apps/api/src/routes/habitaciones.ts`.
- `drizzle-orm` debe ser **una sola instancia**: solo `@suites/db` lo declara como dep y
  re-exporta los operadores (`eq`, `and`, etc.); la API los importa desde `@suites/db`,
  NO desde `drizzle-orm`.

## Deploy en Vercel (DOS proyectos)

Ambos apuntan al mismo repo, con Root Directory distinto.

### API — proyecto con Root Directory = `apps/api`
- Adaptador `hono/vercel`: `apps/api/api/index.ts` exporta `handle(app)` (runtime nodejs).
- `apps/api/src/app.ts` define la app; `apps/api/src/index.ts` es solo el server local.
- `apps/api/vercel.json` (config que costó y FUNCIONA):
  - `framework: null` → evita que un preset corra `tsc` (causa de la degradación de tipos).
  - `buildCommand`: crea un `public/index.html` mínimo (Vercel exige output dir no vacío
    aunque la API son funciones).
  - `outputDirectory: public`.
  - `rewrites: /(.*) -> /api` → todo entra a la función; Hono enruta por el path original.
- Env: la integración de Neon inyecta `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
  **Sin prefijo** de variable (el código lee los nombres estándar).

### Web — proyecto con Root Directory = `apps/web`
- Framework Preset = Vite.
- Env `VITE_API_URL` = URL pública del proyecto API.

## Modo mock / demo

`pnpm dev:mock` corre la web con datos en memoria (`apps/web/src/lib/mockApi.ts`), sin DB
ni backend. Útil para verificar UI. Muestra un banner ámbar. Replica las reglas clave
(anti-overbooking y "no eliminar habitación con reservas").

## Convenciones de Git

- Repo: https://github.com/SanticreideARG/Suites-Manager-V1 (`origin`, rama `main`).
- **Hacer commit en cada cambio importante.** Mensajes en español.
- Identidad de commits de este repo: `SanticreideARG <santi.creide@gmail.com>`
  (configurada como git config LOCAL del repo).
- Terminar los mensajes de commit con:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- `.env` NUNCA se commitea (está en `.gitignore`).

## Estado actual (al día)

**Funciona y verificado:**
- MVP completo del front: planner de ocupación (grilla custom), CRUD habitaciones
  (alta/editar/mantenimiento/eliminar), CRUD reservas (crear/modificar fechas/cancelar)
  con recálculo de total, check-in/out, comprobante PDF (react-pdf, code-split),
  export Excel (exceljs, code-split).
- API verificada end-to-end contra Neon: health, habitaciones, alta de reserva con
  transacción, y **anti-overbooking devuelve 409**.
- **API desplegada como funciones serverless en Vercel** (deploy exitoso).

**Pendiente / en curso:**
- Migración `0001`: la columna `notas` de `huespedes` está en el schema/código pero NO en
  la base real (la `0000_init` corrió antes de agregarla). Hay que crear y correr la 0001.
- CRUD de huéspedes (ficha datos + preferencias + historial de estadías) — en desarrollo.
- Deploy de la web en Vercel con `VITE_API_URL` apuntando a la API.

## Roadmap

- **MVP v1.0** (casi listo): habitaciones, reservas, planner, check-in/out, facturación
  mínima.
- **Fase 2**: huéspedes (ficha + historial), tarifas dinámicas, reportes, roles
  (admin/recepcionista) con Better Auth.
- **Fase 3**: channel manager (Booking/Airbnb), housekeeping, notificaciones
  (Resend/WhatsApp), AFIP, multi-sucursal.
