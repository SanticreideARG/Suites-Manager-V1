/**
 * Carga el .env de la RAÍZ del monorepo para desarrollo local, sin importar el
 * cwd. En serverless (Vercel) las env ya vienen inyectadas y puede no haber
 * `dotenv`, filesystem ni `import.meta.url` confiable en el bundle: por eso TODO
 * (incluidos los imports) va en import dinámico dentro de try/catch, para que
 * este módulo NUNCA pueda crashear la función al cargar.
 */
try {
  const { config } = await import("dotenv");
  const { dirname, join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  config({ path: join(repoRoot, ".env") });
} catch {
  // Sin .env local / sin dotenv: las variables ya están en el entorno.
}
