import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { ReservaListItem } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

export function AccionesReserva({
  reserva,
  habitacionNombre,
  onClose,
}: {
  reserva: ReservaListItem;
  habitacionNombre: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const refrescar = () => qc.invalidateQueries({ queryKey: ["reservas"] });
  const [generando, setGenerando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [checkinEd, setCheckinEd] = useState(reserva.checkin);
  const [checkoutEd, setCheckoutEd] = useState(reserva.checkout);
  const [error, setError] = useState<string | null>(null);

  const editable = reserva.estado === "reservada" || reserva.estado === "ocupada";

  // Carga react-pdf de forma diferida (chunk aparte) recién al hacer clic.
  const generarComprobante = async () => {
    setGenerando(true);
    try {
      const { armarDatos, descargarComprobante } = await import(
        "../facturacion/Comprobante.js"
      );
      await descargarComprobante(
        armarDatos({
          reservaId: reserva.id,
          huesped: reserva.huesped,
          habitacion: habitacionNombre,
          checkin: reserva.checkin,
          checkout: reserva.checkout,
          total: Number(reserva.total),
        }),
      );
    } finally {
      setGenerando(false);
    }
  };

  const guardar = useMutation({
    mutationFn: () =>
      api.reservas.update(reserva.id, {
        checkin: checkinEd,
        checkout: checkoutEd,
      }),
    onSuccess: () => {
      refrescar();
      onClose();
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.esOverbooking
          ? "⚠️ Las nuevas fechas se solapan con otra reserva."
          : "No se pudieron guardar los cambios.",
      ),
  });

  const checkin = useMutation({
    mutationFn: () => api.reservas.checkin(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });
  const checkout = useMutation({
    mutationFn: () => api.reservas.checkout(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });
  const cancelar = useMutation({
    mutationFn: () => api.reservas.cancelar(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });

  return (
    <Modal titulo={`Reserva · ${reserva.huesped}`} onClose={onClose}>
      {!editando ? (
        <dl className="space-y-1 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt className="text-slate-400">Estado</dt>
            <dd className="font-medium">{reserva.estado}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Fechas</dt>
            <dd>
              {reserva.checkin} → {reserva.checkout}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Total</dt>
            <dd>${Number(reserva.total).toLocaleString("es-AR")}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <label className="block flex-1 text-sm">
              Check-in
              <input
                type="date"
                value={checkinEd}
                onChange={(e) => setCheckinEd(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
            <label className="block flex-1 text-sm">
              Check-out
              <input
                type="date"
                value={checkoutEd}
                onChange={(e) => setCheckoutEd(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={checkoutEd <= checkinEd || guardar.isPending}
              onClick={() => {
                setError(null);
                guardar.mutate();
              }}
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {guardar.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setError(null);
                setCheckinEd(reserva.checkin);
                setCheckoutEd(reserva.checkout);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {!editando && (
        <>
          {editable && (
            <button
              onClick={() => setEditando(true)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ✏️ Modificar fechas
            </button>
          )}

          <button
            onClick={generarComprobante}
            disabled={generando}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {generando ? "Generando…" : "📄 Descargar comprobante (PDF)"}
          </button>

          <div className="flex gap-2 pt-2">
            {reserva.estado === "reservada" && (
              <button
                onClick={() => checkin.mutate()}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Check-in
              </button>
            )}
            {reserva.estado === "ocupada" && (
              <button
                onClick={() => checkout.mutate()}
                className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                Check-out
              </button>
            )}
            {reserva.estado !== "checkout" && (
              <button
                onClick={() => cancelar.mutate()}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
