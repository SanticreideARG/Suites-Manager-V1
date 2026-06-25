import type { EstadoReserva } from "@suites/shared";

export interface Habitacion {
  id: number;
  nombre: string;
  tipo: string;
  capacidad: number;
  tarifaBase: string;
  estado: "libre" | "mantenimiento";
}

export interface ReservaListItem {
  id: number;
  habitacionId: number;
  huespedId: number | null; // null en bloqueos de mantenimiento
  checkin: string;
  checkout: string;
  estado: EstadoReserva;
  total: string;
  huesped: string | null; // null en bloqueos de mantenimiento
}

export interface Huesped {
  id: number;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  notas: string | null;
}

export interface HistorialItem {
  id: number;
  habitacionId: number;
  habitacion: string;
  checkin: string;
  checkout: string;
  estado: EstadoReserva;
  total: string;
}

export interface Config {
  id: number;
  nombre: string;
  razonSocial: string | null;
  cuit: string | null;
  direccion: string | null;
  cp: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  logoUrl: string | null;
}

export interface TarifaRegla {
  id: number;
  nombre: string;
  tipo: "rango" | "finde";
  desde: string | null;
  hasta: string | null;
  factor: string;
  prioridad: number;
  activa: boolean;
}

export interface Cotizacion {
  habitacionId: number;
  checkin: string;
  checkout: string;
  noches: number;
  tarifaBase: number;
  total: number;
}

export interface ReporteResumen {
  periodo: { desde: string; hasta: string; dias: number };
  ocupacionPct: number;
  nochesOcupadas: number;
  ingresos: number;
  reservas: number;
  cancelaciones: number;
  estadiaPromedio: number;
  porHabitacion: {
    habitacion: string;
    reservas: number;
    noches: number;
    ingresos: number;
  }[];
  frecuentes: { huesped: string; estadias: number; total: number }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
  get esOverbooking() {
    return this.code === "overbooking";
  }
  get enUso() {
    return this.code === "en_uso";
  }
}

/** Forma común que cumplen tanto la API real como el mock. */
export interface ApiClient {
  habitaciones: {
    list: () => Promise<Habitacion[]>;
    create: (data: import("@suites/shared").HabitacionCreate) => Promise<Habitacion>;
    update: (
      id: number,
      data: import("@suites/shared").HabitacionUpdate,
    ) => Promise<Habitacion>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  huespedes: {
    list: () => Promise<Huesped[]>;
    create: (
      data: import("@suites/shared").HuespedCreate,
    ) => Promise<Huesped>;
    update: (
      id: number,
      data: import("@suites/shared").HuespedUpdate,
    ) => Promise<Huesped>;
    remove: (id: number) => Promise<{ ok: true }>;
    historial: (id: number) => Promise<HistorialItem[]>;
  };
  reportes: {
    resumen: (desde: string, hasta: string) => Promise<ReporteResumen>;
  };
  config: {
    get: () => Promise<Config | null>;
    update: (data: import("@suites/shared").ConfigUpdate) => Promise<Config>;
  };
  tarifas: {
    list: () => Promise<TarifaRegla[]>;
    create: (
      data: import("@suites/shared").TarifaReglaCreate,
    ) => Promise<TarifaRegla>;
    update: (
      id: number,
      data: import("@suites/shared").TarifaReglaUpdate,
    ) => Promise<TarifaRegla>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  reservas: {
    list: (desde?: string, hasta?: string) => Promise<ReservaListItem[]>;
    create: (data: import("@suites/shared").ReservaCreate) => Promise<unknown>;
    cotizar: (
      habitacionId: number,
      checkin: string,
      checkout: string,
    ) => Promise<Cotizacion>;
    mantenimiento: (
      data: import("@suites/shared").BloqueoCreate,
    ) => Promise<unknown>;
    update: (
      id: number,
      data: import("@suites/shared").ReservaUpdate,
    ) => Promise<unknown>;
    checkin: (id: number) => Promise<unknown>;
    checkout: (id: number) => Promise<unknown>;
    cancelar: (id: number) => Promise<unknown>;
  };
}
