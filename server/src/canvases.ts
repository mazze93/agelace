import { readdir, readFile, rename } from "node:fs/promises";
import { join } from "node:path";
import * as Y from "yjs";
import { type CanvasSummary, type Id, slugify } from "@agelace/shared";
import type { WorldStore } from "./store.js";

/**
 * Canvases are Yjs documents, so two windows (or, one day, two people) can
 * edit the same board and merge instead of clobbering. On disk:
 *
 *   canvases/<id>.yjs     the CRDT state — source of truth
 *   canvases/<id>.canvas  JSON Canvas export, readable by Obsidian (write-only)
 *
 * Document shape (see app/src/canvas/model.ts for the typed view):
 *   meta:  Y.Map  { name, created }
 *   nodes: Y.Map<id, Y.Map>   cards: entry | text | mermaid | image | sketch | region | seal
 *   edges: Y.Map<id, Y.Map>   { from, to, label }
 *   ink:   Y.Map<id, Y.Map>   { points: number[] (x,y,pressure…), color, size }
 */
export class CanvasStore {
  private docs = new Map<Id, Y.Doc>();
  private timers = new Map<Id, ReturnType<typeof setTimeout>>();
  private readonly world: WorldStore;

  constructor(world: WorldStore) {
    this.world = world;
  }

  get dir(): string {
    return join(this.world.root, "canvases");
  }
  private path(id: Id, ext: "yjs" | "canvas"): string {
    return join(this.dir, `${id}.${ext}`);
  }

  async ids(): Promise<Id[]> {
    return (await readdir(this.dir)).filter((f) => f.endsWith(".yjs") && !f.startsWith(".")).map((f) => f.slice(0, -4));
  }

  async load(id: Id): Promise<Y.Doc | undefined> {
    const hit = this.docs.get(id);
    if (hit) return hit;
    let bytes: Uint8Array;
    try {
      bytes = await readFile(this.path(id, "yjs"));
    } catch {
      return undefined;
    }
    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, new Uint8Array(bytes), "disk");
    } catch (err) {
      console.warn(`[canvas] unreadable ${id}.yjs: ${(err as Error).message}`);
      return undefined;
    }
    this.docs.set(id, doc);
    return doc;
  }

  /** Re-read a file changed outside the app; CRDT merge, never a replace. */
  async mergeFromDisk(id: Id): Promise<void> {
    const doc = this.docs.get(id);
    if (!doc) return;
    try {
      Y.applyUpdate(doc, new Uint8Array(await readFile(this.path(id, "yjs"))), "disk");
    } catch {
      /* half-written or removed; the next event will settle it */
    }
  }

  async list(): Promise<CanvasSummary[]> {
    const out: CanvasSummary[] = [];
    for (const id of await this.ids()) {
      const doc = await this.load(id);
      if (!doc) continue;
      out.push(summarize(id, doc));
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(name: string): Promise<CanvasSummary> {
    const existing = new Set(await this.ids());
    const base = slugify(name);
    let id = base;
    for (let n = 2; existing.has(id); n++) id = `${base}-${n}`;
    const doc = new Y.Doc();
    const now = new Date().toISOString();
    doc.transact(() => {
      const meta = doc.getMap("meta");
      meta.set("name", name);
      meta.set("created", now);
      meta.set("updated", now);
    });
    this.docs.set(id, doc);
    await this.persist(id);
    return summarize(id, doc);
  }

  /** Full state, or only what a client with state vector `sv` is missing. */
  async state(id: Id, sv?: Uint8Array): Promise<Uint8Array | undefined> {
    const doc = await this.load(id);
    return doc ? Y.encodeStateAsUpdate(doc, sv) : undefined;
  }

  async apply(id: Id, update: Uint8Array): Promise<boolean> {
    const doc = await this.load(id);
    if (!doc) return false;
    Y.applyUpdate(doc, update, "client");
    doc.getMap("meta").set("updated", new Date().toISOString());
    this.schedule(id);
    return true;
  }

  async remove(id: Id): Promise<boolean> {
    if (!(await this.ids()).includes(id)) return false;
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.docs.delete(id);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    for (const ext of ["yjs", "canvas"] as const) {
      const from = this.path(id, ext);
      this.world.markWrite(from);
      await rename(from, join(this.world.root, ".trash", `${id}.${stamp}.${ext}`)).catch(() => undefined);
    }
    return true;
  }

  /** Coalesce bursts of strokes/drags into one write. */
  private schedule(id: Id): void {
    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(() => void this.persist(id).catch((e: Error) => console.error(`[canvas] save ${id}: ${e.message}`)), 400),
    );
  }

  async flushAll(): Promise<void> {
    for (const [id, t] of this.timers) {
      clearTimeout(t);
      await this.persist(id);
    }
    this.timers.clear();
  }

  private async persist(id: Id): Promise<void> {
    const doc = this.docs.get(id);
    if (!doc) return;
    await this.world.writeBytes(this.path(id, "yjs"), Y.encodeStateAsUpdate(doc));
    await this.world.writeJson(this.path(id, "canvas"), await toJsonCanvas(doc, this.world));
  }
}

