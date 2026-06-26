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

## Lote de pedidos (triage 2026-06-26) — ⏳ asentado, sin implementar

> Definido a alto nivel; **decisiones de detalle cerradas** (cuestionario 2026-06-26,
> ver "Decisiones" en cada ítem). No se encara todavía.

### Tarifas — unificar gestión en un solo lugar (⏳)
- ⏳ **Ajuste de precios base desde Tarifas**: un **segundo cuadro que irá PRIMERO**
  (antes del CRUD de reglas) para editar la **tarifa base de cada habitación** sin
  ir a Configuración. Objetivo: centralizar toda la gestión de precios en la pestaña
  Tarifas. (La tarifa base ya vive en `habitaciones.tarifaBase`; sería editarla acá.)
- ⏳ **Reglas por monto fijo** además de coeficiente: hoy `tarifa_reglas.factor`
  es solo multiplicador (1.5 = +50%). Sumar la opción de **monto fijo** (+/- $X por
  noche) como tipo de ajuste alternativo.
- ⏳ **Cargos extra (CRUD nuevo)**: recargos por servicios adicionales. Campos:
  **categoría, concepto, cantidad, precio unitario**. Categorías:
  **Servicios, Consumos, Cargos, Bonificaciones** — *Bonificaciones es la única que
  RESTA* (las otras suman). Este catálogo alimenta los recargos sobre huéspedes
  alojados (ver Huéspedes). Relacionado con "consumos extras" ya pendiente en la ficha.

  **Decisiones (2026-06-26):**
  - Editar la base **solo afecta reservas nuevas**; las existentes quedan congeladas.
  - Cada regla es **de un solo tipo**: coeficiente (×) **o** monto fijo (+/- $),
    excluyente por regla (no ambos a la vez).
  - El catálogo de cargos extra es **CRUD configurable** por el admin (concepto +
    precio unitario por ítem).
  - Las **4 categorías son fijas** (Servicios, Consumos, Cargos, Bonificaciones);
    Bonificaciones siempre resta.
  - Bonificaciones se expresan en **monto fijo $** (precio unitario × cantidad),
    no en porcentaje.

### Huéspedes — separar "alojados" de "histórico" (⏳)
- ⏳ **Completar la ficha** con los datos aún ⏳ del roadmap (ver "Huéspedes (ficha)"
  arriba: datos personales, documentación/procedencia, info de pago, adicional).
- ⏳ **Cargos extra sobre el huésped**: aplicar recargos (servicios/consumos del
  catálogo de Tarifas) **solo a clientes activos** = los que hicieron **check-in**.
- ⏳ **Reestructura de la pestaña Huéspedes** en dos cuadros:
  1. **Huéspedes** (arriba, nuevo): solo los **alojados actualmente** (con check-in
     hecho, sin check-out). Permite **modificar datos** y **cargar recargos**
     (servicios/consumos).
  2. **Histórico de Clientes** (abajo, el listado actual renombrado): todos los
     huéspedes, **ordenado por último check-in realizado** (desc).

  **Decisiones (2026-06-26):**
  - "Alojado actualmente" = huésped con una reserva en estado **`ocupada`** (check-in
    hecho, sin check-out).
  - Los recargos se acumulan **sobre la reserva activa** (cada estadía tiene sus
    consumos) y salen en el comprobante de check-out.
  - Los recargos se **congelan al hacer check-out** (no se editan después, para no
    alterar comprobantes emitidos).
  - **Ficha por fases** (recomendación aceptada): **Fase A** primero — tipo y número
    de documento, nacionalidad, fecha de nacimiento (alto valor operativo / legal).
    **Fase B** después — resto de campos ⏳ (dirección, estado civil, motivo de viaje,
    info de pago, vehículo, preferencias, acompañantes, foto/scan del documento).

### Calendario — datos del cliente (⏳)
- ⏳ **Botón adicional "Ver cliente"** en las acciones de una reserva (junto a
  modificar fechas y descargar/generar comprobante): muestra los datos del huésped
  asociado a esa reserva.

  **Decisión (2026-06-26):** se muestra en un **panel/sección dentro del mismo modal**
  de la reserva (sin navegar fuera; mantiene el contexto).

### Configuración › Habitaciones — características de la unidad (⏳)
- ⏳ **"Características" de las unidades**: poder enumerar detalles por habitación
  (baño privado, TV, aire acondicionado, m², etc.). Coincide con la nota de diseño de
  "amenities" ya registrada (tabla `habitacion_amenities` o columna `JSONB amenities`).

  **Decisiones (2026-06-26):**
  - **Catálogo configurable reutilizable** (se define una vez y se asigna por unidad),
    no texto libre. Sirve también para la futura landing/portal.
  - **Mixto**: cada característica define su tipo — **booleana** (TV: sí/no) o
    **con valor** (m²: número, disposición de camas: texto).

