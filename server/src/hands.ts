import { mkdir, readdir, readFile, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import opentype from "opentype.js";
import {
  DEFAULT_HAND,
  Hand,
  type HandSummary,
  type HandWrite,
  type Id,
  placeGlyph,
  ringCommands,
  slugify,
} from "@agelace/shared";
import type { WorldStore } from "./store.js";

/**
 * Hands: typefaces drawn in the forge. Each is one JSON file of pen strokes,
 * `world/forge/<id>.json`, the editable source. Casting turns it into a real
 * OpenType font in `world/fonts/`, where the font library picks it up like any
 * font the user dropped in.
 */
export class HandStore {
  constructor(private readonly world: WorldStore) {}

  get dir(): string {
    return join(this.world.root, "forge");
  }

  private path(id: Id): string {
    return join(this.dir, `${id}.json`);
  }

  async list(): Promise<HandSummary[]> {
    await mkdir(this.dir, { recursive: true });
    const out: HandSummary[] = [];
    for (const name of await readdir(this.dir)) {
      if (!name.endsWith(".json") || name.startsWith(".")) continue;
      const hand = await this.read(join(this.dir, name));
      if (!hand) continue;
      const cast = castFileName(hand.family);
      const exists = await stat(join(this.world.fontsDir, cast)).then(
        () => true,
        () => false,
      );
      out.push({
        id: hand.id,
        family: hand.family,
        glyphs: Object.values(hand.glyphs).filter((g) => g.strokes.length).length,
        updated: hand.updated,
        ...(exists ? { cast } : {}),
      });
    }
    return out.sort((a, b) => a.family.localeCompare(b.family));
  }

  private async read(path: string): Promise<Hand | undefined> {
    try {
      const parsed = Hand.safeParse(JSON.parse(await readFile(path, "utf8")));
      if (parsed.success) return parsed.data;
      console.warn(`[forge] skipping invalid hand ${path}: ${parsed.error.issues[0]?.message}`);
    } catch (err) {
      console.warn(`[forge] unreadable hand ${path}: ${(err as Error).message}`);
    }
    return undefined;
  }

  async get(id: Id): Promise<Hand | undefined> {
    return this.read(this.path(id));
  }

  async create(family: string): Promise<Hand> {
    await mkdir(this.dir, { recursive: true });
    const taken = new Set((await this.list()).map((h) => h.id));
    const base = slugify(family) || "hand";
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    const now = new Date().toISOString();
    const hand = Hand.parse({ id, family, format: 1, ...DEFAULT_HAND, glyphs: {}, created: now, updated: now });
    await this.world.writeJson(this.path(id), hand);
    return hand;
  }

  async put(id: Id, body: HandWrite): Promise<Hand | undefined> {
    const current = await this.get(id);
    if (!current) return undefined;
    const next = Hand.parse({ ...body, id, format: 1, created: current.created, updated: new Date().toISOString() });
    await this.world.writeJson(this.path(id), next);
    return next;
  }

  async remove(id: Id): Promise<boolean> {
    if (!(await this.get(id))) return false;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.world.markWrite(this.path(id));
    await rename(this.path(id), join(this.world.root, ".trash", `forge-${id}.${stamp}.json`));
    return true;
  }
}

/** The font file a hand casts to. Stable per family, so recasting replaces it. */
export function castFileName(family: string): string {
  const stem =
    family
      .normalize("NFKD")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "hand";
  return `${stem}.otf`;
}

/** A hand → OpenType (CFF) font bytes. Characters with no ink are left out, so text falls back. */
export function castHand(hand: Hand): { bytes: ArrayBuffer; glyphs: number } {
  const { ascender, descender } = hand.metrics;
  const notdef = new opentype.Glyph({ name: ".notdef", advanceWidth: 500, path: notdefPath(ascender) });
  const space = new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: hand.space, path: new opentype.Path() });
  const glyphs = [notdef, space];
  const chars = Object.keys(hand.glyphs).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  for (const ch of chars) {
    const placed = placeGlyph(hand.glyphs[ch]!, hand);
    if (!placed) continue;
    const path = new opentype.Path();
    const r = (v: number) => Math.round(v);
    for (const ring of placed.contours)
      for (const c of ringCommands(ring)) {
        if (c.c === "M") path.moveTo(r(c.x + placed.dx), r(c.y));
        else if (c.c === "L") path.lineTo(r(c.x + placed.dx), r(c.y));
        else if (c.c === "Q") path.quadraticCurveTo(r(c.x1 + placed.dx), r(c.y1), r(c.x + placed.dx), r(c.y));
        else path.close();
      }
    const cp = ch.codePointAt(0)!;
    glyphs.push(new opentype.Glyph({ name: `uni${cp.toString(16).toUpperCase().padStart(4, "0")}`, unicode: cp, advanceWidth: placed.advance, path }));
  }
  const font = new opentype.Font({
    familyName: hand.family,
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender,
    descender,
    designer: "Forged in agelace",
    weightClass: 400,
    version: "1.0",
    glyphs,
  });
  return { bytes: font.toArrayBuffer(), glyphs: glyphs.length - 2 };
}

/** The empty box shown for a character the font lacks (when nothing falls back). */
function notdefPath(ascender: number): opentype.Path {
  const p = new opentype.Path();
  const top = Math.round(ascender * 0.85);
  p.moveTo(50, 0);
  p.lineTo(50, top);
  p.lineTo(450, top);
  p.lineTo(450, 0);
  p.close();
  p.moveTo(100, 50);
  p.lineTo(400, 50);
  p.lineTo(400, top - 50);
  p.lineTo(100, top - 50);
  p.close();
  return p;
}
