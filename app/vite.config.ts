/// <reference types="vitest/config" />
import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, normalize, sep } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// In dev the API runs beside Vite (scripts/dev.sh up); in production the
// server serves app/dist itself, so these proxies only matter for dev.
const api = process.env["AGELACE_API"] ?? "http://localhost:8080";

/**
 * Excalidraw fetches its hand-drawn fonts from a CDN unless told otherwise.
 * agelace is local-first, so ship them: copied into the build, served in dev,
 * and pointed at by window.EXCALIDRAW_ASSET_PATH = "/excalidraw/".
 */
function excalidrawAssets(): Plugin {
  const require = createRequire(import.meta.url);
  // The package doesn't export package.json; find dist/ from its entry point instead.
  const entry = require.resolve("@excalidraw/excalidraw");
  const fonts = join(entry.slice(0, entry.lastIndexOf(`${sep}dist${sep}`)), "dist", "prod", "fonts");
  let outDir = "dist";
  return {
    name: "agelace-excalidraw-assets",
    configResolved: (c) => void (outDir = c.build.outDir),
    configureServer(server) {
      server.middlewares.use("/excalidraw/fonts", (req, res, next) => {
        const file = normalize(join(fonts, decodeURIComponent((req.url ?? "").split("?")[0]!)));
        if (!file.startsWith(fonts) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("content-type", "font/woff2");
        createReadStream(file).pipe(res);
      });
    },
    writeBundle() {
      cpSync(fonts, join(outDir, "excalidraw", "fonts"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), excalidrawAssets()],
  // One React, always. A second copy (npm once hoisted 18 for Excalidraw's
  // jotai peer) makes every hook in a library throw "reading 'useRef'".
  resolve: { dedupe: ["react", "react-dom"] },
  server: {
    port: 5173,
    proxy: { "/api": api, "/fonts": api, "/assets": api },
  },
  test: { environment: "jsdom" },
});
