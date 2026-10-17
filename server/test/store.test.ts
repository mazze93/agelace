import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { fromFilename, looksLikeFont } from "../src/fonts.js";
import { iconSvg, searchIcons } from "../src/icons.js";
import { seedWorld } from "../src/seed.js";

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "agelace-"));
  app = await buildApp({ worldDir: dir, builtinFontsDir: join(dir, "nope"), seed: seedWorld });
});
afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

describe("world folder", () => {
  it("seeds a fresh world with linked entries", async () => {
    const res = await app.inject("/api/entries");
    const list = res.json() as { id: string; links: string[] }[];
    expect(list.map((e) => e.id).sort()).toEqual(["how-to-begin", "the-age-before-names"]);
    expect(list.find((e) => e.id === "how-to-begin")?.links).toEqual(["the-age-before-names"]);
  });

  it("creates, patches and trashes an entry as files on disk", async () => {
    const created = await app.inject({ method: "POST", url: "/api/entries", payload: { title: "Ankh-Morpork!", kind: "place" } });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ id: "ankh-morpork", status: "question" });

    const dup = await app.inject({ method: "POST", url: "/api/entries", payload: { title: "Ankh Morpork", kind: "place" } });
    expect(dup.json().id).toBe("ankh-morpork-2");

    await app.inject({ method: "PATCH", url: "/api/entries/ankh-morpork", payload: { status: "canon" } });
    const onDisk = JSON.parse(await readFile(join(dir, "entries", "ankh-morpork.json"), "utf8"));
    expect(onDisk.status).toBe("canon");

    expect((await app.inject({ method: "DELETE", url: "/api/entries/ankh-morpork" })).statusCode).toBe(204);
    expect(await readdir(join(dir, "entries"))).not.toContain("ankh-morpork.json");
    expect((await readdir(join(dir, ".trash"))).some((f) => f.startsWith("ankh-morpork."))).toBe(true);
  });

  it("rejects bad statuses and path-traversal ids", async () => {
    const bad = await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", payload: { status: "gospel" } });
    expect(bad.statusCode).toBe(400);
    expect((await app.inject("/api/entries/..%2Fworld")).statusCode).toBe(404);
  });

  it("survives a corrupt file dropped in by hand", async () => {
    await writeFile(join(dir, "entries", "broken.json"), "{ not json");
    app.store.invalidate();
    const res = await app.inject("/api/entries");
    expect(res.statusCode).toBe(200);
    expect((res.json() as unknown[]).length).toBe(2);
  });

  it("leaves no temp files behind", async () => {
    await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", payload: { title: "How to Begin Again" } });
    expect((await readdir(join(dir, "entries"))).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });
});

describe("fonts", () => {
  it("reads family/weight/style from filenames as a fallback", () => {
    expect(fromFilename("IMFellEnglish-Italic.woff2")).toEqual({ family: "IM Fell English", weight: "400", style: "italic" });
    expect(fromFilename("my_hand-Bold.otf")).toEqual({ family: "my hand", weight: "700", style: "normal" });
  });

  it("refuses non-fonts on upload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fonts?name=evil.ttf",
      headers: { "content-type": "application/octet-stream" },
      payload: Buffer.from("<script>alert(1)</script>"),
    });
    expect(res.statusCode).toBe(400);
    expect(looksLikeFont(Buffer.from("wOF2\0\0\0\0\0\0\0\0"))).toBe(true);
  });
});

describe("icons", () => {
  it("finds and renders game-icons as currentColor svg", () => {
    expect(searchIcons("hourglass")[0]).toBe("hourglass");
    const svg = iconSvg("castle");
    expect(svg).toMatch(/^<svg /);
    expect(svg).toContain("currentColor");
  });

  it("every default sigil exists", () => {
    for (const n of ["quill-ink", "hood", "castle", "hourglass", "crystal-ball", "scroll-unfurled", "open-book"]) {
      expect(iconSvg(n), n).toBeDefined();
    }
  });
});

describe("patching", () => {
  it("only touches the fields it is given", async () => {
    await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", payload: { tags: ["primer"] } });
    await app.inject({ method: "PATCH", url: "/api/entries/how-to-begin", payload: { doc: { type: "doc", content: [] } } });
    const e = (await app.inject("/api/entries/how-to-begin")).json();
    expect(e.sigil).toBe("open-book");
    expect(e.tags).toEqual(["primer"]);
  });
});
