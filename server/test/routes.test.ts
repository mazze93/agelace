import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WorldEvent } from "@agelace/shared";
import { CanvasStore } from "../src/canvases.js";
import { HandStore } from "../src/hands.js";
import { apiRoutes, matchRoute, type ApiRequest, type Route } from "../src/routes.js";
import { seedWorld } from "../src/seed.js";
import { WorldStore } from "../src/store.js";

// The route table without Fastify: exactly how the in-browser demo's service
// worker drives it. If this passes, the demo and the server share behaviour.
let dir: string;
let routes: Route[];
let events: WorldEvent[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "agelace-routes-"));
  const store = new WorldStore(dir);
  await store.init(seedWorld);
  events = [];
  const canvases = new CanvasStore(store);
  routes = apiRoutes({ store, canvases, hands: new HandStore(store), builtinFontsDir: join(dir, "nope"), emit: (e) => events.push(e) });
});
afterEach(async () => rm(dir, { recursive: true, force: true }));

async function call(method: string, url: string, body?: unknown, by?: string) {
  const u = new URL(url, "http://demo");
  const hit = matchRoute(routes, method, u.pathname);
  if (!hit) return { status: 404, json: undefined as unknown };
  const req: ApiRequest = { params: hit.params, query: u.searchParams, body, ...(by ? { by } : {}) };
  return hit.route.handle(req);
}

describe("route table (no framework)", () => {
  it("matches by method and segment count, decoding params", () => {
    expect(matchRoute(routes, "GET", "/api/entries/how-to-begin")?.params).toEqual({ id: "how-to-begin" });
    expect(matchRoute(routes, "GET", "/api/icons/moon%2Dorbit.svg")?.params).toEqual({ name: "moon-orbit.svg" });
    expect(matchRoute(routes, "PUT", "/api/entries/how-to-begin")).toBeNull();
    expect(matchRoute(routes, "GET", "/api/entries/how-to-begin/extra")).toBeNull();
    expect(matchRoute(routes, "GET", "/api/entries/%E0%A4%A")).toBeNull(); // malformed escape
  });

  it("creates, reads and deletes an entry, writing the same files as the server", async () => {
    const created = await call("POST", "/api/entries", { title: "The Moon, stolen", kind: "chronicle" }, "tab-1");
    expect(created.status).toBe(201);
    const onDisk = JSON.parse(await readFile(join(dir, "entries", "the-moon-stolen.json"), "utf8")) as { title: string };
    expect(onDisk.title).toBe("The Moon, stolen");
    expect(events.at(-1)).toEqual({ type: "entry", id: "the-moon-stolen", op: "upsert", by: "tab-1" });
    expect((await call("GET", "/api/entries/the-moon-stolen")).status).toBe(200);
    expect((await call("DELETE", "/api/entries/the-moon-stolen")).status).toBe(204);
    expect((await call("GET", "/api/entries/the-moon-stolen")).status).toBe(404);
  });

  it("validates with the shared schemas", async () => {
    const bad = await call("POST", "/api/entries", { title: "x", kind: "not-a-kind" });
    expect(bad.status).toBe(400);
  });

  it("round-trips a board as Yjs bytes", async () => {
    const board = await call("POST", "/api/canvases", { name: "Probe" });
    const id = (board.json as { id: string }).id;
    const state = await call("GET", `/api/canvases/${id}/state`);
    expect(state.status).toBe(200);
    expect("bytes" in state && state.bytes instanceof Uint8Array).toBe(true);
    expect((await call("POST", `/api/canvases/${id}/update`, new Uint8Array([1, 2, 3]))).status).toBe(400);
  });

  it("serves icons as SVG text", async () => {
    const res = await call("GET", "/api/icons/moon.svg");
    expect(res.status).toBe(200);
    expect("text" in res && res.text?.startsWith("<svg")).toBe(true);
  });
});
