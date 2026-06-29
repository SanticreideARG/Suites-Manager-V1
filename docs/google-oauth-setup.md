# Google OAuth — Guía de configuración

Stack: Better Auth 1.2.12 (ya instalado) + Google OAuth 2.0.
El provider de Google se agrega como plugin; no requiere dependencias extra.

---

## 1. Google Cloud Console

### 1.1 Crear / seleccionar proyecto

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Menú superior → **Seleccionar proyecto** → **Nuevo proyecto**
   - Nombre: `SuitesManager` (o el que prefieras)
   - Organización: ninguna (personal) o la tuya

### 1.2 Habilitar la API de Google Identity

1. En el menú lateral: **APIs y servicios** → **Biblioteca**
2. Buscar **"Google Identity"** o **"OAuth"**
3. Seleccionar **"Google+ API"** → **Habilitar**
   > Alternativa moderna: simplemente crear las credenciales OAuth; Google habilita el scope automáticamente.

### 1.3 Pantalla de consentimiento OAuth

1. **APIs y servicios** → **Pantalla de consentimiento de OAuth**
2. Tipo de usuario: **Externo** (para usuarios fuera de tu organización G Suite)
3. Completar:
   - **Nombre de la app**: "SuitesManager" (o el nombre del alojamiento)
   - **Email de soporte**: tu email
   - **Logo**: opcional (el logo del alojamiento)
   - **Dominio de la app**: tu dominio de producción (ej. `suites-manager.vercel.app`)
   - **Datos de contacto del desarrollador**: tu email
4. Scopes: **Agregar o quitar scopes** → seleccionar:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Usuarios de prueba: agregar los emails con los que vas a testear en desarrollo
6. **Guardar y continuar**

> En modo "Testing" solo los usuarios de prueba pueden iniciar sesión.
> Para pasar a producción: **Publicar app** (requiere verificación de Google si usás scopes sensibles; con estos 3 scopes básicos generalmente aprueba rápido).

### 1.4 Crear credenciales OAuth 2.0

1. **APIs y servicios** → **Credenciales** → **+ Crear credenciales** → **ID de cliente de OAuth**
2. Tipo de aplicación: **Aplicación web**
3. Nombre: `SuitesManager Web`
4. **Orígenes de JS autorizados**:
   ```
   http://localhost:5182
   https://TU-DOMINIO.vercel.app
   ```
5. **URIs de redireccionamiento autorizados**:
   ```
   http://localhost:3001/api/auth/callback/google
   https://TU-API.vercel.app/api/auth/callback/google
   ```
   > El path `/api/auth/callback/google` lo maneja Better Auth automáticamente.
6. **Crear** → copiar el **Client ID** y el **Client Secret**

---

## 2. Variables de entorno

### `apps/api/.env` (local)

```env
# (existentes)
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001
WEB_URL=http://localhost:5182
BLOB_READ_WRITE_TOKEN=...

# Nuevo
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### Vercel → Proyecto API → Settings → Environment Variables

Agregar (Production + Preview):
```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

---

## 3. Código — API (`apps/api/src/auth.ts`)

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@suites/db";
import * as schema from "@suites/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.WEB_URL!],

  emailAndPassword: { enabled: true },   // ← ya existente

  // ── NUEVO ──────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // ────────────────────────────────────────────────────────
});
```

> No se necesitan dependencias extra; el provider de Google viene incluido en `better-auth`.

---

## 4. Código — Web (`apps/web/src/lib/auth.ts`)

Verificar que el cliente de Better Auth esté configurado (ya debería estar):

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
});

export const { useSession, signIn, signOut } = authClient;
```

---

## 5. Botón de "Continuar con Google"

Agregar en `LoginPage.tsx` (o donde esté el formulario de login):

```tsx
// En LoginPage.tsx
import { signIn } from "../../lib/auth.js";

// Dentro del JSX, debajo del form email/password:
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <span className="w-full border-t border-slate-200" />
  </div>
  <div className="relative text-center text-xs text-slate-400">o</div>
</div>

<button
  type="button"
  onClick={() =>
    signIn.social({
      provider: "google",
      callbackURL: "/panel",   // a dónde redirigir después del login
    })
  }
  className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
>
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  Continuar con Google
</button>
```

---

## 6. Rol del usuario nuevo por Google OAuth

Por defecto, Better Auth asigna el rol del campo `role` en `auth_user` (default: `'cliente'`).

Un admin puede cambiar el rol desde el panel: **Configuración → Usuarios**.

Si querés que ciertos emails sean admin automáticamente al registrarse por primera vez, podés usar un hook de Better Auth:

```typescript
// En auth.ts
export const auth = betterAuth({
  // ...
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",");
          if (adminEmails.includes(user.email)) {
            await db.update(authUser).set({ role: "admin" }).where(eq(authUser.id, user.id));
          }
        },
      },
    },
  },
});
```

Agregar en `.env`:
```env
ADMIN_EMAILS=santi@ejemplo.com,otro@ejemplo.com
```

---

## 7. Flujo completo

```
Usuario → "Continuar con Google"
  → signIn.social({ provider: "google" })
  → Redirect a accounts.google.com
  → Usuario elige/autoriza cuenta Google
  → Google redirige a /api/auth/callback/google (la API)
  → Better Auth valida el token y crea/actualiza el usuario en auth_user
  → Redirect a /panel (callbackURL)
  → useSession() devuelve la sesión activa
```

---

## 8. Checklist de verificación

- [ ] Client ID y Secret en `.env` local y en Vercel
- [ ] URI de redirect en Google Console apunta a la URL de la API (`/api/auth/callback/google`)
- [ ] `socialProviders.google` en `auth.ts`
- [ ] Botón de Google en `LoginPage.tsx`
- [ ] Deploy en Vercel (la API necesita las env vars en producción)
- [ ] Pantalla de consentimiento publicada (o emails de prueba agregados en modo Testing)

---

## 9. Notas

- **No requiere** instalar nada extra; el provider de Google está incluido en `better-auth`.
- El `callbackURL` en `signIn.social()` puede ser cualquier ruta pública de la web.
- Better Auth maneja automáticamente la creación del usuario si no existe y la actualización del token si ya existe.
- Si el usuario ya tiene cuenta por email/password con el mismo email, Better Auth lo vincula automáticamente.
- Las cookies de sesión funcionan igual que con email/password (mismo mecanismo).
