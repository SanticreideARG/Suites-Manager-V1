/**
 * Lógica pura de tarifas dinámicas (sin dependencias de DB → testeable).
 * calcularTarifa.ts la usa pasándole las reglas activas traídas de la base.
 */

export interface ReglaTarifa {
  tipo: "rango" | "finde";
  desde: string | null;
  hasta: string | null;
  factor: string | number;
  prioridad: number;
}

function addDia(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Factor aplicable a una noche: la regla de mayor prioridad que aplica. */
export function factorNoche(fecha: string, reglas: ReglaTarifa[]): number {
  const dow = new Date(fecha + "T00:00:00Z").getUTCDay(); // 0 dom … 6 sáb
  const esFinde = dow === 0 || dow === 6;
  let mejor: ReglaTarifa | null = null;
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

/** Total de la estadía sumando, noche a noche, base × factor aplicable. */
export function totalDesdeReglas(
  tarifaBase: number,
  checkin: string,
  checkout: string,
  reglas: ReglaTarifa[],
): { total: number; noches: number } {
  let total = 0;
  let noches = 0;
  for (let d = checkin; d < checkout; d = addDia(d)) {
    total += tarifaBase * factorNoche(d, reglas);
    noches += 1;
  }
  return { total: Math.round(total * 100) / 100, noches };
}
