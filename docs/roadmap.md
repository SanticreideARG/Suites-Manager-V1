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

### Huéspedes (ficha) — ✅ base + Fase A hecha, ⏳ Fase B pendiente
Base ✅: nombre, documento, email, teléfono, notas, historial de estadías, CRUD.
Fase A ✅ (ver "Huéspedes — separar alojados de histórico" más abajo): tipo de
documento, número de documento, nacionalidad, fecha de nacimiento.

Ampliación pendiente — Fase B (⏳, sin implementar):
- **Datos personales**: ⏳ género (opcional), ⏳ dirección de residencia,
  ⏳ país/ciudad de origen.
- **Documentación y procedencia**: ⏳ estado civil, ⏳ motivo del viaje.
  - ⏳ **Foto/scan del documento (PDF/JPG)** — ver análisis abajo. No hay
    columna `documento_url` ni endpoint de upload todavía.
- **Información de pago** (por reserva, no por huésped): ⏳ modo de pago,
  ⏳ pago por adelantado (sí/no + monto), ⏳ estado del pago (pendiente/parcial/
  completo), ⏳ facturación (CUIT/CUIL, razón social) a nivel huésped (a nivel
  alojamiento ya existe en `config`).
- **Información adicional**: ⏳ vehículo (patente/tipo/estacionamiento),
  ⏳ preferencias especiales, ⏳ necesidades de accesibilidad,
  ⏳ acompañantes (nombre + relación).
- **Gestión interna**: ✅ historial de estadías, ✅ notas internas;
  ✅ **cargos/consumos extras** (tabla `consumos` + catálogo `servicios`,
  migración 0012; sección "Extras" en el modal de reserva — agrega/quita ítems
  del catálogo o libres, cantidad × precio unitario, recalcula el total; nota:
  queda enganchado a la **reserva**, no como registro aparte del huésped fuera
  de una estadía), ✅ N° reserva, ✅ check-in/out.

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
- ✅ **Reglas por monto fijo** (migración 0014): `tarifa_reglas` tiene columnas
  `factor` y `monto` combinables (`base × factor + monto`); el form permite
  editar ambos. ⚠️ La decisión (2026-06-26) era que cada regla fuera de un solo
  tipo, excluyente — hoy no hay esa validación (ver detalle abajo).
- ⏳ Promociones / paquetes (3x2, estadía larga, códigos) — no incluido aún.
- ⏳ Reglas por habitación/tipo (hoy son globales).

### Reportes — ✅ base hecha
- ✅ Ocupación por período (noches de huéspedes / capacidad).
- ✅ Ingresos del período + ✅ ingresos/noches/reservas por habitación.
- ✅ Ranking de huéspedes frecuentes (histórico).
- ✅ Export del reporte (Excel + PDF, ver "Análisis — Ampliación de reportes").
- ⏳ Ingresos por servicio/cargo extra (depende del catálogo de cargos — ver Tarifas).
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

### Tarifas — unificar gestión en un solo lugar (✅ mayormente hecho, ◐ detalles pendientes)
- ✅ **Ajuste de precios base desde Tarifas**: cuadro de precio base por
  habitación, primero en la pestaña Tarifas (`TarifasPage.tsx`), editable sin
  ir a Configuración. Guarda en `habitaciones.tarifaBase`.
  - ⏳ La regla "editar la base solo afecta reservas nuevas" no tiene un
    mecanismo explícito de congelamiento — en la práctica el total ya se
    persiste al crear la reserva, así que no se recalcula retroactivamente,
    pero no hay nada que lo garantice si cambia la lógica de cálculo.
- ◐ **Reglas por monto fijo**: implementado (migración 0014, columnas
  `factor` + `monto`), pero **no excluyente**: el form permite setear ambos a
  la vez (`base × factor + monto`), cuando la decisión era que cada regla
  fuera de un solo tipo. Falta la validación/UI que fuerce la exclusividad.
