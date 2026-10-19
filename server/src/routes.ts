// The API as plain data: method, path, handler. No framework in here, so the
// same handlers run behind Fastify (app.ts) and inside the browser demo's
// service worker. Live events (SSE), static files and the file watcher stay
// with each host, because they are about transport, not about the world.

import { EntryDraft, EntryPatch, HandWrite, Id, WorldPatch, type WorldEvent } from "@agelace/shared";
import { saveAsset } from "./assets.js";
import type { CanvasStore } from "./canvases.js";
import { listBuiltinFonts, listWorldFonts, saveWorldFont } from "./fonts.js";
import { CastError, type HandStore } from "./hands.js";
import { iconSvg, searchIcons } from "./icons.js";
import type { WorldStore } from "./store.js";

export interface ApiContext {
  store: WorldStore;
  canvases: CanvasStore;
  hands: HandStore;
  builtinFontsDir: string;
  emit: (e: WorldEvent) => void;
}

export interface ApiRequest {
  params: Record<string, string>;
  query: URLSearchParams;
  /** Parsed JSON for JSON routes; raw bytes for `body: "bytes"` routes. */
  body: unknown;
  /** Which tab caused the change (already validated by the host). */
  by?: string;
}

export interface ApiResponse {
  status: number;
  json?: unknown;
  bytes?: Uint8Array;
  text?: string;
  type?: string;
  headers?: Record<string, string>;
}

export interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Fastify-style: "/api/entries/:id". */
  path: string;
  body?: "json" | "bytes";
  handle: (req: ApiRequest) => Promise<ApiResponse>;
}

const ok = (json: unknown, status = 200): ApiResponse => ({ status, json });
const fail = (status: number, error: unknown): ApiResponse => ({ status, json: { error } });
const none = (): ApiResponse => ({ status: 204 });
const isBytes = (b: unknown): b is Uint8Array => b instanceof Uint8Array;

