import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { habitacionesRoutes } from "./routes/habitaciones.js";
import { reservasRoutes } from "./routes/reservas.js";
import { huespedesRoutes } from "./routes/huespedes.js";
import { reportesRoutes } from "./routes/reportes.js";
import { tarifasRoutes } from "./routes/tarifas.js";
import { configRoutes } from "./routes/config.js";
import { auth } from "./auth.js";

/** App Hono sin servidor: la consume server.ts (local) y api/index.ts (Vercel). */
export const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => c.json({ ok: true, service: "suites-manager-api" }));
app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth (todas las rutas /auth/*).
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

app.route("/habitaciones", habitacionesRoutes);
app.route("/reservas", reservasRoutes);
app.route("/huespedes", huespedesRoutes);
app.route("/reportes", reportesRoutes);
app.route("/tarifas", tarifasRoutes);
app.route("/config", configRoutes);

export default app;
