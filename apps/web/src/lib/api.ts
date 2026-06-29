import type {
  HabitacionCreate,
  HabitacionUpdate,
  HuespedCreate,
  HuespedUpdate,
  ReservaCreate,
  ReservaUpdate,
  BloqueoCreate,
  TarifaReglaCreate,
  TarifaReglaUpdate,
  ConfigUpdate,
  AmenidadCreate,
  AmenidadUpdate,
  HabitacionAmenidadesSet,
  LandingConfigUpdate,
  LandingLinkCreate,
  LandingLinkUpdate,
} from "@suites/shared";
import type {
  ApiClient,
  Habitacion,
  Huesped,
  HuespedAlojado,
  HistorialItem,
  ReservaListItem,
  ReporteResumen,
  ReporteComparativa,
  ReporteForecast,
  TarifaRegla,
  Cotizacion,
  Config,
  Usuario,
  PublicHabitacion,
  Amenidad,
  HabitacionAmenidad,
  HabitacionFoto,
  LandingConfig,
  LandingFoto,
  LandingLink,
} from "./types.js";
import { ApiError } from "./types.js";
import { mockApi } from "./mockApi.js";

// Re-export para no romper imports existentes (`from "../lib/api.js"`).
export { ApiError };
export type {
  Habitacion,
  Huesped,
  HuespedAlojado,
  HistorialItem,
  ReservaListItem,
  TarifaRegla,
  Cotizacion,
  ReporteResumen,
  ReporteComparativa,
  ReporteForecast,
  Config,
  Usuario,
  PublicHabitacion,
  Amenidad,
  HabitacionAmenidad,
  HabitacionFoto,
  LandingConfig,
  LandingFoto,
  LandingLink,
};

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const USE_MOCK = import.meta.env.VITE_MOCK === "1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return res.json() as Promise<T>;
}

async function upload<T>(path: string, file: File, method = "POST"): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method,
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }
  return res.json() as Promise<T>;
}

const realApi: ApiClient = {
  landing: {
    habitaciones: () => request<PublicHabitacion[]>("/public/habitaciones"),
  },
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
  habitacionFotos: {
    list: (habitacionId: number) =>
      request<HabitacionFoto[]>(`/habitaciones/${habitacionId}/fotos`),
    upload: (habitacionId: number, file: File) =>
      upload<HabitacionFoto>(`/habitaciones/${habitacionId}/fotos`, file),
    remove: (habitacionId: number, fotoId: number) =>
      request<{ ok: true }>(`/habitaciones/${habitacionId}/fotos/${fotoId}`, { method: "DELETE" }),
    reorder: (habitacionId: number, ids: number[]) =>
      request<HabitacionFoto[]>(`/habitaciones/${habitacionId}/fotos/orden`, {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      }),
  },
  huespedes: {
    list: () => request<Huesped[]>("/huespedes"),
    alojados: () => request<HuespedAlojado[]>("/huespedes/alojados"),
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
  amenidades: {
    list: () => request<Amenidad[]>("/amenidades"),
    create: (data: AmenidadCreate) =>
      request<Amenidad>("/amenidades", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: AmenidadUpdate) =>
      request<Amenidad>(`/amenidades/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: true }>(`/amenidades/${id}`, { method: "DELETE" }),
  },
  habitacionAmenidades: {
    get: (habitacionId: number) =>
      request<HabitacionAmenidad[]>(`/habitaciones/${habitacionId}/amenidades`),
    set: (habitacionId: number, data: HabitacionAmenidadesSet) =>
      request<HabitacionAmenidad[]>(`/habitaciones/${habitacionId}/amenidades`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },
  landingManager: {
    getConfig: () => request<LandingConfig | null>("/landing-manager/config"),
    updateConfig: (data: LandingConfigUpdate) =>
      request<LandingConfig>("/landing-manager/config", { method: "PUT", body: JSON.stringify(data) }),
    listFotos: () => request<LandingFoto[]>("/landing-manager/fotos"),
    uploadFoto: (file: File, altTexto?: string) => {
      const form = new FormData();
      form.append("file", file);
      if (altTexto) form.append("altTexto", altTexto);
      return fetch(`${BASE}/landing-manager/fotos`, { method: "POST", body: form, credentials: "include" })
        .then(async (r) => { if (!r.ok) { const b = await r.json().catch(() => ({})); throw new ApiError(r.status, b.message ?? r.statusText, b.error); } return r.json() as Promise<LandingFoto>; });
    },
    removeFoto: (id: number) =>
      request<{ ok: true }>(`/landing-manager/fotos/${id}`, { method: "DELETE" }),
    reorderFotos: (ids: number[]) =>
      request<LandingFoto[]>("/landing-manager/fotos/orden", { method: "PATCH", body: JSON.stringify({ ids }) }),
    listLinks: () => request<LandingLink[]>("/landing-manager/links"),
    createLink: (data: LandingLinkCreate) =>
      request<LandingLink>("/landing-manager/links", { method: "POST", body: JSON.stringify(data) }),
    updateLink: (id: number, data: LandingLinkUpdate) =>
      request<LandingLink>(`/landing-manager/links/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    removeLink: (id: number) =>
      request<{ ok: true }>(`/landing-manager/links/${id}`, { method: "DELETE" }),
    reorderLinks: (ids: number[]) =>
      request<LandingLink[]>("/landing-manager/links/orden", { method: "PATCH", body: JSON.stringify({ ids }) }),
  },
  reportes: {
    resumen: (desde: string, hasta: string) =>
      request<ReporteResumen>(`/reportes/resumen?desde=${desde}&hasta=${hasta}`),
    comparativa: (desde1: string, hasta1: string, desde2: string, hasta2: string) =>
      request<ReporteComparativa>(
        `/reportes/comparativa?desde1=${desde1}&hasta1=${hasta1}&desde2=${desde2}&hasta2=${hasta2}`,
      ),
    forecast: (dias: number) =>
      request<ReporteForecast>(`/reportes/forecast?dias=${dias}`),
  },
  config: {
    get: () => request<Config | null>("/config"),
    update: (data: ConfigUpdate) =>
      request<Config>("/config", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    uploadLogo: (file: File) =>
      upload<{ url: string; config: Config }>("/config/logo", file, "PUT"),
  },
  usuarios: {
    list: () => request<Usuario[]>("/usuarios"),
    setRole: (id: string, role: string) =>
      request<Usuario>(`/usuarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    remove: (id: string) =>
      request<{ ok: true }>(`/usuarios/${id}`, { method: "DELETE" }),
  },
  tarifas: {
    list: () => request<TarifaRegla[]>("/tarifas"),
    create: (data: TarifaReglaCreate) =>
      request<TarifaRegla>("/tarifas", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: number, data: TarifaReglaUpdate) =>
      request<TarifaRegla>(`/tarifas/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    remove: (id: number) =>
      request<{ ok: true }>(`/tarifas/${id}`, { method: "DELETE" }),
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
    cotizar: (habitacionId: number, checkin: string, checkout: string) =>
      request<Cotizacion>(
        `/reservas/cotizar?habitacionId=${habitacionId}&checkin=${checkin}&checkout=${checkout}`,
      ),
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
