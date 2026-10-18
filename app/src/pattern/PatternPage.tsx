import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { EntryKind, KIND_SIGIL, type Status } from "@agelace/shared";
import { Sigil } from "../Sigil";
import { StatusMark } from "../status";
import { useWorld } from "../world";
import { fitView, zoomAt, type View } from "../canvas/geometry";
import { entryKey, neighbours, radiusOf, weave, type PatternFilter, type PatternNode, type Strand } from "./graph";

// ── The Pattern ─────────────────────────────────────────────────────────
// The whole world as one weave. Physics is d3-force; React renders the
// elements once per change in the *graph*, and the tick loop moves them
// directly through refs, so a settling weave never re-renders React.

type SimNode = PatternNode & SimulationNodeDatum & { r: number };
type SimLink = SimulationLinkDatum<SimNode> & { strand: Strand };

const STATUSES: { id: Status; label: string }[] = [
  { id: "canon", label: "Canon" },
  { id: "proposed", label: "Proposed" },
  { id: "question", label: "Questions" },
];
const KINDS = EntryKind.options;
const LINK_DISTANCE = { link: 120, thread: 150, holds: 170 } as const;
const STORE = "agelace-pattern";

/** Saved layout, per viewer: [x, y, pinned]. A convenience, never the truth. */
type Layout = Record<string, [number, number, 0 | 1]>;
function loadLayout(): Layout {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") as Layout;
  } catch {
    return {};
  }
}
/** Only the whole Pattern is remembered; a local weave is arranged round its subject and would scramble it. */
let localWeave = false;
function saveLayout(nodes: SimNode[]): void {
  if (localWeave) return;
  const out: Layout = loadLayout();
  for (const n of nodes) if (n.x !== undefined && n.y !== undefined) out[n.key] = [Math.round(n.x), Math.round(n.y), n.fx != null ? 1 : 0];
  try {
    localStorage.setItem(STORE, JSON.stringify(out));
  } catch {
    /* private mode */
  }
}

const reducedMotion = (): boolean => matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface PatternPageProps {
  /** entry id to centre a local weave on */
  focus: string | null;
}

