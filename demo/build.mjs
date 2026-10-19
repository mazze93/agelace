// Build the sandbox into demo/dist: the real app (Vite, VITE_AGELACE_DEMO=1),
// the service worker that plays the server (esbuild, with node:fs/promises and
// node:path swapped for the shims), and the built-in font library.
//   scripts/dev.sh npm run build -w demo
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(here, "dist");
rmSync(out, { recursive: true, force: true });

// The app's own files go under /_app/, so /assets/ is only the world's images
// (the worker answers that path from the sandbox filesystem).
execFileSync("npx", ["vite", "build", "--outDir", out, "--emptyOutDir", "--assetsDir", "_app"], {
  cwd: join(root, "app"),
  stdio: "inherit",
  env: { ...process.env, VITE_AGELACE_DEMO: "1" },
});

await build({
  entryPoints: [join(here, "src", "sw.ts")],
  outfile: join(out, "sandbox-sw.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "linked",
  alias: {
    "node:fs/promises": join(here, "src", "fs.ts"),
    "node:path": join(here, "src", "path.ts"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    {
      // The icon set loads at runtime (demo/src/icons-set.ts), not in the script.
      name: "icon-set-placeholder",
      setup(b) {
        b.onResolve({ filter: /^@iconify-json\/game-icons\/icons\.json$/ }, () => ({ path: "icons.json", namespace: "icon-set" }));
        b.onLoad({ filter: /.*/, namespace: "icon-set" }, () => ({ contents: '{"prefix":"game-icons","icons":{}}', loader: "json" }));
      },
    },
  ],
  logLevel: "warning",
});

mkdirSync(join(out, "icons"), { recursive: true });
copyFileSync(createRequire(import.meta.url).resolve("@iconify-json/game-icons/icons.json"), join(out, "icons", "game-icons.json"));

mkdirSync(join(out, "fonts"), { recursive: true });
execFileSync("node", [join(root, "scripts", "collect-fonts.mjs"), join(out, "fonts", "builtin")], { stdio: "inherit" });

// The page's inline scripts (Excalidraw's asset path), allowed by hash only.
const html = readFileSync(join(out, "index.html"), "utf8");
const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`);

// Cloudflare Pages headers. The worker must never be cached stale; the page
// may only talk to itself (the sandbox makes no network calls of its own).
writeFileSync(
  join(out, "_headers"),
  `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' ${hashes.join(" ")}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors https://mazzeleczzare.com https://*.mazzeleczzare.pages.dev; base-uri 'none'; form-action 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/sandbox-sw.js
  Cache-Control: no-cache
  Service-Worker-Allowed: /
`,
);
console.log(`sandbox built in ${out}`);
