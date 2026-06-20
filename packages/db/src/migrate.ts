import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { needsSsl } from "./index.js";

/**
 * Runner de migraciones simple y transparente: aplica en orden los .sql de
 * /migrations y registra cuáles ya corrieron. Hecho a mano (en vez de
 * drizzle-kit) porque el constraint EXCLUDE va en SQL crudo.
 *
 * Usa la conexión DIRECTA (no pooled) si está disponible: el DDL con
 * CREATE EXTENSION / ALTER TABLE no se lleva bien con el pooler de Vercel/Neon.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "migrations");

async function main() {
  const { Client } = pg;
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL");

  const client = new Client({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    ),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (ya aplicada)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`▶ aplicando ${file}...`);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations(name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`✔ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`✘ falló ${file}`);
      throw err;
    }
  }

  await client.end();
  console.log("Migraciones al día.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
