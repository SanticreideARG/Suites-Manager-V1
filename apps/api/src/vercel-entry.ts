import { handle } from "hono/vercel";
import app from "./app.js";

/**
 * Fuente del entry de función serverless para Vercel. El build (esbuild) la
 * bundlea en `api/index.js` autocontenida (con @suites/db y @suites/shared
 * inlineados), así no hay resolución de módulos del workspace en runtime.
 */
export const config = { runtime: "nodejs" };

export default handle(app);
