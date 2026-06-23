-- Reglas de tarifa dinámica. El precio por noche = tarifa_base × factor de la
-- regla aplicable de mayor prioridad (o ×1 si ninguna aplica).
--   tipo 'rango': aplica entre [desde, hasta) -> temporada alta/baja, feriados.
--   tipo 'finde': aplica sábados y domingos.
-- factor 1.50 = +50%; 0.80 = -20% (promo). Reglas globales (todas las habitaciones).

DO $$ BEGIN
  CREATE TYPE tipo_tarifa AS ENUM ('rango', 'finde');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tarifa_reglas (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(120) NOT NULL,
  tipo       tipo_tarifa NOT NULL,
  desde      DATE,                 -- para 'rango'
  hasta      DATE,                 -- para 'rango' (exclusivo)
  factor     NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  prioridad  INTEGER NOT NULL DEFAULT 0,  -- gana la de mayor prioridad
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
