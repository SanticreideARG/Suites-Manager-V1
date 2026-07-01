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
pnpm test            # vitest (unit) — apps/api (lógica de tarifas)
pnpm --filter @suites/web build
```

## Base de datos

- **Migraciones**: runner propio en `packages/db/src/migrate.ts` (NO drizzle-kit para el
  DDL, porque el `EXCLUDE` va en SQL crudo). Aplica los `.sql` de `packages/db/migrations`
  en orden y registra en la tabla `_migrations`. Usa `pg` + `DATABASE_URL_UNPOOLED`.
- **Runtime**: `packages/db/src/index.ts` usa el driver **HTTP de Neon**
  (`neon()` + `drizzle-orm/neon-http`). Usa `fetch` nativo, sin WebSocket → no
  crashea en las funciones de Vercel. **No uses el driver WebSocket
  (`neon-serverless` + `ws`)**: anda local pero crasheaba la función en Vercel.
  - **Versión clave**: `@neondatabase/serverless` fijado en **0.10.x**. La v1.x
    cambió la API y rompe con `drizzle-orm` 0.38 (error "can now be called only
    as a tagged-template").
  - El driver HTTP **no tiene transacciones interactivas**. La única operación
    transaccional (alta de reserva: huésped + reserva) se hace con **UNA
    sentencia CTE** (`WITH nuevo_huesped AS (INSERT ... RETURNING id) INSERT INTO
    reservas SELECT ... FROM nuevo_huesped`), que es atómica y dispara igual el
    `EXCLUDE` → 409 si hay overbooking. Ver `apps/api/src/routes/reservas.ts`.
  - `packages/db/src/index.ts` exporta `sql` (el tagged-template de neon) para esa
    sentencia.
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
Se despliega con la **Build Output API de Vercel** (`.vercel/output/`). Es la forma sin
ambigüedad: el build declara explícitamente la función y las rutas, y Vercel despliega
eso tal cual (no depende de autodetectar `api/`, ni de hybrid estático-vs-función).

Por qué NO los enfoques previos (todos fallaron, en orden):
1. `@vercel/node` nativo sobre `api/index.ts` → `tsc` del preset degradaba tipos de
   Drizzle (TS2353); además `@suites/db`/`@suites/shared` son TS sin compilar →
   `ERR_MODULE_NOT_FOUND` en runtime.
2. Bundle esbuild a `api/index.js` gitignoreado → Vercel no registraba la función
   (no estaba en el árbol fuente) → el rewrite caía al `index.html` estático
   (todas las rutas devolvían HTML, nunca JSON).

Setup actual (FUNCIONA):
- `apps/api/src/vercel-entry.ts`: handler Node vía `getRequestListener(app.fetch)`.
- `apps/api/scripts/build-vercel.mjs` (corre en `pnpm build:vercel`): bundlea con esbuild
  (autocontenido, inlinea workspace deps) y escribe `.vercel/output/`:
  - `functions/api.func/index.js` + `package.json` (`type: module`) + `.vc-config.json`
    (`runtime: nodejs20.x`, `launcherType: Nodejs`).
  - `config.json` con `routes: [{ src: "/(.*)", dest: "/api" }]`.
  - `static/index.html` (no se sirve; todo va a `/api`).
- `apps/api/vercel.json`: solo `framework: null` + `buildCommand: pnpm build:vercel`.
  (Sin `outputDirectory` ni `rewrites`: van en el Build Output.)
- `.vercel/` está en `.gitignore` (artefacto de build).
- `apps/api/src/app.ts` define la app; `apps/api/src/index.ts` es solo el server local.
- Env: la integración de Neon inyecta `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
  **Sin prefijo** de variable (el código lee los nombres estándar).

### Web — proyecto con Root Directory = `apps/web`
- Framework Preset = Vite.
- Env `VITE_API_URL` = URL pública del proyecto API.

## Modo mock / demo

`pnpm dev:mock` corre la web con datos en memoria (`apps/web/src/lib/mockApi.ts`), sin DB
ni backend. Útil para verificar UI. Muestra un banner ámbar. Replica las reglas clave
(anti-overbooking y "no eliminar habitación con reservas").

## Autenticación (Better Auth)
- `better-auth@1.2.12` (zod 3). El root `package.json` tiene `pnpm.overrides.better-call=1.0.29`
  para evitar el peer de zod 4 (el proyecto entero usa zod 3 — NO subir a zod 4 sin migrar todo).
- Config en `apps/api/src/auth.ts` (drizzleAdapter sobre la `db` neon-http, emailAndPassword,
  `basePath: "/auth"`, campo `role`). Handler montado en Hono bajo la ruta `/auth/...`.
- Tablas `auth_user/auth_session/auth_account/auth_verification` (migración 0005). `role`:
  `admin` | `gestor` | `cliente` (default `cliente`). Promover admin: `UPDATE auth_user SET role='admin' WHERE email=...`.
- Env: `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` (en `.env` local; **agregarlos en el proyecto API de Vercel**).
- neon-http alcanza para el flujo email/password (no requirió transacciones interactivas/pg).
- ✅ Login en el front, gating por rol y **Google OAuth** ya implementados
  (`socialProviders.google` en `auth.ts` + botón en `LoginModal.tsx`). Ver
  detalle en `docs/roadmap.md` § Roles y permisos.
