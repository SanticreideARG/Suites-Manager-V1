# Suites Manager — Hoja de ruta

Estado: ✅ hecho · 🔜 próximo (en curso/priorizado) · ⏳ pendiente (asentado)

> Este doc lista el alcance completo acordado. Se implementa lo posible; lo
> demás queda pendiente pero registrado. Ver [CLAUDE.md](../CLAUDE.md) para
> arquitectura y convenciones.

---

## Fase 1 — MVP ✅ (completada, en producción)
- ✅ Habitaciones: alta/baja/edición, estado libre/mantenimiento, tarifa base.
- ✅ Reservas: crear / modificar fechas / cancelar, con cálculo de total.
- ✅ Anti-overbooking a nivel DB (constraint EXCLUDE).
- ✅ Calendario/planner (grilla custom habitaciones × días).
- ✅ Check-in / check-out.
- ✅ Comprobante PDF + export Excel.
- ✅ Deploy: API serverless (Vercel + Neon) y web (Vercel + Vite).

### Salvedades / mejoras sobre Fase 1
- ✅ **Mantenimiento programado como "bloqueos"**: bloqueos en el planner (en rojo),
  como reservas sin huésped (estado `mantenimiento`). Aprovecha el constraint EXCLUDE:
  un bloqueo impide reservar esas fechas y viceversa (verificado contra Neon). NO
  reemplaza el flag de mantenimiento por habitación (ese sigue para "fuera de servicio"
  indefinido). Se crea desde el selector Reserva/Mantenimiento en "nueva reserva".

---

## Fase 2 — Valor agregado

### Huéspedes (ficha) — ✅ base hecha, 🔜 ampliación
Base ✅: nombre, documento, email, teléfono, notas, historial de estadías, CRUD.

Ampliación de la ficha (🔜/⏳):
- **Datos personales**: ⏳ fecha de nacimiento, ⏳ género (opcional),
  ⏳ dirección de residencia. (nombre/tel/email ✅)
- **Documentación y procedencia**: ⏳ tipo de documento, ⏳ nacionalidad,
  ⏳ estado civil, ⏳ país/ciudad de origen, ⏳ motivo del viaje.
  - ⏳ **Foto/scan del documento (PDF/JPG)** — ver análisis abajo.
- **Información de pago** (por reserva, no por huésped): ⏳ modo de pago,
  ⏳ pago por adelantado (sí/no + monto), ⏳ estado del pago (pendiente/parcial/
  completo), ⏳ facturación (CUIT/CUIL, razón social).
- **Información adicional**: ⏳ vehículo (patente/tipo/estacionamiento),
  ⏳ preferencias especiales, ⏳ necesidades de accesibilidad,
  ⏳ acompañantes (nombre + relación).
- **Gestión interna**: ✅ historial de estadías, ✅ notas internas;
  ⏳ consumos extras (minibar, lavandería, excursiones), ✅ N° reserva,
  ✅ check-in/out.

> **Análisis: almacenar foto/scan del documento**
> NO guardar el binario en Postgres/Neon (encarece la DB, backups pesados,
> límite de fila). Recomendado: subir el archivo a **almacenamiento de objetos**
> (Vercel Blob — integra directo con el stack — o S3/R2) y guardar en la DB solo
> la **URL** + metadatos (tipo, fecha). Vercel Blob es lo más simple acá.
> Implica: endpoint de upload firmado + columna `documento_url`. ⏳ Pendiente.

### Habitaciones — ✅ base hecha, 🔜 ampliación
Base ✅: nombre, tipo, capacidad, estado, tarifa base.

Ampliación (🔜/⏳):
- **Información básica**: ✅ nombre, ✅ tipo, ✅ capacidad máx;
  ⏳ disposición de camas (ej. 1 matrimonial + 2 simples), ⏳ superficie m².
- **Comodidades** (⏳, probablemente flags booleanos / JSON):
  climatización (AA / calefacción / ventilador), baño (privado/compartido,
  ducha/bañera/bidet), cocina/kitchenette (anafe/microondas/heladera),
  TV/Smart TV/WiFi, balcón/terraza/patio, caja de seguridad.
- **Servicios adicionales** (⏳): vista (jardín/montaña/lago/calle),
  accesibilidad (PB/rampa/ascensor), mascotas, estacionamiento, housekeeping.
