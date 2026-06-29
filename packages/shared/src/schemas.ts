import { z } from "zod";

/**
 * Esquemas compartidos entre la API (Hono) y el front (React).
 * Una sola fuente de verdad para validación y tipos.
 */

// ---------- Enums ----------
export const estadoHabitacion = z.enum(["libre", "mantenimiento"]);
export type EstadoHabitacion = z.infer<typeof estadoHabitacion>;

export const estadoReserva = z.enum([
  "reservada",
  "ocupada", // tras check-in
  "checkout", // tras check-out
  "cancelada",
  "mantenimiento", // bloqueo de mantenimiento programado (sin huésped)
]);
export type EstadoReserva = z.infer<typeof estadoReserva>;

export const metodoPago = z.enum(["efectivo", "transferencia"]);
export type MetodoPago = z.infer<typeof metodoPago>;

export const tipoTarifa = z.enum(["rango", "finde"]);
export type TipoTarifa = z.infer<typeof tipoTarifa>;

// Fecha en formato ISO YYYY-MM-DD (la noche de la estadía)
const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD");

// ---------- Habitaciones ----------
export const habitacionCreate = z.object({
  nombre: z.string().min(1).max(80),
  tipo: z.string().min(1).max(60).default("Standard"),
  capacidad: z.number().int().min(1).max(20),
  tarifaBase: z.number().nonnegative(),
  estado: estadoHabitacion.default("libre"),
});
export type HabitacionCreate = z.infer<typeof habitacionCreate>;

export const habitacionUpdate = habitacionCreate.partial();
export type HabitacionUpdate = z.infer<typeof habitacionUpdate>;

// ---------- Huéspedes (ficha: datos + preferencias) ----------
export const huespedCreate = z.object({
  nombre: z.string().min(1).max(120),
  documento: z.string().max(40).optional(),
  tipoDocumento: z.string().max(30).optional(), // DNI | Pasaporte | CE | Otro
  nacionalidad: z.string().max(80).optional(),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .optional(),
  email: z.string().email().optional(),
  telefono: z.string().max(40).optional(),
  notas: z.string().max(500).optional(), // preferencias, alergias, etc.
});
export type HuespedCreate = z.infer<typeof huespedCreate>;

export const huespedUpdate = huespedCreate.partial();
export type HuespedUpdate = z.infer<typeof huespedUpdate>;

// ---------- Reservas ----------
export const reservaCreate = z
  .object({
    habitacionId: z.number().int().positive(),
    // Huésped existente (huespedId) O datos para crear uno nuevo (huesped).
    huespedId: z.number().int().positive().optional(),
    huesped: huespedCreate.optional(),
    checkin: fechaISO,
    checkout: fechaISO,
    notas: z.string().max(500).optional(),
  })
  .refine((r) => r.checkout > r.checkin, {
    message: "El check-out debe ser posterior al check-in",
    path: ["checkout"],
  })
  .refine((r) => r.huespedId != null || r.huesped != null, {
    message: "Falta el huésped (existente o nuevo)",
    path: ["huesped"],
  });
export type ReservaCreate = z.infer<typeof reservaCreate>;

export const reservaUpdate = z.object({
  checkin: fechaISO.optional(),
  checkout: fechaISO.optional(),
  estado: estadoReserva.optional(),
  notas: z.string().max(500).optional(),
});
export type ReservaUpdate = z.infer<typeof reservaUpdate>;

// ---------- Bloqueo de mantenimiento ----------
// Una "reserva" sin huésped (estado mantenimiento) para planificar trabajos.
export const bloqueoCreate = z
  .object({
    habitacionId: z.number().int().positive(),
    checkin: fechaISO,
    checkout: fechaISO,
    motivo: z.string().max(500).optional(), // se guarda en notas
  })
  .refine((b) => b.checkout > b.checkin, {
    message: "El fin debe ser posterior al inicio",
    path: ["checkout"],
  });
export type BloqueoCreate = z.infer<typeof bloqueoCreate>;

