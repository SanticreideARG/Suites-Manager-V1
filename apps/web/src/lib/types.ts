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
  tipoDocumento: string | null;
  nacionalidad: string | null;
  fechaNacimiento: string | null; // YYYY-MM-DD
  email: string | null;
  telefono: string | null;
  notas: string | null;
}

export interface HuespedAlojado {
  id: number;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  reservaId: number;
  habitacion: string;
  checkin: string;
}

export interface Amenidad {
  id: number;
  nombre: string;
  tipo: "bool" | "texto" | "numero";
  icono: string | null;
}

export interface HabitacionAmenidad {
  amenidadId: number;
  nombre: string;
  tipo: "bool" | "texto" | "numero";
  icono: string | null;
  valor: string | null;
}

export interface HabitacionFoto {
  id: number;
  habitacionId: number;
  url: string;
  orden: number;
  createdAt: string;
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
  landingTagline: string | null;
  landingSubtitulo: string | null;
  landingCtaTexto: string | null;
  landingCtaUrl: string | null;
}

export interface LandingConfig {
  landingTagline: string | null;
  landingSubtitulo: string | null;
  landingCtaTexto: string | null;
  landingCtaUrl: string | null;
}

export interface LandingFoto {
  id: number;
  url: string;
  altTexto: string | null;
  orden: number;
  createdAt: string;
}

export interface LandingLink {
  id: number;
  label: string;
  url: string;
  orden: number;
  activa: boolean;
}

export interface Usuario {
  id: string;
  name: string;
  email: string;
  role: "admin" | "gestor" | "cliente";
  createdAt: string;
}

export interface TarifaRegla {
  id: number;
  nombre: string;
  tipo: "rango" | "finde";
  desde: string | null;
  hasta: string | null;
  factor: string;
  monto: string;
  prioridad: number;
  activa: boolean;
}

export interface LandingServicio {
  id: number;
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
}

export interface LandingContacto {
  id: number;
  label: string;
  url: string;
  iconoUrl: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
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
    tipo: string;
    reservas: number;
    noches: number;
    ingresos: number;
    ocupacionPct: number;
  }[];
  frecuentes: { huesped: string; estadias: number; total: number }[];
}

export interface ReporteComparativa {
  periodo1: { desde: string; hasta: string; dias: number };
  periodo2: { desde: string; hasta: string; dias: number };
  metricas: {
    ingresos: [number, number];
    reservas: [number, number];
    ocupacionPct: [number, number];
    nochesOcupadas: [number, number];
    cancelaciones: [number, number];
    estadiaPromedio: [number, number];
  };
}

export interface ReporteForecast {
  diasHorizonte: number;
  ingresosFuturos: number;
  reservasFuturas: number;
  porHabitacion: {
    habitacion: string;
    ingresos: number;
    noches: number;
    reservas: number;
  }[];
}

export interface Impuesto {
  id: number;
  nombre: string;
  tipo: "porcentaje" | "monto_fijo";
  valor: string;
  aplicaA: "todo" | "habitacion" | "cargo";
  activo: boolean;
  orden: number;
}

export interface MetodoPago {
  id: number;
  tipo: "efectivo" | "transferencia" | "tarjeta" | "qr" | "billetera";
  nombre: string;
  banco: string | null;
  cuotas: number;
  recargoPct: string;
  proveedor: string | null;
  activo: boolean;
}

export interface PagoRegistrado {
  id: number;
  reservaId: number;
  metodoId: number | null;
  metodoPago: string | null;
  monto: string;
  montoBase: string | null;
  montoExtras: string | null;
  referencia: string | null;
  notas: string | null;
  fecha: string;
}

export interface PublicHabitacion {
  id: number;
  nombre: string;
  tipo: string;
  capacidad: number;
  tarifaBase: string;
  fotoUrl: string | null;
}

export type TipoTareaHK = "limpieza" | "mantenimiento" | "inspeccion";
export type PrioridadHK = "baja" | "normal" | "alta" | "urgente";
export type EstadoHK = "pendiente" | "en_proceso" | "completado" | "cancelado";

export interface TareaHousekeeping {
  id: number;
  habitacionId: number;
  habitacionNombre: string | null;
  reservaId: number | null;
  tipo: TipoTareaHK;
  descripcion: string | null;
  prioridad: PrioridadHK;
  estado: EstadoHK;
  fechaProgramada: string;
  asignadoA: string | null;
  notas: string | null;
  completadoAt: string | null;
  createdAt: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  unidad: string;
  categoria: string | null;
  activo: boolean;
}