- ◐ **Cargos extra (catálogo)**: tablas `servicios` (catálogo) + `consumos`
  (cargos por reserva) existen (migración 0012), con CRUD API (`/servicios`) y
  UI de alta/baja de consumos dentro del modal de reserva ("Extras"). Falta:
  - El campo `categoria` es texto libre, **no** un enum de las 4 categorías
    fijas acordadas (Servicios, Consumos, Cargos, Bonificaciones).
  - **Bonificaciones no resta** — todos los consumos suman al total; no hay
    lógica de signo por categoría.
  - No hay una pestaña/sección dedicada al CRUD del catálogo (hoy se gestiona
    implícitamente vía el dropdown al agregar un consumo a una reserva).

  **Decisiones (2026-06-26) — pendientes de aplicar:**
  - Cada regla de un solo tipo, excluyente (× o monto fijo, no ambos).
  - Categorías fijas con Bonificaciones restando, en monto fijo $.

### Huéspedes — separar "alojados" de "histórico" (✅ Fase A / ⏳ resto)
- ✅ **Reestructura de la pestaña Huéspedes**: dos secciones:
  1. **"Alojados ahora"** (arriba): cards de huéspedes con reserva en estado `ocupada`.
     Click → abre la ficha del huésped.
  2. **"Historial de Clientes"** (abajo): listado completo con búsqueda.
  - Endpoint nuevo: `GET /huespedes/alojados`. Migration: `0007_huespedes_fase_a.sql`.
- ✅ **Ficha Fase A** — nuevos campos en `HuespedForm` y `HuespedDetalle`:
  tipo de documento (DNI/Pasaporte/CE/Otro), número de documento, nacionalidad,
  fecha de nacimiento. Verificado en mock.
- ✅ **Cargos extra** — implementado, pero sobre la **reserva** (tabla
  `consumos` + catálogo `servicios`, ver sección Tarifas arriba), no como un
  registro aparte del huésped fuera de una estadía.
- ⏳ **Ficha Fase B**: dirección, estado civil, motivo de viaje, info de pago,
  vehículo, preferencias, acompañantes, foto/scan del documento.

### Calendario — datos del cliente (⏳)
- ⏳ **Botón adicional "Ver cliente"** en las acciones de una reserva (junto a
  modificar fechas y descargar/generar comprobante): muestra los datos del huésped
  asociado a esa reserva.

  **Decisión (2026-06-26):** se muestra en un **panel/sección dentro del mismo modal**
  de la reserva (sin navegar fuera; mantiene el contexto).

### Configuración › Habitaciones — características de la unidad (✅)
- ✅ **"Características" de las unidades**: catálogo configurable reutilizable en
  Configuración + asignación por unidad en el modal de edición de alojamiento.
  - Tablas: `amenidades` (catálogo) + `habitacion_amenidades` (asignación × unidad).
  - Tipos: **booleana** (checkbox), **texto** (campo libre), **número** (campo numérico).
  - Migrations: `0006_amenidades.sql`. API: `GET/POST/PATCH/DELETE /amenidades`,
    `GET/PUT /habitaciones/:id/amenidades`. UI: sección en Configuración + sección
    en modal "Editar alojamiento". Verificado en mock.

---

## Lote de pedidos (triage 2026-06-26 B) — ⏳ asentado, sin implementar

> Parte de los ítems requieren análisis o cuestionario previo (indicado).

### BUG — Línea blanca en tablas (modo oscuro, persistente) 🐛
- ✅ **BUG 3** — `dark:divide-slate-700` agregado directamente en JSX (`<tbody>` / `<ul>`)
  en los 6 archivos afectados: `HabitacionesAdmin`, `TarifasPage`, `UsuariosAdmin`,
  `ReportesPage`, `HuespedesPage`, `HuespedDetalle`. Fix más robusto que el override
  CSS (no depende del orden de capas en el bundle de producción de Tailwind v4).

### Seguridad — Cambios sensibles solicitan contraseña (✅)
- ✅ **Re-autenticación antes de cambios sensibles**: sección "Mi cuenta"
  (`apps/web/src/features/auth/MiCuenta.tsx`, abierta desde el email en el
  sidebar/topbar del panel). Cambiar contraseña, cambiar email y eliminar la
  cuenta propia piden la contraseña actual antes de ejecutarse — ver detalle
  en "Roles y permisos" más abajo. ⏳ Pendiente extender esto al portal de
  clientes cuando exista perfil de cliente autoservicio.

