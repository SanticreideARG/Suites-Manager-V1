import { db, politicasCancelacion, eq } from "@suites/db";
import { cargoCancelacion } from "./cancelacionCalc.js";

/**
 * Cargo por cancelación de una reserva, según las políticas activas y los
 * días de anticipación al checkin. La lógica pura vive en cancelacionCalc.ts
 * (testeable sin DB).
 */
export async function calcularCargoCancelacion(
  total: number,
  checkin: string,
): Promise<{ diasRestantes: number; porcentaje: number; monto: number }> {
  const hoy = new Date().toISOString().slice(0, 10);
  const diasRestantes = Math.round(
    (new Date(checkin).getTime() - new Date(hoy).getTime()) / 86_400_000,
  );
  const politicas = await db
    .select()
    .from(politicasCancelacion)
    .where(eq(politicasCancelacion.activa, true));
  const { porcentaje, monto } = cargoCancelacion(total, diasRestantes, politicas);
  return { diasRestantes, porcentaje, monto };
}
