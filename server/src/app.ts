import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import fastifyStatic from "@fastify/static";
import { watch } from "chokidar";
import Fastify, { type FastifyInstance } from "fastify";
import { CLIENT_HEADER, Id, type WorldEvent } from "@agelace/shared";
import type { FastifyRequest } from "fastify";
import { CanvasStore } from "./canvases.js";
import { isAssetFile } from "./assets.js";
import { isFontFile } from "./fonts.js";
import { HandStore } from "./hands.js";
import { apiRoutes } from "./routes.js";
import { WorldStore } from "./store.js";

export interface AppOptions {
  worldDir: string;
  builtinFontsDir: string;
  /** Built SPA (app/dist). Omitted in dev, where Vite serves the app. */
  staticDir?: string;
  /** Watch the world folder for outside edits (Obsidian, sync clients, hand edits). */
  watch?: boolean;
  /** Polling is the only reliable option on Windows bind mounts. */
  poll?: boolean;
  seed?: (store: WorldStore) => Promise<void>;
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const store = new WorldStore(opts.worldDir);
  await store.init(opts.seed);

  const app = Fastify({ logger: { level: process.env["LOG_LEVEL"] ?? "warn" }, bodyLimit: 32 * 1024 * 1024 });
  const canvases = new CanvasStore(store);
  const hands = new HandStore(store);
  app.decorate("store", store);
  app.decorate("canvases", canvases);
  /** Which browser tab caused a change, so it can ignore its own echo. */
  const by = (req: FastifyRequest): { by?: string } => {
    const h = req.headers[CLIENT_HEADER];
    return typeof h === "string" && /^[\w-]{1,64}$/.test(h) ? { by: h } : {};
  };

  // ── live events (SSE) ───────────────────────────────────────────────
  const listeners = new Set<(e: WorldEvent) => void>();
  const emit = (e: WorldEvent): void => listeners.forEach((l) => l(e));
  app.decorate("worldEvents", listeners);

  app.get("/api/events", (req, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    reply.raw.write(": hello\n\n");
    const send = (e: WorldEvent): void => void reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 25_000);
    listeners.add(send);
    req.raw.on("close", () => {
      clearInterval(ping);
      listeners.delete(send);
    });
  });

  // ── the API: one table, shared with the in-browser demo (routes.ts) ──
  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  for (const route of apiRoutes({ store, canvases, hands, builtinFontsDir: opts.builtinFontsDir, emit })) {
    app.route({
      method: route.method,
      url: route.path,
      handler: async (req, reply) => {
        const res = await route.handle({
          params: (req.params ?? {}) as Record<string, string>,
          query: new URL(req.url, "http://agelace").searchParams,
          body: req.body,
          ...by(req),
        });
        reply.code(res.status);
        if (res.headers) reply.headers(res.headers);
        if (res.type) reply.type(res.type);
        if (res.bytes) return reply.send(Buffer.from(res.bytes.buffer, res.bytes.byteOffset, res.bytes.byteLength));
        if (res.text !== undefined) return reply.send(res.text);
        return res.status === 204 ? reply.send() : reply.send(res.json);
      },
    });
  }

  await app.register(fastifyStatic, {
    root: opts.builtinFontsDir,
    prefix: "/fonts/builtin/",
    decorateReply: false,
    maxAge: "30d",
    immutable: true,
  });
  await app.register(fastifyStatic, { root: store.fontsDir, prefix: "/fonts/world/", decorateReply: false });
  await app.register(fastifyStatic, {
    root: store.assetsDir,
    prefix: "/assets/",
    decorateReply: false,
    allowedPath: (path) => isAssetFile(path),
  });

  // ── the app itself ─────────────────────────────────────────────────
  if (opts.staticDir && existsSync(opts.staticDir)) {
    await app.register(fastifyStatic, { root: opts.staticDir, prefix: "/", wildcard: false });
    // Client-side routes fall back to the SPA shell.
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/") ? reply.code(404).send({ error: "not found" }) : reply.sendFile("index.html", opts.staticDir!),
    );
  }

  // ── outside edits ──────────────────────────────────────────────────
  if (opts.watch) {
    const watcher = watch(opts.worldDir, {
      ignoreInitial: true,
      usePolling: opts.poll ?? false,
      interval: 700,
      binaryInterval: 1500, // fonts, maps, .yjs: chokidar's default (300ms) is needlessly hot
      ignored: (p) => p.endsWith(".tmp") || p.includes(`${sep}.trash`),
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
    });
    watcher.on("all", (event, path) => {
      const ours = store.recentWrites.get(path);
      if (ours && Date.now() - ours < 3000) return; // our own write echoing back
      const rel = relative(opts.worldDir, path).split(sep);
      if (rel[0] === "entries" && rel[1]?.endsWith(".json")) {
        store.invalidate();
        const id = Id.safeParse(rel[1].slice(0, -5));
        if (id.success) emit({ type: "entry", id: id.data, op: event === "unlink" ? "delete" : "upsert" });
      } else if (rel[0] === "fonts" && rel[1] && isFontFile(rel[1])) {
        emit({ type: "fonts" });
      } else if (rel[0] === "canvases" && rel[1]?.endsWith(".yjs")) {
        const id = Id.safeParse(rel[1].slice(0, -4));
        if (id.success) void canvases.mergeFromDisk(id.data).then(() => emit({ type: "canvas", id: id.data, op: event === "unlink" ? "delete" : "upsert" }));
      } else if (rel[0] === "forge" && rel[1]?.endsWith(".json")) {
        const id = Id.safeParse(rel[1].slice(0, -5));
        if (id.success) emit({ type: "hand", id: id.data, op: event === "unlink" ? "delete" : "upsert" });
      } else if (rel[0] === "world.json") {
        emit({ type: "world" });
      }
    });
    app.addHook("onClose", async () => watcher.close());
  }

  app.addHook("onClose", async () => canvases.flushAll());
  return app;
}

export const defaultPaths = (here: string) => ({
  builtinFontsDir: process.env["AGELACE_FONTS"] ?? join(here, "..", "fonts-builtin"),
  staticDir: process.env["AGELACE_STATIC"] ?? join(here, "..", "..", "app", "dist"),
});

declare module "fastify" {
  interface FastifyInstance {
    store: WorldStore;
    canvases: CanvasStore;
    worldEvents: Set<(e: WorldEvent) => void>;
  }
}
