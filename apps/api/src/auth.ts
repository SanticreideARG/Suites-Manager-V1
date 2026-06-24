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
  basePath: "/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
});
