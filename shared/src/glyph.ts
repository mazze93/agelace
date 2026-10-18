import { getStroke } from "perfect-freehand";
import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from "polygon-clipping";
import type { Glyph, GlyphStroke, Hand, Nib } from "./index.js";

/**
 * Glyph geometry for the forge, shared by the app (live proofs) and the server
 * (casting .otf). Strokes are drawn with a nib, unioned into clean contours
 * (outer rings counter-clockwise, holes clockwise, so any fill rule agrees),
 * then turned into lines and quadratic curves: corners stay sharp, the rest
 * is smoothed through edge midpoints.
 */

export type Pt = [number, number];
export type PathCmd =
  | { c: "M"; x: number; y: number }
  | { c: "L"; x: number; y: number }
  | { c: "Q"; x1: number; y1: number; x: number; y: number }
  | { c: "Z" };

export interface Bounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** The characters a new hand offers to draw. Any other single character can be added. */
export const GLYPH_SET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?'\"-–—()&*/";

export const DEFAULT_HAND: Pick<Hand, "nib" | "metrics" | "spacing" | "space"> = {
  nib: { kind: "broad", size: 64, angle: 32 },
  metrics: { ascender: 800, descender: -220, capHeight: 690, xHeight: 450 },
  spacing: 50,
  space: 260,
};

// ── stroke → polygon ────────────────────────────────────────────────────

function triples(s: GlyphStroke): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i + 2 < s.pts.length; i += 3) out.push([s.pts[i]!, s.pts[i + 1]!, s.pts[i + 2]!]);
  return out;
}

