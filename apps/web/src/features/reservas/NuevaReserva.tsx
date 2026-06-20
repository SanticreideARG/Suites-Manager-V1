import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import { addDays } from "../../lib/fechas.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

interface Props {
  habitacionId: number;
  fechaInicial: string;
  onClose: () => void;
}

export function NuevaReserva({ habitacionId, fechaInicial, onClose }: Props) {
  const qc = useQueryClient();
  const [huesped, setHuesped] = useState("");
  const [checkin, setCheckin] = useState(fechaInicial);
  const [checkout, setCheckout] = useState(addDays(fechaInicial, 1));
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () =>
      api.reservas.create({
        habitacionId,
        huesped: { nombre: huesped },
        checkin,
        checkout,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservas"] });
      onClose();
    },
    onError: (err) => {
      setError(
        err instanceof ApiError && err.esOverbooking
          ? "⚠️ Esas fechas ya están ocupadas en esta habitación."
          : "No se pudo crear la reserva.",
      );
    },
  });

  return (
    <Modal titulo="Nueva reserva" onClose={onClose}>
      <label className="block text-sm">
        Huésped
        <input
          autoFocus
          value={huesped}
          onChange={(e) => setHuesped(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Nombre y apellido"
        />
      </label>
      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          Check-in
          <input
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block flex-1 text-sm">
          Check-out
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        disabled={!huesped || checkout <= checkin || crear.isPending}
        onClick={() => {
          setError(null);
          crear.mutate();
        }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {crear.isPending ? "Guardando…" : "Reservar"}
      </button>
    </Modal>
  );
}
