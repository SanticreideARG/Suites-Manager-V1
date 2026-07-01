import type {
  ApiClient,
  Habitacion,
  Huesped,
  HuespedAlojado,
  ReservaListItem,
  ReporteResumen,
  ReporteComparativa,
  ReporteForecast,
  TarifaRegla,
  Config,
  Usuario,
  PublicHabitacion,
  Amenidad,
  HabitacionAmenidad,
  HabitacionFoto,
  LandingConfig,
  LandingFoto,
  LandingLink,
  Impuesto,
  MetodoPago,
  PagoRegistrado,
  TareaHousekeeping,
  Servicio,
  Consumo,
  LandingServicio,
  LandingContacto,
  AuditLogEntry,
  AuditLogPage,
  PoliticaCancelacion,
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
let seqAmen = 0;

interface ReservaInterna extends ReservaListItem {}

const habitaciones: Habitacion[] = [
  { id: ++seqHab, nombre: "Cabaña 1", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Cabaña 2", tipo: "Cabaña", capacidad: 4, tarifaBase: "45000", estado: "libre" },
  { id: ++seqHab, nombre: "Suite Río", tipo: "Suite", capacidad: 2, tarifaBase: "60000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 101", tipo: "Standard", capacidad: 2, tarifaBase: "30000", estado: "libre" },
  { id: ++seqHab, nombre: "Hab. 102", tipo: "Standard", capacidad: 3, tarifaBase: "35000", estado: "mantenimiento" },
];

const huespedes: Huesped[] = [
  { id: ++seqHuesped, nombre: "Familia Gómez", documento: "30111222", tipoDocumento: "DNI", nacionalidad: "Argentina", fechaNacimiento: null, email: "gomez@mail.com", telefono: "+54 11 5555-1111", notas: "Vienen con mascota." },
  { id: ++seqHuesped, nombre: "Lucía Fernández", documento: "28999111", tipoDocumento: "DNI", nacionalidad: "Argentina", fechaNacimiento: "1990-03-15", email: "lucia@mail.com", telefono: null, notas: null },
  { id: ++seqHuesped, nombre: "Martín Pérez", documento: null, tipoDocumento: null, nacionalidad: null, fechaNacimiento: null, email: null, telefono: "+54 9 11 4444-2222", notas: "Pidió cuna." },
  { id: ++seqHuesped, nombre: "Carlos Ruiz", documento: null, tipoDocumento: null, nacionalidad: "Uruguay", fechaNacimiento: "1985-07-22", email: "carlos@mail.com", telefono: null, notas: null },
  { id: ++seqHuesped, nombre: "Ana Torres", documento: "33222111", tipoDocumento: "DNI", nacionalidad: "Argentina", fechaNacimiento: null, email: null, telefono: null, notas: "Cliente frecuente." },
];

// Catálogo de amenidades (características)
const amenidadesMock: Amenidad[] = [
  { id: ++seqAmen, nombre: "Aire acondicionado", tipo: "bool", icono: "❄️" },
  { id: ++seqAmen, nombre: "Baño privado", tipo: "bool", icono: "🚿" },
  { id: ++seqAmen, nombre: "Balcón o terraza", tipo: "bool", icono: "🌿" },
  { id: ++seqAmen, nombre: "Calefacción", tipo: "bool", icono: "🔥" },
  { id: ++seqAmen, nombre: "Cocina/kitchenette", tipo: "bool", icono: "🍳" },
  { id: ++seqAmen, nombre: "Disposición de camas", tipo: "texto", icono: "🛏️" },
  { id: ++seqAmen, nombre: "Superficie (m²)", tipo: "numero", icono: "📐" },
  { id: ++seqAmen, nombre: "Televisor", tipo: "bool", icono: "📺" },
  { id: ++seqAmen, nombre: "WiFi", tipo: "bool", icono: "📶" },
];

type AsignacionAmen = { amenidadId: number; valor: string | null };
const habitacionAmenidadesMock: Record<number, AsignacionAmen[]> = {
  1: [{ amenidadId: 2, valor: null }, { amenidadId: 4, valor: null }, { amenidadId: 7, valor: "45" }, { amenidadId: 8, valor: null }, { amenidadId: 9, valor: null }, { amenidadId: 6, valor: "2 matrimoniales" }],
  2: [{ amenidadId: 2, valor: null }, { amenidadId: 4, valor: null }, { amenidadId: 7, valor: "45" }, { amenidadId: 8, valor: null }, { amenidadId: 9, valor: null }],
  3: [{ amenidadId: 1, valor: null }, { amenidadId: 2, valor: null }, { amenidadId: 3, valor: null }, { amenidadId: 7, valor: "30" }, { amenidadId: 8, valor: null }, { amenidadId: 9, valor: null }],
  4: [{ amenidadId: 2, valor: null }, { amenidadId: 7, valor: "20" }, { amenidadId: 9, valor: null }],
  5: [{ amenidadId: 2, valor: null }, { amenidadId: 9, valor: null }],
};

function resolveAmenidades(habitacionId: number): HabitacionAmenidad[] {
  return (habitacionAmenidadesMock[habitacionId] ?? []).map((a) => {
    const cat = amenidadesMock.find((x) => x.id === a.amenidadId)!;
    return { amenidadId: a.amenidadId, nombre: cat.nombre, tipo: cat.tipo, icono: cat.icono, valor: a.valor };
  });
}

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

// ---- Configuración (mock) ----
let configMock: Config = {
  id: 1,
  nombre: "Suites Manager",
  razonSocial: "Mi Alojamiento S.R.L.",
  cuit: "30-00000000-0",
  direccion: "Av. Siempreviva 742",
  cp: null,
  ciudad: null,
  provincia: null,
  pais: "Argentina",
  telefono: "+54 9 11 0000-0000",
  email: "reservas@mialojamiento.com",
  logoUrl: null,
  landingTagline: null,
  landingSubtitulo: null,
  landingCtaTexto: null,
  landingCtaUrl: null,
};

// ---- Landing Manager (mock) ----
let landingConfigMock: LandingConfig = {
  landingTagline: "Tu descanso, nuestra prioridad",
  landingSubtitulo: "Alojamientos únicos para experiencias únicas. Reservá online.",
  landingCtaTexto: "Ver disponibilidad",
  landingCtaUrl: "#disponibilidad",
};
let seqLandingFoto = 0;
const landingFotosMock: LandingFoto[] = [];
let seqLandingLink = 0;
const landingLinksMock: LandingLink[] = [
  { id: ++seqLandingLink, label: "Inicio", url: "#inicio", orden: 0, activa: true },
  { id: ++seqLandingLink, label: "Alojamientos", url: "#alojamientos", orden: 1, activa: true },
  { id: ++seqLandingLink, label: "Contacto", url: "#contacto", orden: 2, activa: true },
];

// ---- Facturación (mock) ----
let seqImpuesto = 0;
const impuestosMock: Impuesto[] = [
  { id: ++seqImpuesto, nombre: "IVA", tipo: "porcentaje", valor: "21.0000", aplicaA: "todo", activo: true, orden: 0 },
  { id: ++seqImpuesto, nombre: "Tasa municipal", tipo: "porcentaje", valor: "2.5000", aplicaA: "todo", activo: true, orden: 1 },
];

let seqMetodoPago = 0;
const metodosPagoMock: MetodoPago[] = [
  { id: ++seqMetodoPago, tipo: "efectivo", nombre: "Efectivo", banco: null, cuotas: 1, recargoPct: "0.00", proveedor: null, activo: true },
  { id: ++seqMetodoPago, tipo: "transferencia", nombre: "Transferencia bancaria", banco: "Banco Nación", cuotas: 1, recargoPct: "0.00", proveedor: null, activo: true },
  { id: ++seqMetodoPago, tipo: "tarjeta", nombre: "Tarjeta de crédito (Visa)", banco: "Galicia", cuotas: 3, recargoPct: "10.00", proveedor: null, activo: true },
  { id: ++seqMetodoPago, tipo: "qr", nombre: "Mercado Pago QR", banco: null, cuotas: 1, recargoPct: "3.50", proveedor: "Mercado Pago", activo: true },
];

let seqPago = 0;
const pagosMock: PagoRegistrado[] = [];

// ---- Servicios adicionales / Consumos (mock) ----
let seqServicio = 0;
const serviciosMock: Servicio[] = [
  { id: ++seqServicio, nombre: "Desayuno continental", descripcion: null, precio: "1500.00", unidad: "persona", categoria: "consumos", activo: true },
  { id: ++seqServicio, nombre: "Almuerzo", descripcion: null, precio: "2500.00", unidad: "persona", categoria: "consumos", activo: true },
  { id: ++seqServicio, nombre: "Cena", descripcion: null, precio: "3000.00", unidad: "persona", categoria: "consumos", activo: true },
  { id: ++seqServicio, nombre: "Transfer aeropuerto", descripcion: null, precio: "8000.00", unidad: "unidad", categoria: "servicios", activo: true },
  { id: ++seqServicio, nombre: "Lavandería", descripcion: null, precio: "1200.00", unidad: "kg", categoria: "servicios", activo: true },
  { id: ++seqServicio, nombre: "Late check-out (por hora)", descripcion: null, precio: "2000.00", unidad: "hora", categoria: "cargos", activo: true },
  { id: ++seqServicio, nombre: "Descuento fidelidad", descripcion: null, precio: "1000.00", unidad: "unidad", categoria: "bonificaciones", activo: true },
];

let seqConsumo = 0;
const consumosMock: Consumo[] = [];

// ---- Políticas de cancelación (mock) ----
let seqPolitica = 0;
const politicasCancelacionMock: PoliticaCancelacion[] = [];

function cargoCancelacionMock(
  total: number,
  checkin: string,
): { diasRestantes: number; porcentaje: number; monto: number } {
  const diasRestantes = diffDays(hoy, checkin);
  const activas = politicasCancelacionMock.filter((p) => p.activa);

  let mejor: PoliticaCancelacion | null = null;
  for (const p of activas) {
    if (p.diasMinimos > diasRestantes) continue;
    if (!mejor || p.diasMinimos > mejor.diasMinimos) mejor = p;
  }
  // Si ninguna calificó (diasRestantes por debajo de todos los umbrales, ej.
  // checkin ya pasado), la de menor diasMinimos actúa como piso.
  if (!mejor && activas.length > 0) {
    mejor = activas.reduce((min, p) => (p.diasMinimos < min.diasMinimos ? p : min));
  }

  const porcentaje = mejor ? Number(mejor.porcentaje) : 0;
  const monto = Math.round(total * (porcentaje / 100) * 100) / 100;
  return { diasRestantes, porcentaje, monto };
}

// ---- Housekeeping (mock) ----
let seqHK = 0;
const hkMock: TareaHousekeeping[] = [
  {
    id: ++seqHK, habitacionId: 1, habitacionNombre: "Cabaña 1", reservaId: null,
    tipo: "limpieza", descripcion: "Limpieza post check-out", prioridad: "alta",
    estado: "pendiente", fechaProgramada: hoy, asignadoA: null, notas: null,
    completadoAt: null, createdAt: new Date().toISOString(),
  },
  {
    id: ++seqHK, habitacionId: 2, habitacionNombre: "Cabaña 2", reservaId: null,
    tipo: "limpieza", descripcion: "Limpieza semanal", prioridad: "normal",
    estado: "en_proceso", fechaProgramada: hoy, asignadoA: "María García", notas: null,
    completadoAt: null, createdAt: new Date().toISOString(),
  },
  {
    id: ++seqHK, habitacionId: 3, habitacionNombre: "Suite Río", reservaId: null,
    tipo: "inspeccion", descripcion: "Inspección antes de ocupación", prioridad: "alta",
    estado: "pendiente", fechaProgramada: hoy, asignadoA: null, notas: "Verificar A/C y TV",
    completadoAt: null, createdAt: new Date().toISOString(),
  },
  {
    id: ++seqHK, habitacionId: 4, habitacionNombre: "Hab. 101", reservaId: null,
    tipo: "mantenimiento", descripcion: "Cambio de luminaria baño", prioridad: "baja",
    estado: "pendiente", fechaProgramada: addDays(hoy, 1), asignadoA: "Carlos López", notas: null,
    completadoAt: null, createdAt: new Date().toISOString(),
  },
  {
    id: ++seqHK, habitacionId: 1, habitacionNombre: "Cabaña 1", reservaId: null,
    tipo: "limpieza", descripcion: "Limpieza pre check-in", prioridad: "normal",
    estado: "completado", fechaProgramada: addDays(hoy, -1), asignadoA: "María García", notas: null,
    completadoAt: new Date().toISOString(), createdAt: new Date().toISOString(),
  },
];

// ---- Fotos de habitaciones (mock) ----
let seqFoto = 0;
const habitacionFotosMock: Record<number, HabitacionFoto[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };

// ---- Usuarios (mock) ----
const usuariosMock: Usuario[] = [
  { id: "u1", name: "Admin Demo", email: "admin@demo.test", role: "admin", createdAt: "2026-06-01T00:00:00Z" },
  { id: "u2", name: "Recepción", email: "gestor@demo.test", role: "gestor", createdAt: "2026-06-05T00:00:00Z" },
  { id: "u3", name: "Cliente Demo", email: "cliente@demo.test", role: "cliente", createdAt: "2026-06-10T00:00:00Z" },
];

// ---- Tarifas dinámicas (mock) ----
let seqRegla = 0;
const tarifaReglas: TarifaRegla[] = [];

function factorNoche(fecha: string): number {
  const dow = new Date(fecha + "T00:00:00Z").getUTCDay();
  const esFinde = dow === 0 || dow === 6;
  let mejor: TarifaRegla | null = null;
  for (const r of tarifaReglas) {
    if (!r.activa) continue;
    const aplica =
      (r.tipo === "finde" && esFinde) ||
      (r.tipo === "rango" &&
        r.desde != null &&
        r.hasta != null &&
        fecha >= r.desde &&
        fecha < r.hasta);
    if (!aplica) continue;
    if (
      !mejor ||
      r.prioridad > mejor.prioridad ||
      (r.prioridad === mejor.prioridad && Number(r.factor) > Number(mejor.factor))
    ) {
      mejor = r;
    }
  }
  return mejor ? Number(mejor.factor) : 1;
}

function totalConReglas(base: number, ci: string, co: string): number {
  let total = 0;
  for (let d = ci; d < co; d = addDays(d, 1)) total += base * factorNoche(d);
  return Math.round(total * 100) / 100;
}

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
  housekeeping: {
    list: (params?) => {
      let result = [...hkMock];
      if (params?.estado)       result = result.filter(t => t.estado === params.estado);
      if (params?.habitacionId) result = result.filter(t => t.habitacionId === params.habitacionId);
      if (params?.desde)        result = result.filter(t => t.fechaProgramada >= params.desde!);
      if (params?.hasta)        result = result.filter(t => t.fechaProgramada < params.hasta!);
      return delay([...result].sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada)));
    },
    create: (data) => {
      const hab = habitaciones.find(h => h.id === data.habitacionId);
      const t: TareaHousekeeping = {
        id: ++seqHK,
        habitacionId: data.habitacionId,
        habitacionNombre: hab?.nombre ?? null,
        reservaId: data.reservaId ?? null,
        tipo: data.tipo ?? "limpieza",
        descripcion: data.descripcion ?? null,
        prioridad: data.prioridad ?? "normal",
        estado: "pendiente",
        fechaProgramada: data.fechaProgramada,
        asignadoA: data.asignadoA ?? null,
        notas: data.notas ?? null,
        completadoAt: null,
        createdAt: new Date().toISOString(),
      };
      hkMock.push(t);
      return delay({ ...t });
    },
    update: (id, data) => {
      const t = hkMock.find(x => x.id === id);
      if (!t) throw new ApiError(404, "No encontrada");
      if (data.tipo !== undefined) t.tipo = data.tipo;
      if (data.descripcion !== undefined) t.descripcion = data.descripcion;
      if (data.prioridad !== undefined) t.prioridad = data.prioridad;
      if (data.estado !== undefined) {
        t.estado = data.estado;
        t.completadoAt = data.estado === "completado" ? new Date().toISOString() : null;
      }
      if (data.fechaProgramada !== undefined) t.fechaProgramada = data.fechaProgramada;
      if (data.asignadoA !== undefined) t.asignadoA = data.asignadoA;
      if (data.notas !== undefined) t.notas = data.notas;
      return delay({ ...t });
    },
    remove: (id) => {
      const idx = hkMock.findIndex(x => x.id === id);
      if (idx === -1) throw new ApiError(404, "No encontrada");
      hkMock.splice(idx, 1);
      return delay({ ok: true as const });
    },
  },
  landing: {
    habitaciones: () =>
      delay(
        habitaciones.map((h): PublicHabitacion => ({
          id: h.id,
          nombre: h.nombre,
          tipo: h.tipo,
          capacidad: h.capacidad,
          tarifaBase: h.tarifaBase,
          fotoUrl: null,
        })),
      ),
    disponibilidad: (checkin: string, checkout: string) => {
      const bloqueadas = new Set(
        reservas
          .filter(
            (r) =>
              r.estado !== "cancelada" &&
              r.checkin < checkout &&
              r.checkout > checkin,
          )
          .map((r) => r.habitacionId),
      );
      const disponibles = habitaciones
        .filter((h) => !bloqueadas.has(h.id))
        .map((h) => h.id);
      return delay({ checkin, checkout, disponibles });
    },
  },
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
      delay([...huespedes].sort((a, b) => a.nombre.localeCompare(b.nombre))),
    alojados: () =>
      delay(
        reservas
          .filter((r) => r.estado === "ocupada" && r.huespedId != null)
          .map((r) => {
            const h = huespedes.find((x) => x.id === r.huespedId)!;
            const hab = habitaciones.find((x) => x.id === r.habitacionId)!;
            return {
              id: h.id,
              nombre: h.nombre,
              documento: h.documento,
              email: h.email,
              telefono: h.telefono,
              reservaId: r.id,
              habitacion: hab.nombre,
              checkin: r.checkin,
            } satisfies HuespedAlojado;
          })
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      ),
    create: (data) => {
      const h: Huesped = {
        id: ++seqHuesped,
        nombre: data.nombre,
        documento: data.documento ?? null,
        tipoDocumento: data.tipoDocumento ?? null,
        nacionalidad: data.nacionalidad ?? null,
        fechaNacimiento: data.fechaNacimiento ?? null,
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
      if (data.tipoDocumento !== undefined) h.tipoDocumento = data.tipoDocumento ?? null;
      if (data.nacionalidad !== undefined) h.nacionalidad = data.nacionalidad ?? null;
      if (data.fechaNacimiento !== undefined) h.fechaNacimiento = data.fechaNacimiento ?? null;
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
  amenidades: {
    list: () =>
      delay([...amenidadesMock].sort((a, b) => a.nombre.localeCompare(b.nombre))),
    create: (data) => {
      const a: Amenidad = {
        id: ++seqAmen,
        nombre: data.nombre,
        tipo: data.tipo ?? "bool",
        icono: data.icono ?? null,
      };
      amenidadesMock.push(a);
      return delay(a);
    },
    update: (id, data) => {
      const a = amenidadesMock.find((x) => x.id === id);
      if (!a) return Promise.reject(new ApiError(404, "No encontrada"));
      if (data.nombre !== undefined) a.nombre = data.nombre;
      if (data.tipo !== undefined) a.tipo = data.tipo;
      if (data.icono !== undefined) a.icono = data.icono ?? null;
      return delay(a);
    },
    remove: (id) => {
      const i = amenidadesMock.findIndex((x) => x.id === id);
      if (i >= 0) amenidadesMock.splice(i, 1);
      for (const key of Object.keys(habitacionAmenidadesMock)) {
        const arr = habitacionAmenidadesMock[Number(key)];
        if (!arr) continue;
        const j = arr.findIndex((a) => a.amenidadId === id);
        if (j >= 0) arr.splice(j, 1);
      }
      return delay({ ok: true } as const);
    },
  },
  habitacionAmenidades: {
    get: (habitacionId) => delay(resolveAmenidades(habitacionId)),
    set: (habitacionId, data) => {
      habitacionAmenidadesMock[habitacionId] = data.map((a) => ({
        amenidadId: a.amenidadId,
        valor: a.valor ?? null,
      }));
      return delay(resolveAmenidades(habitacionId));
    },
  },
  habitacionFotos: {
    list: (habitacionId) => delay([...(habitacionFotosMock[habitacionId] ?? [])]),
    upload: (habitacionId, file) => {
      const arr = habitacionFotosMock[habitacionId] ?? [];
      const foto: HabitacionFoto = {
        id: ++seqFoto,
        habitacionId,
        url: URL.createObjectURL(file),
        orden: arr.length,
        createdAt: new Date().toISOString(),
      };
      arr.push(foto);
      habitacionFotosMock[habitacionId] = arr;
      return delay(foto);
    },
    remove: (habitacionId, fotoId) => {
      const arr = habitacionFotosMock[habitacionId] ?? [];
      const i = arr.findIndex((f) => f.id === fotoId);
      if (i >= 0) arr.splice(i, 1);
      arr.forEach((f, idx) => { f.orden = idx; });
      return delay({ ok: true } as const);
    },
    reorder: (habitacionId, ids) => {
      const arr = habitacionFotosMock[habitacionId] ?? [];
      const sorted = ids
        .map((id, idx) => {
          const f = arr.find((x) => x.id === id);
          if (f) f.orden = idx;
          return f;
        })
        .filter(Boolean) as HabitacionFoto[];
      habitacionFotosMock[habitacionId] = sorted;
      return delay([...sorted]);
    },
  },
  tarifas: {
    list: () =>
      delay([...tarifaReglas].sort((a, b) => b.prioridad - a.prioridad)),
    create: (data) => {
      const r: TarifaRegla = {
        id: ++seqRegla,
        nombre: data.nombre,
        tipo: data.tipo,
        desde: data.desde ?? null,
        hasta: data.hasta ?? null,
        factor: String(data.factor),
        monto: String(data.monto ?? 0),
        prioridad: data.prioridad ?? 0,
        activa: data.activa ?? true,
      };
      tarifaReglas.push(r);
      return delay(r);
    },
    update: (id, data) => {
      const r = tarifaReglas.find((x) => x.id === id);
      if (!r) return Promise.reject(new ApiError(404, "No encontrada"));
      if (data.nombre !== undefined) r.nombre = data.nombre;
      if (data.tipo !== undefined) r.tipo = data.tipo;
      if (data.desde !== undefined) r.desde = data.desde ?? null;
      if (data.hasta !== undefined) r.hasta = data.hasta ?? null;
      if (data.factor !== undefined) r.factor = String(data.factor);
      if (data.monto !== undefined) r.monto = String(data.monto);
      if (data.prioridad !== undefined) r.prioridad = data.prioridad;
      if (data.activa !== undefined) r.activa = data.activa;
      return delay(r);
    },
    remove: (id) => {
      const i = tarifaReglas.findIndex((x) => x.id === id);
      if (i >= 0) tarifaReglas.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  config: {
    get: () => delay(configMock),
    update: (data) => {
      configMock = { ...configMock, ...data };
      return delay(configMock);
    },
    uploadLogo: (file) => {
      const url = URL.createObjectURL(file);
      configMock = { ...configMock, logoUrl: url };
      return delay({ url, config: configMock });
    },
  },
  usuarios: {
    list: () => delay([...usuariosMock]),
    setRole: (id, role) => {
      const u = usuariosMock.find((x) => x.id === id);
      if (!u) return Promise.reject(new ApiError(404, "No encontrado"));
      u.role = role as Usuario["role"];
      return delay(u);
    },
    remove: (id) => {
      const i = usuariosMock.findIndex((x) => x.id === id);
      if (i >= 0) usuariosMock.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  landingManager: {
    getConfig: () => delay({ ...landingConfigMock }),
    updateConfig: (data) => {
      landingConfigMock = { ...landingConfigMock, ...data };
      return delay({ ...landingConfigMock });
    },
    listFotos: () => delay([...landingFotosMock].sort((a, b) => a.orden - b.orden)),
    uploadFoto: (file, altTexto) => {
      const foto: LandingFoto = {
        id: ++seqLandingFoto,
        url: URL.createObjectURL(file),
        altTexto: altTexto ?? null,
        orden: landingFotosMock.length,
        createdAt: new Date().toISOString(),
      };
      landingFotosMock.push(foto);
      return delay(foto);
    },
    removeFoto: (id) => {
      const i = landingFotosMock.findIndex((f) => f.id === id);
      if (i >= 0) { landingFotosMock.splice(i, 1); landingFotosMock.forEach((f, idx) => { f.orden = idx; }); }
      return delay({ ok: true } as const);
    },
    reorderFotos: (ids) => {
      ids.forEach((id, idx) => { const f = landingFotosMock.find((x) => x.id === id); if (f) f.orden = idx; });
      landingFotosMock.sort((a, b) => a.orden - b.orden);
      return delay([...landingFotosMock]);
    },
    listLinks: () => delay([...landingLinksMock].sort((a, b) => a.orden - b.orden)),
    createLink: (data) => {
      const link: LandingLink = { id: ++seqLandingLink, label: data.label, url: data.url, orden: landingLinksMock.length, activa: data.activa ?? true };
      landingLinksMock.push(link);
      return delay(link);
    },
    updateLink: (id, data) => {
      const l = landingLinksMock.find((x) => x.id === id);
      if (!l) return Promise.reject(new ApiError(404, "No encontrado"));
      if (data.label !== undefined) l.label = data.label;
      if (data.url !== undefined) l.url = data.url;
      if (data.activa !== undefined) l.activa = data.activa;
      return delay({ ...l });
    },
    removeLink: (id) => {
      const i = landingLinksMock.findIndex((x) => x.id === id);
      if (i >= 0) { landingLinksMock.splice(i, 1); landingLinksMock.forEach((l, idx) => { l.orden = idx; }); }
      return delay({ ok: true } as const);
    },
    reorderLinks: (ids) => {
      ids.forEach((id, idx) => { const l = landingLinksMock.find((x) => x.id === id); if (l) l.orden = idx; });
      landingLinksMock.sort((a, b) => a.orden - b.orden);
      return delay([...landingLinksMock]);
    },
  },
  impuestos: {
    list: () => delay([...impuestosMock].sort((a, b) => a.orden - b.orden || a.id - b.id)),
    create: (data) => {
      const imp: Impuesto = {
        id: ++seqImpuesto,
        nombre: data.nombre,
        tipo: data.tipo,
        valor: String(data.valor),
        aplicaA: data.aplicaA ?? "todo",
        activo: data.activo ?? true,
        orden: data.orden ?? 0,
      };
      impuestosMock.push(imp);
      return delay(imp);
    },
    update: (id, data) => {
      const imp = impuestosMock.find((x) => x.id === id);
      if (!imp) return Promise.reject(new ApiError(404, "No encontrado"));
      if (data.nombre !== undefined) imp.nombre = data.nombre;
      if (data.tipo !== undefined) imp.tipo = data.tipo;
      if (data.valor !== undefined) imp.valor = String(data.valor);
      if (data.aplicaA !== undefined) imp.aplicaA = data.aplicaA ?? "todo";
      if (data.activo !== undefined) imp.activo = data.activo;
      if (data.orden !== undefined) imp.orden = data.orden ?? 0;
      return delay({ ...imp });
    },
    remove: (id) => {
      const i = impuestosMock.findIndex((x) => x.id === id);
      if (i >= 0) impuestosMock.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  metodosPago: {
    list: () => delay([...metodosPagoMock]),
    create: (data) => {
      const m: MetodoPago = {
        id: ++seqMetodoPago,
        tipo: data.tipo,
        nombre: data.nombre,
        banco: data.banco ?? null,
        cuotas: data.cuotas ?? 1,
        recargoPct: String(data.recargoPct ?? 0),
        proveedor: data.proveedor ?? null,
        activo: data.activo ?? true,
      };
      metodosPagoMock.push(m);
      return delay(m);
    },
    update: (id, data) => {
      const m = metodosPagoMock.find((x) => x.id === id);
      if (!m) return Promise.reject(new ApiError(404, "No encontrado"));
      if (data.tipo !== undefined) m.tipo = data.tipo;
      if (data.nombre !== undefined) m.nombre = data.nombre;
      if (data.banco !== undefined) m.banco = data.banco ?? null;
      if (data.cuotas !== undefined) m.cuotas = data.cuotas ?? 1;
      if (data.recargoPct !== undefined) m.recargoPct = String(data.recargoPct ?? 0);
      if (data.proveedor !== undefined) m.proveedor = data.proveedor ?? null;
      if (data.activo !== undefined) m.activo = data.activo;
      return delay({ ...m });
    },
    remove: (id) => {
      const i = metodosPagoMock.findIndex((x) => x.id === id);
      if (i >= 0) metodosPagoMock.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  pagos: {
    list: (reservaId) =>
      delay([...pagosMock].filter((p) => p.reservaId === reservaId).sort((a, b) => b.fecha.localeCompare(a.fecha))),
    registrar: (data) => {
      const metodo = metodosPagoMock.find((m) => m.id === data.metodoId);
      if (!metodo) return Promise.reject(new ApiError(404, "Método no encontrado"));
      const montoBase = data.montoBase;
      const montoExtras = data.montoExtras ?? 0;
      const recargo = Number(metodo.recargoPct);
      const monto = Math.round((montoBase + montoExtras) * (1 + recargo / 100) * 100) / 100;
      const pago: PagoRegistrado = {
        id: ++seqPago,
        reservaId: data.reservaId,
        metodoId: data.metodoId,
        metodoPago: metodo.nombre,
        monto: String(monto),
        montoBase: String(montoBase),
        montoExtras: String(montoExtras),
        referencia: data.referencia ?? null,
        notas: data.notas ?? null,
        fecha: new Date().toISOString(),
      };
      pagosMock.push(pago);
      return delay(pago);
    },
  },
  servicios: {
    list: () => delay([...serviciosMock].sort((a, b) => a.nombre.localeCompare(b.nombre))),
    create: (data) => {
      const s: Servicio = {
        id: ++seqServicio,
        nombre: data.nombre,
        descripcion: data.descripcion ?? null,
        precio: String(data.precio),
        unidad: data.unidad ?? "unidad",
        categoria: data.categoria ?? "servicios",
        activo: data.activo ?? true,
      };
      serviciosMock.push(s);
      return delay(s);
    },
    update: (id, data) => {
      const s = serviciosMock.find((x) => x.id === id);
      if (!s) return Promise.reject(new ApiError(404, "No encontrado"));
      if (data.nombre !== undefined) s.nombre = data.nombre;
      if (data.descripcion !== undefined) s.descripcion = data.descripcion ?? null;
      if (data.precio !== undefined) s.precio = String(data.precio);
      if (data.unidad !== undefined) s.unidad = data.unidad;
      if (data.categoria !== undefined) s.categoria = data.categoria;
      if (data.activo !== undefined) s.activo = data.activo;
      return delay({ ...s });
    },
    remove: (id) => {
      const i = serviciosMock.findIndex((x) => x.id === id);
      if (i >= 0) serviciosMock.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  consumos: {
    list: (reservaId) =>
      delay([...consumosMock].filter((c) => c.reservaId === reservaId).sort((a, b) => a.fecha.localeCompare(b.fecha))),
    create: (data) => {
      const r = reservas.find((x) => x.id === data.reservaId);
      if (!r) return Promise.reject(new ApiError(404, "Reserva inexistente"));
      const cantidad = data.cantidad ?? 1;
      const subtotal = Math.round(cantidad * data.precioUnit * 100) / 100;
      const categoria = data.categoria ?? "servicios";
      const efecto = categoria === "bonificaciones" ? -subtotal : subtotal;
      const c: Consumo = {
        id: ++seqConsumo,
        reservaId: data.reservaId,
        servicioId: data.servicioId ?? null,
        descripcion: data.descripcion,
        categoria,
        cantidad: String(cantidad),
        precioUnit: String(data.precioUnit),
        subtotal: String(subtotal),
        fecha: new Date().toISOString(),
        notas: data.notas ?? null,
      };
      consumosMock.push(c);
      r.total = String(Number(r.total) + efecto);
      return delay(c);
    },
    remove: (id) => {
      const i = consumosMock.findIndex((x) => x.id === id);
      if (i === -1) return Promise.reject(new ApiError(404, "No encontrado"));
      const [c] = consumosMock.splice(i, 1) as [Consumo];
      const r = reservas.find((x) => x.id === c.reservaId);
      const efecto = c.categoria === "bonificaciones" ? Number(c.subtotal) : -Number(c.subtotal);
      if (r) r.total = String(Number(r.total) + efecto);
      return delay({ ok: true } as const);
    },
  },
  landingServicios: (() => {
    let seq = 0;
    const items: LandingServicio[] = [
      { id: ++seq, titulo: "Wi-Fi de alta velocidad", descripcion: "Conexión ilimitada en todas las habitaciones y áreas comunes.", imagenUrl: null, orden: 0, activo: true, createdAt: new Date().toISOString() },
      { id: ++seq, titulo: "Desayuno incluido", descripcion: "Desayuno continental servido cada mañana de 7 a 10 hs.", imagenUrl: null, orden: 1, activo: true, createdAt: new Date().toISOString() },
      { id: ++seq, titulo: "Piscina", descripcion: "Piscina al aire libre disponible de diciembre a marzo.", imagenUrl: null, orden: 2, activo: true, createdAt: new Date().toISOString() },
    ];
    return {
      list: () => delay([...items].sort((a, b) => a.orden - b.orden || a.id - b.id)),
      create: (data) => {
        const item: LandingServicio = { id: ++seq, titulo: data.titulo, descripcion: data.descripcion ?? null, imagenUrl: data.imagenUrl || null, orden: data.orden ?? 0, activo: data.activo ?? true, createdAt: new Date().toISOString() };
        items.push(item);
        return delay(item);
      },
      update: (id, data) => {
        const item = items.find((x) => x.id === id);
        if (!item) return Promise.reject(new ApiError(404, "No encontrado"));
        Object.assign(item, { ...data, imagenUrl: data.imagenUrl !== undefined ? (data.imagenUrl || null) : item.imagenUrl });
        return delay({ ...item });
      },
      remove: (id) => {
        const i = items.findIndex((x) => x.id === id);
        if (i >= 0) items.splice(i, 1);
        return delay({ ok: true } as const);
      },
      uploadImagen: (_file: File) => delay("https://placehold.co/400x300/png"),
    };
  })(),
  landingContactos: (() => {
    let seq = 0;
    const items: LandingContacto[] = [
      { id: ++seq, label: "Email", url: "mailto:info@ejemplo.com", iconoUrl: null, orden: 0, activo: true, createdAt: new Date().toISOString() },
      { id: ++seq, label: "Instagram", url: "https://instagram.com/ejemplo", iconoUrl: null, orden: 1, activo: true, createdAt: new Date().toISOString() },
    ];
    return {
      list: () => delay([...items].sort((a, b) => a.orden - b.orden || a.id - b.id)),
      create: (data) => {
        const item: LandingContacto = { id: ++seq, label: data.label, url: data.url, iconoUrl: data.iconoUrl || null, orden: data.orden ?? 0, activo: data.activo ?? true, createdAt: new Date().toISOString() };
        items.push(item);
        return delay(item);
      },
      update: (id, data) => {
        const item = items.find((x) => x.id === id);
        if (!item) return Promise.reject(new ApiError(404, "No encontrado"));
        Object.assign(item, { ...data, iconoUrl: data.iconoUrl !== undefined ? (data.iconoUrl || null) : item.iconoUrl });
        return delay({ ...item });
      },
      remove: (id) => {
        const i = items.findIndex((x) => x.id === id);
        if (i >= 0) items.splice(i, 1);
        return delay({ ok: true } as const);
      },
      uploadIcono: (_file: File) => delay("https://placehold.co/80x80/png"),
    };
  })(),
  reportes: {
    resumen: (desde, hasta) => {
      const dias = Math.max(1, diffDays(desde, hasta));
      const activos = reservas.filter(
        (r) => r.estado !== "cancelada" && r.estado !== "mantenimiento",
      );
      const overlap = (ci: string, co: string) => {
        const start = ci > desde ? ci : desde;
        const end = co < hasta ? co : hasta;
        const d = diffDays(start, end);
        return d > 0 ? d : 0;
      };
      const nochesOcupadas = activos.reduce(
        (acc, r) => acc + overlap(r.checkin, r.checkout),
        0,
      );
      const delPeriodo = activos.filter(
        (r) => r.checkin >= desde && r.checkin < hasta,
      );
      const ingresos = delPeriodo.reduce((acc, r) => acc + Number(r.total), 0);

      const porHabitacion = habitaciones
        .map((h) => {
          const rs = delPeriodo.filter((r) => r.habitacionId === h.id);
          const noches = rs.reduce((a, r) => a + diffDays(r.checkin, r.checkout), 0);
          return {
            habitacion: h.nombre,
            tipo: h.tipo,
            reservas: rs.length,
            noches,
            ingresos: rs.reduce((a, r) => a + Number(r.total), 0),
            ocupacionPct: dias > 0 ? Math.round((noches / dias) * 1000) / 10 : 0,
          };
        })
        .sort((a, b) => b.ingresos - a.ingresos);

      const porHuesped = new Map<number, { estadias: number; total: number }>();
      for (const r of activos) {
        if (r.huespedId == null) continue;
        const acc = porHuesped.get(r.huespedId) ?? { estadias: 0, total: 0 };
        acc.estadias += 1;
        acc.total += Number(r.total);
        porHuesped.set(r.huespedId, acc);
      }
      const frecuentes = [...porHuesped.entries()]
        .map(([id, v]) => ({
          huesped: huespedes.find((h) => h.id === id)?.nombre ?? "—",
          estadias: v.estadias,
          total: v.total,
        }))
        .sort((a, b) => b.estadias - a.estadias || b.total - a.total)
        .slice(0, 5);

      const capacidad = habitaciones.length * dias;
      const ocupacionPct =
        capacidad > 0
          ? Math.round((nochesOcupadas / capacidad) * 1000) / 10
          : 0;
      const cancelaciones = reservas.filter(
        (r) =>
          r.estado === "cancelada" && r.checkin >= desde && r.checkin < hasta,
      ).length;
      const nochesDel = delPeriodo.reduce(
        (a, r) => a + diffDays(r.checkin, r.checkout),
        0,
      );
      const estadiaPromedio =
        delPeriodo.length > 0
          ? Math.round((nochesDel / delPeriodo.length) * 10) / 10
          : 0;

      const res: ReporteResumen = {
        periodo: { desde, hasta, dias },
        ocupacionPct,
        nochesOcupadas,
        ingresos,
        reservas: delPeriodo.length,
        cancelaciones,
        estadiaPromedio,
        porHabitacion,
        frecuentes,
      };
      return delay(res);
    },
    comparativa: (desde1, hasta1, desde2, hasta2) => {
      // Reutiliza la misma lógica del resumen para dos períodos
      const calcPeriodo = (d: string, h: string) => {
        const dias = Math.max(1, diffDays(d, h));
        const activos = reservas.filter((r) => r.estado !== "cancelada" && r.estado !== "mantenimiento");
        const overlap = (ci: string, co: string) => { const s = ci > d ? ci : d; const e = co < h ? co : h; const n = diffDays(s, e); return n > 0 ? n : 0; };
        const noches = activos.reduce((a, r) => a + overlap(r.checkin, r.checkout), 0);
        const delP = activos.filter((r) => r.checkin >= d && r.checkin < h);
        const ingresos = delP.reduce((a, r) => a + Number(r.total), 0);
        const cancelaciones = reservas.filter((r) => r.estado === "cancelada" && r.checkin >= d && r.checkin < h).length;
        const nochesTotal = delP.reduce((a, r) => a + diffDays(r.checkin, r.checkout), 0);
        return { dias, noches, ingresos, reservas: delP.length, cancelaciones, estadiaPromedio: delP.length > 0 ? Math.round(nochesTotal / delP.length * 10) / 10 : 0, ocupacionPct: habitaciones.length * dias > 0 ? Math.round(noches / (habitaciones.length * dias) * 1000) / 10 : 0 };
      };
      const p1 = calcPeriodo(desde1, hasta1);
      const p2 = calcPeriodo(desde2, hasta2);
      const res: ReporteComparativa = {
        periodo1: { desde: desde1, hasta: hasta1, dias: p1.dias },
        periodo2: { desde: desde2, hasta: hasta2, dias: p2.dias },
        metricas: {
          ingresos: [p1.ingresos, p2.ingresos],
          reservas: [p1.reservas, p2.reservas],
          ocupacionPct: [p1.ocupacionPct, p2.ocupacionPct],
          nochesOcupadas: [p1.noches, p2.noches],
          cancelaciones: [p1.cancelaciones, p2.cancelaciones],
          estadiaPromedio: [p1.estadiaPromedio, p2.estadiaPromedio],
        },
      };
      return delay(res);
    },
    forecast: (dias) => {
      const hoy = new Date().toISOString().slice(0, 10);
      const limite = new Date(); limite.setDate(limite.getDate() + dias);
      const limStr = limite.toISOString().slice(0, 10);
      const futuras = reservas.filter((r) => ["reservada", "ocupada"].includes(r.estado) && r.checkout > hoy && r.checkin < limStr);
      const porHab = habitaciones.map((h) => {
        const rs = futuras.filter((r) => r.habitacionId === h.id);
        return { habitacion: h.nombre, ingresos: rs.reduce((a, r) => a + Number(r.total), 0), noches: rs.reduce((a, r) => a + diffDays(r.checkin, r.checkout), 0), reservas: rs.length };
      }).filter((h) => h.reservas > 0).sort((a, b) => b.ingresos - a.ingresos);
      const res: ReporteForecast = {
        diasHorizonte: dias,
        ingresosFuturos: porHab.reduce((a, h) => a + h.ingresos, 0),
        reservasFuturas: futuras.length,
        porHabitacion: porHab,
      };
      return delay(res);
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
      // Huésped existente o nuevo.
      let huespedId: number;
      if (data.huespedId != null) {
        huespedId = data.huespedId;
      } else {
        const huesped: Huesped = {
          id: ++seqHuesped,
          nombre: data.huesped!.nombre,
          documento: data.huesped!.documento ?? null,
          tipoDocumento: data.huesped!.tipoDocumento ?? null,
          nacionalidad: data.huesped!.nacionalidad ?? null,
          fechaNacimiento: data.huesped!.fechaNacimiento ?? null,
          email: data.huesped!.email ?? null,
          telefono: data.huesped!.telefono ?? null,
          notas: data.huesped!.notas ?? null,
        };
        huespedes.push(huesped);
        huespedId = huesped.id;
      }
      const r = nuevaReserva(
        data.habitacionId,
        huespedId,
        data.checkin,
        data.checkout,
        "reservada",
      );
      // Total con tarifas dinámicas (igual que la API real).
      const hab = habitaciones.find((h) => h.id === data.habitacionId)!;
      r.total = String(
        totalConReglas(Number(hab.tarifaBase), data.checkin, data.checkout),
      );
      reservas.push(r);
      return delay(r);
    },
    cotizar: (habitacionId, checkin, checkout) => {
      const hab = habitaciones.find((h) => h.id === habitacionId);
      const base = Number(hab?.tarifaBase ?? 0);
      return delay({
        habitacionId,
        checkin,
        checkout,
        noches: diffDays(checkin, checkout),
        tarifaBase: base,
        total: totalConReglas(base, checkin, checkout),
      });
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
      if (!r) return Promise.reject(new ApiError(404, "No encontrada"));

      if (r.huespedId != null) {
        if (r.estado === "ocupada") {
          const tieneCargos = consumosMock.some((c) => c.reservaId === id);
          if (tieneCargos) {
            return Promise.reject(
              new ApiError(
                409,
                "No se puede cancelar: la reserva ya hizo check-in y tiene cargos asociados.",
                "cancelacion_bloqueada",
              ),
            );
          }
        }
        const { porcentaje, monto } = cargoCancelacionMock(Number(r.total), r.checkin);
        if (monto > 0) {
          const c: Consumo = {
            id: ++seqConsumo,
            reservaId: id,
            servicioId: null,
            descripcion: `Cargo por cancelación (${porcentaje}%)`,
            categoria: "cargos",
            cantidad: "1",
            precioUnit: String(monto),
            subtotal: String(monto),
            fecha: new Date().toISOString(),
            notas: null,
          };
          consumosMock.push(c);
          r.total = String(Number(r.total) + monto);
        }
      }
      r.estado = "cancelada";
      return delay(r);
    },
    cotizarCancelacion: (id) => {
      const r = reservas.find((x) => x.id === id);
      if (!r) return Promise.reject(new ApiError(404, "No encontrada"));
      return delay(cargoCancelacionMock(Number(r.total), r.checkin));
    },
  },
  politicasCancelacion: {
    list: () => delay([...politicasCancelacionMock].sort((a, b) => b.diasMinimos - a.diasMinimos)),
    create: (data) => {
      const p: PoliticaCancelacion = {
        id: ++seqPolitica,
        nombre: data.nombre,
        diasMinimos: data.diasMinimos,
        porcentaje: String(data.porcentaje),
        activa: data.activa ?? true,
      };
      politicasCancelacionMock.push(p);
      return delay(p);
    },
    update: (id, data) => {
      const p = politicasCancelacionMock.find((x) => x.id === id);
      if (!p) return Promise.reject(new ApiError(404, "No encontrada"));
      if (data.nombre !== undefined) p.nombre = data.nombre;
      if (data.diasMinimos !== undefined) p.diasMinimos = data.diasMinimos;
      if (data.porcentaje !== undefined) p.porcentaje = String(data.porcentaje);
      if (data.activa !== undefined) p.activa = data.activa;
      return delay({ ...p });
    },
    remove: (id) => {
      const i = politicasCancelacionMock.findIndex((x) => x.id === id);
      if (i >= 0) politicasCancelacionMock.splice(i, 1);
      return delay({ ok: true } as const);
    },
  },
  auditLog: {
    list: (params = {}) => {
      const entries: AuditLogEntry[] = [
        { id: 1, timestamp: new Date(Date.now() - 60000).toISOString(), userId: "u1", userName: "Admin", userEmail: "admin@hotel.com", accion: "crear", entidad: "reservas", entidadId: "42", entidadLabel: "Hab. Suite / Juan Pérez", diff: JSON.stringify({ checkin: { antes: null, despues: "2026-07-01" }, checkout: { antes: null, despues: "2026-07-05" } }), ip: "192.168.1.1" },
        { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), userId: "u1", userName: "Admin", userEmail: "admin@hotel.com", accion: "editar", entidad: "habitaciones", entidadId: "3", entidadLabel: "Suite Premium", diff: JSON.stringify({ tarifaBase: { antes: "12000", despues: "15000" } }), ip: "192.168.1.1" },
        { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), userId: "u2", userName: "Gestor", userEmail: "gestor@hotel.com", accion: "eliminar", entidad: "huespedes", entidadId: "7", entidadLabel: "María García", diff: JSON.stringify({ nombre: { antes: "María García", despues: null } }), ip: "192.168.1.2" },
      ];
      const PAGE_SIZE = 50;
      let filtered = [...entries];
      if (params.userId) filtered = filtered.filter((e) => e.userId === params.userId);
      if (params.entidad) filtered = filtered.filter((e) => e.entidad === params.entidad);
      if (params.accion) filtered = filtered.filter((e) => e.accion === params.accion);
      if (params.desde) filtered = filtered.filter((e) => e.timestamp >= params.desde!);
      if (params.hasta) filtered = filtered.filter((e) => e.timestamp <= params.hasta!);
      if (params.q) {
        const q = params.q.toLowerCase();
        filtered = filtered.filter((e) => (e.userName + e.userEmail + e.entidadLabel + e.entidad).toLowerCase().includes(q));
      }
      const page = params.page ?? 1;
      const result: AuditLogPage = {
        items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        total: filtered.length,
        page,
        pageSize: PAGE_SIZE,
      };
      return delay(result);
    },
    verify: () =>
      delay({ ok: true, rotoEnId: null, totalFilas: 3, filasVerificadas: 3, legacySinHash: 0 }),
  },
};