export interface Consumo {
  id: number;
  reservaId: number;
  servicioId: number | null;
  descripcion: string;
  cantidad: string;
  precioUnit: string;
  subtotal: string;
  fecha: string;
  notas: string | null;
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
  landing: {
    habitaciones: () => Promise<PublicHabitacion[]>;
    disponibilidad: (checkin: string, checkout: string) => Promise<{ checkin: string; checkout: string; disponibles: number[] }>;
  };
  habitaciones: {
    list: () => Promise<Habitacion[]>;
    create: (data: import("@suites/shared").HabitacionCreate) => Promise<Habitacion>;
    update: (
      id: number,
      data: import("@suites/shared").HabitacionUpdate,
    ) => Promise<Habitacion>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  habitacionFotos: {
    list: (habitacionId: number) => Promise<HabitacionFoto[]>;
    upload: (habitacionId: number, file: File) => Promise<HabitacionFoto>;
    remove: (habitacionId: number, fotoId: number) => Promise<{ ok: true }>;
    reorder: (habitacionId: number, ids: number[]) => Promise<HabitacionFoto[]>;
  };
  config: {
    get: () => Promise<Config | null>;
    update: (data: import("@suites/shared").ConfigUpdate) => Promise<Config>;
    uploadLogo: (file: File) => Promise<{ url: string; config: Config }>;
  };
  huespedes: {
    list: () => Promise<Huesped[]>;
    alojados: () => Promise<HuespedAlojado[]>;
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
  amenidades: {
    list: () => Promise<Amenidad[]>;
    create: (data: import("@suites/shared").AmenidadCreate) => Promise<Amenidad>;
    update: (id: number, data: import("@suites/shared").AmenidadUpdate) => Promise<Amenidad>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  habitacionAmenidades: {
    get: (habitacionId: number) => Promise<HabitacionAmenidad[]>;
    set: (
      habitacionId: number,
      data: import("@suites/shared").HabitacionAmenidadesSet,
    ) => Promise<HabitacionAmenidad[]>;
  };
  landingManager: {
    getConfig: () => Promise<LandingConfig | null>;
    updateConfig: (data: import("@suites/shared").LandingConfigUpdate) => Promise<LandingConfig>;
    listFotos: () => Promise<LandingFoto[]>;
    uploadFoto: (file: File, altTexto?: string) => Promise<LandingFoto>;
    removeFoto: (id: number) => Promise<{ ok: true }>;
    reorderFotos: (ids: number[]) => Promise<LandingFoto[]>;
    listLinks: () => Promise<LandingLink[]>;
    createLink: (data: import("@suites/shared").LandingLinkCreate) => Promise<LandingLink>;
    updateLink: (id: number, data: import("@suites/shared").LandingLinkUpdate) => Promise<LandingLink>;
    removeLink: (id: number) => Promise<{ ok: true }>;
    reorderLinks: (ids: number[]) => Promise<LandingLink[]>;
  };
  impuestos: {
    list: () => Promise<Impuesto[]>;
    create: (data: import("@suites/shared").ImpuestoCreate) => Promise<Impuesto>;
    update: (id: number, data: import("@suites/shared").ImpuestoUpdate) => Promise<Impuesto>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  metodosPago: {
    list: () => Promise<MetodoPago[]>;
    create: (data: import("@suites/shared").MetodoPagoCreate) => Promise<MetodoPago>;
    update: (id: number, data: import("@suites/shared").MetodoPagoUpdate) => Promise<MetodoPago>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  pagos: {
    list: (reservaId: number) => Promise<PagoRegistrado[]>;
    registrar: (data: import("@suites/shared").PagoRegistrar) => Promise<PagoRegistrado>;
  };
  reportes: {
    resumen: (desde: string, hasta: string) => Promise<ReporteResumen>;
    comparativa: (desde1: string, hasta1: string, desde2: string, hasta2: string) => Promise<ReporteComparativa>;
    forecast: (dias: number) => Promise<ReporteForecast>;
  };
  usuarios: {
    list: () => Promise<Usuario[]>;
    setRole: (id: string, role: string) => Promise<Usuario>;
    remove: (id: string) => Promise<{ ok: true }>;
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
  housekeeping: {
    list: (params?: { estado?: string; habitacionId?: number; desde?: string; hasta?: string }) => Promise<TareaHousekeeping[]>;
    create: (data: import("@suites/shared").TareaHousekeepingCreate) => Promise<TareaHousekeeping>;
    update: (id: number, data: import("@suites/shared").TareaHousekeepingUpdate) => Promise<TareaHousekeeping>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  servicios: {
    list: () => Promise<Servicio[]>;
    create: (data: import("@suites/shared").ServicioCreate) => Promise<Servicio>;
    update: (id: number, data: import("@suites/shared").ServicioUpdate) => Promise<Servicio>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  consumos: {
    list: (reservaId: number) => Promise<Consumo[]>;
    create: (data: import("@suites/shared").ConsumoCreate) => Promise<Consumo>;
    remove: (id: number) => Promise<{ ok: true }>;
  };
  landingServicios: {
    list: () => Promise<LandingServicio[]>;
    create: (data: import("@suites/shared").LandingServicioCreate) => Promise<LandingServicio>;
    update: (id: number, data: import("@suites/shared").LandingServicioUpdate) => Promise<LandingServicio>;
    remove: (id: number) => Promise<{ ok: true }>;
    uploadImagen: (file: File) => Promise<string>;
  };
  landingContactos: {
    list: () => Promise<LandingContacto[]>;
    create: (data: import("@suites/shared").LandingContactoCreate) => Promise<LandingContacto>;
    update: (id: number, data: import("@suites/shared").LandingContactoUpdate) => Promise<LandingContacto>;
    remove: (id: number) => Promise<{ ok: true }>;
    uploadIcono: (file: File) => Promise<string>;
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