export function apiRoutes(ctx: ApiContext): Route[] {
  const { store, canvases, hands, emit } = ctx;
  const by = (req: ApiRequest): { by?: string } => (req.by ? { by: req.by } : {});
  const name = (body: unknown, key: string, max: number): string => {
    const v = (body as Record<string, unknown> | null)?.[key];
    return typeof v === "string" ? v.trim().slice(0, max) : "";
  };

  return [
    // ── world ────────────────────────────────────────────────────────
    { method: "GET", path: "/api/health", handle: async () => ok({ ok: true }) },
    { method: "GET", path: "/api/world", handle: async () => ok(await store.meta()) },
    {
      method: "PATCH", path: "/api/world", body: "json",
      handle: async (req) => {
        const patch = WorldPatch.safeParse(req.body);
        if (!patch.success) return fail(400, patch.error.issues);
        const meta = await store.setMeta(patch.data);
        emit({ type: "world", ...by(req) });
        return ok(meta);
      },
    },

    // ── entries ──────────────────────────────────────────────────────
    { method: "GET", path: "/api/entries", handle: async () => ok(await store.list()) },
    {
      method: "GET", path: "/api/entries/:id",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        const entry = id.success ? await store.get(id.data) : undefined;
        return entry ? ok(entry) : fail(404, "not found");
      },
    },
    {
      method: "POST", path: "/api/entries", body: "json",
      handle: async (req) => {
        const draft = EntryDraft.safeParse(req.body);
        if (!draft.success) return fail(400, draft.error.issues);
        const entry = await store.create(draft.data);
        emit({ type: "entry", id: entry.id, op: "upsert", ...by(req) });
        return ok(entry, 201);
      },
    },
    {
      method: "PATCH", path: "/api/entries/:id", body: "json",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        const patch = EntryPatch.safeParse(req.body);
        if (!id.success || !patch.success) return fail(400, "bad request");
        const entry = await store.patch(id.data, patch.data);
        if (!entry) return fail(404, "not found");
        emit({ type: "entry", id: entry.id, op: "upsert", ...by(req) });
        return ok(entry);
      },
    },
    {
      method: "DELETE", path: "/api/entries/:id",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        if (!id.success || !(await store.remove(id.data))) return fail(404, "not found");
        emit({ type: "entry", id: id.data, op: "delete", ...by(req) });
        return none();
      },
    },

    // ── canvases (Yjs) ───────────────────────────────────────────────
    { method: "GET", path: "/api/canvases", handle: async () => ok(await canvases.list()) },
    {
      method: "POST", path: "/api/canvases", body: "json",
      handle: async (req) => {
        const n = name(req.body, "name", 120);
        if (!n) return fail(400, "a board needs a name");
        const summary = await canvases.create(n);
        emit({ type: "canvas", id: summary.id, op: "upsert", ...by(req) });
        return ok(summary, 201);
      },
    },
    {
      method: "GET", path: "/api/canvases/:id/state",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        if (!id.success) return fail(404, "not found");
        const raw = req.query.get("sv");
        try {
          const sv = raw ? fromBase64Url(raw) : undefined;
          const update = await canvases.state(id.data, sv);
          if (!update) return fail(404, "not found");
          return { status: 200, bytes: update, type: "application/octet-stream" };
        } catch {
          return fail(400, "bad state vector");
        }
      },
    },
    {
      method: "POST", path: "/api/canvases/:id/update", body: "bytes",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        if (!id.success || !isBytes(req.body)) return fail(400, "bad request");
        try {
          if (!(await canvases.apply(id.data, new Uint8Array(req.body)))) return fail(404, "not found");
        } catch {
          return fail(400, "not a yjs update");
        }
        emit({ type: "canvas", id: id.data, op: "upsert", ...by(req) });
        return none();
      },
    },
    {
      method: "DELETE", path: "/api/canvases/:id",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        if (!id.success || !(await canvases.remove(id.data))) return fail(404, "not found");
        emit({ type: "canvas", id: id.data, op: "delete", ...by(req) });
        return none();
      },
    },

    // ── assets: images, maps ─────────────────────────────────────────
    {
      method: "POST", path: "/api/assets", body: "bytes",
      handle: async (req) => {
        if (!isBytes(req.body)) return fail(415, "send the file as application/octet-stream");
        try {
          const file = await saveAsset(store.assetsDir, req.query.get("name") ?? "", req.body);
          return ok({ file, url: `/assets/${encodeURIComponent(file)}` }, 201);
        } catch (err) {
          return fail(400, (err as Error).message);
        }
      },
    },

    // ── fonts ────────────────────────────────────────────────────────
    {
      method: "GET", path: "/api/fonts",
      handle: async () => ok([...(await listBuiltinFonts(ctx.builtinFontsDir)), ...(await listWorldFonts(store.fontsDir))]),
    },
    {
      method: "POST", path: "/api/fonts", body: "bytes",
      handle: async (req) => {
        if (!isBytes(req.body)) return fail(415, "send the font as application/octet-stream");
        try {
          const file = await saveWorldFont(store.fontsDir, req.query.get("name") ?? "", req.body);
          emit({ type: "fonts", ...by(req) });
          return ok({ file }, 201);
        } catch (err) {
          return fail(400, (err as Error).message);
        }
      },
    },

    // ── the forge: hands drawn by the user, cast into world/fonts ─────
    { method: "GET", path: "/api/hands", handle: async () => ok(await hands.list()) },
    {
      method: "POST", path: "/api/hands", body: "json",
      handle: async (req) => {
        const family = name(req.body, "family", 60);
        if (!family) return fail(400, "a hand needs a name");
        const hand = await hands.create(family);
        emit({ type: "hand", id: hand.id, op: "upsert", ...by(req) });
        return ok(hand, 201);
      },
    },
    {
      method: "GET", path: "/api/hands/:id",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        const hand = id.success ? await hands.get(id.data) : undefined;
        return hand ? ok(hand) : fail(404, "not found");
      },
    },
    {
      method: "PUT", path: "/api/hands/:id", body: "json",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        const body = HandWrite.safeParse(req.body);
        if (!id.success) return fail(404, "not found");
        if (!body.success) return fail(400, body.error.issues);
        const hand = await hands.put(id.data, body.data);
        if (!hand) return fail(404, "not found");
        emit({ type: "hand", id: hand.id, op: "upsert", ...by(req) });
        return ok(hand);
      },
    },
    {
      method: "DELETE", path: "/api/hands/:id",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        if (!id.success || !(await hands.remove(id.data))) return fail(404, "not found");
        emit({ type: "hand", id: id.data, op: "delete", ...by(req) });
        return none();
      },
    },
    {
      method: "POST", path: "/api/hands/:id/cast",
      handle: async (req) => {
        const id = Id.safeParse(req.params["id"]);
        const hand = id.success ? await hands.get(id.data) : undefined;
        if (!hand) return fail(404, "not found");
        try {
          const builtin = (await listBuiltinFonts(ctx.builtinFontsDir)).map((f) => f.family);
          const cast = await hands.cast(hand, builtin);
          emit({ type: "fonts", ...by(req) });
          return ok({ ...cast, family: hand.family }, 201);
        } catch (err) {
          if (err instanceof CastError) return fail(err.status, err.message);
          throw err;
        }
      },
    },

    // ── icons (game-icons.net, CC BY 3.0) ────────────────────────────
    {
      method: "GET", path: "/api/icons",
      handle: async (req) => ok(searchIcons(req.query.get("q") ?? "", Math.min(Number(req.query.get("limit")) || 120, 600))),
    },
    {
      method: "GET", path: "/api/icons/:name",
      handle: async (req) => {
        const svg = iconSvg((req.params["name"] ?? "").replace(/\.svg$/, ""));
        if (!svg) return fail(404, "no such icon");
        return { status: 200, text: svg, type: "image/svg+xml", headers: { "cache-control": "public, max-age=604800" } };
      },
    },
  ];
}

/** Match a path against the table; params come back decoded. */
export function matchRoute(routes: Route[], method: string, pathname: string): { route: Route; params: Record<string, string> } | null {
  const parts = pathname.split("/");
  for (const route of routes) {
    if (route.method !== method) continue;
    const want = route.path.split("/");
    if (want.length !== parts.length) continue;
    const params: Record<string, string> = {};
    let hit = true;
    for (let i = 0; i < want.length; i++) {
      const w = want[i]!;
      const p = parts[i]!;
      if (w.startsWith(":")) {
        try {
          params[w.slice(1)] = decodeURIComponent(p);
        } catch {
          hit = false;
          break;
        }
      } else if (w !== p) {
        hit = false;
        break;
      }
    }
    if (hit) return { route, params };
  }
  return null;
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
