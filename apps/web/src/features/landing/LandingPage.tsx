import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, usandoMock } from "../../lib/api.js";
import { NavBar } from "./NavBar.js";
import { HeroCarousel } from "./HeroCarousel.js";
import { BookingPanel } from "./BookingPanel.js";
import { UnitCard } from "./UnitCard.js";
import { LoginModal } from "./LoginModal.js";
import { ServiciosModal } from "./ServiciosModal.js";
import { ContactoModal } from "./ContactoModal.js";
import { LandingFooter } from "./LandingFooter.js";

export function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [serviciosOpen, setServiciosOpen] = useState(false);
  const [contactoOpen, setContactoOpen] = useState(false);
  const [filtroCapacidad, setFiltroCapacidad] = useState(0);
  const [disponibles, setDisponibles] = useState<number[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  const { data: unidades, isLoading, isError } = useQuery({
    queryKey: ["landing.habitaciones"],
    queryFn: api.landing.habitaciones,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const unidadesFiltradas = (unidades ?? []).filter((u) => {
    if (filtroCapacidad > 1 && u.capacidad < filtroCapacidad) return false;
    if (disponibles !== null && !disponibles.includes(u.id)) return false;
    return true;
  });

  const hayFiltroActivo = filtroCapacidad > 1 || disponibles !== null;

  async function handleSearch(checkin: string, checkout: string, guests: number) {
    setFiltroCapacidad(guests);
    if (checkin && checkout) {
      setBuscando(true);
      try {
        const result = await api.landing.disponibilidad(checkin, checkout);
        setDisponibles(result.disponibles);
      } catch {
        setDisponibles(null);
      } finally {
        setBuscando(false);
      }
    } else {
      setDisponibles(null);
    }
    setTimeout(
      () =>
        document
          .getElementById("alojamientos")
          ?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  function limpiarFiltros() {
    setFiltroCapacidad(0);
    setDisponibles(null);
  }

  function handleReservar(_id: number) {
    if (!usandoMock) {
      setLoginOpen(true);
    } else {
      document.getElementById("buscar")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-[Inter,sans-serif] text-slate-800 dark:bg-[#0b1c30] dark:text-[#f8f9ff]">
      <NavBar
        onOpenLogin={() => setLoginOpen(true)}
        onOpenServicios={() => setServiciosOpen(true)}
        onOpenContacto={() => setContactoOpen(true)}
      />

      <HeroCarousel onOpenLogin={() => setLoginOpen(true)} />

      {/* Sección principal */}
      <section id="alojamientos" className="mx-auto max-w-7xl px-6 py-16">
        {/* Encabezado */}
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:bg-white/[0.06] dark:text-white/50">
            Nuestros alojamientos
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Encontrá el espacio ideal para vos
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-white/50">
            Desde cabañas rústicas hasta suites de lujo, contamos con opciones
            para cada ocasión y presupuesto.
          </p>
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
          {/* Booking panel (sticky) */}
          <div className="w-full shrink-0 lg:w-72 xl:w-80">
            <BookingPanel onSearch={handleSearch} />
          </div>

          {/* Grid de unidades */}
          <div className="flex-1">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-white/40">
                {isLoading || buscando
                  ? "Buscando…"
                  : `${unidadesFiltradas.length} alojamiento${unidadesFiltradas.length !== 1 ? "s" : ""} disponible${unidadesFiltradas.length !== 1 ? "s" : ""}`}
              </p>
              {hayFiltroActivo && (
                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-[#0058be] transition hover:text-[#2170e4]"
                >
                  × Limpiar filtros
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-white/[0.04]"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
                <p className="text-2xl mb-3">😕</p>
                <p className="font-medium text-slate-700 dark:text-white/70">
                  No se pudo cargar los alojamientos.
                </p>
                <p className="mt-1 text-sm text-slate-400 dark:text-white/30">
                  Intentá recargar la página.
                </p>
              </div>
            ) : unidadesFiltradas.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-white/[0.08] dark:bg-white/[0.03]">
                {hayFiltroActivo ? (
                  <>
                    <p className="text-slate-500 dark:text-white/50">
                      No hay alojamientos disponibles para los filtros seleccionados.
                    </p>
                    <button
                      onClick={limpiarFiltros}
                      className="mt-3 text-sm text-[#0058be] hover:text-[#2170e4]"
                    >
                      Ver todos los alojamientos
                    </button>
                  </>
                ) : (
                  <p className="text-slate-500 dark:text-white/50">
                    Próximamente disponibles.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {unidadesFiltradas.map((u) => (
                  <UnitCard key={u.id} unit={u} onReservar={handleReservar} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <LandingFooter />

      {loginOpen && !usandoMock && (
        <LoginModal onClose={() => setLoginOpen(false)} />
      )}

      {serviciosOpen && (
        <ServiciosModal onClose={() => setServiciosOpen(false)} />
      )}

      {contactoOpen && (
        <ContactoModal onClose={() => setContactoOpen(false)} />
      )}
    </div>
  );
}
