import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  db,
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "@suites/db";

/**
 * Configuración de Better Auth. El handler se monta en app.ts (/auth/*).
 * Roles: admin | gestor | cliente (campo role en auth_user, default 'cliente').
 *
 * Nota: si Better Auth requiere transacciones interactivas (que el driver
 * neon-http no soporta), se le dará una instancia Drizzle propia con `pg`.
 */
// Vercel pone NODE_ENV=production en las funciones; también vale si la URL es https.
const esProd =
  process.env.NODE_ENV === "production" ||
  (process.env.BETTER_AUTH_URL ?? "").startsWith("https");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "cliente",
        input: false, // no se setea desde el cliente al registrarse
      },
    },
  },
  // basePath default de Better Auth → el cliente funciona sin config extra.
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: [
    "http://localhost:5180",
    "http://localhost:5182",
    "http://localhost:5173",
    "https://suites-manager-v1-web.vercel.app",
    ...(process.env.WEB_URL ? [process.env.WEB_URL] : []),
  ],
  // En prod (https) la web y la API están en dominios distintos (cross-site):
  // las cookies necesitan SameSite=None; Secure. En local (http) se deja el
  // default (lax) que funciona porque localhost:* es same-site.
  advanced: esProd
    ? { defaultCookieAttributes: { sameSite: "none", secure: true } }
    : undefined,
});
