import { beforeEach, describe, expect, it } from "vitest";
import { CanvasStore } from "../../server/src/canvases";
import { HandStore } from "../../server/src/hands";
import { apiRoutes, matchRoute, type Route } from "../../server/src/routes";
import { seedWorld } from "../../server/src/seed";
import { WorldStore } from "../../server/src/store";
import * as fs from "../src/fs";

// The server's own route table and stores, on the sandbox filesystem: what
// the service worker runs, minus the browser.
let routes: Route[];
let canvases: CanvasStore;
const call = async (method: string, url: string, body?: unknown) => {
  const u = new URL(url, "http://sandbox");
  const hit = matchRoute(routes, method, u.pathname)!;
  return hit.route.handle({ params: hit.params, query: u.searchParams, body });
};

beforeEach(async () => {
  await fs.reset();
  const store = new WorldStore("/world");
  await store.init(seedWorld);
  canvases = new CanvasStore(store);
  routes = apiRoutes({ store, canvases, hands: new HandStore(store), builtinFontsDir: "/no-fonts", emit: () => {} });
});

describe("route table on the sandbox filesystem", () => {
  it("seeds the same world the server seeds", async () => {
    const list = (await call("GET", "/api/entries")).json as { id: string }[];
    expect(list.map((e) => e.id).sort()).toEqual(["how-to-begin", "the-age-before-names"]);
  });

  it("entry lifecycle, with the deleted page kept in .trash", async () => {
    expect((await call("POST", "/api/entries", { title: "The Moon, stolen", kind: "chronicle" })).status).toBe(201);
    expect((await call("DELETE", "/api/entries/the-moon-stolen")).status).toBe(204);
    expect((await fs.readdir("/world/.trash")).some((f) => f.startsWith("the-moon-stolen."))).toBe(true);
  });

  it("a board persists as .yjs + .canvas", async () => {
    const id = ((await call("POST", "/api/canvases", { name: "Heist plan" })).json as { id: string }).id;
    await canvases.flushAll();
    expect(await fs.readdir("/world/canvases")).toEqual([`${id}.canvas`, `${id}.yjs`]);
  });

  it("the Forge casts a real font file", async () => {
    const created = (await call("POST", "/api/hands", { family: "Moonthief" })).json as Record<string, unknown> & { id: string };
    // As the server's forge test does: keep the new hand's defaults, draw an L.
    const { id, format: _f, created: _c, updated: _u, cast: _k, ...rest } = created;
    const line = (x0: number, y0: number, x1: number, y1: number) => {
      const pts: number[] = [];
      for (let i = 0; i <= 40; i++) pts.push(x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * i) / 40, 0.5);
      return { pts };
    };
    const hand = { id };
    const put = await call("PUT", `/api/hands/${id}`, { ...rest, glyphs: { L: { strokes: [line(100, 690, 100, 0), line(100, 0, 420, 0)] } } });
    expect(put.status, JSON.stringify(put.json)).toBe(200);
    const cast = await call("POST", `/api/hands/${hand.id}/cast`);
    expect(cast.status, JSON.stringify(cast.json)).toBe(201);
    const bytes = (await fs.readFile("/world/fonts/Moonthief.otf")) as Uint8Array;
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe("OTTO");
  });
});
