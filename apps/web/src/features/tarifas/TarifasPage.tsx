import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { TarifaRegla } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

const pct = (factor: string) => {
  const f = Number(factor);
  const d = Math.round((f - 1) * 100);
  return d === 0 ? "sin cambio" : d > 0 ? `+${d}%` : `${d}%`;
};

export function TarifasPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tarifas"], queryFn: api.tarifas.list });
  const [editar, setEditar] = useState<TarifaRegla | null>(null);
  const [creando, setCreando] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => api.tarifas.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });
  const toggle = useMutation({
    mutationFn: (r: TarifaRegla) =>
      api.tarifas.update(r.id, { activa: !r.activa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Reglas que ajustan la tarifa base por noche (gana la de mayor prioridad).
        </p>
        <button
          onClick={() => setCreando(true)}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Regla
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {q.isError && (
        <p className="text-sm text-rose-600">No se pudo cargar.</p>
      )}

      {q.data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Aplica</th>
                <th className="px-4 py-2 text-right font-semibold">Ajuste</th>
                <th className="px-4 py-2 text-right font-semibold">Prioridad</th>
                <th className="px-4 py-2 text-center font-semibold">Activa</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {q.data.map((r) => (
                <tr key={r.id}>
                  <td
                    className="cursor-pointer px-4 py-2 font-medium text-slate-800 hover:underline"
                    onClick={() => setEditar(r)}
                  >
                    {r.nombre}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {r.tipo === "finde"
                      ? "Sáb y Dom"
                      : `${r.desde} → ${r.hasta}`}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">
                    ×{Number(r.factor).toFixed(2)}{" "}
                    <span className="text-xs text-slate-400">({pct(r.factor)})</span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    {r.prioridad}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggle.mutate(r)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.activa
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {r.activa ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${r.nombre}"?`)) remove.mutate(r.id);
                      }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {q.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Sin reglas. La tarifa base se aplica tal cual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {creando && <ReglaForm onClose={() => setCreando(false)} />}
      {editar && (
        <ReglaForm regla={editar} onClose={() => setEditar(null)} />
      )}
    </div>
  );
}

function ReglaForm({
  regla,
  onClose,
}: {
  regla?: TarifaRegla;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(regla?.nombre ?? "");
  const [tipo, setTipo] = useState<"rango" | "finde">(regla?.tipo ?? "finde");
  const [desde, setDesde] = useState(regla?.desde ?? "");
  const [hasta, setHasta] = useState(regla?.hasta ?? "");
  const [factor, setFactor] = useState(Number(regla?.factor ?? 1.5));
  const [prioridad, setPrioridad] = useState(regla?.prioridad ?? 0);
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre,
        tipo,
        desde: tipo === "rango" ? desde : undefined,
        hasta: tipo === "rango" ? hasta : undefined,
        factor,
        prioridad,
      };
      return regla
        ? api.tarifas.update(regla.id, payload)
        : api.tarifas.create({ ...payload, activa: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarifas"] });
      onClose();
    },
    onError: () => setError("Revisá los datos (para 'rango' van desde y hasta)."),
  });

  const input = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm";
  const invalido = !nombre || (tipo === "rango" && (!desde || hasta <= desde));

  return (
    <Modal titulo={regla ? "Editar regla" : "Nueva regla de tarifa"} onClose={onClose}>
      <label className="block text-sm">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={input}
          placeholder="Ej. Temporada alta, Fin de semana…"
        />
      </label>
      <label className="block text-sm">
        Aplica a
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "rango" | "finde")}
          className={input}
        >
          <option value="finde">Fines de semana (sáb/dom)</option>
          <option value="rango">Rango de fechas (temporada/feriado)</option>
        </select>
      </label>
      {tipo === "rango" && (
        <div className="flex gap-3">
          <label className="block flex-1 text-sm">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className={input}
            />
          </label>
          <label className="block flex-1 text-sm">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className={input}
            />
          </label>
        </div>
      )}
      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          Factor ({pct(String(factor))})
          <input
            type="number"
            step={0.05}
            min={0.1}
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            className={input}
          />
        </label>
        <label className="block flex-1 text-sm">
          Prioridad
          <input
            type="number"
            min={0}
            value={prioridad}
            onChange={(e) => setPrioridad(Number(e.target.value))}
            className={input}
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={invalido || guardar.isPending}
        onClick={() => {
          setError(null);
          guardar.mutate();
        }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {guardar.isPending ? "Guardando…" : "Guardar"}
      </button>
    </Modal>
  );
}