---

## Lote de pedidos (triage 2026-06-26 B) — ⏳ asentado, sin implementar

> Parte de los ítems requieren análisis o cuestionario previo (indicado).

### BUG — Línea blanca en tablas (modo oscuro, persistente) 🐛
- ⏳ **BUG 3** — El divisor `divide-slate-100` sigue mostrando una línea blanca/clara
  entre filas en modo oscuro en ciertas tablas. Ya se intentó un override de
  especificidad en index.css; no fue suficiente en producción. A re-diagnosticar
  apuntando al selector exacto que genera Tailwind v4 en el bundle final.

### Seguridad — Cambios sensibles solicitan contraseña (⏳)
- ⏳ **Re-autenticación antes de cambios sensibles**: operaciones como cambiar email,
  cambiar contraseña, o eliminar una cuenta propia deben solicitar la contraseña
  actual antes de ejecutarse (flujo "confirm password" o "re-auth"). Aplica tanto
  en el panel de gestión como (a futuro) en el portal de clientes.

### Configuración — renombrar "Habitaciones" → "Alojamientos" (⏳)
- ⏳ **Renombrar la sección** "Habitaciones" en Configuración a **"Alojamientos"**
  (el término es más genérico y aplica a cabañas, suites, etc.).
  Impacta: label en el sidebar, título de la sección, texto de los formularios.
  La entidad en DB (`habitaciones`) no cambia — es solo vocabulario de UI.

### Configuración — nombre y logo de la app personalizables (⏳)
- ⏳ **Nombre de la aplicación editable** desde Configuración › "Nombre" (campo ya
  existente en `config`): que el nombre mostrado en sidebar, login y comprobantes
  use el valor configurado en lugar del hardcodeado "Suites Manager".
- ⏳ **Logo editable con upload de archivo**: el campo "Logo (URL)" actual solo acepta
  una URL. Extenderlo para permitir **subir un archivo** (JPG/PNG) desde el
  dispositivo. Implica: endpoint de upload + almacenamiento de objetos.
  Ver análisis de carga de imágenes más abajo.

### Análisis — Carga de imágenes (logo y alojamientos) (⏳)
- ⏳ **Análisis pendiente**: definir la estrategia de almacenamiento y upload para:
  - Logo del alojamiento (desde Configuración).
  - Fotos de cada unidad/alojamiento (para la ficha y el futuro portal).
  
  **Opciones a evaluar:**
  - **Vercel Blob** (más simple, integra directo con el stack): upload firmado desde
    la API, URL pública guardada en DB. Sin gestión de infra adicional.
  - **Cloudflare R2** (más económico a escala, S3-compatible): requiere cuenta CF.
  - **Supabase Storage** (si se evalúa mover parte del stack): alternativa.
  
  **Decisión a tomar:** servicio, tamaño máximo, formatos aceptados,
  redimensionado/optimización (¿en cliente antes de subir, o en servidor?).
  *Requiere cuestionario — ver al pie de este bloque.*

### Análisis — Multi-sucursal (⏳)
- ⏳ **Análisis de segmentación por sucursal**: cómo gestionar múltiples propiedades
  desde la misma instancia de la app, con:
  - Calendarios y disponibilidad **independientes** por sucursal.
  - Gestores asignados a una o más sucursales (no acceden a las demás).
  - Clientes y reservas **por sucursal** o compartidos (a definir).
  - Admin global con vista de todas.
  
  **Impacto en el modelo de datos**: prácticamente todas las tablas necesitarían
  `sucursal_id` como foreign key (habitaciones, reservas, huéspedes, config, etc.).
  Es un cambio estructural grande — conviene decidirlo **antes** de escalar otras
  funcionalidades para no reescribir. *Requiere cuestionario.*

### Análisis — Ampliación de reportes (⏳)
- ⏳ **Análisis pendiente**: qué métricas/vistas adicionales agregar. Las actuales son
  ocupación, ingresos, reservas, noches, estadía promedio, cancelaciones, frecuentes
  (por huésped). Posibles ampliaciones:
  - Ingresos por categoría de cargo extra (Servicios, Consumos, etc.).
  - Tasa de ocupación por habitación/tipo (no solo global).
  - Comparación mes a mes / año a año.
  - Huéspedes nuevos vs recurrentes.
  - Forecast de ingresos (reservas futuras confirmadas).
  - Export PDF del reporte (hoy solo Excel).
  *Requiere cuestionario para priorizar qué métricas son más útiles.*

