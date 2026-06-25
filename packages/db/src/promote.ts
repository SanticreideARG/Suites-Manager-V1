import { sql } from "./index.js";

/**
 * Asigna un rol a un usuario por email.
 * Uso: pnpm db:promote <email> <admin|gestor|cliente>
 */
const email = process.argv[2];
const role = process.argv[3];

if (!email || !["admin", "gestor", "cliente"].includes(role ?? "")) {
  console.error("Uso: pnpm db:promote <email> <admin|gestor|cliente>");
  process.exit(1);
}

const rows = (await sql`
  UPDATE auth_user SET role = ${role} WHERE email = ${email} RETURNING email, role
`) as { email: string; role: string }[];

const fila = rows[0];
if (!fila) {
  console.error(`No se encontró el usuario ${email}`);
  process.exit(1);
}
console.log(`OK: ${fila.email} → ${fila.role}`);
process.exit(0);
