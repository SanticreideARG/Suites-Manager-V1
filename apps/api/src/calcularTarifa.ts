import { db, tarifaReglas, eq } from "@suites/db";
import type { TarifaRegla } from "@suites/db";

function addDia(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Factor aplicable a una noche: la regla activa de mayor prioridad. */
function factorNoche(fecha: string, reglas: TarifaRegla[]): number {
  const dow = new Date(fecha + "T00:00:00Z").getUTCDay(); // 0 dom … 6 sáb
  const esFinde = dow === 0 || dow === 6;
  let mejor: TarifaRegla | null = null;
  for (const r of reglas) {
    const aplica =
      (r.tipo === "finde" && esFinde) ||
      (r.tipo === "rango" &&
        r.desde != null &&
        r.hasta != null &&
        fecha >= r.desde &&
        fecha < r.hasta);
    if (!aplica) continue;
    if (
      !mejor ||
      r.prioridad > mejor.prioridad ||
      (r.prioridad === mejor.prioridad && Number(r.factor) > Number(mejor.factor))
    ) {
      mejor = r;
    }
  }
  return mejor ? Number(mejor.factor) : 1;
}

/**
 * Total de una estadía aplicando las reglas de tarifa dinámica.
 * Suma, noche por noche, tarifaBase × factor de la regla aplicable.
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

  let total = 0;
  let noches = 0;
  for (let d = checkin; d < checkout; d = addDia(d)) {
    total += tarifaBase * factorNoche(d, reglas);
    noches += 1;
  }
  return { total: Math.round(total * 100) / 100, noches };
}