- **Gestión**: ✅ tarifa base; 🔜 tarifas dinámicas; ⏳ promociones/paquetes.

> Nota de diseño: las comodidades/servicios son muchos flags. Conviene una tabla
> `habitacion_amenities` o una columna `JSONB amenities` en `habitaciones` para
> no explotar el esquema en columnas. A definir al implementar.

### Tarifas dinámicas — 🔜 backend hecho, falta UI
- ✅ Reglas de tarifa (tabla `tarifa_reglas`): tipo `rango` (temporada/feriado) y
  `finde` (sáb/dom), con `factor` (1.5 = +50%, 0.8 = -20%), `prioridad`, `activa`.
- ✅ Cálculo del total noche-a-noche aplicando la regla de mayor prioridad
  (integrado en alta y edición de reservas). Verificado contra Neon.
- ✅ CRUD de reglas (`/tarifas`) y cotización (`/reservas/cotizar`).
- ✅ **UI**: pestaña Tarifas (CRUD de reglas, toggle activa) + cotización en vivo en
  el alta de reserva (muestra el total con tarifas dinámicas). Verificado en mock.
- ⏳ Promociones / paquetes (3x2, estadía larga, códigos) — no incluido aún.
- ⏳ Reglas por habitación/tipo (hoy son globales).

### Reportes — ✅ base hecha
- ✅ Ocupación por período (noches de huéspedes / capacidad).
- ✅ Ingresos del período + ✅ ingresos/noches/reservas por habitación.
- ✅ Ranking de huéspedes frecuentes (histórico).
- ⏳ Ingresos por servicio (depende de consumos extras), export del reporte.
- Endpoint `GET /reportes/resumen?desde&hasta`; pestaña "Reportes" en la web.

### Roles de usuario — ⏳
- Administrador / recepcionista. Auth (Better Auth o Clerk).

---

## Lote de pedidos (triage 2026-06) — bugs e implementaciones

### Bugs
- ✅ **BUG 1 — huéspedes duplicados**: buscador embebido al reservar (seleccionar
  huésped existente o crear nuevo); la reserva acepta `huespedId` o datos nuevos.
  Verificado: seleccionar existente no duplica. (Sol. 2 escanear DNI → ⏳ futuro.)
- ✅ **BUG 2 — borrar cliente tras cancelar**: ahora bloquea solo si tiene reservas
  NO canceladas; si solo tiene canceladas, las borra y elimina el huésped. Verificado.

### Implementaciones
- **Impl 1 — calendario**: ✅ toggle Quincena/Mes (vista mensual = días del mes);
  ✅ export Excel de reportes (3 hojas) con el rango configurado en Reportes. Verificado.
- **Impl 2 — dashboard bajo el calendario**: ✅ grid check-ins próximos (hoy/mañana),
  ✅ grid check-outs próximos; ⏳ widget de clima (placeholder; depende de ubicación
  del alojamiento → Impl 4). Huésped detalle: ✅ `mailto:` en email, ✅ popover en
  teléfono (WhatsApp wa.me + copiar). Verificado en mock.
- **Impl 3 — empresas**: ⏳ módulo nuevo (entidad empresa, asociar huéspedes, facturar
  a nombre de empresa). Grande; pendiente.
- **Impl 4 — configuración**:
  - 🔜 sección Configuración; mover ABM de habitaciones ahí (calendario solo lectura).
  - 🔜 datos del alojamiento editables (razón social, CUIT, dirección, CP, ciudad,
    provincia, país, tel, email, logo) → reemplaza el `negocio` hardcodeado del PDF.
  - 🔜 temas claro/oscuro (Tailwind dark mode + toggle).
  - ⏳ comprobantes: lista, próximo número, filtro por cliente/empresa, reasociar
    (anular + reemitir). Requiere PERSISTIR comprobantes (hoy el PDF se genera en el
    cliente y no se guarda) → pendiente.

---

## Fase 3 — Escala / completo (⏳)
- Channel manager (Booking/Airbnb/Expedia), evitar overbooking sincronizando.
- Housekeeping/mantenimiento: asignación de limpieza, registro de incidencias.
- Notificaciones automáticas: email/WhatsApp (confirmación, recordatorio, encuesta).
- Contabilidad/AFIP, controladores fiscales.
- Multi-sucursal.
