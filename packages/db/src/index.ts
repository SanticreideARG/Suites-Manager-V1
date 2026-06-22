import "./load-env.js";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

/**
 * Cliente de runtime: driver HTTP de Neon (sin WebSocket).
 * Ideal para serverless (Vercel): usa fetch nativo, sin `ws` ni conexiones
 * persistentes. No soporta transacciones interactivas, así que la única
 * operación transaccional (alta de reserva) se hace con una sentencia CTE
 * única y atómica (ver apps/api/src/routes/reservas.ts).
 *
 * Las migraciones (DDL) usan `pg` aparte en migrate.ts; corren como script.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno");
}

/** Ejecutor SQL crudo de Neon (tagged template), para la sentencia CTE. */
export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export * as schema from "./schema.js";
export { habitaciones, huespedes, reservas, pagos } from "./schema.js";
export type { Habitacion, Huesped, Reserva, Pago } from "./schema.js";

// Operadores de Drizzle (una sola instancia; ver nota en package del repo).
export { and, desc, eq, gte, lt, ne } from "drizzle-orm";

/** Código que lanza Postgres cuando se viola un EXCLUDE constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";
