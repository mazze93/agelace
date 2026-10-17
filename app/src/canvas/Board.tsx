import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as Y from "yjs";
import { api } from "../api";
import { useUndoTarget } from "../undo";
import { EntryCard, ImageCard, RegionCard, SketchCard, type CardProps } from "./cards";
import {
  boundsOf,
  contains,
  edgePath,
  fitView,
  hasPressure,
  intersects,
  lodFor,
  normRect,
  strokeHit,
  strokePath,
  toWorld,
  zoomAt,
  type Pt,
  type Rect,
  type View,
} from "./geometry";
import { MermaidCard } from "./MermaidCard";
import {
  LOCAL,
  addEdge,
  addNode,
  addStroke,
  edgesOf,
  inkOf,
  metaOf,
  nodesOf,
  removeNodes,
  setNode,
  snapshot,
  topZ,
  transact,
  type NewNode,
  type NodeSnap,
  type Snapshot,
} from "./model";
import { CanvasToolbar, type Tool } from "./CanvasToolbar";
import type { SyncState } from "./sync";
import { TextCard } from "./TextCard";

const Sketchbook = lazy(() => import("./Sketchbook"));

export interface BoardProps {
  doc: Y.Doc;
  canvasId: string;
  saveState: SyncState;
}

type Gesture =
  | { kind: "pan"; start: Pt; view: View }
  | { kind: "pinch"; ids: [number, number]; dist: number; mid: Pt; view: View }
  | { kind: "marquee"; start: Pt; now: Pt; additive: boolean }
  | { kind: "move"; start: Pt; origin: Map<string, Pt>; moved: boolean }
  | { kind: "resize"; id: string; start: Pt; box: Rect }
  | { kind: "connect"; from: string; now: Pt }
  | { kind: "ink"; points: number[]; pressured: boolean }
  | { kind: "erase" };

const CARD: Record<NewNode["type"], { w: number; h: number }> = {
  entry: { w: 260, h: 170 },
  text: { w: 320, h: 200 },
  mermaid: { w: 520, h: 300 },
  image: { w: 420, h: 300 },
  sketch: { w: 360, h: 260 },
  region: { w: 900, h: 560 },
};

const CARDS: Record<NodeSnap["type"], (p: CardProps) => React.ReactNode> = {
  entry: EntryCard,
  text: TextCard,
  mermaid: MermaidCard,
  image: ImageCard,
  sketch: SketchCard,
  region: RegionCard,
};

const viewKey = (id: string) => `agelace-view-${id}`;
function savedView(id: string): View | null {
  try {
    const v = JSON.parse(localStorage.getItem(viewKey(id)) ?? "null") as View | null;
    return v && [v.x, v.y, v.z].every(Number.isFinite) ? v : null;
  } catch {
    return null;
  }
}