### Configuración — renombrar "Habitaciones" → "Alojamientos" (✅)
- ✅ **Renombrado** "Habitaciones" → "Alojamientos" en Configuración: título de sección,
  botón "+ Alojamiento", modal "Nuevo alojamiento" y texto vacío. La entidad en DB
  (`habitaciones`) no cambió — solo vocabulario de UI.

### Configuración — nombre y logo de la app personalizables (✅)
- ✅ **Nombre de la aplicación editable**: sidebar y topbar mobile ahora leen
  `config.nombre` via `api.config.get()` (fallback a "Suites Manager").
  Comprobantes ya usaban `config` desde Impl 4-A.
- ✅ **Logo editable con upload de archivo**: endpoint `PUT /config/logo`
  (multipart/form-data, adminOnly) sube a Vercel Blob y borra el logo anterior;
  UI en Configuración con preview y botón "Subir/Reemplazar logo".

### Carga de imágenes (logo y alojamientos) (✅ implementado, ◐ detalles de la decisión sin aplicar)
- ✅ **Implementado**: Vercel Blob para logo (`PUT /config/logo`) y fotos por
  unidad (tabla `habitacion_fotos`, migración 0008; endpoints
  `GET/POST /:id/fotos`, `DELETE /:id/fotos/:fotoId`, `PATCH
  /:id/fotos/orden`; componente `FotosHabitacion.tsx` con reorden y máximo 10
  fotos respetado en la UI).
- ◐ **Decisiones (2026-06-26) no aplicadas del todo**:
  - "Optimización en el cliente" (redimensionar/comprimir antes de subir): ⏳
    no implementado — el archivo se envía tal cual al servidor.
  - "Formatos JPG y WebP": ⏳ sin conversión/validación explícita de formato en
    el cliente; Vercel Blob preserva lo que se suba (`accept="image/*"`).

### Análisis — Multi-sucursal (⏳)
- ⏳ **Análisis de segmentación por sucursal** — solo análisis por ahora; no se
  implementa. Objetivo: que las decisiones de arquitectura actuales no bloqueen
  el futuro.

  **Decisiones (2026-06-26):**
  - **Solo análisis** — no es un objetivo activo de corto plazo.
  - Clientes/huéspedes **por sucursal** (sin mezcla entre propiedades).
  - Gestores asignados a **una sola sucursal** (fijo; el admin lo configura).
  - **Cada sucursal** tiene sus propios datos de empresa, logo, CUIT y numeración
    de comprobantes (configuración completamente independiente).
  - **Impacto de arquitectura a tener en cuenta**: prácticamente todas las tablas
    necesitarían `sucursal_id` como FK. Conviene definir esto antes de escalar
    el modelo de datos para evitar rewrites.

### Análisis — Ampliación de reportes (✅ mayormente implementado)
- ✅ **Comparación mes a mes / año a año**: endpoint `/reportes/comparativa`.
- ✅ **Forecast de ingresos** (reservas futuras confirmadas): endpoint
  `/reportes/forecast` (30/60/90 días).
- ✅ **Gráficos de barra** para ingresos/ocupación por habitación en
  `ReportesPage.tsx`.
- ✅ **Export PDF del reporte** (además del Excel ya existente).
- ◐ **Tasa de ocupación por habitación/tipo**: confirmado por habitación;
  verificar si el desglose "por tipo" también está cubierto antes de darlo
  por cerrado.
- ⏳ *(sin cambios, siguen pendientes)*: ingresos por cargo extra (depende del
  catálogo de cargos — ver Tarifas), huéspedes nuevos vs recurrentes.

### Portal de clientes — website público (◐ base hecha, falta reservar online)
- ✅ **Landing pública** (`LandingPage.tsx`, ruta `/`): navegación como
  invitado sin login, `HeroCarousel`, grid de unidades (`UnitCard`) con
  foto/tipo/capacidad/tarifa base, `BookingPanel` de búsqueda por fechas,
  modales de Servicios y Contacto, footer con links dinámicos.
- ✅ **Login con Google OAuth + email/password** en `LoginModal.tsx` (ver
  Auth más abajo) — invitado navega la landing, login solo se pide para
  reservar.
