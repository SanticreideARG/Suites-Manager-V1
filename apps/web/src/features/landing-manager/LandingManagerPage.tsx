import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { LandingFoto, LandingLink } from "../../lib/api.js";

type Tab = "textos" | "fotos" | "footer";

const TABS: { id: Tab; label: string }[] = [
  { id: "textos", label: "Textos del hero" },
  { id: "fotos", label: "Fotos" },
  { id: "footer", label: "Footer" },
];

export function LandingManagerPage() {
  const [tab, setTab] = useState<Tab>("textos");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit dark:bg-slate-800">
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

      {tab === "textos" && <TextosTab />}
      {tab === "fotos" && <FotosTab />}
      {tab === "footer" && <FooterTab />}
    </div>
  );
}

// ── Textos del hero ──────────────────────────────────────────────
function TextosTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["landing.config"],
    queryFn: api.landingManager.getConfig,
  });

  const [tagline, setTagline] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [ctaTexto, setCtaTexto] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [inicializado, setInicializado] = useState(false);
  const [guardado, setGuardado] = useState(false);

  if (data && !inicializado) {
    setTagline(data.landingTagline ?? "");
    setSubtitulo(data.landingSubtitulo ?? "");
    setCtaTexto(data.landingCtaTexto ?? "");
    setCtaUrl(data.landingCtaUrl ?? "");
    setInicializado(true);
  }

  const guardar = useMutation({
    mutationFn: () =>
      api.landingManager.updateConfig({
        landingTagline: tagline.trim() || null,
        landingSubtitulo: subtitulo.trim() || null,
        landingCtaTexto: ctaTexto.trim() || null,
        landingCtaUrl: ctaUrl.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing.config"] });
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    },
  });

  if (isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-slate-400">
        Estos textos se muestran en el banner principal de la landing page.
      </p>

      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Tagline (título principal)</span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Tu descanso, nuestra prioridad"
          maxLength={200}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Subtítulo</span>
        <textarea
          value={subtitulo}
          onChange={(e) => setSubtitulo(e.target.value)}
          placeholder="Alojamientos únicos para experiencias únicas."
          maxLength={400}
          rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Texto del botón CTA</span>
          <input
            value={ctaTexto}
            onChange={(e) => setCtaTexto(e.target.value)}
            placeholder="Ver disponibilidad"
            maxLength={80}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">URL del CTA</span>
          <input
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="#disponibilidad"
            maxLength={200}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
        >
          {guardar.isPending ? "Guardando…" : "Guardar textos"}
        </button>
        {guardado && <span className="text-sm text-emerald-600">✓ Guardado</span>}
        {guardar.isError && <span className="text-sm text-rose-500">No se pudo guardar.</span>}
      </div>
    </div>
  );
}

// ── Fotos del slider ─────────────────────────────────────────────
const MAX_FOTOS = 8;

