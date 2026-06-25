import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";

/**
 * Exige sesión y que el rol esté entre los permitidos.
 * Roles: admin (todo), gestor (operación), cliente (solo portal).
 */
export function requireRole(...roles: string[]) {
  return createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: "no_auth", message: "No autenticado." }, 401);
    }
    const role = (session.user as { role?: string }).role ?? "cliente";
    if (!roles.includes(role)) {
      return c.json(
        { error: "forbidden", message: "No tenés permiso para esta acción." },
        403,
      );
    }
    return next();
  });
}

/** Staff del panel: administrador o gestor. */
export const staff = requireRole("admin", "gestor");

/** Solo administrador (reglas de negocio: config, ABM habitaciones, reportes, tarifas). */
export const adminOnly = requireRole("admin");