- ✅ **Consultar disponibilidad por fecha en tiempo real**: `GET
  /public/disponibilidad` + `GET /public/habitaciones` (endpoints públicos,
  sin auth).
- ⏳ **Realizar reservas online**: NO implementado — `apps/api/src/routes/
  reservas.ts` protege *todas* las rutas con el middleware `staff`; no existe
  endpoint público para crear una reserva en estado "pendiente de
  confirmación". El `BookingPanel` busca disponibilidad pero no completa una
  reserva.
- ⏳ **Perfil de cliente** (cargar/actualizar datos personales, historial de
  reservas y comprobantes propios): no implementado — no hay rutas
  `/portal/perfil` ni `/portal/mis-reservas`.
- ◐ **Cotización con tarifas dinámicas en la landing**: a confirmar si
  `BookingPanel` ya muestra precio final con reglas aplicadas o solo tarifa
  base — verificar antes de asumir que está cerrado.

  **Decisiones (2026-06-26) — estado real:**
  - Arquitectura de rutas públicas en el mismo dominio: ✅ cumplida (`/` es la
    landing, panel bajo `/panel`).
  - Auth Google + email/password: ✅ cumplida.
  - Reserva pendiente de confirmación por el staff: ⏳ no implementado (falta
    incluso la creación pública de la reserva).

### Administración de la landing page desde el panel (✅ mayormente implementado)
- ✅ **Sección "Landing" en el panel** (`LandingManagerPage.tsx`, tab solo
  admin): implementada con tablas dedicadas (no JSONB, salvo los 4 campos de
  texto del hero en `config`).

  **Alcance implementado:**
  - **Hero / portada**: ✅ tagline, subtítulo, texto y URL del CTA
    (`config.landing_tagline/subtitulo/cta_texto/cta_url`, migración 0009).
    ⏳ Los **slides del carrusel siguen hardcodeados** en `HeroCarousel.tsx`
    (no editables desde el panel todavía).
  - **Sección "Alojamientos"**: ✅ las unidades se muestran automáticamente
    desde la DB. ⏳ No hay toggle de activar/desactivar unidad por unidad
    para la landing (se muestran todas).
  - **Características de unidades**: ◐ las amenidades ya existen en
    Configuración; verificar si ya están cableadas visualmente en la
    landing/`UnitCard` o si falta ese último paso.
  - **Fotos por unidad**: ✅ ya aparecen (mismo storage que Configuración).
  - **Fotos del slider / hero**: ✅ CRUD con reorden vía Vercel Blob (tabla
    `landing_fotos`, hasta 8 fotos).
  - **Links del footer**: ✅ CRUD con orden y activo/inactivo (tabla
    `landing_links`).
  - **Servicios y contactos**: ✅ `landing_servicios` + `landing_contactos`
    (migración 0013), con CRUD admin y modales públicos en la landing.
  - **Colores / personalización visual**: ⏳ sigue sin implementar (acento
    hardcodeado).
  - **Formulario de consulta**: ◐ a confirmar si ya envía notificaciones al
    panel/admin o si el modal de Contacto es solo informativo.

  **Prerequisitos** (ya cumplidos): características de unidades ✅, carga de
  imágenes ✅. Pendiente real: hero dinámico, toggle de visibilidad por
  unidad, personalización de color.

---

## Lote de pedidos (triage 2026-07-01) — cancelación de reservas ✅

### BUG — Cancelar reserva sin confirmación
- ✅ El botón "Cancelar" en el modal de reserva (`AccionesReserva.tsx`) ahora
  abre un panel de confirmación inline (`CancelarPanel`) en vez de cancelar
  directo. El bloqueo de mantenimiento sigue con su flujo propio ("Eliminar
  bloqueo"), sin cambios — no aplica el resto de esta sección (no tiene
  huésped, check-in ni cargos).

### BUG — Cancelar con check-in + cargos ya asociados
- ✅ Guard en `POST /reservas/:id/cancelar` (`apps/api/src/routes/reservas.ts`):
  si `estado === "ocupada"` y la reserva tiene consumos asociados, devuelve
  `409 cancelacion_bloqueada` y no cancela. El panel de confirmación del front
  hace la misma verificación (vía `api.consumos.list`) para mostrar el mensaje
  de bloqueo antes de intentarlo.

