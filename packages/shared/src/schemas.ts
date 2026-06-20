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
]);
export type EstadoReserva = z.infer<typeof estadoReserva>;

export const metodoPago = z.enum(["efectivo", "transferencia"]);
export type MetodoPago = z.infer<typeof metodoPago>;

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

// ---------- Huéspedes (ficha mínima en MVP) ----------
export const huespedCreate = z.object({
  nombre: z.string().min(1).max(120),
  documento: z.string().max(40).optional(),
  email: z.string().email().optional(),
  telefono: z.string().max(40).optional(),
});
export type HuespedCreate = z.infer<typeof huespedCreate>;

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

// ---------- Pagos ----------
export const pagoCreate = z.object({
  reservaId: z.number().int().positive(),
  metodo: metodoPago,
  monto: z.number().positive(),
});
export type PagoCreate = z.infer<typeof pagoCreate>;
