import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export function ContactoModal({ onClose }: { onClose: () => void }) {
  const { data: contactos = [] } = useQuery({
    queryKey: ["landing-contactos"],
    queryFn: () => api.landingContactos.list(),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const activos = contactos.filter((c) => c.activo);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0f1e30] animate-[modal-in_0.15s_ease-out_both]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.07]">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Contacto</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-white/50">Encontranos en nuestras redes</p>
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
        <div className="p-6">
          {activos.length === 0 ? (
            <p className="text-center text-sm text-slate-400 dark:text-white/30 py-8">
              Sin contactos configurados.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-4">
              {activos.map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-[#0058be]/30 hover:bg-blue-50 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"
                  style={{ minWidth: 80 }}
                >
                  {c.iconoUrl ? (
                    <img
                      src={c.iconoUrl}
                      alt={c.label}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0058be]/10 text-[#0058be] dark:bg-blue-500/20 dark:text-blue-400">
                      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-600 group-hover:text-[#0058be] dark:text-white/60 dark:group-hover:text-blue-400 text-center">
                    {c.label}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
