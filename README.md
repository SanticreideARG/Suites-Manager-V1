# Suites Manager

Gestor para hoteles, alojamientos y cabañas: habitaciones, reservas, calendario de ocupación, check-in/out y facturación.

## Stack

- **Frontend** (`apps/web`): Vite + React 19 + TypeScript + Tailwind v4, TanStack Query (estado de servidor) + Zustand (estado de UI). Planner de ocupación con grilla custom.
- **Backend** (`apps/api`): Hono (Node) + Zod.
- **DB** (`packages/db`): Postgres (Neon en prod) + Drizzle ORM.
- **Shared** (`packages/shared`): esquemas Zod/tipos compartidos front ↔ back.

Monorepo con **pnpm workspaces**.

## Pieza clave: anti-overbooking

El solapamiento de reservas se previene **a nivel base de datos** con un constraint
`EXCLUDE USING gist` (ver `packages/db/migrations/0000_init.sql`). Dos reservas no
canceladas no pueden pisar fechas en la misma habitación, sin importar condiciones de
carrera. La API traduce esa violación (código `23P01`) a un `409 overbooking`.

## Puesta en marcha

La base es **Postgres en Vercel (Neon)**. Seguí la guía paso a paso:
👉 [docs/setup-db-vercel.md](docs/setup-db-vercel.md)

Resumen:

```bash
pnpm install
cp .env.example .env        # pegar DATABASE_URL y DATABASE_URL_UNPOOLED (ver guía)

pnpm db:migrate             # crea tablas + constraint
pnpm db:seed                # (opcional) 5 habitaciones de ejemplo

pnpm dev                    # levanta web (:5180) y api (:3001)
```

- Web: http://localhost:5180
- API: http://localhost:3001

### Alternativa: Postgres local con Docker

```bash
docker run --name suites-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=suites -p 5432:5432 -d postgres:16
# DATABASE_URL="postgres://postgres:postgres@localhost:5432/suites"
```

## Estructura

```
apps/
  web/   SPA React (planner, modales de reserva/habitación)
  api/   API Hono (habitaciones, reservas, check-in/out)
packages/
  db/      schema Drizzle + migraciones SQL + runner
  shared/  esquemas Zod compartidos
```

## Roadmap

- **MVP v1.0** (este scaffold): habitaciones, reservas, planner, check-in/out, base de facturación.
- **Fase 2**: ficha de huéspedes + historial, tarifas dinámicas, reportes, roles (admin/recepcionista) con Better Auth.
- **Fase 3**: channel manager (Booking/Airbnb), housekeeping, notificaciones (Resend/WhatsApp), AFIP, multi-sucursal.
