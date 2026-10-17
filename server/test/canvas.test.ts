import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import type { FastifyInstance } from "fastify";
import type { WorldEvent } from "@agelace/shared";
import { buildApp } from "../src/app.js";
import { seedWorld } from "../src/seed.js";

let dir: string;
let app: FastifyInstance;
const make = () => buildApp({ worldDir: dir, builtinFontsDir: join(dir, "nope"), seed: seedWorld });

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "agelace-canvas-"));
  app = await make();
});
afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const bin = { "content-type": "application/octet-stream" };

async function client(id: string): Promise<Y.Doc> {
  const doc = new Y.Doc();
  const res = await app.inject(`/api/canvases/${id}/state`);
  Y.applyUpdate(doc, new Uint8Array(res.rawPayload));
  return doc;
}
async function push(id: string, doc: Y.Doc, fn: () => void): Promise<void> {
  const sv = Y.encodeStateVector(doc);
  doc.transact(fn);
  const update = Y.encodeStateAsUpdate(doc, sv);
  const res = await app.inject({ method: "POST", url: `/api/canvases/${id}/update`, headers: bin, payload: Buffer.from(update) });
  expect(res.statusCode).toBe(204);
}
const card = (doc: Y.Doc, id: string, x: number) => {
  const m = new Y.Map<unknown>();
  m.set("type", "entry");
  m.set("entryId", "how-to-begin");
  m.set("x", x);
  m.set("y", 0);
  m.set("w", 240);
  m.set("h", 140);
  doc.getMap("nodes").set(id, m);
};

describe("canvas sync", () => {
  it("merges concurrent edits from two windows instead of clobbering", async () => {
    const { id } = (await app.inject({ method: "POST", url: "/api/canvases", payload: { name: "The Long Map" } })).json();
    expect(id).toBe("the-long-map");
    const a = await client(id);
    const b = await client(id);
    await push(id, a, () => card(a, "n1", 0));
    await push(id, b, () => card(b, "n2", 400)); // b never saw n1
    const fresh = await client(id);
    expect([...fresh.getMap("nodes").keys()].sort()).toEqual(["n1", "n2"]);
  });

  it("sends only what a client is missing, given its state vector", async () => {
    const { id } = (await app.inject({ method: "POST", url: "/api/canvases", payload: { name: "Delta" } })).json();
    const a = await client(id);
    await push(id, a, () => card(a, "n1", 0));
    const full = (await app.inject(`/api/canvases/${id}/state`)).rawPayload.byteLength;
    const sv = Buffer.from(Y.encodeStateVector(a)).toString("base64url");
    const delta = (await app.inject(`/api/canvases/${id}/state?sv=${sv}`)).rawPayload.byteLength;
    expect(delta).toBeLessThan(full);
  });

  it("persists to .yjs and exports Obsidian JSON Canvas; survives a restart", async () => {
    const { id } = (await app.inject({ method: "POST", url: "/api/canvases", payload: { name: "Ages" } })).json();
    const a = await client(id);
    await push(id, a, () => {
      card(a, "n1", 10);
      const e = new Y.Map<unknown>();
      e.set("from", "n1");
      e.set("to", "n1");
      a.getMap("edges").set("e1", e);
    });
    await app.close(); // flushes the debounced write
    const files = await readdir(join(dir, "canvases"));
    expect(files.sort()).toEqual(["ages.canvas", "ages.yjs"]);
    const jc = JSON.parse(await readFile(join(dir, "canvases", "ages.canvas"), "utf8"));
    expect(jc.nodes[0]).toMatchObject({ id: "n1", type: "text", text: "# How to Begin", x: 10, width: 240 });
    expect(jc.edges[0]).toMatchObject({ fromNode: "n1", toNode: "n1" });

    app = await make();
    const again = await client(id);
    expect(again.getMap("nodes").has("n1")).toBe(true);
    expect((await app.inject("/api/canvases")).json()[0]).toMatchObject({ id: "ages", name: "Ages", nodes: 1 });
  });

  it("rejects garbage updates and unknown boards", async () => {
    const { id } = (await app.inject({ method: "POST", url: "/api/canvases", payload: { name: "X" } })).json();
    const bad = await app.inject({ method: "POST", url: `/api/canvases/${id}/update`, headers: bin, payload: Buffer.from("nope") });
    expect(bad.statusCode).toBe(400);
    expect((await app.inject("/api/canvases/nowhere/state")).statusCode).toBe(404);
  });
});

describe("assets", () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  it("accepts real images and serves them back", async () => {
    const res = await app.inject({ method: "POST", url: "/api/assets?name=Old Map.png", headers: bin, payload: png });
    expect(res.statusCode).toBe(201);
    const { url } = res.json();
    expect(url).toMatch(/^\/assets\/Old-Map-[0-9a-f]{6}\.png$/);
    expect((await app.inject(url)).statusCode).toBe(200);
  });
  it("refuses svg/html and liars", async () => {
    for (const name of ["x.svg", "x.html"]) {
      expect((await app.inject({ method: "POST", url: `/api/assets?name=${name}`, headers: bin, payload: png })).statusCode).toBe(400);
    }
    const liar = await app.inject({ method: "POST", url: "/api/assets?name=x.png", headers: bin, payload: Buffer.from("<html>") });
    expect(liar.statusCode).toBe(400);
  });
});

describe("echo suppression", () => {
  it("tags events with the client that caused them, and outside edits with nobody", async () => {
    const seen: WorldEvent[] = [];
    app.worldEvents.add((e) => seen.push(e));
    await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", headers: { "x-agelace-client": "tab-123" }, payload: { status: "proposed" } });
    await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", headers: { "x-agelace-client": "../evil" }, payload: { status: "canon" } });
    expect(seen).toEqual([
      { type: "entry", id: "how-to-begin", op: "upsert", by: "tab-123" },
      { type: "entry", id: "how-to-begin", op: "upsert" },
    ]);
  });
});
