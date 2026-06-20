import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { Habitacion } from "../../lib/api.js";
import { Modal } from "./NuevaHabitacion.js";

export function EditarHabitacion({
  habitacion,
  onClose,
}: {
  habitacion: Habitacion;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(habitacion.nombre);
  const [tipo, setTipo] = useState(habitacion.tipo);
  const [capacidad, setCapacidad] = useState(habitacion.capacidad);
  const [tarifaBase, setTarifaBase] = useState(Number(habitacion.tarifaBase));
  const [mantenimiento, setMantenimiento] = useState(
    habitacion.estado === "mantenimiento",
  );
  const [error, setError] = useState<string | null>(null);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["habitaciones"] });

  const guardar = useMutation({
    mutationFn: () =>
      api.habitaciones.update(habitacion.id, {
        nombre,
        tipo,
        capacidad,
        tarifaBase,
        estado: mantenimiento ? "mantenimiento" : "libre",
      }),
    onSuccess: () => {
      refrescar();
      onClose();
    },
    onError: () => setError("No se pudo guardar."),
  });

  const eliminar = useMutation({
    mutationFn: () => api.habitaciones.remove(habitacion.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.enUso
          ? "No se puede eliminar: tiene reservas asociadas."
          : "No se pudo eliminar.",
      ),
  });

  return (
    <Modal titulo={`Editar · ${habitacion.nombre}`} onClose={onClose}>
      <label className="block text-sm">
        Nombre
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>
      <label className="block text-sm">
        Tipo
        <input
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
        />
      </label>
      <div className="flex gap-3">
        <label className="block flex-1 text-sm">
          Capacidad
          <input
            type="number"
            min={1}
            value={capacidad}
            onChange={(e) => setCapacidad(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="block flex-1 text-sm">
          Tarifa base
          <input
            type="number"
            min={0}
            value={tarifaBase}
            onChange={(e) => setTarifaBase(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={mantenimiento}
          onChange={(e) => setMantenimiento(e.target.checked)}
        />
        En mantenimiento (bloquea reservas nuevas)
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button
          disabled={!nombre || guardar.isPending}
          onClick={() => {
            setError(null);
            guardar.mutate();
          }}
          className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          disabled={eliminar.isPending}
          onClick={() => {
            if (confirm(`¿Eliminar "${habitacion.nombre}"?`)) {
              setError(null);
              eliminar.mutate();
            }
          }}
          className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          Eliminar
        </button>
      </div>
    </Modal>
  );
}
