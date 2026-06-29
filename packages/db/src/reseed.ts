/**
 * Limpia datos de prueba y carga un set de huéspedes y reservas coherente.
 * Conserva: habitaciones (con fotos/amenidades), config, landing, impuestos,
 *            metodos_pago, usuarios auth.
 * Elimina y recrea: pagos → reservas → huespedes.
 *
 * Uso: pnpm db:reseed
 */
import "./load-env.js";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import { asc } from "drizzle-orm";

const conn = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!conn) throw new Error("Falta DATABASE_URL");

const sql = neon(conn);
const db = drizzle(sql, { schema });

// ─── helpers de fecha ────────────────────────────────────────────────────────
function d(offset: number): string {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

function noches(ci: string, co: string): number {
  return Math.round(
    (new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000,
  );
}

function total(tarifa: string, ci: string, co: string): string {
  return String(Number(tarifa) * noches(ci, co));
}

// ─── limpieza ────────────────────────────────────────────────────────────────
async function limpiar() {
  console.log("Limpiando datos anteriores…");
  await db.delete(schema.pagos);
  await db.delete(schema.reservas);
  await db.delete(schema.huespedes);
  await sql`ALTER SEQUENCE pagos_id_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE reservas_id_seq RESTART WITH 1`;
  await sql`ALTER SEQUENCE huespedes_id_seq RESTART WITH 1`;
  console.log("  ✓ pagos / reservas / huespedes eliminados");
}

// ─── huéspedes ───────────────────────────────────────────────────────────────
const HUESPEDES = [
  { nombre: "Martín González",      documento: "32456789", nac: "Argentina" },
  { nombre: "Laura Fernández",      documento: "41234567", nac: "Argentina" },
  { nombre: "Diego Ramírez",        documento: "28765432", nac: "Argentina" },
  { nombre: "Sofía Herrera",        documento: "39876543", nac: "Argentina" },
  { nombre: "Nicolás Pereyra",      documento: "27345678", nac: "Argentina" },
  { nombre: "Valentina López",      documento: "36543210", nac: "Argentina" },
  { nombre: "Juan Ignacio Torres",  documento: "25678901", nac: "Argentina" },
  { nombre: "Mariana Castro",       documento: "42987654", nac: "Argentina" },
  { nombre: "Pablo Medina",         documento: "31234567", nac: "Argentina" },
  { nombre: "Camila Duarte",        documento: "40876543", nac: "Argentina" },
  { nombre: "Alejandro Bustos",     documento: "29765432", nac: "Argentina" },
  { nombre: "Florencia Cabrera",    documento: "38654321", nac: "Argentina" },
  { nombre: "Rodrigo Álvarez",      documento: "33456789", nac: "Argentina" },
  { nombre: "Julieta Morales",      documento: "44123456", nac: "Argentina" },
  { nombre: "Sebastián Ríos",       documento: "30987654", nac: "Argentina" },
  { nombre: "Carla Benítez",        documento: "37654321", nac: "Argentina" },
  { nombre: "Matías Domínguez",     documento: "26543210", nac: "Argentina" },
  { nombre: "Gabriela Ortiz",       documento: "35876543", nac: "Argentina" },
  { nombre: "Federico Sosa",        documento: "28123456", nac: "Argentina" },
  { nombre: "Luciana Vega",         documento: "39543210", nac: "Argentina" },
  { nombre: "Hernán Acosta",        documento: "34765432", nac: "Argentina" },
  { nombre: "Daniela Paredes",      documento: "43876543", nac: "Argentina" },
  { nombre: "Cristian Navarro",     documento: "27654321", nac: "Argentina" },
  { nombre: "Agustina Molina",      documento: "36987654", nac: "Argentina" },
  { nombre: "Ezequiel Carrizo",     documento: "29876543", nac: "Argentina" },
  { nombre: "Paola Giménez",        documento: "41543210", nac: "Argentina" },
  { nombre: "Bruno Quiroga",        documento: "32987654", nac: "Argentina" },
  { nombre: "Natalia Figueroa",     documento: "40123456", nac: "Argentina" },
  { nombre: "Luis Ferreira",        documento: "12345678", nac: "Uruguay"   },
  { nombre: "Carla Silva",          documento: "21987654", nac: null        },
] as const;

async function insertarHuespedes() {
  console.log("Insertando 30 huéspedes…");
  await db.insert(schema.huespedes).values(
    HUESPEDES.map((h) => ({
      nombre: h.nombre,
      documento: h.documento,
      tipoDocumento: "DNI" as const,
      nacionalidad: h.nac ?? undefined,
    })),
  );
  console.log("  ✓ 30 huéspedes insertados");
}

// ─── reservas ────────────────────────────────────────────────────────────────
async function insertarReservas(
  habs: { id: number; nombre: string; tarifaBase: string }[],
  guestIds: number[],
) {
  // Asigna las primeras 5 habitaciones (o las que haya)
  const [h1, h2, h3, h4, h5] = habs;
  // Alias cortos de huéspedes por posición (0-based)
  const g = (n: number) => guestIds[n - 1]; // 1-based para coincidir con la lista

  type EstadoR = "reservada" | "ocupada" | "checkout" | "cancelada" | "mantenimiento";
  interface R {
    habitacionId: number;
    huespedId: number | null;
    checkin: string;
    checkout: string;
    estado: EstadoR;
    total: string;
    notas?: string;
  }

  const rows: R[] = [];

  // ── Pasadas ──────────────────────────────────────────────────────────────
  // Cabaña 1: Martín González (5 noches, hace ~2 meses)
  if (h1) rows.push({ habitacionId: h1.id, huespedId: g(1),
    checkin: d(-60), checkout: d(-55), estado: "checkout",
    total: total(h1.tarifaBase, d(-60), d(-55)) });

  // Hab.101: Diego Ramírez (3 noches)
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(3),
    checkin: d(-50), checkout: d(-47), estado: "checkout",
    total: total(h4.tarifaBase, d(-50), d(-47)) });

  // Suite Río: Sofía Herrera (4 noches)
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(4),
    checkin: d(-44), checkout: d(-40), estado: "checkout",
    total: total(h3.tarifaBase, d(-44), d(-40)) });

  // Cabaña 2: Juan Ignacio Torres (4 noches)
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(7),
    checkin: d(-38), checkout: d(-34), estado: "checkout",
    total: total(h2.tarifaBase, d(-38), d(-34)) });

  // Hab.102: Valentina López (3 noches)
  if (h5) rows.push({ habitacionId: h5.id, huespedId: g(6),
    checkin: d(-36), checkout: d(-33), estado: "checkout",
    total: total(h5.tarifaBase, d(-36), d(-33)) });

  // Cabaña 1: Pablo Medina (5 noches)
  if (h1) rows.push({ habitacionId: h1.id, huespedId: g(9),
    checkin: d(-30), checkout: d(-25), estado: "checkout",
    total: total(h1.tarifaBase, d(-30), d(-25)) });

  // Hab.101: Mariana Castro (2 noches)
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(8),
    checkin: d(-28), checkout: d(-26), estado: "checkout",
    total: total(h4.tarifaBase, d(-28), d(-26)) });

  // Suite Río: Alejandro Bustos (3 noches)
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(11),
    checkin: d(-22), checkout: d(-19), estado: "checkout",
    total: total(h3.tarifaBase, d(-22), d(-19)) });

  // Cabaña 2: Florencia Cabrera (3 noches)
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(12),
    checkin: d(-20), checkout: d(-17), estado: "checkout",
    total: total(h2.tarifaBase, d(-20), d(-17)) });

  // Hab.102: Rodrigo Álvarez (2 noches)
  if (h5) rows.push({ habitacionId: h5.id, huespedId: g(13),
    checkin: d(-18), checkout: d(-16), estado: "checkout",
    total: total(h5.tarifaBase, d(-18), d(-16)) });

  // Cabaña 1: Julieta Morales (3 noches)
  if (h1) rows.push({ habitacionId: h1.id, huespedId: g(14),
    checkin: d(-14), checkout: d(-11), estado: "checkout",
    total: total(h1.tarifaBase, d(-14), d(-11)) });

  // Hab.101: Sebastián Ríos (2 noches)
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(15),
    checkin: d(-10), checkout: d(-8), estado: "checkout",
    total: total(h4.tarifaBase, d(-10), d(-8)) });

  // Suite Río: Camila Duarte (2 noches)
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(10),
    checkin: d(-8), checkout: d(-6), estado: "checkout",
    total: total(h3.tarifaBase, d(-8), d(-6)) });

  // Cabaña 2: Nicolás Pereyra (3 noches)
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(5),
    checkin: d(-7), checkout: d(-4), estado: "checkout",
    total: total(h2.tarifaBase, d(-7), d(-4)) });

  // ── Canceladas ────────────────────────────────────────────────────────────
  // Paola Giménez (canceló antes de entrar)
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(26),
    checkin: d(-5), checkout: d(-3), estado: "cancelada",
    total: total(h4.tarifaBase, d(-5), d(-3)),
    notas: "Canceló por enfermedad" });

  // Luis Ferreira (canceló reserva futura)
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(29),
    checkin: d(20), checkout: d(24), estado: "cancelada",
    total: total(h3.tarifaBase, d(20), d(24)),
    notas: "Canceló — cambió destino" });

  // ── Actuales (ocupadas) ───────────────────────────────────────────────────
  // Carla Benítez: Suite Río, entró hace 2 días, sale en 3
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(16),
    checkin: d(-2), checkout: d(3), estado: "ocupada",
    total: total(h3.tarifaBase, d(-2), d(3)) });

  // Matías Domínguez: Cabaña 2, entró ayer, sale pasado
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(17),
    checkin: d(-1), checkout: d(2), estado: "ocupada",
    total: total(h2.tarifaBase, d(-1), d(2)) });

  // Gabriela Ortiz: Hab.102, entró hoy, sale en 2 noches
  if (h5) rows.push({ habitacionId: h5.id, huespedId: g(18),
    checkin: d(0), checkout: d(2), estado: "ocupada",
    total: total(h5.tarifaBase, d(0), d(2)) });

  // ── Futuras (reservadas) ──────────────────────────────────────────────────
  // Federico Sosa: Cabaña 1, 4 noches desde +4
  if (h1) rows.push({ habitacionId: h1.id, huespedId: g(19),
    checkin: d(4), checkout: d(8), estado: "reservada",
    total: total(h1.tarifaBase, d(4), d(8)) });

  // Luciana Vega: Hab.101, 2 noches desde +5
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(20),
    checkin: d(5), checkout: d(7), estado: "reservada",
    total: total(h4.tarifaBase, d(5), d(7)) });

  // Hernán Acosta: Suite Río, 4 noches desde +5
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(21),
    checkin: d(5), checkout: d(9), estado: "reservada",
    total: total(h3.tarifaBase, d(5), d(9)) });

  // Cristian Navarro: Cabaña 2, 3 noches desde +4
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(23),
    checkin: d(4), checkout: d(7), estado: "reservada",
    total: total(h2.tarifaBase, d(4), d(7)) });

  // Agustina Molina: Hab.102, 3 noches desde +4
  if (h5) rows.push({ habitacionId: h5.id, huespedId: g(24),
    checkin: d(4), checkout: d(7), estado: "reservada",
    total: total(h5.tarifaBase, d(4), d(7)) });

  // Ezequiel Carrizo: Cabaña 1, 3 noches desde +10
  if (h1) rows.push({ habitacionId: h1.id, huespedId: g(25),
    checkin: d(10), checkout: d(13), estado: "reservada",
    total: total(h1.tarifaBase, d(10), d(13)) });

  // Daniela Paredes: Hab.101, 2 noches desde +10
  if (h4) rows.push({ habitacionId: h4.id, huespedId: g(22),
    checkin: d(10), checkout: d(12), estado: "reservada",
    total: total(h4.tarifaBase, d(10), d(12)) });

  // Bruno Quiroga: Cabaña 2, 4 noches desde +10
  if (h2) rows.push({ habitacionId: h2.id, huespedId: g(27),
    checkin: d(10), checkout: d(14), estado: "reservada",
    total: total(h2.tarifaBase, d(10), d(14)) });

  // Natalia Figueroa: Suite Río, 3 noches desde +12
  if (h3) rows.push({ habitacionId: h3.id, huespedId: g(28),
    checkin: d(12), checkout: d(15), estado: "reservada",
    total: total(h3.tarifaBase, d(12), d(15)) });

  // Carla Silva: Hab.102, 2 noches desde +10
  if (h5) rows.push({ habitacionId: h5.id, huespedId: g(30),
    checkin: d(10), checkout: d(12), estado: "reservada",
    total: total(h5.tarifaBase, d(10), d(12)) });

  console.log(`Insertando ${rows.length} reservas…`);
  for (const row of rows) {
    await db.insert(schema.reservas).values(row as any);
  }
  console.log(`  ✓ ${rows.length} reservas insertadas`);
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  await limpiar();
  await insertarHuespedes();

  const habs = await db
    .select({ id: schema.habitaciones.id, nombre: schema.habitaciones.nombre, tarifaBase: schema.habitaciones.tarifaBase })
    .from(schema.habitaciones)
    .orderBy(asc(schema.habitaciones.id));

  if (habs.length === 0) {
    console.error("No hay habitaciones en la DB. Corré db:seed primero.");
    process.exit(1);
  }

  const guests = await db
    .select({ id: schema.huespedes.id })
    .from(schema.huespedes)
    .orderBy(asc(schema.huespedes.id));

  await insertarReservas(habs, guests.map((g) => g.id));

  console.log("\n✅ Reseed completado.");
  console.log(`   Habitaciones disponibles: ${habs.map((h) => h.nombre).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
