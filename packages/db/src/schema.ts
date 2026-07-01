import {
  pgEnum,
  pgTable,
  primaryKey,
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
  tipoDocumento: varchar("tipo_documento", { length: 30 }), // DNI | Pasaporte | CE | Otro
  nacionalidad: varchar("nacionalidad", { length: 80 }),
  fechaNacimiento: date("fecha_nacimiento"),
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

// ---------- Módulo de facturación ----------

export const impuestos = pgTable("impuestos", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'porcentaje' | 'monto_fijo'
  valor: numeric("valor", { precision: 8, scale: 4 }).notNull(),
  aplicaA: varchar("aplica_a", { length: 30 }).notNull().default("todo"),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull().default(0),
});

export const metodosPago = pgTable("metodos_pago", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  banco: varchar("banco", { length: 80 }),
  cuotas: integer("cuotas").notNull().default(1),
  recargoPct: numeric("recargo_pct", { precision: 5, scale: 2 }).notNull().default("0"),
  proveedor: varchar("proveedor", { length: 80 }),
  activo: boolean("activo").notNull().default(true),
});

export const pagos = pgTable("pagos", {
  id: serial("id").primaryKey(),
  reservaId: integer("reserva_id")
    .notNull()
    .references(() => reservas.id),
  metodo: metodoPagoEnum("metodo"), // nullable: legacy field; nuevos pagos usan metodoId
  metodoId: integer("metodo_id").references(() => metodosPago.id),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  montoBase: numeric("monto_base", { precision: 12, scale: 2 }),
  montoExtras: numeric("monto_extras", { precision: 12, scale: 2 }).notNull().default("0"),
  referencia: varchar("referencia", { length: 200 }),
  notas: text("notas"),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
});

export const tarifaReglas = pgTable("tarifa_reglas", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  tipo: tipoTarifaEnum("tipo").notNull(),
  desde: date("desde"), // para tipo 'rango'
  hasta: date("hasta"), // para tipo 'rango' (exclusivo)
  factor: numeric("factor", { precision: 5, scale: 2 }).notNull().default("1"),
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull().default("0"),
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
  // Landing page
  landingTagline: varchar("landing_tagline", { length: 200 }),
  landingSubtitulo: varchar("landing_subtitulo", { length: 400 }),
  landingCtaTexto: varchar("landing_cta_texto", { length: 80 }),
  landingCtaUrl: varchar("landing_cta_url", { length: 200 }),
});

// ---------- Landing Manager ----------
export const landingFotos = pgTable("landing_fotos", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  altTexto: varchar("alt_texto", { length: 200 }),
  orden: integer("orden").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingLinks = pgTable("landing_links", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 300 }).notNull(),
  orden: integer("orden").notNull().default(0),
  activa: boolean("activa").notNull().default(true),
});