export function PatternPage({ focus }: PatternPageProps) {
  const { entries, canvases, byId } = useWorld();
  const [statuses, setStatuses] = useState<Set<Status>>(() => new Set(["canon", "proposed", "question"]));
  const [kinds, setKinds] = useState<Set<EntryKind>>(() => new Set(KINDS));
  const [boards, setBoards] = useState(true);
  const [depth, setDepth] = useState(2);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pinned, setPinned] = useState(0);
  // narrow screens start with the filters folded away (the CSS ignores this on wide ones)
  const [folded, setFolded] = useState(() => matchMedia("(max-width: 860px)").matches);

  const filter: PatternFilter = useMemo(
    () => ({ statuses, kinds, boards, focus: focus ? { id: focus, depth } : undefined }),
    [statuses, kinds, boards, focus, depth],
  );
  const pattern = useMemo(() => weave(entries, canvases, filter), [entries, canvases, filter]);
  const adjacent = useMemo(() => neighbours(pattern.strands), [pattern]);

  const viewport = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, z: 1 });
  const sim = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodes = useRef<SimNode[]>([]);
  const simLinks = useRef<SimLink[]>([]);
  const nodeEls = useRef(new Map<string, HTMLElement>());
  const strandEls = useRef(new Map<string, SVGLineElement>());
  const labelEls = useRef(new Map<string, HTMLElement>());
  const fitted = useRef<string | null>(null);
  const subjectKey = useRef<string | null>(null);

  // ── drawing (imperative, per tick) ──
  const draw = useCallback(() => {
    for (const n of simNodes.current) {
      const el = nodeEls.current.get(n.key);
      if (el) el.style.transform = `translate(${n.x ?? 0}px, ${n.y ?? 0}px)`;
    }
    for (const l of simLinks.current) {
      const s = l.source as SimNode;
      const t = l.target as SimNode;
      const el = strandEls.current.get(l.strand.key);
      if (el) {
        el.setAttribute("x1", String(s.x ?? 0));
        el.setAttribute("y1", String(s.y ?? 0));
        el.setAttribute("x2", String(t.x ?? 0));
        el.setAttribute("y2", String(t.y ?? 0));
      }
      const lab = labelEls.current.get(l.strand.key);
      if (lab) lab.style.transform = `translate(${((s.x ?? 0) + (t.x ?? 0)) / 2}px, ${((s.y ?? 0) + (t.y ?? 0)) / 2}px)`;
    }
  }, []);

  const applyView = useCallback((v: View) => {
    view.current = v;
    const el = layer.current;
    if (el) {
      el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
      el.style.setProperty("--inv", String(1 / v.z));
    }
    viewport.current?.setAttribute("data-near", v.z >= 0.85 ? "true" : "false");
    viewport.current?.setAttribute("data-far", v.z < 0.45 ? "true" : "false");
    setZoom(v.z);
  }, []);

  const fit = useCallback(() => {
    const el = viewport.current;
    const ns = simNodes.current;
    if (!el || !ns.length) return;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const n of ns) {
      x0 = Math.min(x0, (n.x ?? 0) - n.r);
      y0 = Math.min(y0, (n.y ?? 0) - n.r);
      x1 = Math.max(x1, (n.x ?? 0) + n.r);
      y1 = Math.max(y1, (n.y ?? 0) + n.r + 24);
    }
    // frame the weave in the open paper beside the panel, not under it
    const panel = el.querySelector(".pattern-panel")?.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    // wide screens dock it top-left (keep clear to its right); narrow ones dock it at the foot
    const docked = panel && panel.top - box.top < box.height / 3 ? "side" : panel ? "foot" : null;
    const side = docked === "side" ? panel!.right - box.left : 0;
    const below = docked === "foot" ? box.bottom - panel!.top : 0;
    const v = fitView({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, el.clientWidth - side, el.clientHeight - below, 48);
    applyView({ ...v, x: v.x + side });
  }, [applyView]);

  // ── the simulation: created once, re-fed whenever the weave changes ──
  // (a layout effect, declared first, so it exists before the feed below runs)
  useLayoutEffect(() => {
    const s = forceSimulation<SimNode, SimLink>()
      .velocityDecay(0.42)
      .force("charge", forceManyBody<SimNode>().strength((d) => -110 - d.r * 7).distanceMax(900))
      // generous collision: room for the label that hangs beneath each seal
      .force("collide", forceCollide<SimNode>((d) => d.r + 30).iterations(2))
      .force("x", forceX<SimNode>(0).strength(0.035))
      .force("y", forceY<SimNode>(0).strength(0.035))
      .on("tick", draw)
      .on("end", () => saveLayout(simNodes.current))
      .stop();
    sim.current = s;
    return () => {
      s.stop();
      saveLayout(simNodes.current);
    };
  }, [draw]);

  useLayoutEffect(() => {
    const s = sim.current;
    if (!s) return;
    localWeave = !!focus;
    const prev = new Map(simNodes.current.map((n) => [n.key, n]));
    const saved = loadLayout();
    const fresh: SimNode[] = [];
    const nodes = pattern.nodes.map((p): SimNode => {
      const old = prev.get(p.key);
      if (old) return Object.assign(old, p, { r: radiusOf(p) });
      const n: SimNode = { ...p, r: radiusOf(p) };
      const at = saved[p.key];
      if (at) {
        n.x = at[0];
        n.y = at[1];
        if (at[2]) (n.fx = at[0]), (n.fy = at[1]);
      } else fresh.push(n);
      return n;
    });
    // newcomers start beside a placed neighbour, not in a heap at the origin
    const placed = new Map(nodes.filter((n) => n.x !== undefined).map((n) => [n.key, n]));
    for (const n of fresh) {
      const friend = [...(adjacent.get(n.key) ?? [])].map((k) => placed.get(k)).find(Boolean);
      const a = Math.random() * Math.PI * 2;
      const d = friend ? 60 : 160 + Math.random() * 220;
      n.x = (friend?.x ?? 0) + Math.cos(a) * d;
      n.y = (friend?.y ?? 0) + Math.sin(a) * d;
      placed.set(n.key, n);
    }
    // a local weave holds its subject at the centre; leaving it lets the subject go
    const was = subjectKey.current;
    subjectKey.current = focus ? entryKey(focus) : null;
    if (was && was !== subjectKey.current) {
      const n = nodes.find((x) => x.key === was);
      if (n && !saved[was]?.[2]) n.fx = n.fy = null;
    }
    if (focus) {
      for (const n of nodes) if (n.key === entryKey(focus)) (n.fx = 0), (n.fy = 0);
    }
    const byKey = new Map(nodes.map((n) => [n.key, n]));
    const links: SimLink[] = pattern.strands.map((strand) => ({ strand, source: byKey.get(strand.source)!, target: byKey.get(strand.target)! }));
    simNodes.current = nodes;
    simLinks.current = links;
    setPinned(nodes.filter((n) => n.fx != null).length);

    s.nodes(nodes);
    s.force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .distance((l) => LINK_DISTANCE[l.strand.kind] + (l.source as SimNode).r + (l.target as SimNode).r)
        .strength((l) => (l.strand.kind === "holds" ? 0.08 : l.strand.kind === "thread" ? 0.5 : 0.35)),
    );

    const firstLook = fitted.current !== (focus ?? "*");
    const unseen = fresh.length / Math.max(1, nodes.length);
    if (reducedMotion()) {
      s.alpha(firstLook || fresh.length ? 1 : 0.3);
      s.tick(300);
      draw();
      saveLayout(nodes);
    } else {
      // settle most of the way off-screen so the first frame is already a weave
      if (firstLook && unseen > 0.5) s.alpha(1).tick(160);
      s.alpha(firstLook ? Math.max(0.3, unseen) : fresh.length ? 0.35 : 0.12).restart();
      draw();
    }
    // only an actual weave counts as seen: the index may still be loading
    if (firstLook && nodes.length) {
      fitted.current = focus ?? "*";
      fit();
    }
  }, [pattern, adjacent, focus, draw, fit]);

  // ── hover / search emphasis, applied as classes ──
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? new Set(pattern.nodes.filter((n) => n.title.toLowerCase().includes(q)).map((n) => n.key)) : null;
  }, [query, pattern]);

  const light = useCallback(
    (key: string | null) => {
      const root = viewport.current;
      if (!root) return;
      root.classList.toggle("is-hot", !!key);
      const near = key ? new Set([key, ...(adjacent.get(key) ?? [])]) : null;
      for (const [k, el] of nodeEls.current) el.classList.toggle("is-lit", !!near?.has(k));
      for (const l of simLinks.current) {
        const lit = !!key && (l.strand.source === key || l.strand.target === key);
        strandEls.current.get(l.strand.key)?.classList.toggle("is-lit", lit);
        labelEls.current.get(l.strand.key)?.classList.toggle("is-lit", lit);
      }
    },
    [adjacent],
  );

  useEffect(() => {
    viewport.current?.classList.toggle("is-searching", !!hits);
    for (const [k, el] of nodeEls.current) el.classList.toggle("is-hit", !!hits?.has(k));
  }, [hits, pattern]);

  const centreOn = useCallback(
    (key: string) => {
      const n = simNodes.current.find((x) => x.key === key);
      const el = viewport.current;
      if (!n || !el) return;
      const z = Math.max(view.current.z, 1);
      applyView({ z, x: el.clientWidth / 2 - (n.x ?? 0) * z, y: el.clientHeight / 2 - (n.y ?? 0) * z });
    },
    [applyView],
  );

  // ── gestures: pan the loom, pinch, wheel; drag a seal to pin it ──
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { d: number } | null = null;
    let drag: { id: number; node: SimNode; sx: number; sy: number; moved: boolean; wasPinned: boolean } | null = null;
    let suppressClick = false;

    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const t = e.target as HTMLElement;
      if (t.closest(".pattern-panel, .pn-pin")) return;
      const seal = t.closest<HTMLElement>("[data-key]");
      if (seal && pts.size === 0) {
        const node = simNodes.current.find((n) => n.key === seal.dataset["key"]);
        if (node) {
          drag = { id: e.pointerId, node, sx: e.clientX, sy: e.clientY, moved: false, wasPinned: node.fx != null };
          try {
            seal.setPointerCapture(e.pointerId);
          } catch {
            /* released already */
          }
          return;
        }
      }
      pts.set(e.pointerId, local(e));
      el.classList.add("is-panning");
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* released already */
      }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
      }
    };
    const move = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
        if (!drag.moved) {
          drag.moved = true;
          sim.current?.alphaTarget(0.25).restart();
          light(drag.node.key);
        }
        const p = local(e);
        const v = view.current;
        drag.node.fx = (p.x - v.x) / v.z;
        drag.node.fy = (p.y - v.y) / v.z;
        return;
      }
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pts.set(e.pointerId, p);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        applyView(zoomAt(view.current, mid, d / pinch.d));
        pinch.d = d;
      } else if (pts.size === 1) {
        const v = view.current;
        applyView({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y });
      }
    };
    const up = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        if (drag.moved) {
          // a dragged seal stays where it was set down, until loosened
          sim.current?.alphaTarget(0);
          suppressClick = true;
          setPinned(simNodes.current.filter((n) => n.fx != null).length);
          saveLayout(simNodes.current);
          light(null);
        }
        drag = null;
        return;
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) el.classList.remove("is-panning");
    };
    // a drag that ends on the seal's link must not also follow it
    const click = (e: MouseEvent) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".pattern-panel")) return;
      e.preventDefault();
      const at = local(e);
      // mouse wheels and pinches zoom; two-finger trackpad scrolls pan
      const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || mouseWheel) applyView(zoomAt(view.current, at, Math.exp(-e.deltaY * (mouseWheel ? 0.0025 : 0.01))));
      else applyView({ ...view.current, x: view.current.x - e.deltaX, y: view.current.y - e.deltaY });
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [applyView, light]);

  // keyboard: Shift-1 fits, / searches
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.shiftKey && (e.key === "!" || e.code === "Digit1")) (e.preventDefault(), fit());
      else if (e.key === "/") (e.preventDefault(), document.querySelector<HTMLInputElement>(".pattern-search")?.focus());
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [fit]);

  const unpin = (key: string) => {
    const n = simNodes.current.find((x) => x.key === key);
    if (!n || (focus && key === entryKey(focus))) return;
    n.fx = n.fy = null;
    setPinned(simNodes.current.filter((x) => x.fx != null).length);
    sim.current?.alpha(0.3).restart();
  };
  const loosenAll = () => {
    for (const n of simNodes.current) if (!(focus && n.key === entryKey(focus))) n.fx = n.fy = null;
    setPinned(focus ? 1 : 0);
    sim.current?.alpha(0.6).restart();
  };
  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const subject = focus ? byId.get(focus) : undefined;
  const threads = pattern.strands.filter((s) => s.kind !== "holds").length;
  let i = 0;

  return (
    <div className="pattern" ref={viewport} data-near="true">
      <svg className="pattern-wheel" aria-hidden="true" viewBox="-500 -500 1000 1000">
        {/* the Wheel behind the weave: seven spokes, three rims — hairline, unhurried */}
        {[160, 330, 480].map((r) => (
          <circle key={r} r={r} />
        ))}
        {Array.from({ length: 7 }, (_, k) => {
          const a = (k / 7) * Math.PI * 2 - Math.PI / 2;
          return <line key={k} x1={Math.cos(a) * 40} y1={Math.sin(a) * 40} x2={Math.cos(a) * 480} y2={Math.sin(a) * 480} />;
        })}
      </svg>

      <div className="pattern-layer" ref={layer}>
        <svg className="pattern-strands" aria-hidden="true">
          {pattern.strands.map((s) => (
            <line
              key={s.key}
              ref={(el) => void (el ? strandEls.current.set(s.key, el) : strandEls.current.delete(s.key))}
              className={`strand strand-${s.kind}${s.mutual ? " is-mutual" : ""}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {pattern.strands
          .filter((s) => s.kind === "thread" && s.labels.length)
          .map((s) => (
            <span key={s.key} className="strand-label" ref={(el) => void (el ? labelEls.current.set(s.key, el) : labelEls.current.delete(s.key))}>
              <span>{s.labels.join(" · ")}</span>
            </span>
          ))}
        {pattern.nodes.map((n) => {
          const r = radiusOf(n);
          const hub = n.kind === "age" || n.degree >= 4 || n.type === "board";
          const isPinned = simNodes.current.find((x) => x.key === n.key)?.fx != null;
          return (
            <div
              key={n.key}
              data-key={n.key}
              ref={(el) => void (el ? nodeEls.current.set(n.key, el) : nodeEls.current.delete(n.key))}
              className={`pn pn-${n.type}${n.status ? ` st-${n.status}` : ""}${n.kind ? ` kind-${n.kind}` : ""}${hub ? " is-hub" : ""}${
                focus && n.key === entryKey(focus) ? " is-subject" : ""
              }`}
              style={{ "--r": `${r}px`, "--i": Math.min(i++, 50) } as CSSProperties}
              onPointerEnter={() => light(n.key)}
              onPointerLeave={() => light(null)}
            >
              <a
                className="pn-link"
                href={n.type === "board" ? `#/c/${n.ref}` : `#/e/${n.ref}`}
                draggable={false}
                aria-label={`${n.title}${n.status ? ` (${n.status})` : n.type === "board" ? " (board)" : ""}`}
                onFocus={() => light(n.key)}
                onBlur={() => light(null)}
              >
                <span className="pn-seal">
                  <Sigil name={n.sigil} />
                </span>
                <span className="pn-label">{n.title}</span>
              </a>
              {isPinned && !(focus && n.key === entryKey(focus)) && (
                <button type="button" className="pn-pin" title="Loosen this pin" aria-label={`Loosen ${n.title}`} onClick={() => unpin(n.key)}>
                  <Sigil name="pin" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <aside className={`pattern-panel${folded ? " is-folded" : ""}`} aria-label="The Pattern — what to show">
        <header>
          <button type="button" className="tool tool-word pattern-fold" aria-expanded={!folded} onClick={() => setFolded(!folded)}>
            {folded ? "Filters" : "Fold"}
          </button>
          <p className="pattern-kicker">{subject ? "The weave about" : "The whole of"}</p>
          <h1>{subject ? subject.title : "The Pattern"}</h1>
          <p className="pattern-count">
            {pattern.nodes.length} {pattern.nodes.length === 1 ? "seal" : "seals"} · {threads} {threads === 1 ? "strand" : "strands"}
          </p>
        </header>

        <input
          className="pattern-search"
          type="search"
          placeholder="Find in the weave  ( / )"
          aria-label="Find in the weave"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            const first = hits && [...hits][0];
            if (e.key === "Enter" && first) centreOn(first);
          }}
        />

        {focus && (
          <div className="pattern-depth" role="group" aria-label="How far to follow the strands">
            <span>Strands deep</span>
            {[1, 2, 3].map((d) => (
              <button key={d} type="button" aria-pressed={depth === d} onClick={() => setDepth(d)}>
                {d}
              </button>
            ))}
          </div>
        )}

        <div className="pattern-chips" role="group" aria-label="Status">
          {STATUSES.map((s) => (
            <button key={s.id} type="button" aria-pressed={statuses.has(s.id)} onClick={() => setStatuses(toggle(statuses, s.id))}>
              <StatusMark status={s.id} /> {s.label}
            </button>
          ))}
        </div>
        <div className="pattern-chips" role="group" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kinds.has(k)} onClick={() => setKinds(toggle(kinds, k))} title={k}>
              <Sigil name={KIND_SIGIL[k]} /> {k}
            </button>
          ))}
          <button type="button" aria-pressed={boards} onClick={() => setBoards(!boards)}>
            <Sigil name="treasure-map" /> boards
          </button>
        </div>

        <dl className="pattern-key">
          <div>
            <dt>
              <svg viewBox="0 0 28 6" aria-hidden="true">
                <line className="strand strand-link" x1="0" y1="3" x2="28" y2="3" />
              </svg>
            </dt>
            <dd>named in the text</dd>
          </div>
          <div>
            <dt>
              <svg viewBox="0 0 28 6" aria-hidden="true">
                <line className="strand strand-thread" x1="0" y1="3" x2="28" y2="3" />
              </svg>
            </dt>
            <dd>a thread on a board</dd>
          </div>
          <div>
            <dt>
              <svg viewBox="0 0 28 6" aria-hidden="true">
                <line className="strand strand-holds" x1="0" y1="3" x2="28" y2="3" />
              </svg>
            </dt>
            <dd>laid on a board</dd>
          </div>
        </dl>

        <footer>
          <button type="button" className="tool tool-word" onClick={fit} title="Fit the weave (Shift-1)">
            {Math.round(zoom * 100)}% · fit
          </button>
          <button type="button" className="tool tool-word" onClick={loosenAll} disabled={pinned <= (focus ? 1 : 0)} title="Let every pinned seal drift free">
            Loosen pins
          </button>
          {focus && (
            <a className="tool tool-word" href="#/pattern">
              Whole pattern
            </a>
          )}
        </footer>
        <p className="pattern-hint">Drag a seal to pin it · click to open · scroll or pinch to travel</p>
      </aside>

      {!pattern.nodes.length && (
        <p className="pattern-empty">
          {entries.length ? "Nothing in the weave matches. Loosen the filters." : "The weave is empty. Name something, and link it with [[double brackets]]."}
        </p>
      )}
    </div>
  );
}
