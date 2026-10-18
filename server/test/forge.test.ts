import { mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import opentype from "opentype.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { glyphContours, placeGlyph, ringCommands, signedArea, type Glyph, type Hand, type Nib, type Pt } from "@agelace/shared";
import { buildApp } from "../src/app.js";
import { fontName } from "../src/fonts.js";

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "agelace-forge-"));
  app = await buildApp({ worldDir: dir, builtinFontsDir: join(dir, "nope") });
});
afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

/** A stroke from (x0,y0) to (x1,y1), sampled every 10 units. */
const line = (x0: number, y0: number, x1: number, y1: number) => {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10));
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) pts.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 0.5);
  return { pts };
};
/** A ring of strokes drawn as one closed loop. */
const loop = (cx: number, cy: number, r: number) => {
  const pts: number[] = [];
  for (let i = 0; i <= 48; i++) pts.push(cx + Math.cos((i / 48) * 2 * Math.PI) * r, cy + Math.sin((i / 48) * 2 * Math.PI) * r, 0.5);
  return { pts };
};
const L: Glyph = { strokes: [line(100, 690, 100, 0), line(100, 0, 420, 0)] };
const O: Glyph = { strokes: [loop(300, 225, 200)] };
const broad: Nib = { kind: "broad", size: 64, angle: 32 };

