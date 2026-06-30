import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { LandingServicio } from "../../lib/types.js";

const QK = ["landing-servicios"];

interface FormState {
  titulo: string;
  descripcion: string;
  imagenUrl: string;
  orden: number;
  activo: boolean;
}

const empty = (): FormState => ({
  titulo: "",
  descripcion: "",
  imagenUrl: "",
  orden: 0,
  activo: true,
});

export function LandingServiciosAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: QK, queryFn: () => api.landingServicios.list() });

  const [editando, setEditando] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState<FormState>(empty());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const createM = useMutation({ mutationFn: api.landingServicios.create, onSuccess: () => { invalidate(); setCreando(false); setForm(empty()); } });
  const updateM = useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<FormState> }) => api.landingServicios.update(id, data), onSuccess: () => { invalidate(); setEditando(null); } });
  const removeM = useMutation({ mutationFn: api.landingServicios.remove, onSuccess: invalidate });

  function startEdit(item: LandingServicio) {
    setEditando(item.id);
    setCreando(false);
    setForm({ titulo: item.titulo, descripcion: item.descripcion ?? "", imagenUrl: item.imagenUrl ?? "", orden: item.orden, activo: item.activo });
  }

  function startCreate() {
    setCreando(true);
    setEditando(null);
    setForm(empty());
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await api.landingServicios.uploadImagen(file);
      setForm((f) => ({ ...f, imagenUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    const payload = { titulo: form.titulo, descripcion: form.descripcion || undefined, imagenUrl: form.imagenUrl || undefined, orden: form.orden, activo: form.activo };
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
          <h3 className="font-semibold text-slate-800 dark:text-white">Servicios (landing)</h3>
          <p className="text-xs text-slate-400 dark:text-white/40 mt-0.5">Aparecen en el modal "Servicios" de la landing.</p>
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
            {editando !== null ? "Editar servicio" : "Nuevo servicio"}
          </h4>

          <div>
            <label className="label">Título</label>
            <input className="field" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ej. Wi-Fi de alta velocidad" />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea className="field resize-none" rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción breve del servicio..." />
          </div>

          <div>
            <label className="label">Imagen (opcional)</label>
            <div className="flex gap-2 items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn text-xs px-3 py-1.5 border border-slate-200 dark:border-white/10"
              >
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
              {form.imagenUrl && (
                <div className="flex items-center gap-2">
                  <img src={form.imagenUrl} alt="" className="h-10 w-10 rounded object-cover" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, imagenUrl: "" }))} className="text-xs text-rose-500 hover:text-rose-700">
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
            <button onClick={handleSave} disabled={isSaving || !form.titulo.trim()} className="btn btn-primary text-sm px-4">
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
        <p className="text-sm text-slate-400 dark:text-white/30">Sin servicios. Agregá uno.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
              {item.imagenUrl && (
                <img src={item.imagenUrl} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{item.titulo}</p>
                {item.descripcion && <p className="text-xs text-slate-400 dark:text-white/30 truncate">{item.descripcion}</p>}
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
