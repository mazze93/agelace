import { z } from "zod";

// ── Story-model invariant ────────────────────────────────────────────────
// Every element carries a status. Generated material enters as "proposed"
// and only an explicit user action promotes it to "canon".
export const Status = z.enum(["canon", "proposed", "question"]);
export type Status = z.infer<typeof Status>;

export const EntryKind = z.enum([
  "chronicle", // prose, histories, scenes
  "person",
  "place",
  "age", // eras, aeons, epochs
  "thing", // artefacts, institutions, magic
  "note",
]);
export type EntryKind = z.infer<typeof EntryKind>;

/** Each kind's default sigil (game-icons names), shared by server and app. */
export const KIND_SIGIL: Record<EntryKind, string> = {
  chronicle: "quill-ink",
  person: "hood",
  place: "castle",
  age: "hourglass",
  thing: "crystal-ball",
  note: "scroll-unfurled",
};

// Ids double as filenames, so keep them filesystem-safe on every OS
// (Windows forbids <>:"/\|?* and is case-insensitive → lowercase only).
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "id must be lowercase a-z, 0-9, dashes");
export type Id = z.infer<typeof Id>;

/** ProseMirror/TipTap document JSON. Validated structurally by the editor, opaque here. */
export const RichDoc = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() }).loose();
export type RichDoc = z.infer<typeof RichDoc>;

export const Entry = z.object({
  id: Id,
  title: z.string().min(1).max(200),
  kind: EntryKind,
  status: Status,
  /** game-icons name, e.g. "crossed-swords" — the entry's chapter sigil */
  sigil: z.string().min(1).max(80),
  // No .default() here: defaults would leak into EntryPatch (a .partial() of
  // this) and silently overwrite fields on every save. Defaults live in create().
  tags: z.array(z.string().max(60)),
  doc: RichDoc,
  created: z.string(),
  updated: z.string(),
});
export type Entry = z.infer<typeof Entry>;

export const EntryDraft = Entry.pick({ title: true, kind: true }).extend({
  status: Status.optional(),
  sigil: z.string().max(80).optional(),
  tags: z.array(z.string()).optional(),
  doc: RichDoc.optional(),
});
export type EntryDraft = z.infer<typeof EntryDraft>;

export const EntryPatch = Entry.omit({ id: true, created: true, updated: true }).partial();
export type EntryPatch = z.infer<typeof EntryPatch>;

/** Lightweight listing row — no document body. */
export type EntrySummary = Omit<Entry, "doc"> & { links: Id[]; excerpt: string };

/** Families for the three typographic roles. Empty or absent = the archive's own face. */
export const Typeset = z.object({
  display: z.string().max(120).optional(),
  body: z.string().max(120).optional(),
  label: z.string().max(120).optional(),
});
export type Typeset = z.infer<typeof Typeset>;

export const Pairing = Typeset.extend({ name: z.string().min(1).max(80) });
export type Pairing = z.infer<typeof Pairing>;

const worldFields = {
  name: z.string().min(1).max(120),
  epigraph: z.string().max(400),
  format: z.literal(1),
  /** the world's hand: applied to the whole app */
  typeset: Typeset.optional(),
  /** pairings saved from the forge */
  pairings: z.array(Pairing).max(60).optional(),
};
export const WorldMeta = z.object({ ...worldFields, epigraph: worldFields.epigraph.default("") });
export type WorldMeta = z.infer<typeof WorldMeta>;
// Built from the default-free fields: a .partial() of WorldMeta would fill in
// epigraph: "" on every PATCH that leaves it out, blanking the real one.
export const WorldPatch = z.object(worldFields).omit({ format: true }).partial();
export type WorldPatch = z.infer<typeof WorldPatch>;

// ── The forge: hands (user-drawn typefaces) ──────────────────────────────
// Coordinates are font units: 1000 to the em, y up, 0 at the baseline. A
// glyph's horizontal position is free; casting places it by its ink.

export const NibKind = z.enum([
  "quill", // pressure-led, tapering (perfect-freehand)
  "broad", // broad-edge chisel held at a fixed angle: thick and thin by direction
  "round", // monoline
]);
export type NibKind = z.infer<typeof NibKind>;

export const Nib = z.object({
  kind: NibKind,
  /** width in font units */
  size: z.number().min(4).max(240),
  /** broad-edge angle in degrees, counter-clockwise from the baseline */
  angle: z.number().min(-90).max(90),
});
export type Nib = z.infer<typeof Nib>;