/** Drop points closer than `min` to the last kept one (always keep the last). */
function thin(pts: [number, number, number][], min: number): [number, number, number][] {
  if (pts.length < 3) return pts;
  const out = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = pts[i]!;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= min) out.push(b);
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** Andrew's monotone chain. */
function hull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export function signedArea(r: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i]!;
    const q = r[(i + 1) % r.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/**
 * A broad-edge nib is a thin rectangle at a fixed angle. Its sweep along the
 * stroke is the union of the hulls of consecutive nib positions, which is
 * exactly how a chisel pen lays ink: full width across the angle, a hairline along it.
 */
function broadPolygons(pts: [number, number, number][], nib: Nib, pen: boolean): Ring[] {
  const a = (nib.angle * Math.PI) / 180;
  const t = Math.max(2, nib.size * 0.07) / 2;
  const tx = -Math.sin(a) * t;
  const ty = Math.cos(a) * t;
  const corners = (p: [number, number, number]): Pt[] => {
    // A real broad nib spreads under pressure; with a stylus, so does this one.
    const w = (pen ? nib.size * (0.7 + 0.6 * p[2]) : nib.size) / 2;
    const hx = Math.cos(a) * w;
    const hy = Math.sin(a) * w;
    return [
      [p[0] + hx + tx, p[1] + hy + ty],
      [p[0] + hx - tx, p[1] + hy - ty],
      [p[0] - hx - tx, p[1] - hy - ty],
      [p[0] - hx + tx, p[1] - hy + ty],
    ];
  };
  const run = thin(pts, Math.max(3, nib.size * 0.12));
  if (run.length === 1) return [hull(corners(run[0]!))];
  const rings: Ring[] = [];
  for (let i = 0; i + 1 < run.length; i++) rings.push(hull([...corners(run[i]!), ...corners(run[i + 1]!)]));
  return rings;
}

function freehandPolygon(pts: [number, number, number][], nib: Nib, pen: boolean): Ring[] {
  const quill = nib.kind === "quill";
  const outline = getStroke(pts, {
    size: nib.size,
    thinning: quill ? 0.6 : 0,
    smoothing: 0.6,
    streamline: 0.35,
    simulatePressure: quill && !pen,
    start: quill ? { taper: nib.size * 1.2, cap: true } : { cap: true },
    end: quill ? { taper: nib.size * 1.6, cap: true } : { cap: true },
    last: true,
  }) as Pt[];
  return outline.length >= 3 ? [outline] : [];
}

export function strokePolygons(s: GlyphStroke, nib: Nib): Ring[] {
  const pts = triples(s);
  if (!pts.length) return [];
  const rings = nib.kind === "broad" ? broadPolygons(pts, nib, s.pen === true) : freehandPolygon(pts, nib, s.pen === true);
  return rings.filter((r) => r.length >= 3 && Math.abs(signedArea(r as Pt[])) > 0.5);
}

// ── union → contours ────────────────────────────────────────────────────

/** Ramer–Douglas–Peucker on an open chain; keeps both ends. */
function simplifyChain(c: Pt[], tol: number): Pt[] {
  if (c.length <= 2) return c;
  const keep = new Uint8Array(c.length);
  keep[0] = keep[c.length - 1] = 1;
  const stack: [number, number][] = [[0, c.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = c[a]!;
    const [bx, by] = c[b]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - c[i]![1]) - (ax - c[i]![0]) * (by - ay)) / len;
      if (d > worst) [worst, at] = [d, i];
    }
    if (at > 0 && worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return c.filter((_, i) => keep[i]);
}

/** A closed ring, split at the point farthest from its first so both halves are open chains. */
function simplifyRing(r: Pt[], tol: number): Pt[] {
  if (r.length <= 4) return r;
  const d = (p: Pt) => Math.hypot(p[0] - r[0]![0], p[1] - r[0]![1]);
  let far = 1;
  for (let i = 2; i < r.length; i++) if (d(r[i]!) > d(r[far]!)) far = i;
  const one = simplifyChain(r.slice(0, far + 1), tol);
  const two = simplifyChain([...r.slice(far), r[0]!], tol);
  const out = [...one, ...two.slice(1, -1)];
  return out.length >= 3 ? out : r;
}

function cleanRing(r: Ring): Pt[] {
  const pts = r.map(([x, y]) => [x, y] as Pt);
  const last = pts[pts.length - 1];
  if (last && pts.length > 1 && last[0] === pts[0]![0] && last[1] === pts[0]![1]) pts.pop();
  return pts;
}

/**
 * Every stroke of a glyph, inked with the nib and merged into contours.
 * Outer rings run counter-clockwise (y up), holes clockwise.
 */
export function glyphContours(glyph: Pick<Glyph, "strokes">, nib: Nib): Pt[][] {
  const polys: Polygon[] = [];
  // Snapped to a quarter unit: polygon-clipping's sweep line is fragile with
  // raw floats ("Unable to complete output ring"), and fonts store integers anyway.
  const snap = (v: number) => Math.round(v * 4) / 4;
  for (const s of glyph.strokes) for (const r of strokePolygons(s, nib)) polys.push([r.map(([x, y]) => [snap(x), snap(y)] as Pt)]);
  if (!polys.length) return [];
  const merged = unionAll(polys);
  if (!merged) return polys.map((p) => orient(cleanRing(p[0]!), true));
  const out: Pt[][] = [];
  for (const poly of merged) {
    poly.forEach((ring, i) => {
      const pts = simplifyRing(cleanRing(ring), 0.9);
      if (pts.length >= 3 && Math.abs(signedArea(pts)) > 1) out.push(orient(pts, i === 0));
    });
  }
  return out;
}

/**
 * Union everything at once; if the sweep line still trips, fold the polygons in
 * one by one, keeping any that refuse as separate rings. Null only if nothing merges.
 */
function unionAll(polys: Polygon[]): MultiPolygon | null {
  try {
    return polygonClipping.union(polys[0]!, ...polys.slice(1));
  } catch {
    let acc: MultiPolygon = [polys[0]!];
    const loose: Polygon[] = [];
    for (const p of polys.slice(1)) {
      try {
        acc = polygonClipping.union(acc, p);
      } catch {
        loose.push(p);
      }
    }
    // Loose rings stay outer rings; nonzero filling still unions them on screen and in type.
    return loose.length === polys.length - 1 ? null : [...acc, ...loose];
  }
}

function orient(r: Pt[], ccw: boolean): Pt[] {
  return signedArea(r) > 0 === ccw ? r : [...r].reverse();
}

export function contoursBounds(contours: readonly Pt[][]): Bounds | null {
  let b: Bounds | null = null;
  for (const r of contours)
    for (const [x, y] of r) {
      if (!b) b = { xMin: x, yMin: y, xMax: x, yMax: y };
      else {
        if (x < b.xMin) b.xMin = x;
        if (x > b.xMax) b.xMax = x;
        if (y < b.yMin) b.yMin = y;
        if (y > b.yMax) b.yMax = y;
      }
    }
  return b;
}

// ── contours → path ─────────────────────────────────────────────────────

/** Turning angle (radians) above which a vertex stays a corner. */
const CORNER = (52 * Math.PI) / 180;

function isCorner(prev: Pt, p: Pt, next: Pt): boolean {
  const a1 = Math.atan2(p[1] - prev[1], p[0] - prev[0]);
  const a2 = Math.atan2(next[1] - p[1], next[0] - p[0]);
  let d = Math.abs(a2 - a1);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d > CORNER;
}

/** One closed ring → M, L, Q, Z. Smooth vertices become quadratic controls through edge midpoints. */
export function ringCommands(r: readonly Pt[]): PathCmd[] {
  const n = r.length;
  if (n < 3) return [];
  const at = (i: number) => r[((i % n) + n) % n]!;
  const corner = r.map((p, i) => isCorner(at(i - 1), p, at(i + 1)));
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const k = corner.indexOf(true);
  const start: Pt = k >= 0 ? at(k) : mid(at(0), at(1));
  const first = k >= 0 ? k + 1 : 1;
  const cmds: PathCmd[] = [{ c: "M", x: start[0], y: start[1] }];
  let pos = start;
  for (let step = 0; step < n; step++) {
    const i = first + step;
    const p = at(i);
    if (corner[((i % n) + n) % n]) {
      const closing = step === n - 1 && p[0] === start[0] && p[1] === start[1];
      if (!closing && (p[0] !== pos[0] || p[1] !== pos[1])) cmds.push({ c: "L", x: p[0], y: p[1] });
      pos = p;
    } else {
      const next = at(i + 1);
      const end = corner[(((i + 1) % n) + n) % n] ? next : mid(p, next);
      cmds.push({ c: "Q", x1: p[0], y1: p[1], x: end[0], y: end[1] });
      pos = end;
    }
  }
  cmds.push({ c: "Z" });
  return cmds;
}

/** SVG path data. `flip` turns font units (y up) into screen units (y down). */
export function contoursToSvg(contours: readonly Pt[][], dx = 0, flip = true): string {
  const f = (v: number) => (Math.round(v * 10) / 10).toString();
  const y = (v: number) => f(flip ? -v : v);
  let d = "";
  for (const r of contours)
    for (const c of ringCommands(r)) {
      if (c.c === "M") d += `M${f(c.x + dx)} ${y(c.y)}`;
      else if (c.c === "L") d += `L${f(c.x + dx)} ${y(c.y)}`;
      else if (c.c === "Q") d += `Q${f(c.x1 + dx)} ${y(c.y1)} ${f(c.x + dx)} ${y(c.y)}`;
      else d += "Z";
    }
  return d;
}

// ── spacing ─────────────────────────────────────────────────────────────

export interface Placed {
  contours: Pt[][];
  /** shift that puts the ink at its left side bearing */
  dx: number;
  advance: number;
  bounds: Bounds;
}

/** Where a glyph's ink sits and how far the pen moves after it. Null for a glyph with no ink. */
export function placeGlyph(glyph: Glyph, hand: Pick<Hand, "nib" | "spacing">, contours = glyphContours(glyph, hand.nib)): Placed | null {
  const bounds = contoursBounds(contours);
  if (!bounds) return null;
  const left = glyph.left ?? hand.spacing;
  const right = glyph.right ?? hand.spacing;
  const dx = Math.round(left - bounds.xMin);
  return { contours, dx, advance: Math.max(1, Math.round(bounds.xMax - bounds.xMin + left + right)), bounds };
}
