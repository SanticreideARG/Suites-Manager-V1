import {
  pgEnum,
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";

/**
 * Schema Drizzle: tipado de queries en la API.
 *
 * OJO: la restricción anti-overbooking (EXCLUDE USING gist) NO se puede
 * expresar en el DSL de Drizzle. Vive en migrations/0000_init.sql y es la
 * fuente de verdad del DDL. Mantené ambos en sync.
 */

export const estadoHabitacionEnum = pgEnum("estado_habitacion", [
  "libre",
  "mantenimiento",
]);

export const estadoReservaEnum = pgEnum("estado_reserva", [
  "reservada",
  "ocupada",
  "checkout",
  "cancelada",
  "mantenimiento", // bloqueo de mantenimiento programado (sin huésped)
]);

export const metodoPagoEnum = pgEnum("metodo_pago", [
  "efectivo",
  "transferencia",
]);

export const habitaciones = pgTable("habitaciones", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 80 }).notNull(),
  tipo: varchar("tipo", { length: 60 }).notNull().default("Standard"),
  capacidad: integer("capacidad").notNull(),
  tarifaBase: numeric("tarifa_base", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  estado: estadoHabitacionEnum("estado").notNull().default("libre"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const huespedes = pgTable("huespedes", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  documento: varchar("documento", { length: 40 }),
  email: varchar("email", { length: 160 }),
  telefono: varchar("telefono", { length: 40 }),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reservas = pgTable(
  "reservas",
  {
    id: serial("id").primaryKey(),
    habitacionId: integer("habitacion_id")
      .notNull()
      .references(() => habitaciones.id),
    // NULL para bloqueos de mantenimiento (estado 'mantenimiento').
    huespedId: integer("huesped_id").references(() => huespedes.id),
    checkin: date("checkin").notNull(), // primera noche
    checkout: date("checkout").notNull(), // día de salida (exclusivo)
    estado: estadoReservaEnum("estado").notNull().default("reservada"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    notas: text("notas"),
    checkinAt: timestamp("checkin_at", { withTimezone: true }),
    checkoutAt: timestamp("checkout_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_reservas_habitacion").on(t.habitacionId)],
);

export const pagos = pgTable("pagos", {
  id: serial("id").primaryKey(),
  reservaId: integer("reserva_id")
    .notNull()
    .references(() => reservas.id),
  metodo: metodoPagoEnum("metodo").notNull(),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
});

export type Habitacion = typeof habitaciones.$inferSelect;
export type Huesped = typeof huespedes.$inferSelect;
export type Reserva = typeof reservas.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
