import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Carga el .env de la RAÍZ del monorepo, sin importar desde qué cwd se ejecute
 * (los scripts corren con cwd en packages/db o apps/api). En Vercel el archivo
 * no existe y las env ya vienen inyectadas: dotenv simplemente no hace nada.
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: join(repoRoot, ".env") });