describe("glyph geometry", () => {
  it("unions a glyph's strokes into one counter-clockwise outline", () => {
    const c = glyphContours(L, broad);
    expect(c).toHaveLength(1);
    expect(signedArea(c[0]!)).toBeGreaterThan(0);
  });

  it("keeps the counter of an O as a clockwise hole, under every nib", () => {
    for (const kind of ["broad", "quill", "round"] as const) {
      const c = glyphContours(O, { ...broad, kind });
      expect(c.length, kind).toBe(2);
      const areas = c.map((r) => signedArea(r)).sort((a, b) => a - b);
      expect(areas[0], kind).toBeLessThan(0);
      expect(areas[1], kind).toBeGreaterThan(0);
    }
  });

  it("a broad nib is thick across its angle and hairline along it", () => {
    const width = (g: Glyph) => {
      const c = glyphContours(g, { kind: "broad", size: 80, angle: 0 });
      const ys = c.flat().map((p) => p[1]);
      return Math.max(...ys) - Math.min(...ys);
    };
    // A horizontal stroke with a horizontal nib is a hairline; a vertical one is full width.
    expect(width({ strokes: [line(0, 300, 400, 300)] })).toBeLessThan(10);
    const c = glyphContours({ strokes: [line(200, 0, 200, 400)] }, { kind: "broad", size: 80, angle: 0 });
    const xs = c.flat().map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(75);
  });

  it("a stylus pressing harder spreads a broad nib; a mouse stays even", () => {
    const across = (pen: boolean, p: number) => {
      const pts: number[] = [];
      for (let y = 0; y <= 400; y += 10) pts.push(200, y, p);
      const c = glyphContours({ strokes: [{ pts, pen }] }, { kind: "broad", size: 80, angle: 0 });
      const xs = c.flat().map((q) => q[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(across(true, 1)).toBeGreaterThan(across(true, 0.1) * 1.5);
    expect(Math.round(across(false, 1))).toBe(Math.round(across(false, 0.1)));
  });

  it("paths close, start with a move, and keep sharp corners as lines", () => {
    const square: Pt[] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    const cmds = ringCommands(square);
    expect(cmds[0]?.c).toBe("M");
    expect(cmds.at(-1)?.c).toBe("Z");
    expect(cmds.filter((c) => c.c === "Q")).toHaveLength(0);
    expect(cmds.filter((c) => c.c === "L")).toHaveLength(3); // the fourth side is the Z
  });

  it("places ink at its side bearings", () => {
    const p = placeGlyph(L, { nib: broad, spacing: 50 })!;
    expect(Math.round(p.bounds.xMin + p.dx)).toBe(50);
    expect(p.advance).toBe(Math.round(p.bounds.xMax - p.bounds.xMin + 100));
    expect(placeGlyph({ strokes: [] }, { nib: broad, spacing: 50 })).toBeNull();
  });
});

describe("world settings", () => {
  it("renaming the world leaves its epigraph alone", async () => {
    await app.inject({ method: "PATCH", url: "/api/world", payload: { epigraph: "Before the names, the Pattern." } });
    const res = await app.inject({ method: "PATCH", url: "/api/world", payload: { name: "Ankh" } });
    expect(res.json()).toMatchObject({ name: "Ankh", epigraph: "Before the names, the Pattern." });
  });

  it("keeps a typeset and saved pairings", async () => {
    const pairings = [{ name: "Chancery", display: "IM Fell English", body: "Alegreya" }];
    await app.inject({ method: "PATCH", url: "/api/world", payload: { typeset: { display: "Uncial Antiqua" }, pairings } });
    const world = (await app.inject("/api/world")).json();
    expect(world).toMatchObject({ typeset: { display: "Uncial Antiqua" }, pairings });
  });
});

describe("hands", () => {
  it("creates, draws, casts and trashes a hand", async () => {
    const created = await app.inject({ method: "POST", url: "/api/hands", payload: { family: "Moonthief Hand" } });
    expect(created.statusCode).toBe(201);
    const hand = created.json() as Hand;
    expect(hand.id).toBe("moonthief-hand");

    const { id, format, created: c, updated, cast: _cast, ...rest } = hand;
    const put = await app.inject({ method: "PUT", url: `/api/hands/${id}`, payload: { ...rest, glyphs: { L, O, a: { strokes: [] } } } });
    expect(put.statusCode).toBe(200);

    const bad = await app.inject({ method: "PUT", url: `/api/hands/${id}`, payload: { ...rest, glyphs: { LO: L } } });
    expect(bad.statusCode).toBe(400);

    const listed = (await app.inject("/api/hands")).json();
    expect(listed).toEqual([expect.objectContaining({ id, family: "Moonthief Hand", glyphs: 2 })]);

    const cast = await app.inject({ method: "POST", url: `/api/hands/${id}/cast` });
    expect(cast.statusCode).toBe(201);
    expect(cast.json()).toMatchObject({ file: "Moonthief-Hand.otf", glyphs: 2 });

    const bytes = await readFile(join(dir, "fonts", "Moonthief-Hand.otf"));
    const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(fontName(font.names, "fontFamily")).toBe("Moonthief Hand");
    const glyphL = font.charToGlyph("L");
    expect(glyphL.unicode).toBe(76);
    expect(glyphL.path.commands.length).toBeGreaterThan(4);
    expect(Math.round(glyphL.getBoundingBox().x1)).toBe(50);
    expect(font.charToGlyph(" ").advanceWidth).toBe(hand.space);
    expect((font.tables["os2"] as { usWeightClass: number }).usWeightClass).toBe(400);

    const fonts = (await app.inject("/api/fonts")).json() as { family: string; url: string }[];
    expect(fonts).toEqual([expect.objectContaining({ family: "Moonthief Hand", url: expect.stringMatching(/^\/fonts\/world\/Moonthief-Hand\.otf\?v=/) })]);
    expect((await app.inject("/api/hands")).json()[0].cast).toBe("Moonthief-Hand.otf");

    expect((await app.inject({ method: "DELETE", url: `/api/hands/${id}` })).statusCode).toBe(204);
    expect((await readdir(join(dir, ".trash"))).some((f) => f.startsWith("forge-moonthief-hand."))).toBe(true);
    expect((await app.inject(`/api/hands/${id}`)).statusCode).toBe(404);
  });

  const drawn = async (family: string, glyphs: Record<string, Glyph> = { L }) => {
    const hand = (await app.inject({ method: "POST", url: "/api/hands", payload: { family } })).json() as Hand;
    const { id, format, created, updated, cast, ...rest } = hand;
    await app.inject({ method: "PUT", url: `/api/hands/${id}`, payload: { ...rest, glyphs } });
    return hand;
  };

  it("never overwrites a font it didn't make", async () => {
    await writeFile(join(dir, "fonts", "Moonthief.otf"), "a font someone dropped in");
    const hand = await drawn("Moonthief");
    const cast = await app.inject({ method: "POST", url: `/api/hands/${hand.id}/cast` });
    expect(cast.statusCode).toBe(409);
    expect(await readFile(join(dir, "fonts", "Moonthief.otf"), "utf8")).toBe("a font someone dropped in");
  });

  it("two hands with one name: the first to cast keeps it, the second is refused", async () => {
    const one = await drawn("Twin");
    const two = await drawn("Twin");
    expect((await app.inject({ method: "POST", url: `/api/hands/${one.id}/cast` })).statusCode).toBe(201);
    expect((await app.inject({ method: "POST", url: `/api/hands/${two.id}/cast` })).statusCode).toBe(409);
    expect((await app.inject({ method: "POST", url: `/api/hands/${one.id}/cast` })).statusCode).toBe(201); // recasting your own is fine
  });

  it("refuses a family a dropped-in font already uses under another filename", async () => {
    const one = await drawn("Shared");
    await app.inject({ method: "POST", url: `/api/hands/${one.id}/cast` });
    // The same font now sits under another filename, as if dropped in; Shared.otf itself is gone.
    await rename(join(dir, "fonts", "Shared.otf"), join(dir, "fonts", "dropped.otf"));
    const two = await drawn("Shared");
    const res = await app.inject({ method: "POST", url: `/api/hands/${two.id}/cast` });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/dropped\.otf is already the family Shared/);
  });

  it("recasting after a rename retires the old file to the trash", async () => {
    const hand = await drawn("First Name");
    expect((await app.inject({ method: "POST", url: `/api/hands/${hand.id}/cast` })).json().file).toBe("First-Name.otf");
    const current = (await app.inject(`/api/hands/${hand.id}`)).json() as Hand;
    expect(current.cast).toBe("First-Name.otf");
    const { id, format, created, updated, cast, ...rest } = current;
    await app.inject({ method: "PUT", url: `/api/hands/${id}`, payload: { ...rest, family: "Second Name" } });
    expect((await app.inject(`/api/hands/${id}`)).json().cast).toBe("First-Name.otf"); // a save never drops it
    expect((await app.inject({ method: "POST", url: `/api/hands/${id}/cast` })).json().file).toBe("Second-Name.otf");
    const fonts = await readdir(join(dir, "fonts"));
    expect(fonts).toEqual(["Second-Name.otf"]);
    expect((await readdir(join(dir, ".trash"))).some((f) => f.endsWith("First-Name.otf"))).toBe(true);
  });

  it("casts characters beyond the Basic Multilingual Plane", async () => {
    const hand = await drawn("Astral", { "\u{16A0}": L, "\u{1F319}": O });
    expect((await app.inject({ method: "POST", url: `/api/hands/${hand.id}/cast` })).statusCode).toBe(201);
    const bytes = await readFile(join(dir, "fonts", "Astral.otf"));
    const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(font.charToGlyph("\u{16A0}").unicode).toBe(0x16a0);
    expect(font.charToGlyph("\u{1F319}").unicode).toBe(0x1f319);
  });

  it("refuses to cast an empty hand", async () => {
    const hand = (await app.inject({ method: "POST", url: "/api/hands", payload: { family: "Blank" } })).json() as Hand;
    const cast = await app.inject({ method: "POST", url: `/api/hands/${hand.id}/cast` });
    expect(cast.statusCode).toBe(400);
  });
});
