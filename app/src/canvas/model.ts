import * as Y from "yjs";

// ── Typed view over the canvas Y.Doc ────────────────────────────────────
// The doc is the single source of truth; React renders snapshots of it.
// Every local mutation goes through `transact(doc, fn)` with the LOCAL
// origin, which is what the undo manager tracks and the sync layer ships.

export const LOCAL = Symbol("agelace-local");
export const REMOTE = "remote";

export type NodeType = "entry" | "text" | "mermaid" | "image" | "sketch" | "region" | "seal";

export interface NodeSnap {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  entryId?: string;
  src?: string;
  label?: string;
  /** mermaid source */
  source?: string;
  /** sketch preview svg (rendered by Excalidraw on save) */
  preview?: string;
  /** seal: game-icons name and ink */
  icon?: string;
  color?: string;
}

export interface EdgeSnap {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface StrokeSnap {
  id: string;
  /** flat [x, y, pressure, x, y, pressure, …] in world units */
  points: number[];
  color: string;
  size: number;
}

export interface Snapshot {
  nodes: NodeSnap[];
  edges: EdgeSnap[];
  ink: StrokeSnap[];
  name: string;
}

export const nodesOf = (doc: Y.Doc) => doc.getMap<Y.Map<unknown>>("nodes");
export const edgesOf = (doc: Y.Doc) => doc.getMap<Y.Map<unknown>>("edges");
export const inkOf = (doc: Y.Doc) => doc.getMap<Y.Map<unknown>>("ink");
export const metaOf = (doc: Y.Doc) => doc.getMap<unknown>("meta");

export function transact(doc: Y.Doc, fn: () => void): void {
  doc.transact(fn, LOCAL);
}

const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function snapshot(doc: Y.Doc): Snapshot {
  const nodes: NodeSnap[] = [];
  nodesOf(doc).forEach((m, id) => {
    const type = str(m.get("type")) as NodeType | undefined;
    if (!type) return;
    const src = m.get("source");
    nodes.push({
      id,
      type,
      x: num(m.get("x")),
      y: num(m.get("y")),
      w: num(m.get("w"), 240),
      h: num(m.get("h"), 140),
      z: num(m.get("z")),
      ...(str(m.get("entryId")) ? { entryId: str(m.get("entryId")) } : {}),
      ...(str(m.get("src")) ? { src: str(m.get("src")) } : {}),
      ...(str(m.get("label")) !== undefined ? { label: str(m.get("label")) } : {}),
      ...(src instanceof Y.Text ? { source: src.toString() } : {}),
      ...(str(m.get("preview")) ? { preview: str(m.get("preview")) } : {}),
      ...(str(m.get("icon")) ? { icon: str(m.get("icon")) } : {}),
      ...(str(m.get("color")) ? { color: str(m.get("color")) } : {}),
    });
  });
  // Regions always sit beneath cards; within a layer, z then id for stability.
  nodes.sort((a, b) => (a.type === "region" ? 0 : 1) - (b.type === "region" ? 0 : 1) || a.z - b.z || a.id.localeCompare(b.id));

  const edges: EdgeSnap[] = [];
  edgesOf(doc).forEach((m, id) => {
    const from = str(m.get("from"));
    const to = str(m.get("to"));
    if (from && to) edges.push({ id, from, to, label: str(m.get("label")) ?? "" });
  });

  const ink: StrokeSnap[] = [];
  inkOf(doc).forEach((m, id) => {
    const pts = m.get("points");
    const points = pts instanceof Y.Array ? (pts.toArray() as number[]) : Array.isArray(pts) ? (pts as number[]) : [];
    ink.push({ id, points, color: str(m.get("color")) ?? "var(--ink-lampblack)", size: num(m.get("size"), 6) });
  });

  return { nodes, edges, ink, name: String(metaOf(doc).get("name") ?? "") };
}

export function newId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface NewNode {
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  entryId?: string;
  src?: string;
  label?: string;
  source?: string;
  icon?: string;
  color?: string;
}

/** Create a card. Caller wraps in transact(). */
export function addNode(doc: Y.Doc, n: NewNode): string {
  const id = newId();
  const m = new Y.Map<unknown>();
  m.set("type", n.type);
  m.set("x", Math.round(n.x));
  m.set("y", Math.round(n.y));
  m.set("w", Math.round(n.w));
  m.set("h", Math.round(n.h));
  m.set("z", topZ(doc) + 1);
  if (n.entryId) m.set("entryId", n.entryId);
  if (n.src) m.set("src", n.src);
  if (n.label !== undefined) m.set("label", n.label);
  if (n.icon) m.set("icon", n.icon);
  if (n.color) m.set("color", n.color);
  if (n.type === "mermaid") m.set("source", new Y.Text(n.source ?? ""));
  if (n.type === "text") m.set("body", new Y.XmlFragment());
  nodesOf(doc).set(id, m);
  return id;
}

export function topZ(doc: Y.Doc): number {
  let z = 0;
  nodesOf(doc).forEach((m) => (z = Math.max(z, num(m.get("z")))));
  return z;
}

/** Remove cards and every edge that touched them. Caller wraps in transact(). */
export function removeNodes(doc: Y.Doc, ids: Iterable<string>): void {
  const gone = new Set(ids);
  for (const id of gone) nodesOf(doc).delete(id);
  edgesOf(doc).forEach((m, id) => {
    if (gone.has(String(m.get("from"))) || gone.has(String(m.get("to")))) edgesOf(doc).delete(id);
  });
}

export function addEdge(doc: Y.Doc, from: string, to: string): string | null {
  if (from === to) return null;
  let dup: string | null = null;
  edgesOf(doc).forEach((m, id) => {
    if (m.get("from") === from && m.get("to") === to) dup = id;
  });
  if (dup) return dup;
  const id = newId();
  const m = new Y.Map<unknown>();
  m.set("from", from);
  m.set("to", to);
  m.set("label", "");
  edgesOf(doc).set(id, m);
  return id;
}

export function addStroke(doc: Y.Doc, points: number[], color: string, size: number): string {
  const id = newId();
  const m = new Y.Map<unknown>();
  // Rounded to 0.1 world units: invisible, and halves the bytes on disk.
  m.set("points", points.map((v) => Math.round(v * 10) / 10));
  m.set("color", color);
  m.set("size", size);
  inkOf(doc).set(id, m);
  return id;
}

export function setNode(doc: Y.Doc, id: string, patch: Partial<Pick<NodeSnap, "x" | "y" | "w" | "h" | "z" | "label" | "src" | "preview" | "icon" | "color">>): void {
  const m = nodesOf(doc).get(id);
  if (!m) return;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    m.set(k, typeof v === "number" ? Math.round(v) : v);
  }
}
