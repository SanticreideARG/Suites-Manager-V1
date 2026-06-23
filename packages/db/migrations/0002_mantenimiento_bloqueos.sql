-- Bloqueos de mantenimiento programado como "reservas" sin huésped.
-- Un bloqueo es una fila en reservas con estado 'mantenimiento' y huesped_id
-- NULL. Aprovecha el constraint EXCLUDE existente (WHERE estado <> 'cancelada'):
-- un bloqueo impide reservar esas fechas y una reserva impide solapar el bloqueo.

ALTER TYPE estado_reserva ADD VALUE IF NOT EXISTS 'mantenimiento';

-- Los bloqueos no tienen huésped.
ALTER TABLE reservas ALTER COLUMN huesped_id DROP NOT NULL;
