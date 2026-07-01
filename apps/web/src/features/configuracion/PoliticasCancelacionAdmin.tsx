import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { PoliticaCancelacion } from "../../lib/api.js";

export function PoliticasCancelacionAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["politicas-cancelacion"], queryFn: api.politicasCancelacion.list });
  const [form, setForm] = useState<Partial<PoliticaCancelacion> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalida = () => qc.invalidateQueries({ queryKey: ["politicas-cancelacion"] });

  const guardar = useMutation({
    mutationFn: () => {
      if (!form) throw new Error();
      const payload = {
        nombre: form.nombre ?? "",
        diasMinimos: Number(form.diasMinimos ?? 0),
        porcentaje: Number(form.porcentaje ?? 0),
        activa: form.activa ?? true,
      };
      return editId != null
        ? api.politicasCancelacion.update(editId, payload)
        : api.politicasCancelacion.create(payload);
    },
    onSuccess: () => { invalida(); cerrar(); },
    onError: () => setError("No se pudo guardar."),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.politicasCancelacion.remove(id),
    onSuccess: invalida,
  });

  function abrir(p?: PoliticaCancelacion) {
    setError(null);
    setEditId(p?.id ?? null);
    setForm(p ? { ...p } : { nombre: "", diasMinimos: 0, porcentaje: "0", activa: true });
  }

  function cerrar() { setForm(null); setEditId(null); setError(null); }

  const politicas = q.data ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-800 dark:text-slate-100">Políticas de cancelación</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cargo (% del total) según la anticipación con la que se cancela. Se aplica la
            política activa con más días mínimos que no supere los días restantes hasta el
            check-in.
          </p>
        </div>
        <button
          onClick={() => abrir()}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
        >
          + Agregar
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {politicas.length > 0 && (
        <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5 text-right">Días mínimos de anticipación</th>
                <th className="px-4 py-2.5 text-right">Cargo</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {politicas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => abrir(p)} className="font-medium text-slate-800 hover:underline dark:text-slate-100">
                      {p.nombre}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                    {p.diasMinimos} {p.diasMinimos === 1 ? "día" : "días"} o más
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700 dark:text-slate-200">
                    {Number(p.porcentaje).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${p.activa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                      {p.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => abrir(p)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Editar</button>
                      <button
                        onClick={() => eliminar.mutate(p.id)}
                        disabled={eliminar.isPending}
                        className="text-xs text-rose-400 hover:text-rose-600 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {politicas.length === 0 && !q.isLoading && (
        <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-8 text-center text-sm text-slate-400">
          Sin políticas configuradas. Sin políticas activas, cancelar no genera ningún cargo.
        </p>
      )}

      {form && (
        <PoliticaModal
          form={form}
          editId={editId}
          error={error}
          pending={guardar.isPending}
          onChange={setForm}
          onGuardar={() => { setError(null); guardar.mutate(); }}
          onCerrar={cerrar}
        />
      )}
    </div>
  );
}

function PoliticaModal({
  form, editId, error, pending, onChange, onGuardar, onCerrar,
}: {
  form: Partial<PoliticaCancelacion>;
  editId: number | null;
  error: string | null;
  pending: boolean;
  onChange: (f: Partial<PoliticaCancelacion>) => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  const set = (k: keyof PoliticaCancelacion, v: unknown) => onChange({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {editId != null ? "Editar política" : "Nueva política de cancelación"}
        </h3>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Nombre</span>
            <input
              value={form.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="ej: Cancelación de último momento"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Días mínimos</span>
              <input
                type="number" min={0} step={1}
                value={form.diasMinimos ?? 0}
                onChange={(e) => set("diasMinimos", Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Cargo (%)</span>
              <input
                type="number" min={0} max={100} step={1}
                value={form.porcentaje ?? "0"}
                onChange={(e) => set("porcentaje", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Se aplica cuando quedan {form.diasMinimos ?? 0} días o más hasta el check-in.
          </p>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activa ?? true}
              onChange={(e) => set("activa", e.target.checked)}
              className="rounded"
            />
            <span className="text-slate-600 dark:text-slate-300">Activa</span>
          </label>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={pending || !form.nombre?.trim()}
            onClick={onGuardar}
            className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onCerrar}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
