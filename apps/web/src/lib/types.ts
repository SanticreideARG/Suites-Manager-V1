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
  checkin: string;
  checkout: string;
  estado: EstadoReserva;
  total: string;
  huesped: string;
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
  reservas: {
    list: (desde?: string, hasta?: string) => Promise<ReservaListItem[]>;
    create: (data: import("@suites/shared").ReservaCreate) => Promise<unknown>;
    update: (
      id: number,
      data: import("@suites/shared").ReservaUpdate,
    ) => Promise<unknown>;
    checkin: (id: number) => Promise<unknown>;
    checkout: (id: number) => Promise<unknown>;
    cancelar: (id: number) => Promise<unknown>;
  };
}
