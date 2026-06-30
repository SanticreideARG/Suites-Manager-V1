import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export function ServiciosModal({ onClose }: { onClose: () => void }) {
  const { data: servicios = [] } = useQuery({
    queryKey: ["landing-servicios"],
    queryFn: () => api.landingServicios.list(),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const activos = servicios.filter((s) => s.activo);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0f1e30] flex flex-col animate-[modal-in_0.15s_ease-out_both]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.07]">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nuestros Servicios</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-white/50">Todo lo que ofrecemos para tu estadía</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {activos.length === 0 ? (
            <p className="text-center text-sm text-slate-400 dark:text-white/30 py-8">
              Sin servicios disponibles.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activos.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.03]"
                >
                  {s.imagenUrl && (
                    <img
                      src={s.imagenUrl}
                      alt={s.titulo}
                      className="mb-3 h-36 w-full rounded-lg object-cover"
                    />
                  )}
                  <h3 className="font-semibold text-slate-800 dark:text-white">{s.titulo}</h3>
                  {s.descripcion && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-white/50 leading-relaxed">
                      {s.descripcion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
