import type {
  HabitacionCreate,
  HabitacionUpdate,
  HuespedCreate,
  HuespedUpdate,
  ReservaCreate,
  ReservaUpdate,
  BloqueoCreate,
} from "@suites/shared";
import type {
  ApiClient,
  Habitacion,
  Huesped,
  HistorialItem,
  ReservaListItem,
} from "./types.js";
import { ApiError } from "./types.js";
import { mockApi } from "./mockApi.js";

// Re-export para no romper imports existentes (`from "../lib/api.js"`).
export { ApiError };
export type { Habitacion, Huesped, HistorialItem, ReservaListItem };

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const USE_MOCK = import.meta.env.VITE_MOCK === "1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return res.json() as Promise<T>;
}

const realApi: ApiClient = {
  habitaciones: {
    list: () => request<Habitacion[]>("/habitaciones"),
    create: (data: HabitacionCreate) =>
      request<Habitacion>("/habitaciones", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: HabitacionUpdate) =>
      request<Habitacion>(`/habitaciones/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/habitaciones/${id}`, { method: "DELETE" }),
  },
  huespedes: {
    list: () => request<Huesped[]>("/huespedes"),
    create: (data: HuespedCreate) =>
      request<Huesped>("/huespedes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: HuespedUpdate) =>
      request<Huesped>(`/huespedes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/huespedes/${id}`, { method: "DELETE" }),
    historial: (id: number) =>
      request<HistorialItem[]>(`/huespedes/${id}/historial`),
  },
  reservas: {
    list: (desde?: string, hasta?: string) => {
      const qs = new URLSearchParams();
      if (desde) qs.set("desde", desde);
      if (hasta) qs.set("hasta", hasta);
      return request<ReservaListItem[]>(`/reservas?${qs}`);
    },
    create: (data: ReservaCreate) =>
      request<unknown>("/reservas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    mantenimiento: (data: BloqueoCreate) =>
      request<unknown>("/reservas/mantenimiento", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: ReservaUpdate) =>
      request<unknown>(`/reservas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    checkin: (id: number) =>
      request<unknown>(`/reservas/${id}/checkin`, { method: "POST" }),
    checkout: (id: number) =>
      request<unknown>(`/reservas/${id}/checkout`, { method: "POST" }),
    cancelar: (id: number) =>
      request<unknown>(`/reservas/${id}/cancelar`, { method: "POST" }),
  },
};

export const api: ApiClient = USE_MOCK ? mockApi : realApi;
export const usandoMock = USE_MOCK;
