import type { ApiClient, Habitacion, ReservaListItem } from "./types.js";
import { ApiError } from "./types.js";
import { addDays, diffDays } from "./fechas.js";

/**
 * API falsa en memoria para desarrollar/verificar la UI sin DB ni backend.
 * Se activa con VITE_MOCK=1. Replica las reglas clave: anti-overbooking y
 * "no eliminar habitación con reservas".
 */

const hoy = new Date().toISOString().slice(0, 10);

let seqHab = 0;
let seqRes = 0;

interface ReservaInterna extends ReservaListItem {}

const habitaciones: Habitacion[] = [
  { id: ++seqHab, nombre: "Cabaña 1", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Cabaña 2", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Suite Río", tipo: "Suite", capacidad: 2, tarifaBase: "60000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 101", tipo: "Standard", capacidad: 2, tarifaBase: "30000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 102", tipo: "Standard", capacidad: 3, tarifaBase: "35000", estado: "mantenimiento" },
];

function nuevaReserva(
  habitacionId: number,
  huesped: string,
  checkin: string,
  checkout: string,
  estado: ReservaListItem["estado"],
): ReservaInterna {
  const hab = habitaciones.find((h) => h.id === habitacionId)!;
  const total = diffDays(checkin, checkout) * Number(hab.tarifaBase);
  return {
    id: ++seqRes,
    habitacionId,
    huesped,
    checkin,
    checkout,
    estado,
    total: String(total),
  };
}

const reservas: ReservaInterna[] = [
  nuevaReserva(1, "Familia Gómez", hoy, addDays(hoy, 3), "ocupada"),
  nuevaReserva(2, "Lucía Fernández", addDays(hoy, 1), addDays(hoy, 5), "reservada"),
  nuevaReserva(3, "Martín Pérez", addDays(hoy, 4), addDays(hoy, 6), "reservada"),
  nuevaReserva(1, "Carlos Ruiz", addDays(hoy, 5), addDays(hoy, 8), "reservada"),
  nuevaReserva(4, "Ana Torres", addDays(hoy, -2), addDays(hoy, 1), "checkout"),
];

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

function seSolapan(
  habitacionId: number,
  checkin: string,
  checkout: string,
  excluirId?: number,
): boolean {
  return reservas.some(
    (r) =>
      r.habitacionId === habitacionId &&
      r.estado !== "cancelada" &&
      r.id !== excluirId &&
      checkin < r.checkout &&
      r.checkin < checkout,
  );
}

export const mockApi: ApiClient = {
  habitaciones: {
    list: () => delay([...habitaciones]),
    create: (data) => {
      const hab: Habitacion = {
        id: ++seqHab,
        nombre: data.nombre,
        tipo: data.tipo ?? "Standard",
        capacidad: data.capacidad,
        tarifaBase: String(data.tarifaBase),
        estado: data.estado ?? "libre",
      };
      habitaciones.push(hab);
      return delay(hab);
    },
    update: (id, data) => {
      const hab = habitaciones.find((h) => h.id === id);
      if (!hab) throw new ApiError(404, "No encontrada");
      if (data.nombre !== undefined) hab.nombre = data.nombre;
      if (data.tipo !== undefined) hab.tipo = data.tipo;
      if (data.capacidad !== undefined) hab.capacidad = data.capacidad;
      if (data.tarifaBase !== undefined) hab.tarifaBase = String(data.tarifaBase);
      if (data.estado !== undefined) hab.estado = data.estado;
      return delay(hab);
    },
    remove: (id) => {
      if (reservas.some((r) => r.habitacionId === id && r.estado !== "cancelada")) {
        return Promise.reject(
          new ApiError(409, "Tiene reservas asociadas.", "en_uso"),
        );
      }
      const i = habitaciones.findIndex((h) => h.id === id);
      if (i >= 0) habitaciones.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  reservas: {
    list: (desde, hasta) =>
      delay(
        reservas.filter(
          (r) =>
            r.estado !== "cancelada" &&
            (!desde || r.checkout >= desde) &&
            (!hasta || r.checkin < hasta),
        ),
      ),
    create: (data) => {
      if (seSolapan(data.habitacionId, data.checkin, data.checkout)) {
        return Promise.reject(
          new ApiError(409, "Esas fechas ya están ocupadas.", "overbooking"),
        );
      }
      const r = nuevaReserva(
        data.habitacionId,
        data.huesped.nombre,
        data.checkin,
        data.checkout,
        "reservada",
      );
      reservas.push(r);
      return delay(r);
    },
    update: (id, data) => {
      const r = reservas.find((x) => x.id === id);
      if (!r) return Promise.reject(new ApiError(404, "No encontrada"));
      const checkin = data.checkin ?? r.checkin;
      const checkout = data.checkout ?? r.checkout;
      if (
        (data.checkin || data.checkout) &&
        seSolapan(r.habitacionId, checkin, checkout, r.id)
      ) {
        return Promise.reject(
          new ApiError(409, "Las nuevas fechas se solapan.", "overbooking"),
        );
      }
      if (data.checkin || data.checkout) {
        const hab = habitaciones.find((h) => h.id === r.habitacionId)!;
        r.checkin = checkin;
        r.checkout = checkout;
        r.total = String(diffDays(checkin, checkout) * Number(hab.tarifaBase));
      }
      if (data.estado) r.estado = data.estado;
      return delay(r);
    },
    checkin: (id) => {
      const r = reservas.find((x) => x.id === id);
      if (r) r.estado = "ocupada";
      return delay(r);
    },
    checkout: (id) => {
      const r = reservas.find((x) => x.id === id);
      if (r) r.estado = "checkout";
      return delay(r);
    },
    cancelar: (id) => {
      const r = reservas.find((x) => x.id === id);
      if (r) r.estado = "cancelada";
      return delay(r);
    },
  },
};
