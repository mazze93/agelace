import type { CanvasSummary, EntryKind, EntrySummary, Status } from "@agelace/shared";

// ── The Pattern: the world as one woven graph ───────────────────────────
// Pure model, no DOM: entries and boards become nodes; wikilinks, board
// threads and board membership become strands. The view (PatternPage) owns
// positions and physics; this only decides what exists and how it relates.

export type StrandKind = "link" | "thread" | "holds";

export interface PatternNode {
  /** "e:<entry id>" or "b:<board id>" — boards and entries share no namespace */
  key: string;
  ref: string;
  type: "entry" | "board";
  title: string;
  sigil: string;
  status?: Status;
  kind?: EntryKind;
  degree: number;
}

export interface Strand {
  key: string;
  source: string;
  target: string;
  kind: StrandKind;
  /** link: both entries name each other */
  mutual: boolean;
  labels: string[];
}

export interface PatternFilter {
  statuses: ReadonlySet<Status>;
  kinds: ReadonlySet<EntryKind>;
  boards: boolean;
  /** restrict to entries within `depth` strands of this entry */
  focus?: { id: string; depth: number } | undefined;
}

export interface Pattern {
  nodes: PatternNode[];
  strands: Strand[];
}

export const entryKey = (id: string): string => `e:${id}`;
export const boardKey = (id: string): string => `b:${id}`;

export function weave(entries: EntrySummary[], canvases: CanvasSummary[], f: PatternFilter): Pattern {
  const nodes = new Map<string, PatternNode>();
  for (const e of entries) {
    if (!f.statuses.has(e.status) || !f.kinds.has(e.kind)) continue;
    nodes.set(entryKey(e.id), { key: entryKey(e.id), ref: e.id, type: "entry", title: e.title, sigil: e.sigil, status: e.status, kind: e.kind, degree: 0 });
  }

  const strands = new Map<string, Strand>();
  const add = (a: string, b: string, kind: StrandKind, label?: string, directed = true): void => {
    if (a === b || !nodes.has(a) || !nodes.has(b)) return;
    // one strand per unordered pair and kind; a link written both ways is "mutual"
    const [s, t] = a < b ? [a, b] : [b, a];
    const key = `${kind}:${s}|${t}`;
    const hit = strands.get(key);
    if (hit) {
      if (kind === "link" && directed && hit.source !== a) hit.mutual = true;
      if (label && !hit.labels.includes(label)) hit.labels.push(label);
      return;
    }
    strands.set(key, { key, source: a, target: b, kind, mutual: false, labels: label ? [label] : [] });
  };

  for (const e of entries) for (const to of e.links) add(entryKey(e.id), entryKey(to), "link");
  for (const c of canvases) for (const t of c.threads) add(entryKey(t.from), entryKey(t.to), "thread", t.label || undefined, false);
  if (f.boards) {
    for (const c of canvases) {
      if (!c.entries.some((id) => nodes.has(entryKey(id)))) continue;
      nodes.set(boardKey(c.id), { key: boardKey(c.id), ref: c.id, type: "board", title: c.name, sigil: "treasure-map", degree: 0 });
      for (const id of c.entries) add(boardKey(c.id), entryKey(id), "holds", undefined, false);
    }
  }

  let keep: Set<string> | null = null;
  if (f.focus) {
    const start = entryKey(f.focus.id);
    keep = new Set(nodes.has(start) ? [start] : []);
    const adj = new Map<string, string[]>();
    for (const s of strands.values()) {
      adj.set(s.source, [...(adj.get(s.source) ?? []), s.target]);
      adj.set(s.target, [...(adj.get(s.target) ?? []), s.source]);
    }
    let ring = [...keep];
    for (let d = 0; d < f.focus.depth && ring.length; d++) {
      const next: string[] = [];
      for (const k of ring) for (const n of adj.get(k) ?? []) if (!keep.has(n)) (keep.add(n), next.push(n));
      ring = next;
    }
  }

  const out: Strand[] = [];
  for (const s of strands.values()) {
    if (keep && !(keep.has(s.source) && keep.has(s.target))) continue;
    out.push(s);
    nodes.get(s.source)!.degree++;
    nodes.get(s.target)!.degree++;
  }
  return { nodes: [...nodes.values()].filter((n) => !keep || keep.has(n.key)), strands: out };
}

/** Seal radius in world units: ages and well-woven entries loom larger. */
export function radiusOf(n: Pick<PatternNode, "type" | "kind" | "degree">): number {
  const base = n.type === "board" ? 20 : n.kind === "age" ? 26 : 16;
  return base + Math.min(14, Math.sqrt(n.degree) * 3.2);
}

/** Neighbour keys for hover emphasis. */
export function neighbours(strands: Strand[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    let s = m.get(a);
    if (!s) m.set(a, (s = new Set()));
    s.add(b);
  };
  for (const s of strands) (link(s.source, s.target), link(s.target, s.source));
  return m;
}
