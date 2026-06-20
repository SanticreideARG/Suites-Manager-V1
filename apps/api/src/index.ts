import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { habitacionesRoutes } from "./routes/habitaciones.js";
import { reservasRoutes } from "./routes/reservas.js";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) => c.json({ ok: true, service: "suites-manager-api" }));
app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/habitaciones", habitacionesRoutes);
app.route("/reservas", reservasRoutes);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API escuchando en http://localhost:${info.port}`);
});
