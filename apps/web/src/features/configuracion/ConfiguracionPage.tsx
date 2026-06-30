import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import { HabitacionesAdmin } from "./HabitacionesAdmin.js";
import { AmenidadesAdmin } from "./AmenidadesAdmin.js";
import { UsuariosAdmin } from "./UsuariosAdmin.js";
import { FacturacionAdmin } from "./FacturacionAdmin.js";
import { LandingServiciosAdmin } from "./LandingServiciosAdmin.js";
import { LandingContactosAdmin } from "./LandingContactosAdmin.js";

type Tab = "datos" | "logo" | "alojamientos" | "caracteristicas" | "facturacion" | "usuarios" | "servicios-landing" | "contacto-landing";

const TABS: { id: Tab; label: string }[] = [
  { id: "datos", label: "Datos" },
  { id: "logo", label: "Logo" },
  { id: "alojamientos", label: "Alojamientos" },
  { id: "caracteristicas", label: "Características" },
  { id: "facturacion", label: "Facturación" },
  { id: "usuarios", label: "Usuarios" },
  { id: "servicios-landing", label: "Servicios (landing)" },
  { id: "contacto-landing", label: "Contacto (landing)" },
];

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
] as const;

type Campo = (typeof campos)[number][0];

export function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("datos");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-fit dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "datos" && <DatosTab />}
      {tab === "logo" && <LogoTab />}
      {tab === "alojamientos" && <HabitacionesAdmin />}
      {tab === "caracteristicas" && <AmenidadesAdmin />}
      {tab === "facturacion" && <FacturacionAdmin />}
      {tab === "usuarios" && <UsuariosAdmin />}
      {tab === "servicios-landing" && <LandingServiciosAdmin />}
      {tab === "contacto-landing" && <LandingContactosAdmin />}
    </div>
  );
}

// ── Datos del alojamiento ────────────────────────────────────────
function DatosTab() {
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
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-400">
        Se usan en los comprobantes y la facturación.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map(([k, label]) => (
          <label key={k} className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">{label}</span>
            <input
              value={form[k] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          disabled={guardar.isPending}
          onClick={() => guardar.mutate()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
        >
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </button>
        {guardado && <span className="text-sm text-emerald-600">✓ Guardado</span>}
        {guardar.isError && <span className="text-sm text-rose-600">No se pudo guardar.</span>}
      </div>
    </div>
  );
}

// ── Logo ─────────────────────────────────────────────────────────
function LogoTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["config"], queryFn: api.config.get });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setGuardado(false);
    setSubiendo(true);
    try {
      await api.config.uploadLogo(file);
      qc.invalidateQueries({ queryKey: ["config"] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch {
      setError("No se pudo subir el logo. Intentá de nuevo.");
    } finally {
      setSubiendo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const logoUrl = q.data?.logoUrl ?? null;

  return (
    <div className="max-w-lg space-y-5">
      <p className="text-sm text-slate-400">
        Se muestra en el panel y en los comprobantes. Se reemplaza al subir uno nuevo.
      </p>
      <div className="flex items-center gap-6">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo actual"
            className="h-20 w-auto rounded-xl border border-slate-200 object-contain bg-white p-2 dark:border-slate-700"
          />
        ) : (
          <div className="h-20 w-28 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs">
            Sin logo
          </div>
        )}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={subiendo}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {subiendo ? "Subiendo…" : logoUrl ? "Reemplazar logo" : "Subir logo"}
          </button>
          {guardado && <p className="text-sm text-emerald-600">✓ Logo actualizado</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <p className="text-xs text-slate-400">PNG, JPG o SVG. Recomendado: fondo transparente.</p>
        </div>
      </div>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogo}
      />
    </div>
  );
}
