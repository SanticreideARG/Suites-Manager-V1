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
  boolean,
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

export const tipoTarifaEnum = pgEnum("tipo_tarifa", ["rango", "finde"]);

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

export const tarifaReglas = pgTable("tarifa_reglas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  tipo: tipoTarifaEnum("tipo").notNull(),
  desde: date("desde"), // para tipo 'rango'
  hasta: date("hasta"), // para tipo 'rango' (exclusivo)
  factor: numeric("factor", { precision: 5, scale: 2 }).notNull().default("1"),
  prioridad: integer("prioridad").notNull().default(0),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const config = pgTable("config", {
  id: integer("id").primaryKey().default(1),
  nombre: varchar("nombre", { length: 120 }).notNull().default("Mi Alojamiento"),
  razonSocial: varchar("razon_social", { length: 160 }),
  cuit: varchar("cuit", { length: 20 }),
  direccion: varchar("direccion", { length: 200 }),
  cp: varchar("cp", { length: 20 }),
  ciudad: varchar("ciudad", { length: 120 }),
  provincia: varchar("provincia", { length: 120 }),
  pais: varchar("pais", { length: 120 }),
  telefono: varchar("telefono", { length: 40 }),
  email: varchar("email", { length: 160 }),
  logoUrl: text("logo_url"),
});

// ---------- Better Auth (tablas auth_*; nombres de propiedad = campos de Better Auth) ----------
export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("cliente"), // admin | gestor | cliente
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const authAccount = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authVerification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type Habitacion = typeof habitaciones.$inferSelect;
export type Huesped = typeof huespedes.$inferSelect;
export type Reserva = typeof reservas.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
export type TarifaRegla = typeof tarifaReglas.$inferSelect;
