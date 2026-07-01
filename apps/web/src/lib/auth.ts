import { createAuthClient } from "better-auth/react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/** Cliente de Better Auth. baseURL = origen de la API (basePath /api/auth).
 *  credentials: include → envía/recibe la cookie de sesión cross-origin. */
export const authClient = createAuthClient({
  baseURL: BASE,
  fetchOptions: { credentials: "include" },
});

export const {
  useSession,
  signIn,
  signOut,
  signUp,
  changePassword,
  changeEmail,
  deleteUser,
} = authClient;