### Portal de clientes — website público (⏳, análisis + cuestionario)
- ⏳ **Website público moderno** para que los clientes puedan:
  - Cargar / actualizar sus datos personales.
  - Consultar **disponibilidad por fecha** con vista de calendario o listado.
  - Ver **precio estimado** (cotización con tarifas dinámicas).
  - Ver **características y fotos** de cada unidad.
  - **Realizar reservas** online (pendiente de confirmación por el staff, o
    automática según config).
  - Historial de sus propias reservas y comprobantes.
  
  **Arquitectura probable**: sub-sitio separado del panel de gestión (o rutas
  públicas `/portal/*` en el mismo repo), con endpoints públicos (disponibilidad,
  cotizar, crear reserva). Auth con Google OAuth o email (rol `cliente`).
  
  **Ítems previos necesarios**: características de unidades, carga de imágenes,
  Google OAuth para clientes.
  
  *Este ítem tiene su propio cuestionario — ver al pie.*

---

## Estratégicos (análisis competitivo) — priorización

> ⭐ prioritario (corto/mediano) · 🔌 integración (requiere credenciales externas) ·
> ⏳ opción / mayor alcance.

### ⭐ Prioritarios
- ⭐ **Roles y permisos** + auth (**Better Auth**). En curso.

  **Roles definidos:**
  - **admin** — acceso total (como hoy).
  - **gestor** — operación diaria (calendario, reservas, check-in/out, huéspedes),
    PERO NO: Configuración (datos del alojamiento), ABM de habitaciones (cantidad de
    unidades), Reportes, ni reglas de Tarifas. *(Tarifas como "regla de negocio" es mi
    interpretación — confirmar.)*
  - **cliente** — solo portal público: crear/gestionar sus reservas y obtener
    comprobantes una vez emitidos. Sin acceso al panel.

  **Matriz (panel = staff):**
  | Área | admin | gestor | cliente |
  |---|---|---|---|
  | Calendario (reservar, check-in/out) | ✓ | ✓ | ✗ |
  | Huéspedes | ✓ | ✓ | ✗ |
  | Reportes | ✓ | ✗ | ✗ |
  | Tarifas (reglas) | ✓ | ✗ | ✗ |
  | Configuración (alojamiento + ABM habitaciones) | ✓ | ✗ | ✗ |
  | Portal: reservar/gestionar propias + comprobantes | — | — | ✓ |

  **Plan por increments:**
  - ✅ (1+2) Better Auth instalado (1.2.12, fijado a zod 3 vía override de `better-call`
    a 1.0.29) + schema auth_user/session/account/verification (migración 0005, con
    `role` default 'cliente') + config (`auth.ts`) + handler en Hono (`/auth/*`).
    **Signup/login verificados contra Neon** — el driver neon-http funciona, NO hizo
    falta `pg` (Better Auth no usó transacciones interactivas en email/password).
  - ✅ (3) login en el panel: cliente `better-auth/react` (lib/auth.ts), `LoginPage`
    (ingresar/registrar), App gatea el panel con `useSession` (en modo mock se omite),
    header con email + "Salir". CORS con `credentials` + origin reflejado + Better Auth
    `trustedOrigins`; cookies SameSite=None;Secure en prod (https), lax en local.
    basePath movido a `/api/auth` (default del cliente). Verificado en local (web 5182
    + API 3001): login → panel → signout. ⚠️ Vercel: agregar `BETTER_AUTH_SECRET`,
    `BETTER_AUTH_URL` (=URL del API) y `WEB_URL` (=URL de la web, para trustedOrigins)
    al proyecto API; verificar cookies cross-site en prod.
  - ✅ (4) gating por rol: middleware en API (`apps/api/src/middleware/auth.ts`:
    `staff`=admin+gestor, `adminOnly`=admin) aplicado por ruta/método (reportes/tarifas
    adminOnly; config GET staff/PUT admin; habitaciones GET staff/ABM admin; reservas y
    huéspedes staff). El front oculta tabs Reportes/Tarifas/Configuración salvo admin y
    muestra "sin acceso" a clientes. `credentials: include` en el cliente API (envía la
    cookie). Promover roles: `pnpm db:promote <email> <admin|gestor|cliente>`.
    Verificado los 3 roles (tabs + 403/200).
  - ✅ **Gestión de usuarios** (admin, en Configuración): listar, cambiar rol y eliminar
    usuarios (API `/usuarios` adminOnly; no podés cambiar/eliminar tu propia cuenta).
    Componente `UsuariosAdmin`. Verificado en mock.
  - 🔜 (5) Google OAuth (clientes del portal).
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
- ✅ **Reportes ampliados**: agregadas **cancelaciones** y **estadía promedio** a los
  KPIs (además de ocupación, ingresos, reservas, noches, frecuentes), en API, mock,
  UI y export Excel. Verificado en mock.
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
