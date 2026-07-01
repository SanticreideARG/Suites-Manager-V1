import type { Context } from "hono";
import { createHash } from "node:crypto";
import { db, auditLog, desc } from "@suites/db";
import { auth } from "../auth.js";

/** Punto de partida de la cadena de hashes (no hay fila anterior). */
export const AUDIT_GENESIS_HASH = "GENESIS";

/** sha256(hashAnterior + datos de la fila) — cadena tamper-evident. */
export function computeAuditHash(
  hashAnterior: string,
  fila: {
    timestamp: string;
    userId: string;
    accion: string;
    entidad: string;
    entidadId: string | null;
    diff: string | null;
  },
): string {
  const base = [
    hashAnterior,
    fila.timestamp,
    fila.userId,
    fila.accion,
    fila.entidad,
    fila.entidadId ?? "",
    fila.diff ?? "",
  ].join("|");
  return createHash("sha256").update(base).digest("hex");
}

export type Accion = "crear" | "editar" | "eliminar";

export type Diff = Record<string, { antes: unknown; despues: unknown }>;

/** Calcula diff entre dos snapshots — solo campos que cambiaron. */
export function computeDiff<T extends Record<string, unknown>>(
  antes: T,
  despues: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    const a = String(antes[campo] ?? "");
    const b = String(despues[campo] ?? "");
    if (a !== b) {
      diff[String(campo)] = { antes: antes[campo] ?? null, despues: despues[campo] ?? null };
    }
  }
  return diff;
}

/** Diff para "crear": todos los campos tienen antes=null. */
export function diffCrear<T extends Record<string, unknown>>(
  despues: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    if (despues[campo] != null) {
      diff[String(campo)] = { antes: null, despues: despues[campo] };
    }
  }
  return diff;
}

/** Diff para "eliminar": todos los campos tienen despues=null. */
export function diffEliminar<T extends Record<string, unknown>>(
  antes: T,
  campos: (keyof T)[],
): Diff {
  const diff: Diff = {};
  for (const campo of campos) {
    if (antes[campo] != null) {
      diff[String(campo)] = { antes: antes[campo], despues: null };
    }
  }
  return diff;
}

interface LogParams {
  accion: Accion;
  entidad: string;
  entidadId?: string | number | null;
  entidadLabel?: string | null;
  diff?: Diff;
}

/**
 * Registra una entrada en audit_log, encadenada por hash a la anterior.
 * Extrae usuario e IP del contexto Hono. Fire-and-forget: los errores
 * se silencian para no interrumpir la respuesta principal.
 *
 * Nota: el driver HTTP de Neon no soporta transacciones interactivas, así que
 * leer el último hash e insertar son dos pasos separados — con escrituras
 * concurrentes hay una ventana de carrera teórica. Aceptable para un log de
 * auditoría de escritura poco frecuente (acciones de admin/gestor).
 */
export async function logAudit(c: Context, params: LogParams): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return;

    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      null;

    const [ultimo] = await db
      .select({ hash: auditLog.hash })
      .from(auditLog)
      .orderBy(desc(auditLog.id))
      .limit(1);
    const hashAnterior = ultimo?.hash ?? AUDIT_GENESIS_HASH;

    const timestamp = new Date();
    const entidadId = params.entidadId != null ? String(params.entidadId) : null;
    const diff = params.diff ? JSON.stringify(params.diff) : null;
    const hash = computeAuditHash(hashAnterior, {
      timestamp: timestamp.toISOString(),
      userId: session.user.id,
      accion: params.accion,
      entidad: params.entidad,
      entidadId,
      diff,
    });

    await db.insert(auditLog).values({
      timestamp,
      userId:       session.user.id,
      userName:     session.user.name,
      userEmail:    session.user.email,
      accion:       params.accion,
      entidad:      params.entidad,
      entidadId,
      entidadLabel: params.entidadLabel ?? null,
      diff,
      ip,
      hashAnterior,
      hash,
    } as any);
  } catch {
    // No interrumpir la respuesta por fallos de logging
  }
}
