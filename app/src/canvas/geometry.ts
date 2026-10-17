import { getStroke } from "perfect-freehand";
import type { NodeSnap, StrokeSnap } from "./model";

export interface View {
  x: number;
  y: number;
  z: number;
}
export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_ZOOM = 0.08;
export const MAX_ZOOM = 4;
export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/** screen = world · z + (x, y) */
export const toWorld = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) / v.z, y: (p.y - v.y) / v.z });

/** Zoom by `factor` keeping the world point under `at` (screen) fixed. */
export function zoomAt(v: View, at: Pt, factor: number): View {
  const z = clampZoom(v.z * factor);
  const k = z / v.z;
  return { z, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k };
}

/** Level of detail for semantic zoom: prose folds into sigils as you pull back. */
export type Lod = "full" | "mid" | "far";
export const lodFor = (z: number): Lod => (z >= 0.55 ? "full" : z >= 0.26 ? "mid" : "far");

export function boundsOf(nodes: NodeSnap[], ink: StrokeSnap[]): Rect | null {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const n of nodes) {
    x0 = Math.min(x0, n.x);
    y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x + n.w);
    y1 = Math.max(y1, n.y + n.h);
  }
  for (const s of ink) {
    for (let i = 0; i < s.points.length; i += 3) {
      x0 = Math.min(x0, s.points[i]!);
      y0 = Math.min(y0, s.points[i + 1]!);
      x1 = Math.max(x1, s.points[i]!);
      y1 = Math.max(y1, s.points[i + 1]!);
    }
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

export function fitView(b: Rect, screenW: number, screenH: number, pad = 80): View {
  const z = clampZoom(Math.min((screenW - pad * 2) / Math.max(b.w, 1), (screenH - pad * 2) / Math.max(b.h, 1), 1.2));
  return { z, x: screenW / 2 - (b.x + b.w / 2) * z, y: screenH / 2 - (b.y + b.h / 2) * z };
}

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;

export const normRect = (a: Pt, b: Pt): Rect => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
});

/** Where a line from a rect's centre toward `toward` leaves the rect. */
export function borderPoint(r: Rect, toward: Pt): Pt {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const sx = r.w / 2 / Math.abs(dx || 1e-9);
  const sy = r.h / 2 / Math.abs(dy || 1e-9);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** A gentle curve between two cards, bowing perpendicular to the chord. */
export function edgePath(a: Rect, b: Rect): { d: string; mid: Pt; end: Pt; angle: number } {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const p0 = borderPoint(a, cb);
  const p1 = borderPoint(b, ca);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.min(60, len * 0.12);
  const c = { x: (p0.x + p1.x) / 2 - (dy / len) * bow, y: (p0.y + p1.y) / 2 + (dx / len) * bow };
  const mid = { x: 0.25 * p0.x + 0.5 * c.x + 0.25 * p1.x, y: 0.25 * p0.y + 0.5 * c.y + 0.25 * p1.y };
  const angle = Math.atan2(p1.y - c.y, p1.x - c.x);
  return { d: `M${p0.x},${p0.y} Q${c.x},${c.y} ${p1.x},${p1.y}`, mid, end: p1, angle };
}

// ── ink ────────────────────────────────────────────────────────────────

const strokeCache = new Map<string, string>();

/** perfect-freehand outline → SVG path. Real pen pressure when we have it. */
export function strokePath(points: number[], size: number, pressured: boolean, cacheKey?: string): string {
  if (cacheKey) {
    const hit = strokeCache.get(cacheKey);
    if (hit) return hit;
  }
  const input: [number, number, number][] = [];
  for (let i = 0; i + 2 < points.length; i += 3) input.push([points[i]!, points[i + 1]!, points[i + 2]!]);
  const outline = getStroke(input, {
    size,
    thinning: 0.62,
    smoothing: 0.55,
    streamline: 0.42,
    simulatePressure: !pressured,
    start: { taper: size * 1.5, cap: true },
    end: { taper: size * 2, cap: true },
  });
  const d = outlineToPath(outline);
  if (cacheKey) {
    if (strokeCache.size > 4000) strokeCache.clear();
    strokeCache.set(cacheKey, d);
  }
  return d;
}

function outlineToPath(pts: number[][]): string {
  if (pts.length < 2) return "";
  const avg = (a: number, b: number) => (a + b) / 2;
  let d = `M${pts[0]![0]!.toFixed(1)},${pts[0]![1]!.toFixed(1)} Q`;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    d += `${x0!.toFixed(1)},${y0!.toFixed(1)} ${avg(x0!, x1!).toFixed(1)},${avg(y0!, y1!).toFixed(1)} `;
  }
  return d + "Z";
}

/** Does a stroke pass within `r` world units of p? Segment distance, so fast strokes with sparse samples still hit. */
export function strokeHit(s: StrokeSnap, p: Pt, r: number): boolean {
  const rr = (r + s.size / 2) ** 2;
  const pts = s.points;
  if (pts.length >= 2 && pts.length < 6) return (pts[0]! - p.x) ** 2 + (pts[1]! - p.y) ** 2 <= rr;
  for (let i = 0; i + 5 < pts.length; i += 3) {
    const ax = pts[i]!,
      ay = pts[i + 1]!,
      bx = pts[i + 3]!,
      by = pts[i + 4]!;
    const dx = bx - ax,
      dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2)) : 0;
    if ((ax + t * dx - p.x) ** 2 + (ay + t * dy - p.y) ** 2 <= rr) return true;
  }
  return false;
}

/** Strokes recorded with a real pen carry varying pressure; mouse/touch don't. */
export const hasPressure = (points: number[]): boolean => {
  for (let i = 2; i < points.length; i += 3) if (points[i] !== 0.5) return true;
  return false;
};
