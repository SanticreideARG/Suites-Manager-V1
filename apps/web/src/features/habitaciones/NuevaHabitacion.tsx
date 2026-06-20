import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

export function NuevaHabitacion() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [capacidad, setCapacidad] = useState(2);
  const [tarifaBase, setTarifaBase] = useState(30000);

  const crear = useMutation({
    mutationFn: () =>
      api.habitaciones.create({
        nombre,
        tipo: "Standard",
        capacidad,
        tarifaBase,
        estado: "libre",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habitaciones"] });
      setAbierto(false);
      setNombre("");
    },
  });

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        + Habitación
      </button>
    );
  }

  return (
    <Modal onClose={() => setAbierto(false)} titulo="Nueva habitación">
      <label className="block text-sm">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
          placeholder="Cabaña 3"
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
      <button
        disabled={!nombre || crear.isPending}
        onClick={() => crear.mutate()}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {crear.isPending ? "Guardando…" : "Crear"}
      </button>
    </Modal>
  );
}

export function Modal({
  titulo,
  children,
  onClose,
}: {
  titulo: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
