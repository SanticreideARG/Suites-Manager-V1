# Autenticación en Vercel — habilitar login y gestionar usuarios

La autenticación (Better Auth) corre en el **proyecto API**. Para que el login
funcione en producción hay que configurar variables de entorno; luego se crean
usuarios y se les asigna un rol.

> La base es **Neon** y es la misma para local y producción. Por eso un usuario
> creado en cualquier entorno (o promovido desde local) sirve en Vercel.

---

## Paso 1 — Variables de entorno en el proyecto API (obligatorio)

Sin esto el login "no funciona": cada cold start de la función usa un secreto
distinto y la sesión nunca queda válida.

Vercel → proyecto **API** (`suites-manager-v1-api`) → **Settings → Environment
Variables** → agregá estas 3 (Production, y Preview si querés):

| Variable | Valor | Ejemplo |
|---|---|---|
| `BETTER_AUTH_SECRET` | un secreto fuerte y fijo | salida de `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL pública del **API** | `https://suites-manager-v1-api.vercel.app` |
| `WEB_URL` | URL pública de la **web** | `https://suites-manager-v1-web.vercel.app` |

> Para generar el secreto: en una terminal `openssl rand -base64 32`
> (o en Node: `node -e "console.log(crypto.randomBytes(32).toString('base64'))"`).
> Guardalo: si lo cambiás, se invalidan todas las sesiones existentes.

Después de guardar, **Deployments → Redeploy** del proyecto API.

### Verificación rápida
```bash
curl -i -X POST https://suites-manager-v1-api.vercel.app/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"santi.creide@gmail.com","password":"TU_PASS"}'
```
Debe devolver **200** y un `Set-Cookie` de sesión. Si da 500, revisá que las
variables estén bien y que el deploy haya tomado los cambios.

---

## Paso 2 — Crear un usuario

**Opción A (recomendada): registrarse desde la web.**
Abrí la web desplegada → en el login, "¿No tenés cuenta? Registrate" → completá
nombre, email y contraseña. Queda con rol **cliente** por defecto.

**Opción B: por API (curl).**
```bash
curl -X POST https://suites-manager-v1-api.vercel.app/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@mail.com","password":"contraseña","name":"Nombre"}'
```

> La contraseña mínima es 8 caracteres.

---

## Paso 3 — Asignar el rol (admin / gestor / cliente)

Los nuevos usuarios nacen como **cliente**. Para hacerlos **admin** o **gestor**:

**Opción A: script local** (corre contra la misma base Neon de producción):
```bash
pnpm db:promote persona@mail.com admin
pnpm db:promote otra@mail.com gestor
```

**Opción B: SQL desde el panel de Neon** (Neon Console → tu proyecto → SQL Editor):
```sql
UPDATE auth_user SET role = 'admin' WHERE email = 'persona@mail.com';
```

Roles (detalle en [roadmap.md](./roadmap.md)):
- **admin**: acceso total (incluye Reportes, Tarifas, Configuración y ABM de habitaciones).
- **gestor**: operación diaria (calendario, reservas, check-in/out, huéspedes). Sin
  Reportes, Tarifas, Configuración ni alta/baja de habitaciones.
- **cliente**: sin acceso al panel (reservado para el futuro portal público).

---

## Estado actual
- Ya existe un admin: **santi.creide@gmail.com** (rol admin). Funciona apenas
  configures las variables del Paso 1 y redeploys el API.
- Usuarios de prueba (se pueden borrar): `admin@suites.test`, `gestor@suites.test`,
  `cliente@suites.test`.

## Si tras el Paso 1 el login sigue fallando en producción
Es, casi seguro, tema de **cookies cross-site** (la web y el API están en dominios
distintos). Ya están configuradas como `SameSite=None; Secure`, pero si el navegador
las bloquea, las alternativas son:
1. Servir web y API bajo el **mismo dominio** (p. ej. la web con un rewrite a la API
   en `/api`), de modo que la cookie sea same-site.
2. Usar **tokens Bearer** (plugin de Better Auth) en lugar de cookies.

Avisá si pasa y lo resolvemos.
