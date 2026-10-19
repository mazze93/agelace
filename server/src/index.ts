import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp, defaultPaths } from "./app.js";
import { seedWorld } from "./seed.js";

const here = dirname(fileURLToPath(import.meta.url));
const paths = defaultPaths(here);

const worldDir = process.env["AGELACE_WORLD"] ?? "/world";
await assertWritable(worldDir);

const app = await buildApp({
  worldDir,
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

/**
 * The container runs as a non-root user. If the host folder it's given can't be
 * written by that user, say so in words before anything else fails obscurely.
 */
async function assertWritable(dir: string): Promise<void> {
  const probe = join(dir, `.agelace-write-check-${process.pid}`);
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(probe, "");
    await rm(probe);
  } catch (err) {
    const uid = typeof process.getuid === "function" ? process.getuid() : "?";
    console.error(
      `agelace can't write to its world folder (${dir}), so it won't start.\n` +
        `It runs as user ${uid}. On Linux, start it with ./start-agelace.sh, which runs it as you;\n` +
        `or give that user access to the folder. Details: ${(err as Error).message}`,
    );
    process.exit(78);
  }
}
