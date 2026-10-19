/// <reference lib="webworker" />
// The sandbox's server: a service worker that answers the app's /api/* calls
// with the server's own route table and stores (server/src/routes.ts), on a
// filesystem that lives in this browser (fs.ts → IndexedDB). Nothing is sent
// anywhere. The page is the real app build; it doesn't know it's a demo.

import { CLIENT_HEADER, type WorldEvent } from "@agelace/shared";
import { CanvasStore } from "../../server/src/canvases";
import { HandStore } from "../../server/src/hands";
import { apiRoutes, matchRoute, type ApiResponse, type Route } from "../../server/src/routes";
import { seedWorld } from "../../server/src/seed";
import { WorldStore } from "../../server/src/store";
import { indexedDbPersistence, mount, readFile, reset, stat, usePersistence } from "./fs";
import { loadIconSet } from "./icons-set";

declare const self: ServiceWorkerGlobalScope;

const WORLD = "/world";
const BUILTIN = "/builtin-fonts";

interface Sandbox {
  routes: Route[];
  canvases: CanvasStore;
  store: WorldStore;
}
let sandbox: Promise<Sandbox> | null = null;
let persistenceReady: Promise<void> | null = null;
const listeners = new Set<(e: WorldEvent) => void>();

function boot(): Promise<Sandbox> {
  return (sandbox ??= (async () => {
    persistenceReady ??= (async () => {
      mount(BUILTIN, new URL("/fonts/builtin/", self.location.origin).href);
      await Promise.all([usePersistence(indexedDbPersistence()), loadIconSet("/icons/game-icons.json")]);
    })();
    await persistenceReady;
    const store = new WorldStore(WORLD);
    await store.init(seedWorld);
    const canvases = new CanvasStore(store);
    const hands = new HandStore(store);
    const emit = (e: WorldEvent): void => listeners.forEach((l) => l(e));
    return { routes: apiRoutes({ store, canvases, hands, builtinFontsDir: BUILTIN, emit }), canvases, store };
  })());
}

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p === "/api/events") return e.respondWith(events());
  if (p === "/__sandbox/reset" && e.request.method === "POST") return e.respondWith(startOver());
  if (p.startsWith("/api/")) return e.respondWith(api(e, url));
  if (p.startsWith("/fonts/world/")) return e.respondWith(file(`${WORLD}/fonts/${decodeURIComponent(p.slice(13))}`));
  if (p.startsWith("/assets/")) return e.respondWith(file(`${WORLD}/assets/${decodeURIComponent(p.slice(8))}`));
});

async function api(e: FetchEvent, url: URL): Promise<Response> {
  try {
    const { routes, canvases } = await boot();
    const hit = matchRoute(routes, e.request.method, url.pathname);
    if (!hit) return json(404, { error: "not found" });
    let body: unknown;
    if (hit.route.body === "json") body = await e.request.json().catch(() => undefined);
    else if (hit.route.body === "bytes") body = new Uint8Array(await e.request.arrayBuffer());
    const tab = e.request.headers.get(CLIENT_HEADER);
    const res = await hit.route.handle({
      params: hit.params,
      query: url.searchParams,
      body,
      ...(tab && /^[\w-]{1,64}$/.test(tab) ? { by: tab } : {}),
    });
    // Boards save on a short timer; keep the worker alive until they're written.
    if (e.request.method !== "GET" && url.pathname.startsWith("/api/canvases")) e.waitUntil(canvases.flushAll());
    return toResponse(res);
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
}

function toResponse(res: ApiResponse): Response {
  const headers = new Headers(res.headers);
  if (res.status === 204) return new Response(null, { status: 204, headers });
  if (res.bytes) {
    headers.set("content-type", res.type ?? "application/octet-stream");
    return new Response(res.bytes as BodyInit, { status: res.status, headers });
  }
  if (res.text !== undefined) {
    headers.set("content-type", res.type ?? "text/plain; charset=utf-8");
    return new Response(res.text, { status: res.status, headers });
  }
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(res.json), { status: res.status, headers });
}

const json = (status: number, body: unknown): Response => toResponse({ status, json: body });

const TYPES: Record<string, string> = {
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".avif": "image/avif",
};

async function file(path: string): Promise<Response> {
  await boot();
  if (path.includes("/../") || path.endsWith("/..")) return new Response(null, { status: 404 });
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response(null, { status: 404 });
  try {
    const [data, s] = [(await readFile(path)) as Uint8Array, await stat(path)];
    return new Response(data as BodyInit, { headers: { "content-type": type, "last-modified": new Date(s.mtimeMs).toUTCString() } });
  } catch {
    return new Response(null, { status: 404 });
  }
}

/** Server-sent events, as the server sends them: a hello, then one line per change. */
function events(): Response {
  const enc = new TextEncoder();
  let send: ((e: WorldEvent) => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(ctl) {
      ctl.enqueue(enc.encode(": hello\n\n"));
      send = (e) => ctl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
      listeners.add(send);
      ping = setInterval(() => ctl.enqueue(enc.encode(": ping\n\n")), 20_000);
    },
    cancel() {
      if (send) listeners.delete(send);
      if (ping) clearInterval(ping);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}

async function startOver(): Promise<Response> {
  const current = sandbox;
  sandbox = null;
  if (current) await (await current).canvases.flushAll().catch(() => undefined);
  await persistenceReady;
  await reset();
  await boot();
  return new Response(null, { status: 204 });
}
