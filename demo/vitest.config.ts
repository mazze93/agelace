import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The same swap as build.mjs, so these tests run the server's stores on the
// sandbox's filesystem, in Node.
const shim = (f: string) => fileURLToPath(new URL(`./src/${f}`, import.meta.url));
export default defineConfig({
  resolve: { alias: { "node:fs/promises": shim("fs.ts"), "node:path": shim("path.ts") } },
  test: { include: ["test/**/*.test.ts"] },
});
