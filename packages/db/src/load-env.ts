import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Carga el .env de la RAÍZ del monorepo, sin importar desde qué cwd se ejecute
 * (los scripts corren con cwd en packages/db o apps/api).
 *
 * En serverless (Vercel) las env ya vienen inyectadas y puede no haber acceso
 * a filesystem ni a import.meta.url confiable: si algo falla, se ignora.
 */
try {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  config({ path: join(repoRoot, ".env") });
} catch {
  // Sin .env local: las variables ya están en el entorno.
}
