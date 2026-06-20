-- ============================================================
-- Suites Manager — esquema inicial (MVP v1.0)
-- ============================================================
-- Extensión necesaria para combinar igualdad (=) sobre habitacion_id
-- con el operador de solapamiento (&&) de rangos en un mismo EXCLUDE.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- Enums ----------
DO $$ BEGIN
  CREATE TYPE estado_habitacion AS ENUM ('libre', 'mantenimiento');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_reserva AS ENUM ('reservada', 'ocupada', 'checkout', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE metodo_pago AS ENUM ('efectivo', 'transferencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Tablas ----------
CREATE TABLE IF NOT EXISTS habitaciones (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL,
  tipo        VARCHAR(60)  NOT NULL DEFAULT 'Standard',
  capacidad   INTEGER      NOT NULL,
  tarifa_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado      estado_habitacion NOT NULL DEFAULT 'libre',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS huespedes (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  documento  VARCHAR(40),
  email      VARCHAR(160),
  telefono   VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservas (
  id            SERIAL PRIMARY KEY,
  habitacion_id INTEGER NOT NULL REFERENCES habitaciones(id),
  huesped_id    INTEGER NOT NULL REFERENCES huespedes(id),
  checkin       DATE NOT NULL,
  checkout      DATE NOT NULL,
  estado        estado_reserva NOT NULL DEFAULT 'reservada',
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas         TEXT,
  checkin_at    TIMESTAMPTZ,
  checkout_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_fechas CHECK (checkout > checkin)
);

CREATE INDEX IF NOT EXISTS idx_reservas_habitacion ON reservas(habitacion_id);

-- ============================================================
-- 🔒 ANTI-OVERBOOKING — la pieza clave
-- Dos reservas NO canceladas no pueden solapar fechas en la misma
-- habitación. El rango '[)' incluye el check-in y excluye el check-out,
-- así una reserva que sale el día 10 y otra que entra el día 10 NO chocan.
-- Cualquier INSERT/UPDATE que viole esto falla a nivel base de datos,
-- sin importar condiciones de carrera.
-- ============================================================
ALTER TABLE reservas
  ADD CONSTRAINT reservas_sin_solapamiento
  EXCLUDE USING gist (
    habitacion_id WITH =,
    daterange(checkin, checkout, '[)') WITH &&
  ) WHERE (estado <> 'cancelada');

CREATE TABLE IF NOT EXISTS pagos (
  id         SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id),
  metodo     metodo_pago NOT NULL,
  monto      NUMERIC(12,2) NOT NULL,
  fecha      TIMESTAMPTZ NOT NULL DEFAULT now()
);
