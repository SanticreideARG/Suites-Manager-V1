import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { LandingContacto } from "../../lib/types.js";

const QK = ["landing-contactos"];

interface FormState {
  label: string;
  url: string;
  iconoUrl: string;
  orden: number;
  activo: boolean;
}

const empty = (): FormState => ({ label: "", url: "", iconoUrl: "", orden: 0, activo: true });

export function LandingContactosAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: QK, queryFn: () => api.landingContactos.list() });

  const [editando, setEditando] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<FormState>(empty());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const createM = useMutation({ mutationFn: api.landingContactos.create, onSuccess: () => { invalidate(); setCreando(false); setForm(empty()); } });
  const updateM = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<FormState> }) => api.landingContactos.update(id, data), onSuccess: () => { invalidate(); setEditando(null); } });
  const removeM = useMutation({ mutationFn: api.landingContactos.remove, onSuccess: invalidate });

  function startEdit(item: LandingContacto) {
    setEditando(item.id);
    setCreando(false);
    setForm({ label: item.label, url: item.url, iconoUrl: item.iconoUrl ?? "", orden: item.orden, activo: item.activo });
  }

  function startCreate() {
    setCreando(true);
    setEditando(null);
    setForm(empty());
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await api.landingContactos.uploadIcono(file);
      setForm((f) => ({ ...f, iconoUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    const payload = { label: form.label, url: form.url, iconoUrl: form.iconoUrl || undefined, orden: form.orden, activo: form.activo };
    if (editando !== null) {
      updateM.mutate({ id: editando, data: payload });
    } else {
      createM.mutate(payload as any);
    }
  }

  const isSaving = createM.isPending || updateM.isPending;
  const showForm = creando || editando !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Contacto (landing)</h3>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">Links con íconos que aparecen en el modal "Contacto" de la landing.</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="btn btn-primary text-xs px-3 py-1.5">
            + Agregar
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.03] space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-white/80">
            {editando !== null ? "Editar contacto" : "Nuevo contacto"}
          </h4>

          <div>
            <label className="label">Etiqueta</label>
            <input className="field" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ej. Instagram, Email, WhatsApp" />
          </div>

          <div>
            <label className="label">URL / Enlace</label>
            <input className="field" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https:// o mailto:..." />
          </div>

          <div>
            <label className="label">Ícono cuadrado PNG (opcional)</label>
            <div className="flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn text-xs px-3 py-1.5 border border-slate-200 dark:border-white/10"
              >
                {uploading ? "Subiendo…" : "Subir ícono"}
              </button>
              {form.iconoUrl && (
                <div className="flex items-center gap-2">
                  <img src={form.iconoUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, iconoUrl: "" }))} className="text-xs text-rose-500 hover:text-rose-700">
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Orden</label>
              <input type="number" className="field" value={form.orden} onChange={(e) => setForm((f) => ({ ...f, orden: Number(e.target.value) }))} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} />
                Activo
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={isSaving || !form.label.trim() || !form.url.trim()} className="btn btn-primary text-sm px-4">
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={() => { setEditando(null); setCreando(false); }} className="btn text-sm px-4 border border-slate-200 dark:border-white/10">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-white/30">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-white/30">Sin contactos. Agregá uno.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
              {item.iconoUrl ? (
                <img src={item.iconoUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-white/[0.06] shrink-0">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.label}</p>
                <p className="text-xs text-slate-400 dark:text-white/30 truncate">{item.url}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.activo ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-white/30"}`}>
                {item.activo ? "Activo" : "Inactivo"}
              </span>
              <button onClick={() => startEdit(item)} className="text-xs text-[#0058be] hover:underline shrink-0">Editar</button>
              <button onClick={() => removeM.mutate(item.id)} className="text-xs text-rose-500 hover:underline shrink-0">Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
