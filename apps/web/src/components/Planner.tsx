import { useMemo } from "react";
import type { Habitacion, ReservaListItem } from "../lib/api.js";
import type { EstadoReserva } from "@suites/shared";
import {
  diaCorto,
  diffDays,
  esFinDeSemana,
  rangoDias,
} from "../lib/fechas.js";

const COL_LABEL = "180px";

const colorReserva: Record<EstadoReserva, string> = {
  reservada: "bg-amber-400 text-amber-950",
  ocupada: "bg-emerald-500 text-white",
  checkout: "bg-slate-300 text-slate-700",
  cancelada: "hidden",
  mantenimiento: "bg-rose-500 text-white",
};

/** Texto de la barra: nombre del huésped o "Mantenimiento" para bloqueos. */
function etiqueta(r: ReservaListItem): string {
  return r.estado === "mantenimiento" ? "🔧 Mantenimiento" : (r.huesped ?? "—");
}

interface Props {
  habitaciones: Habitacion[];
  reservas: ReservaListItem[];
  ancla: string;
  dias: number;
  onClickReserva?: (r: ReservaListItem) => void;
  onClickCelda?: (habitacionId: number, fecha: string) => void;
  onClickHabitacion?: (h: Habitacion) => void;
}

export function Planner({
  habitaciones,
  reservas,
  ancla,
  dias,
  onClickReserva,
  onClickCelda,
  onClickHabitacion,
}: Props) {
  const fechas = useMemo(() => rangoDias(ancla, dias), [ancla, dias]);
  const gridCols = `${COL_LABEL} repeat(${dias}, minmax(44px, 1fr))`;

  const reservasPorHab = useMemo(() => {
    const map = new Map<number, ReservaListItem[]>();
    for (const r of reservas) {
      if (r.estado === "cancelada") continue;
      const lista = map.get(r.habitacionId);
      if (lista) lista.push(r);
      else map.set(r.habitacionId, [r]);
    }
    return map;
  }, [reservas]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="min-w-max">
        {/* Cabecera de días */}
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            Habitación
          </div>
          {fechas.map((f) => {
            const { dow, num } = diaCorto(f);
            return (
              <div
                key={f}
                className={`border-b border-r border-slate-200 py-2 text-center text-xs ${
                  esFinDeSemana(f) ? "bg-slate-100" : "bg-slate-50"
                }`}
              >
                <div className="text-slate-400">{dow}</div>
                <div className="font-semibold text-slate-700">{num}</div>
              </div>
            );
          })}
        </div>

        {/* Filas por habitación */}
        {habitaciones.map((hab) => (
          <div
            key={hab.id}
            className="grid"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Etiqueta (click para editar) */}
            <button
              onClick={() => onClickHabitacion?.(hab)}
              className="sticky left-0 z-10 flex items-center justify-between border-b border-r border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50"
              style={{ gridColumn: 1, gridRow: 1 }}
            >
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {hab.nombre}
                </div>
                <div className="text-xs text-slate-400">
                  {hab.tipo} · {hab.capacidad}p
                </div>
              </div>
              {hab.estado === "mantenimiento" && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                  mant.
                </span>
              )}
            </button>

            {/* Celdas de fondo (clickeables para crear reserva) */}
            {fechas.map((f, i) => (
              <button
                key={f}
                onClick={() => onClickCelda?.(hab.id, f)}
                className={`h-14 border-b border-r border-slate-100 transition-colors hover:bg-sky-50 ${
                  esFinDeSemana(f) ? "bg-slate-50/60" : ""
                } ${hab.estado === "mantenimiento" ? "bg-rose-50/50" : ""}`}
                style={{ gridRow: 1, gridColumn: i + 2 }}
              />
            ))}

            {/* Barras de reservas superpuestas */}
            {(reservasPorHab.get(hab.id) ?? []).map((r) => {
              const start = Math.max(0, diffDays(ancla, r.checkin));
              const end = Math.min(dias, diffDays(ancla, r.checkout));
              if (end <= 0 || start >= dias) return null;
              return (
                <button
                  key={r.id}
                  onClick={() => onClickReserva?.(r)}
                  title={`${etiqueta(r)} · ${r.checkin} → ${r.checkout}`}
                  className={`z-10 m-1 flex items-center truncate rounded px-2 text-xs font-medium shadow-sm ${colorReserva[r.estado]}`}
                  style={{
                    gridRow: 1,
                    gridColumnStart: 2 + start,
                    gridColumnEnd: 2 + end,
                  }}
                >
                  <span className="truncate">{etiqueta(r)}</span>
                </button>
              );
            })}
          </div>
        ))}

        {habitaciones.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
            No hay habitaciones todavía. Creá una para empezar.
          </div>
        )}
      </div>
    </div>
  );
}
