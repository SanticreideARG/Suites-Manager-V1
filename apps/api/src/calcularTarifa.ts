import { db, tarifaReglas, eq } from "@suites/db";
import { totalDesdeReglas } from "./tarifaCalc.js";

/**
 * Total de una estadía aplicando las reglas de tarifa dinámica activas.
 * La lógica pura vive en tarifaCalc.ts (testeable sin DB).
 */
export async function calcularTotal(
  tarifaBase: number,
  checkin: string,
  checkout: string,
): Promise<{ total: number; noches: number }> {
  const reglas = await db
    .select()
    .from(tarifaReglas)
    .where(eq(tarifaReglas.activa, true));
  return totalDesdeReglas(tarifaBase, checkin, checkout, reglas);
}
