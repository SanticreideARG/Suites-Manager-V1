-- Categorías fijas para el catálogo de cargos/servicios (decisión 2026-06-26):
-- Servicios, Consumos y Cargos suman al total; Bonificaciones resta.
CREATE TYPE categoria_cargo AS ENUM ('servicios', 'consumos', 'cargos', 'bonificaciones');

ALTER TABLE servicios
  ALTER COLUMN categoria TYPE categoria_cargo
  USING (
    CASE lower(coalesce(categoria, 'servicios'))
      WHEN 'bonificacion'   THEN 'bonificaciones'
      WHEN 'bonificaciones' THEN 'bonificaciones'
      WHEN 'cargo'          THEN 'cargos'
      WHEN 'cargos'         THEN 'cargos'
      WHEN 'consumo'        THEN 'consumos'
      WHEN 'consumos'       THEN 'consumos'
      ELSE 'servicios'
    END::categoria_cargo
  );
ALTER TABLE servicios ALTER COLUMN categoria SET DEFAULT 'servicios';
ALTER TABLE servicios ALTER COLUMN categoria SET NOT NULL;

-- Cada consumo (de catálogo o cargo libre) también lleva su categoría, para
-- poder aplicar el signo (Bonificaciones resta) sin depender de un servicio.
ALTER TABLE consumos
  ADD COLUMN categoria categoria_cargo NOT NULL DEFAULT 'servicios';

UPDATE consumos c
SET categoria = s.categoria
FROM servicios s
WHERE c.servicio_id = s.id;
