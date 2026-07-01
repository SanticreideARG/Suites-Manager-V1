import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { Servicio, CategoriaCargo } from "../../lib/types.js";

const CATEGORIA_LABEL: Record<CategoriaCargo, string> = {
  servicios: "Servicios",
  consumos: "Consumos",
  cargos: "Cargos",
  bonificaciones: "Bonificaciones",
};

const CATEGORIA_BADGE: Record<CategoriaCargo, string> = {
  servicios: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  consumos: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  cargos: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  bonificaciones: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

/** Catálogo de cargos/servicios (Tarifas): las 4 categorías fijas acordadas
 *  el 2026-06-26 — Servicios/Consumos/Cargos suman al total de la reserva,
 *  Bonificaciones resta. */
export function CatalogoCargos() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["servicios"], queryFn: api.servicios.list });
  const [form, setForm] = useState<Partial<Servicio> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalida = () => qc.invalidateQueries({ queryKey: ["servicios"] });

  const guardar = useMutation({
    mutationFn: () => {
      if (!form) throw new Error();
      const payload = {
        nombre: form.nombre ?? "",
        descripcion: form.descripcion ?? null,
        precio: Number(form.precio ?? 0),
        unidad: form.unidad ?? "unidad",
        categoria: (form.categoria ?? "servicios") as CategoriaCargo,
        activo: form.activo ?? true,
      };
      return editId != null
        ? api.servicios.update(editId, payload)
        : api.servicios.create(payload);
    },
    onSuccess: () => { invalida(); cerrar(); },
    onError: () => setError("No se pudo guardar."),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => api.servicios.remove(id),
    onSuccess: invalida,
  });

  function abrir(s?: Servicio) {
    setError(null);
    setEditId(s?.id ?? null);
    setForm(
      s
        ? { ...s }
        : { nombre: "", descripcion: null, precio: "0", unidad: "unidad", categoria: "servicios", activo: true },
    );
  }

  function cerrar() { setForm(null); setEditId(null); setError(null); }

  const items = q.data ?? [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest">
            Catálogo de cargos y servicios
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-white/30">
            Servicios, Consumos y Cargos suman al total de la reserva; Bonificaciones resta.
          </p>
        </div>
        <button
          onClick={() => abrir()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-[#0058be] dark:hover:bg-[#2170e4]"
        >
          + Cargo
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#1a2b42]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.04] dark:text-white/40">
              <tr>
                <th className="px-4 py-2 font-semibold">Nombre</th>
                <th className="px-4 py-2 font-semibold">Categoría</th>
                <th className="px-4 py-2 text-right font-semibold">Precio</th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {items.map((s) => (
                <tr key={s.id}>
                  <td
                    className="cursor-pointer px-4 py-2 font-medium text-slate-800 dark:text-white hover:underline"
                    onClick={() => abrir(s)}
                  >
                    {s.nombre}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIA_BADGE[s.categoria]}`}>
                      {CATEGORIA_LABEL[s.categoria]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-white/80">
                    ${Number(s.precio).toLocaleString("es-AR")}/{s.unidad}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-white/30"}`}>
                      {s.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${s.nombre}"?`)) eliminar.mutate(s.id); }}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !q.isLoading && (
        <p className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] py-8 text-center text-sm text-slate-400">
          Sin cargos en el catálogo.
        </p>
      )}

      {form && (
        <CargoModal
          form={form}
          editId={editId}
          error={error}
          pending={guardar.isPending}
          onChange={setForm}
          onGuardar={() => { setError(null); guardar.mutate(); }}
          onCerrar={cerrar}
        />
      )}
    </section>
  );
}

function CargoModal({
  form, editId, error, pending, onChange, onGuardar, onCerrar,
}: {
  form: Partial<Servicio>;
  editId: number | null;
  error: string | null;
  pending: boolean;
  onChange: (f: Partial<Servicio>) => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  const set = (k: keyof Servicio, v: unknown) => onChange({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 space-y-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          {editId != null ? "Editar cargo" : "Nuevo cargo"}
        </h3>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Nombre</span>
            <input
              value={form.nombre ?? ""}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Desayuno, Late check-out, Descuento fidelidad…"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Categoría</span>
            <select
              value={form.categoria ?? "servicios"}
              onChange={(e) => set("categoria", e.target.value as CategoriaCargo)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {form.categoria === "bonificaciones" && (
              <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">
                Esta categoría resta del total cuando se aplica a una reserva.
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Precio unitario ($)</span>
              <input
                type="number" min={0} step={0.01}
                value={form.precio ?? "0"}
                onChange={(e) => set("precio", e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Unidad</span>
              <input
                value={form.unidad ?? "unidad"}
                onChange={(e) => set("unidad", e.target.value)}
                placeholder="unidad, persona, kg, hora…"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Descripción (opcional)</span>
            <input
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value || null)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => set("activo", e.target.checked)}
              className="rounded"
            />
            <span className="text-slate-600 dark:text-slate-300">Activo (disponible al cargar extras)</span>
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