- ✅ Re-autenticación antes de cambios sensibles: sección "Mi cuenta"
  (`apps/web/src/features/auth/MiCuenta.tsx`). `changePassword` exige
  `currentPassword` (nativo de Better Auth); cambiar email reverifica la
  contraseña actual vía `signIn.email` antes de `changeEmail`; `deleteUser`
  recibe `password` y Better Auth lo verifica server-side. Ambos
  (`changeEmail`, `deleteUser`) están habilitados explícitamente en
  `user: {...}` de `auth.ts` (antes no lo estaban).

## Convenciones de Git

- Repo: https://github.com/SanticreideARG/Suites-Manager-V1 (`origin`, rama `main`).
- **Hacer commit en cada cambio importante.** Mensajes en español.
- Identidad de commits de este repo: `SanticreideARG <santi.creide@gmail.com>`
  (configurada como git config LOCAL del repo).
- `.env` NUNCA se commitea (está en `.gitignore`).

## Estado actual (al día)

> Snapshot revisado 2026-07-01 contra el código real (19 migraciones,
> `0000` a `0018`; las últimas tres — `0016_cargos_categorias`,
> `0017_audit_log_hash`, `0018_politicas_cancelacion` — **no corrieron aún
> contra Neon**, hay que `pnpm db:migrate`). El detalle ítem por ítem vive en
> `docs/roadmap.md` (mantenido como fuente de verdad de feature-status); esta
> sección es un resumen de alto nivel, no la duplica.

**Funciona y verificado (más allá del MVP original):**
- MVP completo (habitaciones, reservas, planner, check-in/out, comprobante PDF,
  export Excel), desplegado en Vercel (web + API serverless).
- Auth completa: Better Auth con email/password **y Google OAuth**, roles
  admin/gestor/cliente con gating por ruta, gestión de usuarios, y
  **re-autenticación** para cambiar password/email/borrar cuenta ("Mi cuenta").
- Huéspedes Fase A (tipo/número de documento, nacionalidad, fecha de
  nacimiento, sección "alojados ahora" vs histórico), cargos/consumos extra
  sobre la reserva (catálogo `servicios` + tabla `consumos`) con **4
  categorías fijas** (Servicios/Consumos/Cargos/Bonificaciones — Bonificaciones
  resta del total) y CRUD del catálogo en la pestaña Tarifas.
- Tarifas dinámicas: reglas por coeficiente **o** monto fijo (excluyente entre
  sí, con validación en la API) + edición de precio base por habitación, todo
  centralizado en la pestaña Tarifas.
- Amenidades (catálogo + asignación por unidad), fotos de alojamiento y logo
  vía Vercel Blob.
- Landing pública con disponibilidad en tiempo real + panel de administración
  de landing (hero, fotos, links de footer, servicios, contactos).
- Reportes ampliados (comparativa mensual/anual, forecast, gráficos, export
  PDF/Excel), módulo de Pagos completo (DB+API+UI en el modal de reserva),
  Housekeeping completo.
- Audit log con **hash encadenado** (sha256, tamper-evident) + endpoint
  `GET /audit-log/verify` y botón "Verificar integridad" en Actividad.
- Cancelación de reservas: pide confirmación (panel inline, no cancela
  directo), bloquea si hay check-in + cargos asociados (409
  `cancelacion_bloqueada`), y aplica cargo % configurable según anticipación
  (Configuración → "Cancelaciones") como un cargo más (categoría `cargos`).

**Pendiente / gaps reales (ver `docs/roadmap.md` para detalle):**
- **Correr las migraciones 0016, 0017 y 0018 contra Neon** (`pnpm db:migrate`)
  antes de desplegar — el código de esta sesión asume que ya corrieron.
- Reservas online desde la landing pública (hoy solo se puede consultar
  disponibilidad; crear una reserva sigue restringido a `staff`).
- Ficha de huésped Fase B (dirección, estado civil, motivo de viaje, info de
  pago, vehículo, preferencias, acompañantes, foto de documento).
- Playwright, Sentry/Uptime Kuma, MercadoPago.
- **Drift de entorno detectado (no relacionado a esta sesión)**: `pnpm
  typecheck` falla en `packages/db` (src/reseed.ts) y `apps/api` (`auth.ts`
  google types, varios `'row' is possibly undefined` en rutas no tocadas acá)
  incluso en un checkout limpio — parece un desfasaje entre la versión de
  TypeScript resuelta ahora (5.9.3) y la que se usó al escribir ese código.
  No introducido por los cambios de esta sesión (verificado con `git stash`),
  pero conviene revisarlo aparte.

## Roadmap

- **MVP v1.0** (casi listo): habitaciones, reservas, planner, check-in/out, facturación
  mínima.
- **Fase 2**: huéspedes (ficha + historial), tarifas dinámicas, reportes, roles
  (admin/recepcionista) con Better Auth.
- **Fase 3**: channel manager (Booking/Airbnb), housekeeping, notificaciones
  (Resend/WhatsApp), AFIP, multi-sucursal.
