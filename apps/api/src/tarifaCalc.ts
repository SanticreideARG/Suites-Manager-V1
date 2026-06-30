/**
 * Lógica pura de tarifas dinámicas (sin dependencias de DB → testeable).
 * calcularTarifa.ts la usa pasándole las reglas activas traídas de la base.
 */

export interface ReglaTarifa {
  tipo: "rango" | "finde";
  desde: string | null;
  hasta: string | null;
  factor: string | number;
  monto: string | number | null;
  prioridad: number;
}

function addDia(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Regla de mayor prioridad que aplica a la noche dada. */
function mejorRegla(fecha: string, reglas: ReglaTarifa[]): ReglaTarifa | null {
  const dow = new Date(fecha + "T00:00:00Z").getUTCDay();
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
  return mejor;
}

/** Factor aplicable a una noche (mantiene compatibilidad). */
export function factorNoche(fecha: string, reglas: ReglaTarifa[]): number {
  const r = mejorRegla(fecha, reglas);
  return r ? Number(r.factor) : 1;
}

/** Precio de una noche: base × factor + monto (monto puede ser negativo = descuento). */
function precioNoche(tarifaBase: number, fecha: string, reglas: ReglaTarifa[]): number {
  const r = mejorRegla(fecha, reglas);
  if (!r) return tarifaBase;
  return tarifaBase * Number(r.factor) + Number(r.monto ?? 0);
}

/** Total de la estadía sumando, noche a noche, base × factor + monto. */
export function totalDesdeReglas(
  tarifaBase: number,
  checkin: string,
  checkout: string,
  reglas: ReglaTarifa[],
): { total: number; noches: number } {
  let total = 0;
  let noches = 0;
  for (let d = checkin; d < checkout; d = addDia(d)) {
    total += precioNoche(tarifaBase, d, reglas);
    noches += 1;
  }
  return { total: Math.round(total * 100) / 100, noches };
}
