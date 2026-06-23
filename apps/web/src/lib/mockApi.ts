import type {
  ApiClient,
  Habitacion,
  Huesped,
  ReservaListItem,
} from "./types.js";
import { ApiError } from "./types.js";
import { addDays, diffDays } from "./fechas.js";

/**
 * API falsa en memoria para desarrollar/verificar la UI sin DB ni backend.
 * Se activa con VITE_MOCK=1. Replica las reglas clave: anti-overbooking y
 * "no eliminar con reservas asociadas".
 */

const hoy = new Date().toISOString().slice(0, 10);

let seqHab = 0;
let seqRes = 0;
let seqHuesped = 0;

interface ReservaInterna extends ReservaListItem {}

const habitaciones: Habitacion[] = [
  { id: ++seqHab, nombre: "Cabaña 1", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Cabaña 2", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Suite Río", tipo: "Suite", capacidad: 2, tarifaBase: "60000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 101", tipo: "Standard", capacidad: 2, tarifaBase: "30000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 102", tipo: "Standard", capacidad: 3, tarifaBase: "35000", estado: "mantenimiento" },
];

const huespedes: Huesped[] = [
  { id: ++seqHuesped, nombre: "Familia Gómez", documento: "30111222", email: "gomez@mail.com", telefono: "+54 11 5555-1111", notas: "Vienen con mascota." },
  { id: ++seqHuesped, nombre: "Lucía Fernández", documento: "28999111", email: "lucia@mail.com", telefono: null, notas: null },
  { id: ++seqHuesped, nombre: "Martín Pérez", documento: null, email: null, telefono: "+54 9 11 4444-2222", notas: "Pidió cuna." },
  { id: ++seqHuesped, nombre: "Carlos Ruiz", documento: null, email: "carlos@mail.com", telefono: null, notas: null },
  { id: ++seqHuesped, nombre: "Ana Torres", documento: "33222111", email: null, telefono: null, notas: "Cliente frecuente." },
];

function nuevaReserva(
  habitacionId: number,
  huespedId: number,
  checkin: string,
  checkout: string,
  estado: ReservaListItem["estado"],
): ReservaInterna {
  const hab = habitaciones.find((h) => h.id === habitacionId)!;
  const huesped = huespedes.find((h) => h.id === huespedId)!;
  const total = diffDays(checkin, checkout) * Number(hab.tarifaBase);
  return {
    id: ++seqRes,
    habitacionId,
    huespedId,
    huesped: huesped?.nombre ?? "—",
    checkin,
    checkout,
    estado,
    total: String(total),
  };
}

const reservas: ReservaInterna[] = [
  nuevaReserva(1, 1, hoy, addDays(hoy, 3), "ocupada"),
  nuevaReserva(2, 2, addDays(hoy, 1), addDays(hoy, 5), "reservada"),
  nuevaReserva(3, 3, addDays(hoy, 4), addDays(hoy, 6), "reservada"),
  nuevaReserva(1, 4, addDays(hoy, 5), addDays(hoy, 8), "reservada"),
  nuevaReserva(4, 5, addDays(hoy, -2), addDays(hoy, 1), "checkout"),
  // Segunda estadía de Ana Torres -> historial con 2 estadías
  nuevaReserva(3, 5, addDays(hoy, -40), addDays(hoy, -37), "checkout"),
  // Bloqueo de mantenimiento (sin huésped) en Suite Río
  {
    id: ++seqRes,
    habitacionId: 3,
    huespedId: null,
    huesped: null,
    checkin: addDays(hoy, 8),
    checkout: addDays(hoy, 11),
    estado: "mantenimiento",
    total: "0",
  },
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
  huespedes: {
    list: () =>
      delay(
        [...huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      ),
    create: (data) => {
      const h: Huesped = {
        id: ++seqHuesped,
        nombre: data.nombre,
        documento: data.documento ?? null,
        email: data.email ?? null,
        telefono: data.telefono ?? null,
        notas: data.notas ?? null,
      };
      huespedes.push(h);
      return delay(h);
    },
    update: (id, data) => {
      const h = huespedes.find((x) => x.id === id);
      if (!h) return Promise.reject(new ApiError(404, "No encontrado"));
      if (data.nombre !== undefined) h.nombre = data.nombre;
      if (data.documento !== undefined) h.documento = data.documento ?? null;
      if (data.email !== undefined) h.email = data.email ?? null;
      if (data.telefono !== undefined) h.telefono = data.telefono ?? null;
      if (data.notas !== undefined) h.notas = data.notas ?? null;
      return delay(h);
    },
    remove: (id) => {
      if (reservas.some((r) => r.huespedId === id && r.estado !== "cancelada")) {
        return Promise.reject(
          new ApiError(409, "El huésped tiene reservas.", "en_uso"),
        );
      }
      const i = huespedes.findIndex((h) => h.id === id);
      if (i >= 0) huespedes.splice(i, 1);
      return delay({ ok: true } as const);
    },
    historial: (id) =>
      delay(
        reservas
          .filter((r) => r.huespedId === id)
          .sort((a, b) => b.checkin.localeCompare(a.checkin))
          .map((r) => ({
            id: r.id,
            habitacionId: r.habitacionId,
            habitacion:
              habitaciones.find((h) => h.id === r.habitacionId)?.nombre ?? "—",
            checkin: r.checkin,
            checkout: r.checkout,
            estado: r.estado,
            total: r.total,
          })),
      ),
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
      const huesped: Huesped = {
        id: ++seqHuesped,
        nombre: data.huesped.nombre,
        documento: data.huesped.documento ?? null,
        email: data.huesped.email ?? null,
        telefono: data.huesped.telefono ?? null,
        notas: data.huesped.notas ?? null,
      };
      huespedes.push(huesped);
      const r = nuevaReserva(
        data.habitacionId,
        huesped.id,
        data.checkin,
        data.checkout,
        "reservada",
      );
      reservas.push(r);
      return delay(r);
    },
    mantenimiento: (data) => {
      if (seSolapan(data.habitacionId, data.checkin, data.checkout)) {
        return Promise.reject(
          new ApiError(409, "Esas fechas ya están ocupadas.", "overbooking"),
        );
      }
      const r: ReservaInterna = {
        id: ++seqRes,
        habitacionId: data.habitacionId,
        huespedId: null,
        huesped: null,
        checkin: data.checkin,
        checkout: data.checkout,
        estado: "mantenimiento",
        total: "0",
      };
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
