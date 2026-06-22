import { db, habitaciones } from "./index.js";

/** Carga unas habitaciones de ejemplo para probar el planner. */
async function main() {
  const existentes = await db.select().from(habitaciones);
  if (existentes.length > 0) {
    console.log(`Ya hay ${existentes.length} habitaciones, no hago seed.`);
    process.exit(0);
  }

  await db.insert(habitaciones).values([
    { nombre: "Cabaña 1", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000" },
    { nombre: "Cabaña 2", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000" },
    { nombre: "Suite Río", tipo: "Suite", capacidad: 2, tarifaBase: "60000" },
    { nombre: "Hab. 101", tipo: "Standard", capacidad: 2, tarifaBase: "30000" },
    { nombre: "Hab. 102", tipo: "Standard", capacidad: 3, tarifaBase: "35000" },
  ]);

  console.log("Seed listo: 5 habitaciones creadas.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
