import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { HabitacionesAdmin } from "./HabitacionesAdmin.js";

const campos = [
  ["nombre", "Nombre"],
  ["razonSocial", "Razón social"],
  ["cuit", "CUIT"],
  ["direccion", "Dirección"],
  ["cp", "Código postal"],
  ["ciudad", "Ciudad"],
  ["provincia", "Provincia"],
  ["pais", "País"],
  ["telefono", "Teléfono"],
  ["email", "Email"],
  ["logoUrl", "Logo (URL)"],
] as const;

type Campo = (typeof campos)[number][0];

export function ConfiguracionPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["config"], queryFn: api.config.get });
  const [form, setForm] = useState<Record<Campo, string>>({} as Record<Campo, string>);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    const f = {} as Record<Campo, string>;
    for (const [k] of campos) f[k] = (q.data[k] as string | null) ?? "";
    setForm(f);
  }, [q.data]);

  const guardar = useMutation({
    mutationFn: () => {
      const payload: Record<string, string | null> = {};
      for (const [k] of campos) {
        const v = (form[k] ?? "").trim();
        payload[k] = v === "" ? (k === "nombre" ? "Mi Alojamiento" : null) : v;
      }
      return api.config.update(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["config"] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    },
  });

  if (q.isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;

  return (
    <div className="space-y-10">
      <section className="max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold text-slate-800">
        Datos del alojamiento
      </h2>
      <p className="mb-4 text-sm text-slate-400">
        Se usan en los comprobantes y la facturación.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="text-slate-600">{label}</span>
            <input
              value={form[k] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          disabled={guardar.isPending}
          onClick={() => guardar.mutate()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </button>
        {guardado && (
          <span className="text-sm text-emerald-600">✓ Guardado</span>
        )}
        {guardar.isError && (
          <span className="text-sm text-rose-600">No se pudo guardar.</span>
        )}
      </div>
      </section>

      <HabitacionesAdmin />
    </div>
  );
}
