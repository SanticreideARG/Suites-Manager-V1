import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en el entorno");
}

/** SSL para cualquier DB cloud (Neon/Vercel/etc); off solo en local. */
export function needsSsl(cs: string): boolean {
  return !/@(localhost|127\.0\.0\.1)/.test(cs);
}

export const pool = new Pool({
  connectionString,
  ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export * as schema from "./schema.js";
export {
  habitaciones,
  huespedes,
  reservas,
  pagos,
} from "./schema.js";
export type { Habitacion, Huesped, Reserva, Pago } from "./schema.js";

/** Código que lanza Postgres cuando se viola un EXCLUDE constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";
