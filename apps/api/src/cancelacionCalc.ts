/**
 * Lógica pura de cargos por cancelación (sin dependencias de DB → testeable).
 * calcularCancelacion.ts la usa pasándole las políticas activas de la base.
 */

export interface PoliticaCancelacion {
  diasMinimos: number;
  porcentaje: string | number;
  activa: boolean;
}

/**
 * Política activa con mayor diasMinimos que no supere los días restantes.
 * Si ninguna califica (diasRestantes por debajo de todos los umbrales, ej.
 * checkin ya pasado), se usa la de menor diasMinimos como piso: sigue siendo
 * la cancelación más tardía posible, no corresponde dejarla sin cargo.
 */
export function politicaAplicable(
  diasRestantes: number,
  politicas: PoliticaCancelacion[],
): PoliticaCancelacion | null {
  const activas = politicas.filter((p) => p.activa);
  if (activas.length === 0) return null;

  let mejor: PoliticaCancelacion | null = null;
  for (const p of activas) {
    if (p.diasMinimos > diasRestantes) continue;
    if (!mejor || p.diasMinimos > mejor.diasMinimos) mejor = p;
  }
  if (mejor) return mejor;

  return activas.reduce((min, p) => (p.diasMinimos < min.diasMinimos ? p : min));
}

/** Cargo por cancelación: porcentaje de la política aplicable × total. */
export function cargoCancelacion(
  total: number,
  diasRestantes: number,
  politicas: PoliticaCancelacion[],
): { porcentaje: number; monto: number } {
  const politica = politicaAplicable(diasRestantes, politicas);
  const porcentaje = politica ? Number(politica.porcentaje) : 0;
  const monto = Math.round(total * (porcentaje / 100) * 100) / 100;
  return { porcentaje, monto };
}
