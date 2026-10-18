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

export const WorldMeta = z.object({
  name: z.string().min(1).max(120),
  epigraph: z.string().max(400).default(""),
  format: z.literal(1),
});
export type WorldMeta = z.infer<typeof WorldMeta>;

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