function FotosTab() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ["landing.fotos"],
    queryFn: api.landingManager.listFotos,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["landing.fotos"] });

  const eliminarMut = useMutation({
    mutationFn: (id: number) => api.landingManager.removeFoto(id),
    onSuccess: invalidar,
  });

  const reorderMut = useMutation({
    mutationFn: (ids: number[]) => api.landingManager.reorderFotos(ids),
    onSuccess: invalidar,
  });

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fotos.length >= MAX_FOTOS) { setError(`Máximo ${MAX_FOTOS} fotos.`); return; }
    setError(null);
    setSubiendo(true);
    try {
      await api.landingManager.uploadFoto(file);
      invalidar();
    } catch {
      setError("No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function mover(foto: LandingFoto, dir: -1 | 1) {
    const sorted = [...fotos].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((f) => f.id === foto.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const tmp = sorted[idx]; const nxt = sorted[newIdx];
    if (!tmp || !nxt) return;
    sorted[idx] = nxt; sorted[newIdx] = tmp;
    reorderMut.mutate(sorted.map((f) => f.id));
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;

  const sorted = [...fotos].sort((a, b) => a.orden - b.orden);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Imágenes del slider/banner del hero. La primera es la imagen principal. Máx. {MAX_FOTOS}.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{fotos.length}/{MAX_FOTOS} fotos</span>
        {fotos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {subiendo ? "Subiendo…" : "+ Agregar foto"}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleArchivo} />
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {sorted.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 dark:border-slate-700">
          <p className="text-sm">Sin fotos aún. Subí la primera imagen del hero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((foto, idx) => (
            <div key={foto.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video bg-slate-100 dark:bg-slate-800">
              <img src={foto.url} alt={foto.altTexto ?? `Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => mover(foto, -1)} disabled={idx === 0 || reorderMut.isPending} className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-40">←</button>
                  <button type="button" onClick={() => mover(foto, 1)} disabled={idx === sorted.length - 1 || reorderMut.isPending} className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs disabled:opacity-40">→</button>
                </div>
                <button type="button" onClick={() => eliminarMut.mutate(foto.id)} disabled={eliminarMut.isPending} className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs">Eliminar</button>
              </div>
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-sky-700 text-white text-xs px-1.5 py-0.5 rounded">Principal</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Links del footer ─────────────────────────────────────────────
function FooterTab() {
  const qc = useQueryClient();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["landing.links"],
    queryFn: api.landingManager.listLinks,
  });

  const [nuevaLabel, setNuevaLabel] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const invalidar = () => qc.invalidateQueries({ queryKey: ["landing.links"] });

  const crearMut = useMutation({
    mutationFn: () => api.landingManager.createLink({ label: nuevaLabel.trim(), url: nuevaUrl.trim() }),
    onSuccess: () => { invalidar(); setNuevaLabel(""); setNuevaUrl(""); },
  });

  const actualizarMut = useMutation({
    mutationFn: () => api.landingManager.updateLink(editandoId!, { label: editLabel.trim(), url: editUrl.trim() }),
    onSuccess: () => { invalidar(); setEditandoId(null); },
  });

  const eliminarMut = useMutation({
    mutationFn: (id: number) => api.landingManager.removeLink(id),
    onSuccess: invalidar,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
      api.landingManager.updateLink(id, { activa }),
    onSuccess: invalidar,
  });

  const reorderMut = useMutation({
    mutationFn: (ids: number[]) => api.landingManager.reorderLinks(ids),
    onSuccess: invalidar,
  });

  function mover(link: LandingLink, dir: -1 | 1) {
    const sorted = [...links].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((l) => l.id === link.id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const tmp = sorted[idx]; const nxt = sorted[newIdx];
    if (!tmp || !nxt) return;
    sorted[idx] = nxt; sorted[newIdx] = tmp;
    reorderMut.mutate(sorted.map((l) => l.id));
  }

  function iniciarEdicion(link: LandingLink) {
    setEditandoId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando…</p>;

  const sorted = [...links].sort((a, b) => a.orden - b.orden);

  return (
    <div className="max-w-xl space-y-5">
      <p className="text-sm text-slate-400">
        Links que aparecen en el footer de la landing. Podés reordenarlos y activar/desactivar cada uno.
      </p>

      {/* Lista */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Sin links aún.</p>
        )}
        {sorted.map((link, idx) => (
          <div key={link.id} className={`flex items-center gap-3 px-4 py-3 ${!link.activa ? "opacity-50" : ""} bg-white dark:bg-slate-900`}>
            {/* Reorder */}
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => mover(link, -1)} disabled={idx === 0} className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30">▲</button>
              <button type="button" onClick={() => mover(link, 1)} disabled={idx === sorted.length - 1} className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30">▼</button>
            </div>

            {editandoId === link.id ? (
              /* Inline edit */
              <div className="flex flex-1 gap-2">
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="Label" />
                <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" placeholder="URL" />
                <button type="button" onClick={() => actualizarMut.mutate()} disabled={actualizarMut.isPending} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-500">✓</button>
                <button type="button" onClick={() => setEditandoId(null)} className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">✕</button>
              </div>
            ) : (
              /* Display */
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="font-medium text-sm text-slate-800 dark:text-slate-100 shrink-0">{link.label}</span>
                <span className="text-xs text-slate-400 truncate">{link.url}</span>
              </div>
            )}

            {editandoId !== link.id && (
              <div className="flex items-center gap-1 shrink-0">
                {/* Toggle activa */}
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ id: link.id, activa: !link.activa })}
                  title={link.activa ? "Desactivar" : "Activar"}
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${link.activa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}
                >
                  {link.activa ? "Activo" : "Inactivo"}
                </button>
                <button type="button" onClick={() => iniciarEdicion(link)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">✏️</button>
                <button type="button" onClick={() => eliminarMut.mutate(link.id)} disabled={eliminarMut.isPending} className="rounded p-1 text-slate-400 hover:text-rose-500">🗑️</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agregar nuevo */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Agregar link</p>
        <div className="flex gap-2">
          <input
            value={nuevaLabel}
            onChange={(e) => setNuevaLabel(e.target.value)}
            placeholder="Label (ej. Contacto)"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={nuevaUrl}
            onChange={(e) => setNuevaUrl(e.target.value)}
            placeholder="URL (ej. #contacto)"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => crearMut.mutate()}
            disabled={!nuevaLabel.trim() || !nuevaUrl.trim() || crearMut.isPending}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {crearMut.isPending ? "…" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
