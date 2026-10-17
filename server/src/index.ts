import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, defaultPaths } from "./app.js";
import { seedWorld } from "./seed.js";

const here = dirname(fileURLToPath(import.meta.url));
const paths = defaultPaths(here);

const app = await buildApp({
  worldDir: process.env["AGELACE_WORLD"] ?? "/world",
  builtinFontsDir: paths.builtinFontsDir,
  staticDir: paths.staticDir,
  watch: true,
  poll: process.env["AGELACE_POLL"] === "1",
  seed: seedWorld,
});

const port = Number(process.env["PORT"] ?? 8080);
await app.listen({ host: "0.0.0.0", port });
console.log(`agelace is open at http://localhost:${port}`);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => void app.close().then(() => process.exit(0)));
}
