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
  - ✅ **4-A** sección Configuración + datos del alojamiento editables (tabla `config`
    fila única, migración 0004; GET/PUT /config; formulario). El comprobante PDF ya usa
    estos datos (antes hardcodeados). Verificado: API (Neon) + UI (mock).
  - ✅ **4-B** ABM de habitaciones en Configuración (lista + alta/edición/baja). El
    calendario quedó solo lectura (sin botón crear ni edición por click). Verificado.
  - ✅ **4-C** temas claro/oscuro: modo oscuro por clase `.dark` con overrides
    centralizados en index.css (sin tocar cada componente) + toggle en el header,
    persistido en localStorage (respeta preferencia del sistema). Verificado.
  - ⏳ comprobantes: lista, próximo número, filtro por cliente/empresa, reasociar
    (anular + reemitir). Requiere PERSISTIR comprobantes (hoy el PDF se genera en el
    cliente y no se guarda) → pendiente.

---

## Estratégicos (análisis competitivo) — priorización

> ⭐ prioritario (corto/mediano) · 🔌 integración (requiere credenciales externas) ·
> ⏳ opción / mayor alcance.

### ⭐ Prioritarios
- ⭐ **Roles y permisos** (administrador / recepcionista / auditor) + auth.
  **Análisis — Better Auth** (recomendado): TS-first, integra con Drizzle/Postgres y
  monta un handler en Hono; cliente para React. Plan por increments:
  (1) instalar + schema de auth (tablas user/session/account/verification) + migración;
  (2) endpoint de auth en la API + middleware de sesión; (3) login en el panel +
  proteger rutas; (4) roles (campo/plugin) y gating por rol; (5) Google OAuth
  (sirve también para los clientes del portal público). Es multi-increment.
- ⭐ **Tests automatizados**:
  - ✅ **Vitest** (unit): lógica de tarifas dinámicas (finde/rango/prioridad/totales),
    7 tests. `pnpm test`. Base lista para sumar más (overlap de fechas, schemas Zod).
  - 🔜 unit adicionales + **integración** del anti-overbooking concurrente y
    cancelaciones (requiere una **DB de test**, p. ej. branch de Neon o Postgres local).
  - 🔌 **Playwright** (e2e): flujos crear/modificar/cancelar reserva, overbooking,
    huéspedes. Corre contra la web (modo mock o API real).
- ⭐ **Observabilidad / trazabilidad**:
  - 🔌 **Sentry**: captura de errores y trazas en web (`@sentry/react`) y API
    (`@sentry/node`). Requiere DSN (cuenta Sentry). Bajo esfuerzo de wiring.
  - 🔌 **Uptime Kuma**: monitoreo de disponibilidad (self-hosted) apuntando a
    `/health` de la API y a la URL de la web; alertas. Es ops/infra (fuera del repo).
- ⭐ **Reportes ampliados**: sumar **cancelaciones** y **estadía promedio** a los
  actuales (ocupación, ingresos, frecuentes). Rápido, sobre lo ya hecho.
- ⭐ **Housekeeping + historial de mantenimiento por unidad**: estado de limpieza por
  habitación; registrar e historiar mantenimientos/incidencias por unidad (extiende
  los bloqueos de mantenimiento ya existentes).
- ⭐ **Dashboard de KPIs**: ocupación / ingresos / reservas activas en tiempo real
  (amplía ProximosPanel + Reportes).
- ⭐ **Pagos** (registro): efectivo/transferencia/QR con estado (pendiente/parcial/
  completo). La tabla `pagos` ya existe sin usar. MercadoPago = paso siguiente (🔌).
- ⭐ **Auditoría / logs firmados**: tabla append-only con **hash encadenado** (hash del
  registro previo + datos + timestamp) por operación (alta/modificación/cancelación).

### 🔌 Integraciones (requieren servicios/credenciales externas)
- 🔌 **Notificaciones**: email (Resend) + WhatsApp (Evolution API) — confirmación de
  reserva, recordatorio de check-in, encuesta post-estadía.
- 🔌 **Pagos electrónicos**: MercadoPago (checkout + QR interoperable + webhooks).

### 🌐 Portal público / reservas online (módulo nuevo, medio plazo)
- 🔜 **Landing page pública** del alojamiento: presentación, fotos, habitaciones,
  servicios, ubicación, contacto (usa los datos de `config`).
- 🔜 **Gestor de reservas para clientes** (self-service): consultar disponibilidad por
  fechas, ver habitaciones libres + precio (cotización con tarifas dinámicas), reservar
  online. Reutiliza el anti-overbooking ya existente.
- ⏳ **Registro/login de clientes con Google OAuth** — a desarrollar a futuro.
  (Coordina con roles/permisos: el cliente es un rol distinto del staff.)
- Nota de arquitectura: probablemente un sub-sitio/área pública aparte del panel de
  gestión, consumiendo endpoints públicos (disponibilidad, cotizar, crear reserva
  "pendiente de confirmación"). El staff confirma desde el panel.

### ⏳ Opciones / mayor alcance (ver Fase 3)
- ⏳ **Channel Manager** (Booking/Airbnb/Expedia) — anti doble-reserva sincronizando.
- ⏳ **Multi-sucursal** — gestión centralizada; impacta el modelo (scoping por sucursal).
- ⏳ **AFIP / facturación electrónica** — WSFE + certificados.
- ⏳ **Backups**: Neon ya provee backups automáticos / PITR en su plan; estrategia
  adicional (export periódico a almacenamiento externo) = opcional.

---

## Fase 3 — Escala / completo (⏳)
- Channel manager (Booking/Airbnb/Expedia), evitar overbooking sincronizando.
- Housekeeping/mantenimiento: asignación de limpieza, registro de incidencias.
- Notificaciones automáticas: email/WhatsApp (confirmación, recordatorio, encuesta).
- Contabilidad/AFIP, controladores fiscales.
- Multi-sucursal.