// ---------- Fotos de alojamiento (URLs en Vercel Blob) ----------
export const habitacionFotos = pgTable("habitacion_fotos", {
  id: serial("id").primaryKey(),
  habitacionId: integer("habitacion_id")
    .notNull()
    .references(() => habitaciones.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  orden: integer("orden").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Amenidades (catálogo de características de alojamientos) ----------
export const tipoAmenidadEnum = pgEnum("tipo_amenidad", [
  "bool",
  "texto",
  "numero",
]);

export const amenidades = pgTable("amenidades", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  tipo: tipoAmenidadEnum("tipo").notNull().default("bool"),
  icono: varchar("icono", { length: 10 }),
});

export const habitacionAmenidades = pgTable(
  "habitacion_amenidades",
  {
    habitacionId: integer("habitacion_id")
      .notNull()
      .references(() => habitaciones.id, { onDelete: "cascade" }),
    amenidadId: integer("amenidad_id")
      .notNull()
      .references(() => amenidades.id, { onDelete: "cascade" }),
    valor: text("valor"), // null = true para bool; string para texto/numero
  },
  (t) => [primaryKey({ columns: [t.habitacionId, t.amenidadId] })],
);

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

// ---------- Housekeeping ----------
export const tareasHousekeeping = pgTable("tareas_housekeeping", {
  id: serial("id").primaryKey(),
  habitacionId: integer("habitacion_id")
    .notNull()
    .references(() => habitaciones.id),
  reservaId: integer("reserva_id").references(() => reservas.id),
  tipo: varchar("tipo", { length: 30 }).notNull().default("limpieza"),
  descripcion: text("descripcion"),
  prioridad: varchar("prioridad", { length: 20 }).notNull().default("normal"),
  estado: varchar("estado", { length: 20 }).notNull().default("pendiente"),
  fechaProgramada: date("fecha_programada").notNull(),
  asignadoA: varchar("asignado_a", { length: 120 }),
  notas: text("notas"),
  completadoAt: timestamp("completado_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type TareaHousekeeping = typeof tareasHousekeeping.$inferSelect;

// ---------- Servicios adicionales / Consumos ----------
// Categorías fijas (decisión 2026-06-26): Servicios/Consumos/Cargos suman al
// total; Bonificaciones resta.
export const categoriaCargoEnum = pgEnum("categoria_cargo", [
  "servicios",
  "consumos",
  "cargos",
  "bonificaciones",
]);

export const servicios = pgTable("servicios", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  descripcion: text("descripcion"),
  precio: numeric("precio", { precision: 12, scale: 2 }).notNull().default("0"),
  unidad: varchar("unidad", { length: 40 }).notNull().default("unidad"),
  categoria: categoriaCargoEnum("categoria").notNull().default("servicios"),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Servicio = typeof servicios.$inferSelect;

export const consumos = pgTable(
  "consumos",
  {
    id: serial("id").primaryKey(),
    reservaId: integer("reserva_id")
      .notNull()
      .references(() => reservas.id),
    servicioId: integer("servicio_id").references(() => servicios.id),
    descripcion: varchar("descripcion", { length: 200 }).notNull(),
    categoria: categoriaCargoEnum("categoria").notNull().default("servicios"),
    cantidad: numeric("cantidad", { precision: 8, scale: 2 }).notNull().default("1"),
    precioUnit: numeric("precio_unit", { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    notas: text("notas"),
  },
  (t) => [index("idx_consumos_reserva").on(t.reservaId)],
);
export type Consumo = typeof consumos.$inferSelect;

// ---------- Landing Servicios / Contactos ----------
export const landingServicios = pgTable("landing_servicios", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 120 }).notNull(),
  descripcion: text("descripcion"),
  imagenUrl: text("imagen_url"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const landingContactos = pgTable("landing_contactos", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  url: varchar("url", { length: 300 }).notNull(),
  iconoUrl: text("icono_url"),
  orden: integer("orden").notNull().default(0),
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Habitacion = typeof habitaciones.$inferSelect;
export type Huesped = typeof huespedes.$inferSelect;
export type Reserva = typeof reservas.$inferSelect;
export type Impuesto = typeof impuestos.$inferSelect;
export type MetodoPago = typeof metodosPago.$inferSelect;
export type Pago = typeof pagos.$inferSelect;
export type TarifaRegla = typeof tarifaReglas.$inferSelect;
export type Amenidad = typeof amenidades.$inferSelect;
export type HabitacionAmenidad = typeof habitacionAmenidades.$inferSelect;
export type HabitacionFoto = typeof habitacionFotos.$inferSelect;
export type LandingFoto = typeof landingFotos.$inferSelect;
export type LandingLink = typeof landingLinks.$inferSelect;
export type LandingServicio = typeof landingServicios.$inferSelect;
export type LandingContacto = typeof landingContactos.$inferSelect;

// ---------- Políticas de cancelación ----------
export const politicasCancelacion = pgTable("politicas_cancelacion", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  diasMinimos: integer("dias_minimos").notNull().default(0),
  porcentaje: numeric("porcentaje", { precision: 5, scale: 2 }).notNull().default("0"),
  activa: boolean("activa").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type PoliticaCancelacion = typeof politicasCancelacion.$inferSelect;

// ---------- Audit Log ----------
export const auditLog = pgTable("audit_log", {
  id:           serial("id").primaryKey(),
  timestamp:    timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  userId:       text("user_id").notNull(),
  userName:     text("user_name").notNull(),
  userEmail:    text("user_email").notNull(),
  accion:       varchar("accion", { length: 20 }).notNull(),
  entidad:      varchar("entidad", { length: 40 }).notNull(),
  entidadId:    text("entidad_id"),
  entidadLabel: text("entidad_label"),
  diff:         text("diff"),  // JSON stringificado — evita import jsonb en esbuild
  ip:           text("ip"),
  hash:         text("hash"),           // sha256(hashAnterior + datos de la fila)
  hashAnterior: text("hash_anterior"),  // hash de la fila previa (cadena tamper-evident)
});
export type AuditLogEntry = typeof auditLog.$inferSelect;