// ---------- Tarifas dinámicas ----------
export const tarifaReglaCreate = z
  .object({
    nombre: z.string().min(1).max(120),
    tipo: tipoTarifa,
    desde: fechaISO.optional(),
    hasta: fechaISO.optional(),
    factor: z.number().positive().max(100),
    prioridad: z.number().int().min(0).default(0),
    activa: z.boolean().default(true),
  })
  .refine((r) => r.tipo !== "rango" || (r.desde && r.hasta && r.hasta > r.desde), {
    message: "Para tipo 'rango' se requieren desde y hasta (hasta > desde)",
    path: ["hasta"],
  });
export type TarifaReglaCreate = z.infer<typeof tarifaReglaCreate>;

export const tarifaReglaUpdate = z.object({
  nombre: z.string().min(1).max(120).optional(),
  tipo: tipoTarifa.optional(),
  desde: fechaISO.nullable().optional(),
  hasta: fechaISO.nullable().optional(),
  factor: z.number().positive().max(100).optional(),
  prioridad: z.number().int().min(0).optional(),
  activa: z.boolean().optional(),
});
export type TarifaReglaUpdate = z.infer<typeof tarifaReglaUpdate>;

// ---------- Configuración del alojamiento ----------
export const configUpdate = z.object({
  nombre: z.string().min(1).max(120).optional(),
  razonSocial: z.string().max(160).nullable().optional(),
  cuit: z.string().max(20).nullable().optional(),
  direccion: z.string().max(200).nullable().optional(),
  cp: z.string().max(20).nullable().optional(),
  ciudad: z.string().max(120).nullable().optional(),
  provincia: z.string().max(120).nullable().optional(),
  pais: z.string().max(120).nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  email: z.string().max(160).nullable().optional(),
  logoUrl: z.string().max(1000).nullable().optional(),
});
export type ConfigUpdate = z.infer<typeof configUpdate>;

// ---------- Landing Manager ----------
export const landingConfigUpdate = z.object({
  landingTagline: z.string().max(200).nullable().optional(),
  landingSubtitulo: z.string().max(400).nullable().optional(),
  landingCtaTexto: z.string().max(80).nullable().optional(),
  landingCtaUrl: z.string().max(200).nullable().optional(),
});
export type LandingConfigUpdate = z.infer<typeof landingConfigUpdate>;

export const landingLinkCreate = z.object({
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(300),
  activa: z.boolean().optional(),
});
export type LandingLinkCreate = z.infer<typeof landingLinkCreate>;

export const landingLinkUpdate = z.object({
  label: z.string().min(1).max(120).optional(),
  url: z.string().min(1).max(300).optional(),
  activa: z.boolean().optional(),
});
export type LandingLinkUpdate = z.infer<typeof landingLinkUpdate>;

export const landingLinksOrden = z.object({ ids: z.array(z.number()) });
export type LandingLinksOrden = z.infer<typeof landingLinksOrden>;

// ---------- Amenidades (catálogo de características) ----------
export const tipoAmenidad = z.enum(["bool", "texto", "numero"]);
export type TipoAmenidad = z.infer<typeof tipoAmenidad>;

export const amenidadCreate = z.object({
  nombre: z.string().min(1).max(120),
  tipo: tipoAmenidad.default("bool"),
  icono: z.string().max(10).optional(),
});
export type AmenidadCreate = z.infer<typeof amenidadCreate>;

export const amenidadUpdate = amenidadCreate.partial();
export type AmenidadUpdate = z.infer<typeof amenidadUpdate>;

// Asignación de amenidades a una habitación (reemplaza el set completo)
export const habitacionAmenidadesSet = z.array(
  z.object({
    amenidadId: z.number().int().positive(),
    valor: z.string().max(500).nullable().optional(),
  }),
);
export type HabitacionAmenidadesSet = z.infer<typeof habitacionAmenidadesSet>;

// ---------- Pagos ----------
export const pagoCreate = z.object({
  reservaId: z.number().int().positive(),
  metodo: metodoPago,
  monto: z.number().positive(),
});
export type PagoCreate = z.infer<typeof pagoCreate>;