### Implementación — Políticas de cancelación configurables (cargo % según anticipación)
- ✅ Nueva tabla `politicas_cancelacion` (migración `0018`): nombre,
  `diasMinimos`, `porcentaje`, activa. CRUD adminOnly en
  `/politicas-cancelacion`, UI en **Configuración → pestaña "Cancelaciones"**
  (`PoliticasCancelacionAdmin.tsx`).
- ✅ Lógica pura testeable en `apps/api/src/cancelacionCalc.ts`
  (`cancelacionCalc.test.ts`, 6 tests): se aplica la política activa con
  mayor `diasMinimos` que no supere los días restantes al checkin; si ninguna
  califica (checkin ya pasado), se usa la de menor `diasMinimos` como piso.
- ✅ Al cancelar, si corresponde cargo (>0%), se inserta un `consumo` con
  categoría `cargos` (reutiliza el sistema de cargos extra ya existente) y se
  suma al total de la reserva — igual que cualquier otro cargo. No aplica a
  bloqueos de mantenimiento (sin huésped).
- ✅ `GET /reservas/:id/cotizar-cancelacion` (staff): preview del cargo antes
  de confirmar, usado por el panel de confirmación del front.
- ⏳ Pendiente correr la migración `0018` contra Neon (`pnpm db:migrate`).

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
  - ✅ (5) **Google OAuth** (clientes del portal): configurado en
    `apps/api/src/auth.ts` (`socialProviders.google` con `GOOGLE_CLIENT_ID`/
    `GOOGLE_CLIENT_SECRET`) + botón "Continuar con Google" (`GoogleBtn` en
    `LoginModal.tsx`, landing) con `callbackURL: "/panel"`. Ver
    `docs/google-oauth-setup.md`.
  - ✅ **Re-autenticación antes de cambios sensibles**: sección "Mi cuenta"
    (`apps/web/src/features/auth/MiCuenta.tsx`, abierta desde el email en el
    sidebar/topbar). Cambiar contraseña usa `changePassword` de Better Auth,
    que exige `currentPassword` server-side. Cambiar email re-verifica la
    contraseña actual vía `signIn.email` antes de llamar `changeEmail`
    (habilitado en `auth.ts`). Eliminar cuenta llama `deleteUser({ password })`,
    que Better Auth verifica server-side (también habilitado en `auth.ts`).
- ⭐ **Tests automatizados**:
  - ✅ **Vitest** (unit): lógica de tarifas dinámicas (finde/rango/prioridad/
    totales) en `apps/api/src/tarifaCalc.test.ts` — **7 tests**, los 7 pasan
    (`pnpm test`; verificado corriendo la suite — una revisión anterior de
    este doc lo había "corregido" a 5 por error). Base lista para sumar más
    (overlap de fechas, schemas Zod).
  - 🔜 unit adicionales + **integración** del anti-overbooking concurrente y
    cancelaciones (requiere una **DB de test**, p. ej. branch de Neon o Postgres local).
  - 🔌 **Playwright** (e2e): sigue sin configurar — flujos crear/modificar/
    cancelar reserva, overbooking, huéspedes. Corre contra la web (modo mock o
    API real).
- ⭐ **Observabilidad / trazabilidad**:
  - 🔌 **Sentry**: captura de errores y trazas en web (`@sentry/react`) y API
    (`@sentry/node`). Requiere DSN (cuenta Sentry). Bajo esfuerzo de wiring.
  - 🔌 **Uptime Kuma**: monitoreo de disponibilidad (self-hosted) apuntando a
    `/health` de la API y a la URL de la web; alertas. Es ops/infra (fuera del repo).
- ✅ **Reportes ampliados**: agregadas **cancelaciones** y **estadía promedio** a los
  KPIs (además de ocupación, ingresos, reservas, noches, frecuentes), en API, mock,
  UI y export Excel. Verificado en mock.
