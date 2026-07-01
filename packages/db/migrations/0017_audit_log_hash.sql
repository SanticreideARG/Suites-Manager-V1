-- Hash encadenado (tamper-evident): cada fila referencia el hash de la
-- anterior. Las filas previas a esta migración quedan con hash NULL (no
-- verificables retroactivamente) y la cadena arranca de cero a partir de acá.
ALTER TABLE audit_log
  ADD COLUMN hash TEXT,
  ADD COLUMN hash_anterior TEXT;
