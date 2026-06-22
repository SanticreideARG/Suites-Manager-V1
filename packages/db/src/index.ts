import "./load-env.js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema.js";

/**
 * Cliente de runtime: driver serverless de Neon (Pool por WebSocket).
 * Funciona en funciones serverless (Vercel) y en Node local, y soporta
 * transacciones interactivas (las usamos en el alta de reserva).
 *
 * Las migraciones (DDL) usan `pg` aparte en migrate.ts; corren como script.
 */

// En Node (dev local y runtime Node de Vercel) hay que proveer el WebSocket.
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * as schema from "./schema.js";
export { habitaciones, huespedes, reservas, pagos } from "./schema.js";
export type { Habitacion, Huesped, Reserva, Pago } from "./schema.js";

// Re-export de operadores: la API los usa desde acá para que haya UNA sola
// instancia de drizzle-orm (evita el choque de tipos por peers duplicados).
export { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm";

/** Código que lanza Postgres cuando se viola un EXCLUDE constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";
