import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import { addDays } from "../../lib/fechas.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

interface Props {
  habitacionId: number;
  fechaInicial: string;
  onClose: () => void;
}

type Tipo = "reserva" | "mantenimiento";

export function NuevaReserva({ habitacionId, fechaInicial, onClose }: Props) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>("reserva");
  const [huesped, setHuesped] = useState("");
  const [motivo, setMotivo] = useState("");
  const [checkin, setCheckin] = useState(fechaInicial);
  const [checkout, setCheckout] = useState(addDays(fechaInicial, 1));
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      tipo === "reserva"
        ? api.reservas.create({
            habitacionId,
            huesped: { nombre: huesped },
            checkin,
            checkout,
          })
        : api.reservas.mantenimiento({
            habitacionId,
            checkin,
            checkout,
            motivo: motivo || undefined,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservas"] });
      onClose();
    },
    onError: (err) => {
      setError(
        err instanceof ApiError && err.esOverbooking
          ? "⚠️ Esas fechas ya están ocupadas en esta habitación."
          : "No se pudo guardar.",
      );
    },
  });

  // Cotización en vivo (tarifas dinámicas) para reservas de huésped.
  const cotizacionQ = useQuery({
    queryKey: ["cotizar", habitacionId, checkin, checkout],
    queryFn: () => api.reservas.cotizar(habitacionId, checkin, checkout),
    enabled: tipo === "reserva" && checkout > checkin,
  });

  const input = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5";
  const faltaDatos = tipo === "reserva" && !huesped;

  return (
    <Modal
      titulo={tipo === "reserva" ? "Nueva reserva" : "Bloqueo de mantenimiento"}
      onClose={onClose}
    >
      {/* Selector de tipo */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <TipoBtn activo={tipo === "reserva"} onClick={() => setTipo("reserva")}>
          Reserva
        </TipoBtn>
        <TipoBtn
          activo={tipo === "mantenimiento"}
          onClick={() => setTipo("mantenimiento")}
        >
          🔧 Mantenimiento
        </TipoBtn>
      </div>

      {tipo === "reserva" ? (
        <label className="block text-sm">
          Huésped
          <input
            autoFocus
            value={huesped}
            onChange={(e) => setHuesped(e.target.value)}
            className={input}
            placeholder="Nombre y apellido"
          />
        </label>
      ) : (
        <label className="block text-sm">
          Motivo (opcional)
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={input}
            placeholder="Ej. pintura, plomería…"
          />
        </label>
      )}

      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          {tipo === "reserva" ? "Check-in" : "Desde"}
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className={input}
          />
        </label>
        <label className="block flex-1 text-sm">
          {tipo === "reserva" ? "Check-out" : "Hasta"}
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className={input}
          />
        </label>
      </div>

      {tipo === "reserva" && cotizacionQ.data && checkout > checkin && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">
            {cotizacionQ.data.noches} noche(s) · tarifas dinámicas
          </span>
          <span className="text-base font-bold text-slate-800">
            ${cotizacionQ.data.total.toLocaleString("es-AR")}
          </span>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={faltaDatos || checkout <= checkin || crear.isPending}
        onClick={() => {
          setError(null);
          crear.mutate();
        }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {crear.isPending
          ? "Guardando…"
          : tipo === "reserva"
            ? "Reservar"
            : "Bloquear"}
      </button>
    </Modal>
  );
}

function TipoBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
        activo ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
