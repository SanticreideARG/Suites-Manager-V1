import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { habitacionesRoutes } from "./routes/habitaciones.js";
import { reservasRoutes } from "./routes/reservas.js";
import { huespedesRoutes } from "./routes/huespedes.js";
import { reportesRoutes } from "./routes/reportes.js";
import { tarifasRoutes } from "./routes/tarifas.js";
import { configRoutes } from "./routes/config.js";
import { usuariosRoutes } from "./routes/usuarios.js";
import { publicRoutes } from "./routes/public.js";
import { amenidadesRoutes } from "./routes/amenidades.js";
import { landingManagerRoutes } from "./routes/landingManager.js";
import { impuestosRoutes } from "./routes/impuestos.js";
import { metodosPagoRoutes } from "./routes/metodosPago.js";
import { pagosRoutes } from "./routes/pagos.js";
import { housekeepingRoutes } from "./routes/housekeeping.js";
import { serviciosRoutes } from "./routes/servicios.js";
import { consumosRoutes } from "./routes/consumos.js";
import { landingServiciosRoutes } from "./routes/landingServicios.js";
import { landingContactosRoutes } from "./routes/landingContactos.js";
import { auditLogRoutes } from "./routes/auditLog.js";
import { politicasCancelacionRoutes } from "./routes/politicasCancelacion.js";
import { auth } from "./auth.js";

/** App Hono sin servidor: la consume server.ts (local) y api/index.ts (Vercel). */
export const app = new Hono();

app.use("*", logger());
// CORS con credenciales: refleja el origin (necesario para enviar cookies de
// sesión cross-origin entre la web y la API).
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "suites-manager-api" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth (rutas bajo /api/auth).
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/habitaciones", habitacionesRoutes);
app.route("/reservas", reservasRoutes);
app.route("/huespedes", huespedesRoutes);
app.route("/reportes", reportesRoutes);
app.route("/tarifas", tarifasRoutes);
app.route("/config", configRoutes);
app.route("/usuarios", usuariosRoutes);
app.route("/amenidades", amenidadesRoutes);
app.route("/landing-manager", landingManagerRoutes);
app.route("/impuestos", impuestosRoutes);
app.route("/metodos-pago", metodosPagoRoutes);
app.route("/pagos", pagosRoutes);
app.route("/housekeeping", housekeepingRoutes);
app.route("/servicios", serviciosRoutes);
app.route("/consumos", consumosRoutes);
app.route("/landing-servicios", landingServiciosRoutes);
app.route("/landing-contactos", landingContactosRoutes);
app.route("/audit-log", auditLogRoutes);
app.route("/politicas-cancelacion", politicasCancelacionRoutes);
app.route("/public", publicRoutes);

export default app;
