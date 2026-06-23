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
    huesped: huespedCreate, // crea/asocia huésped en la misma operación
    checkin: fechaISO,
    checkout: fechaISO,
    notas: z.string().max(500).optional(),
  })
  .refine((r) => r.checkout > r.checkin, {
    message: "El check-out debe ser posterior al check-in",
    path: ["checkout"],
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

// ---------- Pagos ----------
export const pagoCreate = z.object({
  reservaId: z.number().int().positive(),
  metodo: metodoPago,
  monto: z.number().positive(),
});
export type PagoCreate = z.infer<typeof pagoCreate>;