/**
 * Listing row. Besides the count it names the entries a board holds and the
 * threads drawn between them, so the Pattern (graph view) can weave boards in
 * without loading every Y.Doc in the browser.
 */
function summarize(id: Id, doc: Y.Doc): CanvasSummary {
  const meta = doc.getMap("meta");
  const nodes = doc.getMap<Y.Map<unknown>>("nodes");
  const entryOf = new Map<string, Id>();
  for (const [nid, n] of nodes) {
    const e = n.get("entryId");
    if (n.get("type") === "entry" && typeof e === "string") entryOf.set(nid, e);
  }
  const threads: CanvasSummary["threads"] = [];
  for (const e of doc.getMap<Y.Map<unknown>>("edges").values()) {
    const from = entryOf.get(String(e.get("from")));
    const to = entryOf.get(String(e.get("to")));
    if (from && to && from !== to) threads.push({ from, to, label: typeof e.get("label") === "string" ? String(e.get("label")) : "" });
  }
  return {
    id,
    name: String(meta.get("name") ?? id),
    updated: String(meta.get("updated") ?? meta.get("created") ?? ""),
    nodes: nodes.size,
    entries: [...new Set(entryOf.values())],
    threads,
  };
}

// ── JSON Canvas 1.0 export (jsoncanvas.org) ──────────────────────────────
// Lossy by design: Obsidian sees cards, regions and arrows; agelace keeps
// the extra fields (prefixed agelace*) and its own .yjs as the truth.

type JsonCanvasNode = Record<string, unknown> & { id: string; type: string; x: number; y: number; width: number; height: number };

async function toJsonCanvas(doc: Y.Doc, world: WorldStore): Promise<{ nodes: JsonCanvasNode[]; edges: unknown[] }> {
  const nodes: JsonCanvasNode[] = [];
  for (const [id, raw] of doc.getMap<Y.Map<unknown>>("nodes")) {
    const n = raw.toJSON() as Record<string, unknown>;
    const geo = {
      id,
      x: Math.round(Number(n["x"] ?? 0)),
      y: Math.round(Number(n["y"] ?? 0)),
      width: Math.round(Number(n["w"] ?? 240)),
      height: Math.round(Number(n["h"] ?? 140)),
    };
    const kind = String(n["type"]);
    if (kind === "region") {
      nodes.push({ ...geo, type: "group", label: String(n["label"] ?? "") });
    } else if (kind === "image" && typeof n["src"] === "string") {
      nodes.push({ ...geo, type: "file", file: String(n["src"]).replace(/^\/assets\//, "assets/") });
    } else if (kind === "entry") {
      const entry = await world.get(String(n["entryId"]));
      nodes.push({ ...geo, type: "text", text: entry ? `# ${entry.title}` : "*(torn out)*", agelaceEntry: n["entryId"] });
    } else if (kind === "mermaid") {
      nodes.push({ ...geo, type: "text", text: "```mermaid\n" + String(n["source"] ?? "") + "\n```" });
    } else if (kind === "seal") {
      const label = n["label"] ? ` — ${String(n["label"])}` : "";
      nodes.push({ ...geo, type: "text", text: `*(seal: ${String(n["icon"] ?? "")}${label})*`, agelaceSeal: n["icon"] });
    } else if (kind === "text") {
      const frag = raw.get("body");
      nodes.push({ ...geo, type: "text", text: frag instanceof Y.XmlFragment ? xmlText(frag) : "" });
    } else {
      nodes.push({ ...geo, type: "text", text: `*(${kind})*` });
    }
  }
  const edges = [...doc.getMap<Y.Map<unknown>>("edges").entries()].map(([id, e]) => ({
    id,
    fromNode: e.get("from"),
    toNode: e.get("to"),
    toEnd: "arrow",
    ...(e.get("label") ? { label: e.get("label") } : {}),
  }));
  return { nodes, edges };
}

function xmlText(node: Y.XmlFragment | Y.XmlElement): string {
  let s = "";
  node.forEach((child) => {
    if (child instanceof Y.XmlText) s += child.toString().replace(/<[^>]+>/g, "");
    else if (child instanceof Y.XmlElement) {
      s += xmlText(child);
      if (child.nodeName === "paragraph" || child.nodeName === "heading") s += "\n\n";
    }
  });
  return s.trim();
}