export const GlyphStroke = z.object({
  /** flat [x, y, pressure, x, y, pressure, …] */
  pts: z.array(z.number()).max(12_000),
  /** true when pressure came from a real pen, not simulated */
  pen: z.boolean().optional(),
});
export type GlyphStroke = z.infer<typeof GlyphStroke>;

export const Glyph = z.object({
  strokes: z.array(GlyphStroke).max(300),
  /** side-bearing overrides; absent = the hand's spacing */
  left: z.number().int().min(-400).max(600).optional(),
  right: z.number().int().min(-400).max(600).optional(),
});
export type Glyph = z.infer<typeof Glyph>;

export const HandMetrics = z.object({
  ascender: z.number().int().min(500).max(1200),
  descender: z.number().int().min(-600).max(0),
  capHeight: z.number().int().min(200).max(1100),
  xHeight: z.number().int().min(100).max(900),
});
export type HandMetrics = z.infer<typeof HandMetrics>;

/** One character (one code point) → its glyph. */
const GlyphKey = z.string().refine((k) => [...k].length === 1 && k !== " ", "one character per glyph");

export const Hand = z.object({
  id: Id,
  family: z.string().trim().min(1).max(60),
  format: z.literal(1),
  nib: Nib,
  metrics: HandMetrics,
  /** default side bearing, font units */
  spacing: z.number().int().min(0).max(400),
  /** advance of the space character */
  space: z.number().int().min(50).max(1000),
  glyphs: z.record(GlyphKey, Glyph),
  created: z.string(),
  updated: z.string(),
});
export type Hand = z.infer<typeof Hand>;

export const HandWrite = Hand.omit({ id: true, format: true, created: true, updated: true });
export type HandWrite = z.infer<typeof HandWrite>;

export interface HandSummary {
  id: Id;
  family: string;
  glyphs: number;
  updated: string;
  /** file in world/fonts once cast */
  cast?: string;
}

export interface FontFaceInfo {
  /** CSS family name as it should be used in font-family */
  family: string;
  /** URL the browser can load the file from */
  url: string;
  format: "woff2" | "woff" | "truetype" | "opentype";
  weight: string;
  style: "normal" | "italic";
  source: "builtin" | "world";
  file: string;
  unicodeRange?: string;
  license?: string;
  category?: string;
}

/**
 * Live events. `by` is the client id that caused the change (sent by the app
 * as the x-agelace-client header) so a client can ignore its own echoes;
 * absent when the change came from outside (another app, a sync client, a hand edit).
 */
export type WorldEvent =
  | { type: "entry"; id: Id; op: "upsert" | "delete"; by?: string }
  | { type: "canvas"; id: Id; op: "upsert" | "delete"; by?: string }
  | { type: "hand"; id: Id; op: "upsert" | "delete"; by?: string }
  | { type: "fonts"; by?: string }
  | { type: "world"; by?: string };

export interface CanvasSummary {
  id: Id;
  name: string;
  updated: string;
  nodes: number;
  /** entries placed on the board (deduplicated) */
  entries: Id[];
  /** threads drawn between two entry cards, resolved to entry ids */
  threads: { from: Id; to: Id; label: string }[];
}

export const CLIENT_HEADER = "x-agelace-client";

// ── Rich-doc helpers shared by server (indexing) and app ─────────────────

interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
}

function walk(node: unknown, visit: (n: PMNode) => void): void {
  if (!node || typeof node !== "object") return;
  const n = node as PMNode;
  visit(n);
  if (Array.isArray(n.content)) for (const c of n.content) walk(c, visit);
}

/** Entry ids referenced by wikilink nodes inside a document. */
export function extractLinks(doc: RichDoc): Id[] {
  const out = new Set<string>();
  walk(doc, (n) => {
    if (n.type === "wikiLink" && typeof n.attrs?.["id"] === "string") out.add(n.attrs["id"]);
  });
  return [...out];
}

/** Plain text of a document, footnote bodies excluded. */
export function plainText(doc: RichDoc, limit = Infinity): string {
  let s = "";
  const go = (node: unknown): void => {
    if (s.length >= limit || !node || typeof node !== "object") return;
    const n = node as PMNode;
    if (n.type === "footnote") return;
    if (typeof n.text === "string") s += n.text;
    else if (n.type === "wikiLink") s += String(n.attrs?.["label"] ?? "");
    if (Array.isArray(n.content)) n.content.forEach(go);
    if (n.type === "paragraph" || n.type === "heading") s += " ";
  };
  go(doc);
  return s.replace(/\s+/g, " ").trim().slice(0, limit);
}

export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return base || "untitled";
}

export const emptyDoc = (): RichDoc => ({ type: "doc", content: [{ type: "paragraph" }] });

export * from "./glyph.js";
