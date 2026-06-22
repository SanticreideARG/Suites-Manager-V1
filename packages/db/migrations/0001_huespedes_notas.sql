-- Agrega la columna `notas` a huespedes (preferencias, alergias, etc.).
-- Idempotente: en bases nuevas la columna ya viene de 0000_init; en las
-- existentes (que aplicaron 0000 antes de este cambio) la agrega acá.
ALTER TABLE huespedes ADD COLUMN IF NOT EXISTS notas TEXT;
