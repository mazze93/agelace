import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import fastifyStatic from "@fastify/static";
import { watch } from "chokidar";
import Fastify, { type FastifyInstance } from "fastify";
import { CLIENT_HEADER, EntryDraft, EntryPatch, Id, WorldMeta, type WorldEvent } from "@agelace/shared";
import type { FastifyRequest } from "fastify";
import { CanvasStore } from "./canvases.js";
import { isAssetFile, saveAsset } from "./assets.js";
import { isFontFile, listBuiltinFonts, listWorldFonts, saveWorldFont } from "./fonts.js";
import { iconSvg, searchIcons } from "./icons.js";
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

  // ── world ──────────────────────────────────────────────────────────
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/world", async () => store.meta());
  app.patch("/api/world", async (req) => {
    const meta = await store.setMeta(WorldMeta.partial().parse(req.body));
    emit({ type: "world", ...by(req) });
    return meta;
  });

  // ── entries ────────────────────────────────────────────────────────
  app.get("/api/entries", async () => store.list());

  app.get<{ Params: { id: string } }>("/api/entries/:id", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    const entry = id.success ? await store.get(id.data) : undefined;
    return entry ?? reply.code(404).send({ error: "not found" });
  });

  app.post("/api/entries", async (req, reply) => {
    const draft = EntryDraft.safeParse(req.body);
    if (!draft.success) return reply.code(400).send({ error: draft.error.issues });
    const entry = await store.create(draft.data);
    emit({ type: "entry", id: entry.id, op: "upsert", ...by(req) });
    return reply.code(201).send(entry);
  });

  app.patch<{ Params: { id: string } }>("/api/entries/:id", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    const patch = EntryPatch.safeParse(req.body);
    if (!id.success || !patch.success) return reply.code(400).send({ error: "bad request" });
    const entry = await store.patch(id.data, patch.data);
    if (!entry) return reply.code(404).send({ error: "not found" });
    emit({ type: "entry", id: entry.id, op: "upsert", ...by(req) });
    return entry;
  });

  app.delete<{ Params: { id: string } }>("/api/entries/:id", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success || !(await store.remove(id.data))) return reply.code(404).send({ error: "not found" });
    emit({ type: "entry", id: id.data, op: "delete", ...by(req) });
    return reply.code(204).send();
  });

  // ── canvases (Yjs) ─────────────────────────────────────────────────
  app.get("/api/canvases", async () => canvases.list());

  app.post<{ Body: { name?: unknown } }>("/api/canvases", async (req, reply) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 120) : "";
    if (!name) return reply.code(400).send({ error: "a board needs a name" });
    const summary = await canvases.create(name);
    emit({ type: "canvas", id: summary.id, op: "upsert", ...by(req) });
    return reply.code(201).send(summary);
  });

  app.get<{ Params: { id: string }; Querystring: { sv?: string } }>("/api/canvases/:id/state", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success) return reply.code(404).send({ error: "not found" });
    const sv = req.query.sv ? new Uint8Array(Buffer.from(req.query.sv, "base64url")) : undefined;
    try {
      const update = await canvases.state(id.data, sv);
      if (!update) return reply.code(404).send({ error: "not found" });
      return reply.type("application/octet-stream").send(Buffer.from(update));
    } catch {
      return reply.code(400).send({ error: "bad state vector" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/canvases/:id/update", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success || !Buffer.isBuffer(req.body)) return reply.code(400).send({ error: "bad request" });
    try {
      if (!(await canvases.apply(id.data, new Uint8Array(req.body)))) return reply.code(404).send({ error: "not found" });
    } catch {
      return reply.code(400).send({ error: "not a yjs update" });
    }
    emit({ type: "canvas", id: id.data, op: "upsert", ...by(req) });
    return reply.code(204).send();
  });

  app.delete<{ Params: { id: string } }>("/api/canvases/:id", async (req, reply) => {
    const id = Id.safeParse(req.params.id);
    if (!id.success || !(await canvases.remove(id.data))) return reply.code(404).send({ error: "not found" });
    emit({ type: "canvas", id: id.data, op: "delete", ...by(req) });
    return reply.code(204).send();
  });

  // ── assets: images, maps ───────────────────────────────────────────
  app.post<{ Querystring: { name?: string } }>("/api/assets", async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) return reply.code(415).send({ error: "send the file as application/octet-stream" });
    try {
      const file = await saveAsset(store.assetsDir, req.query.name ?? "", req.body);
      return reply.code(201).send({ file, url: `/assets/${encodeURIComponent(file)}` });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  // ── fonts ──────────────────────────────────────────────────────────
  app.get("/api/fonts", async () => [
    ...(await listBuiltinFonts(opts.builtinFontsDir)),
    ...(await listWorldFonts(store.fontsDir)),
  ]);

  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  app.post<{ Querystring: { name?: string } }>("/api/fonts", async (req, reply) => {
    const name = req.query.name ?? "";
    if (!Buffer.isBuffer(req.body)) return reply.code(415).send({ error: "send the font as application/octet-stream" });
    try {
      const file = await saveWorldFont(store.fontsDir, name, req.body);
      emit({ type: "fonts", ...by(req) });
      return reply.code(201).send({ file });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

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

  // ── icons (game-icons.net, CC BY 3.0) ──────────────────────────────
  app.get<{ Querystring: { q?: string; limit?: string } }>("/api/icons", async (req) =>
    searchIcons(req.query.q ?? "", Math.min(Number(req.query.limit) || 120, 600)),
  );
  app.get<{ Params: { name: string } }>("/api/icons/:name", async (req, reply) => {
    const svg = iconSvg(req.params.name.replace(/\.svg$/, ""));
    if (!svg) return reply.code(404).send({ error: "no such icon" });
    return reply.type("image/svg+xml").header("cache-control", "public, max-age=604800").send(svg);
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
