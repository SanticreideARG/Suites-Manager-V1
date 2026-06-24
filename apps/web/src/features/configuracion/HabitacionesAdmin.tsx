import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Habitacion } from "../../lib/api.js";
import { NuevaHabitacion } from "../habitaciones/NuevaHabitacion.js";
import { EditarHabitacion } from "../habitaciones/EditarHabitacion.js";

export function HabitacionesAdmin() {
  const q = useQuery({
    queryKey: ["habitaciones"],
    queryFn: api.habitaciones.list,
  });
  const [sel, setSel] = useState<Habitacion | null>(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Habitaciones</h2>
          <p className="text-sm text-slate-400">
            Alta, edición y baja. El calendario es solo lectura.
          </p>
        </div>
        <NuevaHabitacion />
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {q.data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Tipo</th>
                <th className="px-4 py-2 text-right font-semibold">Capacidad</th>
                <th className="px-4 py-2 text-right font-semibold">Tarifa base</th>
                <th className="px-4 py-2 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => setSel(h)}
                  className="cursor-pointer hover:bg-sky-50"
                >
                  <td className="px-4 py-2 font-medium text-slate-800">
                    {h.nombre}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{h.tipo}</td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    {h.capacidad}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    ${Number(h.tarifaBase).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {h.estado === "mantenimiento" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-600">
                        mantenimiento
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        libre
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {q.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Sin habitaciones. Creá la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {sel && (
        <EditarHabitacion habitacion={sel} onClose={() => setSel(null)} />
      )}
    </div>
  );
}
