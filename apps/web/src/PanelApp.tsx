import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, usandoMock } from "./lib/api.js";
import type { ReservaListItem } from "./lib/api.js";
import { addDays } from "./lib/fechas.js";
import { useUi } from "./store/ui.js";
import { Planner } from "./components/Planner.js";
import { NuevaReserva } from "./features/reservas/NuevaReserva.js";
import { AccionesReserva } from "./features/reservas/AccionesReserva.js";
import { HuespedesPage } from "./features/huespedes/HuespedesPage.js";
import { ReportesPage } from "./features/reportes/ReportesPage.js";
import { TarifasPage } from "./features/tarifas/TarifasPage.js";
import { ProximosPanel } from "./features/dashboard/ProximosPanel.js";
import { ConfiguracionPage } from "./features/configuracion/ConfiguracionPage.js";
import { LandingManagerPage } from "./features/landing-manager/LandingManagerPage.js";
import { useSession, signOut } from "./lib/auth.js";
import logo from "./assets/suites-man-logo.png";

type Vista = "calendario" | "huespedes" | "reportes" | "tarifas" | "landing" | "config";

interface NavDef {
  id: Vista;
  label: string;
  icon: React.ReactNode;
  soloAdmin?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavDef[];
}

export function PanelApp() {
  const [vista, setVista] = useState<Vista>("calendario");
  const { tema, toggleTema } = useUi();
  const { data: session, isPending } = useSession();
  const configQ = useQuery({ queryKey: ["config"], queryFn: api.config.get });
  const appNombre = configQ.data?.nombre ?? "Suites Manager";

  const requiereAuth = !usandoMock;

  if (requiereAuth && isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Cargando…
      </div>
    );
  }

  // Sin sesión → volver a la landing (el login está ahí)
  if (requiereAuth && !session) {
    return <Navigate to="/" replace />;
  }

  const role = usandoMock
    ? "admin"
    : ((session?.user as { role?: string } | undefined)?.role ?? "gestor");
  const esAdmin = role === "admin";

  // Cliente → no tiene acceso al panel, lo mandamos a la landing
  if (requiereAuth && role === "cliente") {
    return <Navigate to="/" replace />;
  }

  const groups: NavGroup[] = [
    {
      items: NAV_MAIN,
    },
    {
      label: "Administración",
      items: NAV_ADMIN.filter((n) => !n.soloAdmin || esAdmin),
    },
  ].filter((g) => g.items.length > 0);

  const allItems = groups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen md:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:flex">
        <Brand nombre={appNombre} />
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((n) => (
                  <NavButton
                    key={n.id}
                    icon={n.icon}
                    label={n.label}
                    activa={vista === n.id}
                    onClick={() => setVista(n.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <SidebarFooter
          email={session?.user.email}
          tema={tema}
          onToggleTema={toggleTema}
          onSignOut={session ? () => signOut() : undefined}
        />
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 md:hidden">
        <div className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-bold text-slate-800 dark:text-slate-100">{appNombre}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={toggleTema} title="Cambiar tema">
            {tema === "dark" ? "☀️" : "🌙"}
          </IconBtn>
          {session && (
            <IconBtn onClick={() => signOut()} title="Salir">
              ⎋
            </IconBtn>
          )}
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-900 md:hidden">
        {allItems.map((n) => (
          <button
            key={n.id}
            onClick={() => setVista(n.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
              vista === n.id
                ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500"
            }`}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {/* Contenido */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {usandoMock && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            🧪 Modo demo — datos de ejemplo en memoria, sin base de datos. Los
            cambios se pierden al recargar.
          </div>
        )}

        <h1 className="mb-5 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {allItems.find((n) => n.id === vista)?.label}
        </h1>

        {vista === "calendario" && <CalendarioView />}
        {vista === "huespedes" && <HuespedesPage />}
        {vista === "reportes" && esAdmin && <ReportesPage />}
        {vista === "tarifas" && esAdmin && <TarifasPage />}
        {vista === "landing" && esAdmin && <LandingManagerPage />}
        {vista === "config" && esAdmin && <ConfiguracionPage />}
      </main>
    </div>
  );
}

function Brand({ nombre }: { nombre: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
      <img src={logo} alt="" className="h-10 w-10 rounded-xl" />
      <div className="leading-tight">
        <div className="font-bold text-slate-800">{nombre}</div>
        <div className="text-xs text-slate-400">Gestión de hoteles</div>
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  activa,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        activa
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <span className={activa ? "text-slate-900" : "text-slate-400"}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function SidebarFooter({
  email,
  tema,
  onToggleTema,
  onSignOut,
}: {
  email?: string;
  tema: "light" | "dark";
  onToggleTema: () => void;
  onSignOut?: () => void;
}) {
  return (
    <div className="border-t border-slate-200 p-3">
      <button
        onClick={onToggleTema}
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      >
        {tema === "dark" ? "☀️ Tema claro" : "🌙 Tema oscuro"}
      </button>
      {email && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
            {email.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
            {email}
          </span>
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Salir"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              {iconLogout}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg px-2.5 py-1.5 text-base text-slate-600 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function CalendarioView() {
  const { fechaAncla, diasVisibles, avanzar, setFechaAncla, verMes, verQuincena } =
    useUi();
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
  const [exportando, setExportando] = useState(false);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => avanzar(-diasVisibles)} className="btn btn-ghost btn-sm">
            ← Anterior
          </button>
          <button
            onClick={() => setFechaAncla(new Date().toISOString().slice(0, 10))}
            className="btn btn-ghost btn-sm"
          >
            Hoy
          </button>
          <button onClick={() => avanzar(diasVisibles)} className="btn btn-ghost btn-sm">
            Siguiente →
          </button>
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
          <button
            onClick={verQuincena}
            className={`rounded px-2.5 py-1 font-medium transition ${
              diasVisibles === 14 ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Quincena
          </button>
          <button
            onClick={verMes}
            className={`rounded px-2.5 py-1 font-medium transition ${
              diasVisibles > 14 ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Mes
          </button>
        </div>
        <span className="text-sm text-slate-400">
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
            className="btn btn-ghost btn-sm"
          >
            {exportando ? "Exportando…" : "⬇ Excel"}
          </button>
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
          />
        </div>
      )}

      {habitacionesQ.data && <ProximosPanel />}

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
    ["bg-slate-400", "Check-out"],
    ["bg-rose-500", "Mantenimiento"],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded ${color}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ── Íconos inline (sin dependencias) ── */
const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const iconCalendar = (
  <svg {...svgProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const iconUsers = (
  <svg {...svgProps}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const iconChart = (
  <svg {...svgProps}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" />
    <rect x="13" y="7" width="3" height="10" />
  </svg>
);
const iconTag = (
  <svg {...svgProps}>
    <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.82 8.82a2 2 0 0 0 2.82 0l7.17-7.17a2 2 0 0 0 0-2.82Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const iconSettings = (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
const iconLogout = (
  <svg {...svgProps} width={16} height={16}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const iconLanding = (
  <svg {...svgProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
);

const NAV_MAIN: NavDef[] = [
  { id: "calendario", label: "Calendario", icon: iconCalendar },
  { id: "huespedes", label: "Huéspedes", icon: iconUsers },
];

const NAV_ADMIN: NavDef[] = [
  { id: "reportes", label: "Reportes", icon: iconChart, soloAdmin: true },
  { id: "tarifas", label: "Tarifas", icon: iconTag, soloAdmin: true },
  { id: "landing", label: "Landing", icon: iconLanding, soloAdmin: true },
  { id: "config", label: "Configuración", icon: iconSettings, soloAdmin: true },
];