export function Board({ doc, canvasId, saveState }: BoardProps) {
  const [snap, setSnap] = useState<Snapshot>(() => snapshot(doc));
  const [view, setView] = useState<View>(() => savedView(canvasId) ?? { x: 80, y: 80, z: 1 });
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edgeSel, setEdgeSel] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [edgeEditing, setEdgeEditing] = useState<string | null>(null);
  const [sketching, setSketching] = useState<string | null>(null);
  const [ink, setInk] = useState({ color: "var(--ink-lampblack)", size: 6 });
  const [live, setLive] = useState<Gesture | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const space = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const snapRef = useRef(snap);
  snapRef.current = snap;

  // ── doc → React ────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setSnap(snapshot(doc)));
    };
    const maps = [nodesOf(doc), edgesOf(doc), inkOf(doc), metaOf(doc)];
    maps.forEach((m) => m.observeDeep(on));
    return () => {
      cancelAnimationFrame(raf);
      maps.forEach((m) => m.unobserveDeep(on));
    };
  }, [doc]);

  // First visit: frame whatever is on the board.
  const framed = useRef(savedView(canvasId) !== null);
  useLayoutEffect(() => {
    if (framed.current || !surface.current) return;
    framed.current = true;
    const b = boundsOf(snap.nodes, snap.ink);
    const r = surface.current.getBoundingClientRect();
    if (b) setView(fitView(b, r.width, r.height));
  }, [snap]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(viewKey(canvasId), JSON.stringify(view));
      } catch {
        /* private mode — the board still works, it just won't remember the view */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [view, canvasId]);

  // ── undo (Yjs) ─────────────────────────────────────────────────────
  const um = useMemo(
    () => new Y.UndoManager([nodesOf(doc), edgesOf(doc), inkOf(doc)], { trackedOrigins: new Set([LOCAL]), captureTimeout: 400 }),
    [doc],
  );
  useEffect(() => () => um.destroy(), [um]);
  useUndoTarget({ undo: () => um.undo() !== null, redo: () => um.redo() !== null });

  // ── helpers ────────────────────────────────────────────────────────
  const screenPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = surface.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const worldPt = (e: { clientX: number; clientY: number }): Pt => toWorld(viewRef.current, screenPt(e));
  const nodeById = useMemo(() => new Map(snap.nodes.map((n) => [n.id, n])), [snap.nodes]);

  const centre = (): Pt => {
    const r = surface.current?.getBoundingClientRect();
    return toWorld(viewRef.current, { x: (r?.width ?? 800) / 2, y: (r?.height ?? 600) / 2 });
  };

  const place = useCallback(
    (n: Omit<NewNode, "x" | "y" | "w" | "h"> & Partial<Pick<NewNode, "x" | "y" | "w" | "h">>, at?: Pt): string => {
      const size = CARD[n.type];
      const w = n.w ?? size.w;
      const h = n.h ?? size.h;
      const p = at ?? centre();
      let id = "";
      um.stopCapturing();
      transact(doc, () => (id = addNode(doc, { ...n, w, h, x: p.x - w / 2, y: p.y - h / 2 })));
      setSelected(new Set([id]));
      setEdgeSel(null);
      return id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, um],
  );

  const removeSelection = () => {
    um.stopCapturing();
    transact(doc, () => {
      if (selected.size) removeNodes(doc, selected);
      if (edgeSel) edgesOf(doc).delete(edgeSel);
    });
    setSelected(new Set());
    setEdgeSel(null);
  };

  const fit = () => {
    const b = boundsOf(snapRef.current.nodes, snapRef.current.ink);
    const r = surface.current?.getBoundingClientRect();
    if (b && r) setView(fitView(b, r.width, r.height));
  };

  const zoomBy = (f: number) => {
    const r = surface.current?.getBoundingClientRect();
    if (r) setView((v) => zoomAt(v, { x: r.width / 2, y: r.height / 2 }, f));
  };

  // ── pointer gestures ───────────────────────────────────────────────
  const begin = (g: Gesture, e: React.PointerEvent) => {
    gesture.current = g;
    setLive(g);
    try {
      surface.current?.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already released (fast pen taps do this) — the gesture still ends on pointerup.
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Typing inside an open card: the editor owns the pointer.
    if (editing && target.closest(`[data-node="${editing}"] .card-body`)) return;
    if (target.closest(".edge-label-input")) return;
    if (editing) setEditing(null);
    if (edgeEditing) setEdgeEditing(null);

    pointers.current.set(e.pointerId, screenPt(e));
    const touches = [...pointers.current.entries()];
    if (e.pointerType === "touch" && touches.length === 2) {
      const [[ia, a], [ib, b]] = touches as [[number, Pt], [number, Pt]];
      return begin(
        { kind: "pinch", ids: [ia, ib], dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: viewRef.current },
        e,
      );
    }

    const p = worldPt(e);
    const pen = e.pointerType === "pen";
    const penEraser = pen && (e.buttons & 32) !== 0;
    const handle = target.closest<HTMLElement>("[data-handle]");
    const nodeEl = target.closest<HTMLElement>("[data-node]");
    const edgeEl = target.closest<HTMLElement>("[data-edge]");

    if (e.button === 1 || space.current || tool === "hand") return begin({ kind: "pan", start: screenPt(e), view: viewRef.current }, e);

    if (tool === "erase" || penEraser) {
      um.stopCapturing();
      eraseAt(p);
      return begin({ kind: "erase" }, e);
    }

    // The pencil draws wherever it lands on bare paper; fingers and mice select.
    if (tool === "pen" || (pen && !nodeEl && !handle && !edgeEl)) {
      return begin({ kind: "ink", points: [p.x, p.y, pen ? e.pressure || 0.5 : 0.5], pressured: pen }, e);
    }

    if (handle && nodeEl) {
      const id = nodeEl.dataset["node"]!;
      const n = nodeById.get(id);
      if (!n) return;
      um.stopCapturing();
      if (handle.dataset["handle"] === "resize") return begin({ kind: "resize", id, start: p, box: { x: n.x, y: n.y, w: n.w, h: n.h } }, e);
      return begin({ kind: "connect", from: id, now: p }, e);
    }

    if (nodeEl) {
      const id = nodeEl.dataset["node"]!;
      let sel = selected;
      if (e.shiftKey) {
        sel = new Set(selected);
        if (sel.has(id)) sel.delete(id);
        else sel.add(id);
      } else if (!selected.has(id)) sel = new Set([id]);
      setSelected(sel);
      setEdgeSel(null);
      // Moving a region carries everything inside it.
      const moving = new Set(sel);
      for (const sid of sel) {
        const r = nodeById.get(sid);
        if (r?.type !== "region") continue;
        for (const n of snap.nodes) if (n.id !== sid && contains(r, n)) moving.add(n.id);
      }
      const origin = new Map<string, Pt>();
      for (const mid of moving) {
        const n = nodeById.get(mid);
        if (n) origin.set(mid, { x: n.x, y: n.y });
      }
      um.stopCapturing();
      return begin({ kind: "move", start: p, origin, moved: false }, e);
    }

    if (edgeEl) {
      setEdgeSel(edgeEl.dataset["edge"]!);
      setSelected(new Set());
      return;
    }

    // Bare paper.
    if (e.pointerType === "touch") return begin({ kind: "pan", start: screenPt(e), view: viewRef.current }, e);
    if (!e.shiftKey) setSelected(new Set());
    setEdgeSel(null);
    begin({ kind: "marquee", start: p, now: p, additive: e.shiftKey }, e);
  };

  const eraseAt = (p: Pt) => {
    const r = 8 / viewRef.current.z;
    const hits = snapRef.current.ink.filter((s) => strokeHit(s, p, r));
    if (hits.length) transact(doc, () => hits.forEach((s) => inkOf(doc).delete(s.id)));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, screenPt(e));
    const g = gesture.current;
    if (!g) return;
    const p = worldPt(e);
    switch (g.kind) {
      case "pan": {
        const s = screenPt(e);
        setView({ ...g.view, x: g.view.x + s.x - g.start.x, y: g.view.y + s.y - g.start.y });
        break;
      }
      case "pinch": {
        const a = pointers.current.get(g.ids[0]);
        const b = pointers.current.get(g.ids[1]);
        if (!a || !b) break;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const panned = { ...g.view, x: g.view.x + mid.x - g.mid.x, y: g.view.y + mid.y - g.mid.y };
        setView(zoomAt(panned, mid, Math.hypot(a.x - b.x, a.y - b.y) / g.dist));
        break;
      }
      case "marquee":
        g.now = p;
        setLive({ ...g });
        break;
      case "move": {
        const dx = p.x - g.start.x;
        const dy = p.y - g.start.y;
        if (!g.moved && Math.hypot(dx, dy) * viewRef.current.z < 3) break;
        g.moved = true;
        transact(doc, () => g.origin.forEach((o, id) => setNode(doc, id, { x: o.x + dx, y: o.y + dy })));
        break;
      }
      case "resize": {
        const min = nodeById.get(g.id)?.type === "region" ? 200 : 120;
        transact(doc, () =>
          setNode(doc, g.id, { w: Math.max(min, g.box.w + p.x - g.start.x), h: Math.max(80, g.box.h + p.y - g.start.y) }),
        );
        break;
      }
      case "connect":
        g.now = p;
        setLive({ ...g });
        break;
      case "ink": {
        // Coalesced events: every sample the pen reported, not one per frame.
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
        for (const ce of events.length ? events : [e.nativeEvent]) {
          const q = worldPt(ce);
          g.points.push(q.x, q.y, g.pressured ? ce.pressure || 0.5 : 0.5);
        }
        setLive({ ...g });
        break;
      }
      case "erase":
        eraseAt(p);
        break;
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size === 1) {
      // One finger lifted: carry on panning with the other, no jump.
      const [[, rest]] = [...pointers.current.entries()] as [[number, Pt]];
      gesture.current = { kind: "pan", start: rest, view: viewRef.current };
      return;
    }
    gesture.current = null;
    setLive(null);
    switch (g.kind) {
      case "marquee": {
        const box = normRect(g.start, g.now);
        if (box.w * viewRef.current.z < 4 && box.h * viewRef.current.z < 4) break;
        const next = new Set(g.additive ? selected : []);
        for (const n of snap.nodes) if (n.type !== "region" ? intersects(box, n) : contains(box, n)) next.add(n.id);
        setSelected(next);
        break;
      }
      case "ink":
        if (g.points.length >= 6) {
          um.stopCapturing();
          transact(doc, () => addStroke(doc, g.points, ink.color, ink.size));
        }
        break;
      case "connect": {
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-node]");
        const to = el?.dataset["node"];
        if (to && to !== g.from) transact(doc, () => addEdge(doc, g.from, to));
        break;
      }
      case "move":
        if (g.moved) transact(doc, () => g.origin.forEach((_o, id) => nodesOf(doc).get(id)?.set("z", topZ(doc) + 1)));
        break;
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest<HTMLElement>("[data-node]");
    const edgeEl = target.closest<HTMLElement>("[data-edge]");
    if (edgeEl) return setEdgeEditing(edgeEl.dataset["edge"]!);
    if (!nodeEl) {
      if (tool !== "select") return;
      const id = place({ type: "text" }, worldPt(e));
      return setEditing(id);
    }
    const n = nodeById.get(nodeEl.dataset["node"]!);
    if (!n) return;
    if (n.type === "entry" && n.entryId) location.hash = `#/e/${n.entryId}`;
    else if (n.type === "sketch") setSketching(n.id);
    else if (n.type !== "image") setEditing(n.id);
  };

  // Wheel: two-finger scroll pans, pinch (ctrl+wheel) zooms at the cursor.
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      const t = e.target as HTMLElement;
      if (editing && t.closest(`[data-node="${editing}"] .card-body`)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const at = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) setView((v) => zoomAt(v, at, Math.exp(-e.deltaY * 0.01)));
      else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [editing]);

  // Keyboard: only when not typing somewhere.
  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.key === " " && !typing(e.target)) {
        space.current = true;
        surface.current?.classList.add("is-panning");
        if (e.target === document.body) e.preventDefault();
      }
      if (typing(e.target) || sketching) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected.size || edgeSel) {
          e.preventDefault();
          removeSelection();
        }
      } else if (e.key === "Escape") {
        setSelected(new Set());
        setEdgeSel(null);
        setEditing(null);
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(new Set(snapRef.current.nodes.map((n) => n.id)));
      } else if (!mod && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "v") setTool("select");
        else if (k === "h") setTool("hand");
        else if (k === "p") setTool("pen");
        else if (k === "e") setTool("erase");
        else if (e.key === "!" || (e.shiftKey && k === "1")) fit();
        else if (k === "=" || k === "+") zoomBy(1.2);
        else if (k === "-") zoomBy(1 / 1.2);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") {
        space.current = false;
        surface.current?.classList.remove("is-panning");
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  // ── drop: entries from the index, images from the desktop ──────────
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const at = worldPt(e);
    const entryId = e.dataTransfer.getData("application/x-agelace-entry");
    if (entryId) return void place({ type: "entry", entryId }, at);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    let offset = 0;
    for (const f of files) {
      const { url } = await api.uploadAsset(f);
      const dims = await imageSize(url);
      const s = Math.min(1, 520 / Math.max(dims.w, dims.h));
      place({ type: "image", src: url, label: f.name, w: dims.w * s, h: dims.h * s }, { x: at.x + offset, y: at.y + offset });
      offset += 40;
    }
  };

  // ── render ─────────────────────────────────────────────────────────
  const lod = lodFor(view.z);
  const g = live;
  const dark = document.documentElement.dataset["theme"] === "dark" ||
    (!document.documentElement.dataset["theme"] && matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="board">
      <CanvasToolbar
        tool={tool}
        setTool={setTool}
        ink={ink}
        setInk={setInk}
        zoom={view.z}
        onZoom={zoomBy}
        onFit={fit}
        saveState={saveState}
        name={snap.name}
        place={(n) => {
          const id = place(n);
          if (n.type === "text" || n.type === "mermaid" || n.type === "region") setEditing(id);
          if (n.type === "sketch") setSketching(id);
        }}
        onImage={async (f) => {
          const { url } = await api.uploadAsset(f);
          const dims = await imageSize(url);
          const s = Math.min(1, 520 / Math.max(dims.w, dims.h));
          place({ type: "image", src: url, label: f.name, w: dims.w * s, h: dims.h * s });
        }}
        canDelete={selected.size > 0 || edgeSel !== null}
        onDelete={removeSelection}
        undo={() => um.undo()}
        redo={() => um.redo()}
      />
      <div
        ref={surface}
        className={`surface uses-${tool} lod-${lod}`}
        style={{ "--z": view.z, "--inv": 1 / view.z, "--gx": `${view.x}px`, "--gy": `${view.y}px`, "--gs": `${gridStep(view.z)}px` } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => void onDrop(e)}
        tabIndex={-1}
        aria-label="Board"
      >
        <div className="plane" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {snap.nodes.map((n) => {
            const Card = CARDS[n.type];
            const isSel = selected.has(n.id);
            return (
              <div
                key={n.id}
                data-node={n.id}
                className={`card is-${n.type}${isSel ? " is-selected" : ""}${editing === n.id ? " is-editing" : ""}`}
                style={{ transform: `translate(${n.x}px, ${n.y}px)`, width: n.w, height: n.h }}
              >
                <div className="card-body">
                  <Card node={n} doc={doc} lod={lod} editing={editing === n.id} onDone={() => setEditing(null)} />
                </div>
                {isSel && selected.size === 1 && (
                  <>
                    <span className="handle handle-resize" data-handle="resize" title="Resize" />
                    {n.type !== "region" && <span className="handle handle-connect" data-handle="connect" title="Drag to another card to tie a thread" />}
                  </>
                )}
              </div>
            );
          })}

          <svg className="threads" aria-hidden="true">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,1 L9,5 L0,9 z" fill="var(--thread)" />
              </marker>
            </defs>
            {snap.edges.map((ed) => {
              const a = nodeById.get(ed.from);
              const b = nodeById.get(ed.to);
              if (!a || !b) return null;
              const { d, mid } = edgePath(a, b);
              return (
                <g key={ed.id} data-edge={ed.id} className={edgeSel === ed.id ? "is-selected" : ""}>
                  <path d={d} className="thread-hit" />
                  <path d={d} className="thread" markerEnd="url(#arrow)" />
                  {ed.label && edgeEditing !== ed.id && (
                    <text x={mid.x} y={mid.y} className="thread-label">
                      {ed.label}
                    </text>
                  )}
                </g>
              );
            })}
            {g?.kind === "connect" && nodeById.get(g.from) && (
              <path
                className="thread is-drafting"
                d={(() => {
                  const a = nodeById.get(g.from)!;
                  return edgePath(a, { x: g.now.x, y: g.now.y, w: 0, h: 0 }).d;
                })()}
              />
            )}
            {snap.ink.map((s) => (
              <path key={s.id} d={strokePath(s.points, s.size, hasPressure(s.points), `${s.id}:${s.size}`)} fill={s.color} className="stroke" />
            ))}
            {g?.kind === "ink" && <path d={strokePath(g.points, ink.size, g.pressured)} fill={ink.color} className="stroke is-wet" />}
            {g?.kind === "marquee" && (
              <rect className="marquee" {...(({ x, y, w, h }) => ({ x, y, width: w, height: h }))(normRect(g.start, g.now))} />
            )}
          </svg>

          {edgeEditing && <EdgeLabelEditor doc={doc} id={edgeEditing} nodeById={nodeById} onDone={() => setEdgeEditing(null)} />}
        </div>

        {!snap.nodes.length && !snap.ink.length && (
          <div className="board-empty" aria-hidden="true">
            <p>An empty board.</p>
            <p className="muted">Double-click to write. Drag entries in from the index. Draw with a pen. Drop a map.</p>
          </div>
        )}
      </div>

      {sketching && (
        <Suspense fallback={<div className="sketchbook is-loading">Opening the sketchbook…</div>}>
          <Sketchbook doc={doc} nodeId={sketching} dark={dark} onClose={() => setSketching(null)} />
        </Suspense>
      )}
    </div>
  );
}

function EdgeLabelEditor({ doc, id, nodeById, onDone }: { doc: Y.Doc; id: string; nodeById: Map<string, NodeSnap>; onDone: () => void }) {
  const m = edgesOf(doc).get(id);
  const [draft, setDraft] = useState(String(m?.get("label") ?? ""));
  const a = nodeById.get(String(m?.get("from")));
  const b = nodeById.get(String(m?.get("to")));
  if (!m || !a || !b) return null;
  const { mid } = edgePath(a, b);
  const commit = () => {
    transact(doc, () => m.set("label", draft.trim()));
    onDone();
  };
  return (
    <input
      className="edge-label-input"
      style={{ left: mid.x, top: mid.y }}
      value={draft}
      autoFocus
      placeholder="what binds them?"
      aria-label="Thread label"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone();
      }}
    />
  );
}

/** Grid spacing on screen: 48 world units, doubled as you pull back so dots never crowd below 18px. */
function gridStep(z: number): number {
  let step = 48 * z;
  while (step < 18) step *= 2;
  return step;
}

function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = url;
  });
}
