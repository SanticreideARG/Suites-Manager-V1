import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

/**
 * Genera la Build Output API de Vercel (.vercel/output/) para la API.
 * - Bundlea la función con esbuild (autocontenida: inlinea @suites/db, etc.).
 * - Declara explícitamente la función y las rutas, así Vercel la despliega sin
 *   ambigüedad (sin depender de la autodetección de api/).
 */

const OUT = ".vercel/output";
const FN = `${OUT}/functions/api.func`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(FN, { recursive: true });
mkdirSync(`${OUT}/static`, { recursive: true });

await build({
  entryPoints: ["src/vercel-entry.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${FN}/index.js`,
  // Algunos paquetes CJS usan require("node:buffer") etc. en tiempo de ejecución.
  // external: evita bundlear los built-ins de Node (se importan como ESM nativos).
  // banner: provee require() via createRequire para dynamic requires residuales.
  external: ["node:*"],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});

// La función es ESM.
writeFileSync(`${FN}/package.json`, JSON.stringify({ type: "module" }) + "\n");

// Config de la función serverless (runtime + handler).
writeFileSync(
  `${FN}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
    },
    null,
    2,
  ) + "\n",
);

// Rutas: todo va a la función /api (Hono enruta por el path original).
writeFileSync(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: "/(.*)", dest: "/api" }],
    },
    null,
    2,
  ) + "\n",
);

// Landing estático mínimo (no se sirve: todo se enruta a /api).
writeFileSync(
  `${OUT}/static/index.html`,
  "<!doctype html><meta charset=utf-8><title>Suites Manager API</title><h1>Suites Manager API</h1>\n",
);

console.log("Build Output generado en .vercel/output");