- ✅ **Housekeeping + historial de mantenimiento por unidad**: implementado
  (migración 0011): tabla `tareas_housekeeping` (estado pendiente/en_proceso/
  completado; tipo limpieza/mantenimiento/inspeccion; prioridad; asignado_a),
  CRUD + filtros en `apps/api/src/routes/housekeeping.ts`, UI en
  `HousekeepingPage.tsx` (KPIs de hoy/semana/todas, alta y cambio de estado).
- ⭐ **Dashboard de KPIs**: ocupación / ingresos / reservas activas en tiempo real
  (amplía ProximosPanel + Reportes). Sigue pendiente como panel unificado (los
  KPIs hoy viven repartidos entre Reportes y ProximosPanel).
- ✅ **Pagos** (registro): completo. Tabla `pagos` ampliada (migración 0010:
  métodos de pago + impuestos, monto base/extras, referencia), endpoints API
  (`GET/POST/DELETE /pagos`) y **UI en el panel**: sección "💰 Pagos" dentro del
  modal de reserva (`AccionesReserva.tsx` → `PagosSection`) con selector de
  método (efectivo/transferencia/tarjeta/QR/billetera), monto base + extras,
  cálculo de recargo por método, barra de saldo cobrado/pendiente e historial
  de pagos. *(Corrección: una revisión anterior de este doc no había
  encontrado esta UI — verificado directamente en el código, sí existe.)*
  Falta solamente: MercadoPago (🔌), sin empezar.
- ◐ **Auditoría / logs**: tabla `audit_log` implementada (migración 0015:
  usuario, acción, entidad, diff en JSONB, búsqueda full-text) con logging
  fire-and-forget en `pagos.ts`/`reservas.ts` (`apps/api/src/lib/audit.ts`).
  **Falta lo que la hacía "firmada"**: no hay columna de hash del registro
  previo ni verificación de cadena — hoy es un log de auditoría normal, no
  tamper-evident.

### 🔌 Integraciones (requieren servicios/credenciales externas)
- 🔌 **Notificaciones**: email (Resend) + WhatsApp (Evolution API) — confirmación de
  reserva, recordatorio de check-in, encuesta post-estadía.
- 🔌 **Pagos electrónicos**: MercadoPago (checkout + QR interoperable + webhooks).

### 🌐 Portal público / reservas online (módulo nuevo, medio plazo)
- ✅ **Landing page pública** del alojamiento: presentación, fotos, habitaciones,
  servicios, contacto (ver "Portal de clientes" arriba para el detalle completo).
- ◐ **Gestor de reservas para clientes** (self-service): consultar disponibilidad
  por fechas y ver habitaciones libres + precio base ✅ ya funciona; **reservar
  online sigue sin implementar** (todas las rutas de `/reservas` requieren rol
  `staff`). Reutilizaría el anti-overbooking ya existente una vez se agregue el
  endpoint público.
- ✅ **Registro/login de clientes con Google OAuth** — implementado (ver Auth).
- Nota de arquitectura: la landing pública ya vive en el mismo dominio (`/`),
  consumiendo endpoints públicos de solo lectura (`/public/*`); falta el
  endpoint de creación de reserva "pendiente de confirmación" para que el
  staff la confirme desde el panel.

### ⏳ Opciones / mayor alcance (ver Fase 3)
- ⏳ **Channel Manager** (Booking/Airbnb/Expedia) — anti doble-reserva sincronizando.
- ⏳ **Multi-sucursal** — gestión centralizada; impacta el modelo (scoping por sucursal).
- ⏳ **AFIP / facturación electrónica** — WSFE + certificados.
- ⏳ **Backups**: Neon ya provee backups automáticos / PITR en su plan; estrategia
  adicional (export periódico a almacenamiento externo) = opcional.

---

## Fase 3 — Escala / completo (⏳, salvo lo ya marcado)
- Channel manager (Booking/Airbnb/Expedia), evitar overbooking sincronizando.
- ✅ Housekeeping/mantenimiento: asignación de limpieza, registro de incidencias
  (implementado, ver "Estratégicos" arriba — ya no es exclusivo de Fase 3).
- Notificaciones automáticas: email/WhatsApp (confirmación, recordatorio, encuesta).
- Contabilidad/AFIP, controladores fiscales.
- Multi-sucursal.
