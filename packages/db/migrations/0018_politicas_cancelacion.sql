-- Políticas de cancelación: cargo porcentual según días de anticipación al
-- checkin. Se aplica la política activa con mayor dias_minimos que no supere
-- los días restantes (ej. "menos de 3 días: 100%", "menos de 7 días: 30%").
CREATE TABLE politicas_cancelacion (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  dias_minimos INTEGER NOT NULL DEFAULT 0,
  porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
