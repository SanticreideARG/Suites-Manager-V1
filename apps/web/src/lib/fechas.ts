/** Utilidades de fecha para el planner (trabajan con strings YYYY-MM-DD). */

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, dias: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return toISO(d);
}

/** Días enteros entre dos fechas (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000,
  );
}

export function rangoDias(ancla: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => addDays(ancla, i));
}

export function esFinDeSemana(iso: string): boolean {
  const dia = new Date(iso).getUTCDay();
  return dia === 0 || dia === 6;
}

export function diaCorto(iso: string): { dow: string; num: string } {
  const d = new Date(iso);
  const dow = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"][d.getUTCDay()]!;
  return { dow, num: String(d.getUTCDate()) };
}
