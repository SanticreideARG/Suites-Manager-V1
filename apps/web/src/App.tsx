import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, usandoMock } from "./lib/api.js";
import type { Habitacion, ReservaListItem } from "./lib/api.js";
import { addDays } from "./lib/fechas.js";
import { useUi } from "./store/ui.js";
import { Planner } from "./components/Planner.js";
import { NuevaHabitacion } from "./features/habitaciones/NuevaHabitacion.js";
import { EditarHabitacion } from "./features/habitaciones/EditarHabitacion.js";
import { NuevaReserva } from "./features/reservas/NuevaReserva.js";
import { AccionesReserva } from "./features/reservas/AccionesReserva.js";
import { HuespedesPage } from "./features/huespedes/HuespedesPage.js";
import { ReportesPage } from "./features/reportes/ReportesPage.js";

type Vista = "calendario" | "huespedes" | "reportes";

export function App() {
  const [vista, setVista] = useState<Vista>("calendario");

  return (
    <div className="mx-auto max-w-7xl p-6">
      {usandoMock && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          🧪 Modo demo — datos de ejemplo en memoria, sin base de datos. Los
          cambios se pierden al recargar.
        </div>
      )}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Suites Manager</h1>
        <nav className="mt-3 flex gap-1 border-b border-slate-200">
          <Tab activa={vista === "calendario"} onClick={() => setVista("calendario")}>
            Calendario
          </Tab>
          <Tab activa={vista === "huespedes"} onClick={() => setVista("huespedes")}>
            Huéspedes
          </Tab>
          <Tab activa={vista === "reportes"} onClick={() => setVista("reportes")}>
            Reportes
          </Tab>
        </nav>
      </header>

      {vista === "calendario" && <CalendarioView />}
      {vista === "huespedes" && <HuespedesPage />}
      {vista === "reportes" && <ReportesPage />}
    </div>
  );
}

function Tab({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        activa
          ? "border-slate-800 text-slate-800"
          : "border-transparent text-slate-400 hover:text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function CalendarioView() {
  const { fechaAncla, diasVisibles, avanzar, setFechaAncla } = useUi();
  const hasta = addDays(fechaAncla, diasVisibles);

  const habitacionesQ = useQuery({
    queryKey: ["habitaciones"],
    queryFn: api.habitaciones.list,
  });
  const reservasQ = useQuery({
    queryKey: ["reservas", fechaAncla, diasVisibles],
    queryFn: () => api.reservas.list(fechaAncla, hasta),
  });

  const [nuevaReserva, setNuevaReserva] = useState<{
    habitacionId: number;
    fecha: string;
  } | null>(null);
  const [reservaSel, setReservaSel] = useState<ReservaListItem | null>(null);
  const [habitacionSel, setHabitacionSel] = useState<Habitacion | null>(null);
  const [exportando, setExportando] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => avanzar(-diasVisibles)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ← Anterior
        </button>
        <button
          onClick={() => setFechaAncla(new Date().toISOString().slice(0, 10))}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Hoy
        </button>
        <button
          onClick={() => avanzar(diasVisibles)}
          className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Siguiente →
        </button>
        <span className="ml-2 text-sm text-slate-400">
          {fechaAncla} → {hasta}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            disabled={exportando || !habitacionesQ.data}
            onClick={async () => {
              setExportando(true);
              try {
                const { exportarExcel } = await import(
                  "./features/reportes/exportarExcel.js"
                );
                await exportarExcel({
                  reservas: reservasQ.data ?? [],
                  habitaciones: habitacionesQ.data ?? [],
                  desde: fechaAncla,
                  hasta,
                });
              } finally {
                setExportando(false);
              }
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exportando ? "Exportando…" : "⬇ Excel"}
          </button>
          <NuevaHabitacion />
        </div>
      </div>

      <Leyenda />

      {(habitacionesQ.isLoading || reservasQ.isLoading) && (
        <p className="mt-3 text-sm text-slate-400">Cargando…</p>
      )}
      {habitacionesQ.isError && (
        <p className="mt-3 text-sm text-rose-600">
          No se pudo conectar con la API. ¿Está corriendo en :3001?
        </p>
      )}

      {habitacionesQ.data && (
        <div className="mt-3">
          <Planner
            habitaciones={habitacionesQ.data}
            reservas={reservasQ.data ?? []}
            ancla={fechaAncla}
            dias={diasVisibles}
            onClickCelda={(habitacionId, fecha) =>
              setNuevaReserva({ habitacionId, fecha })
            }
            onClickReserva={(r) => setReservaSel(r)}
            onClickHabitacion={(h) => setHabitacionSel(h)}
          />
        </div>
      )}

      {habitacionSel && (
        <EditarHabitacion
          habitacion={habitacionSel}
          onClose={() => setHabitacionSel(null)}
        />
      )}
      {nuevaReserva && (
        <NuevaReserva
          habitacionId={nuevaReserva.habitacionId}
          fechaInicial={nuevaReserva.fecha}
          onClose={() => setNuevaReserva(null)}
        />
      )}
      {reservaSel && (
        <AccionesReserva
          reserva={reservaSel}
          habitacionNombre={
            habitacionesQ.data?.find((h) => h.id === reservaSel.habitacionId)
              ?.nombre ?? "—"
          }
          onClose={() => setReservaSel(null)}
        />
      )}
    </div>
  );
}

function Leyenda() {
  const items = [
    ["bg-amber-400", "Reservada"],
    ["bg-emerald-500", "Ocupada"],
    ["bg-slate-300", "Check-out"],
    ["bg-rose-200", "Mantenimiento"],
  ] as const;
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
