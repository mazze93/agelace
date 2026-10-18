import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  GLYPH_SET,
  contoursBounds,
  contoursToSvg,
  glyphContours,
  placeGlyph,
  strokePolygons,
  type Glyph,
  type GlyphStroke,
  type Hand,
  type HandMetrics,
  type HandSummary,
  type HandWrite,
  type Nib,
  type NibKind,
  type Pt,
} from "@agelace/shared";
import { api, subscribe } from "../api";
import { refreshFonts, useFontFamilies } from "../fonts";
import { useUndoTarget } from "../undo";
import { Sigil } from "../Sigil";

// ── contours, cached per glyph object and nib ───────────────────────────
// Edits replace only the glyph they touch, so every other glyph keeps its
// identity and its cached outline.
const cache = new WeakMap<Glyph, Map<string, Pt[][]>>();
const nibKey = (n: Nib) => `${n.kind}:${n.size}:${n.angle}`;
function contoursOf(g: Glyph, nib: Nib): Pt[][] {
  let m = cache.get(g);
  if (!m) cache.set(g, (m = new Map()));
  const k = nibKey(nib);
  let c = m.get(k);
  if (!c) m.set(k, (c = glyphContours(g, nib)));
  return c;
}

const ringsToSvg = (rings: [number, number][][]): string =>
  rings.map((r) => r.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${(-y).toFixed(1)}`).join("") + "Z").join("");

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;
const chars = (s: string) => [...s];
const toWrite = ({ id: _id, format: _f, created: _c, updated: _u, ...w }: Hand): HandWrite => w;

const NIBS: { kind: NibKind; name: string; gloss: string }[] = [
  { kind: "broad", name: "Broad edge", gloss: "a chisel at a fixed angle" },
  { kind: "quill", name: "Quill", gloss: "swells with pressure" },
  { kind: "round", name: "Round", gloss: "one even line" },
];

// ── the list of hands ───────────────────────────────────────────────────

export function HandsList() {
  const [hands, setHands] = useState<HandSummary[] | null>(null);
  const [family, setFamily] = useState("");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => void api.hands().then(setHands), []);
  useEffect(() => {
    load();
    return subscribe((e) => (e.type === "hand" || e.type === "fonts") && load());
  }, [load]);

  const begin = async (e: FormEvent) => {
    e.preventDefault();
    if (!family.trim()) return;
    try {
      const h = await api.createHand(family.trim());
      location.hash = `#/forge/hands/${h.id}`;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="scriptorium">
      <div className="hands-intro">
        <p>
          A <em>hand</em> is a typeface you draw yourself, letter by letter, with a stylus, a finger or a mouse. Choose a nib, rule your lines, write. When
          you cast it, it becomes a real font in your world's <code>fonts</code> folder, ready for any page, board or pairing.
        </p>
        <form className="hands-new" onSubmit={(e) => void begin(e)}>
          <input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="Name a new hand…" maxLength={60} aria-label="Name of the new hand" />
          <button type="submit" disabled={!family.trim()}>
            Begin a hand
          </button>
        </form>
        {error && <p className="forge-error">{error}</p>}
      </div>
      <ul className="hands-list">
        {hands?.map((h) => (
          <li key={h.id}>
            <a href={`#/forge/hands/${h.id}`} className="hand-card">
              <Sigil name="quill" size="1.4rem" />
              <span className="hand-card-name" style={h.cast ? { fontFamily: `"${h.family.replace(/["\\]/g, "")}", var(--font-display)` } : undefined}>
                {h.family}
              </span>
              <small>
                {h.glyphs} {h.glyphs === 1 ? "letter" : "letters"} drawn · {h.cast ? `cast as ${h.cast}` : "not yet cast"}
              </small>
            </a>
          </li>
        ))}
      </ul>
      {hands && !hands.length && <p className="muted">No hands yet. Name one above to begin.</p>}
    </div>
  );
}

// ── the desk ────────────────────────────────────────────────────────────

type Save = "saved" | "wet" | "blotted";
type Cast = { state: "idle" | "busy" } | { state: "done"; file: string; glyphs: number } | { state: "error"; message: string };

export function HandDesk({ id }: { id: string }) {
  const [hand, setHand] = useState<Hand | null>(null);
  const [missing, setMissing] = useState(false);
  const [ch, setCh] = useState("a");
  const [tool, setTool] = useState<"pen" | "erase">("pen");
  const [save, setSave] = useState<Save>("saved");
  const [cast, setCast] = useState<Cast>({ state: "idle" });
  const [proof, setProof] = useState("Sphinx of black quartz, judge my vow");
  const [ghost, setGhost] = useState("");
  const [extra, setExtra] = useState("");

  const handRef = useRef<Hand | null>(null);
  handRef.current = hand;
  const past = useRef<Hand[]>([]);
  const future = useRef<Hand[]>([]);
  const last = useRef({ key: "", t: 0 });
  const dirty = useRef(false);

  useEffect(() => {
    let live = true;
    setHand(null);
    setMissing(false);
    past.current = [];
    future.current = [];
    dirty.current = false;
    api.hand(id).then(
      (h) => {
        if (!live) return;
        setHand(h);
        const drawn = Object.keys(h.glyphs);
        setCh(drawn.includes("a") || !drawn.length ? "a" : drawn[0]!);
      },
      () => live && setMissing(true),
    );
    const off = subscribe((e) => {
      if (e.type === "hand" && e.id === id && !dirty.current) void api.hand(id).then((h) => live && setHand(h));
    });
    return () => {
      live = false;
      off();
    };
  }, [id]);

  /** Every change goes through here: one history entry per gesture (coalesced by key). */
  const edit = useCallback((fn: (h: Hand) => Hand, coalesce?: string) => {
    const h = handRef.current;
    if (!h) return;
    const next = fn(h);
    if (next === h) return;
    const now = Date.now();
    if (!(coalesce && last.current.key === coalesce && now - last.current.t < 1200)) {
      past.current.push(h);
      if (past.current.length > 300) past.current.shift();
    }
    last.current = { key: coalesce ?? "", t: now };
    future.current = [];
    dirty.current = true;
    handRef.current = next;
    setHand(next);
  }, []);

  const setGlyph = useCallback(
    (c: string, fn: (g: Glyph) => Glyph, coalesce?: string) =>
      edit((h) => {
        const g = h.glyphs[c] ?? { strokes: [] };
        const n = fn(g);
        if (n === g) return h;
        const glyphs = { ...h.glyphs };
        if (!n.strokes.length && n.left === undefined && n.right === undefined) delete glyphs[c];
        else glyphs[c] = n;
        return { ...h, glyphs };
      }, coalesce),
    [edit],
  );

  const step = (from: Hand[], to: Hand[]) => {
    const prev = from.pop();
    const cur = handRef.current;
    if (!prev || !cur) return false;
    to.push(cur);
    last.current = { key: "", t: 0 };
    dirty.current = true;
    handRef.current = prev;
    setHand(prev);
    return true;
  };
  useUndoTarget({ undo: () => step(past.current, future.current), redo: () => step(future.current, past.current) });

  const flush = useCallback(async () => {
    const h = handRef.current;
    if (!h || !dirty.current) return;
    dirty.current = false;
    try {
      await api.saveHand(h.id, toWrite(h));
      setSave((s) => (dirty.current ? s : "saved"));
    } catch {
      dirty.current = true;
      setSave("blotted");
    }
  }, []);
  useEffect(() => {
    if (!hand || !dirty.current) return;
    setSave("wet");
    const t = setTimeout(() => void flush(), 700);
    return () => clearTimeout(t);
  }, [hand, flush]);
  useEffect(() => () => void flush(), [flush]);

  const palette = useMemo(() => {
    const set = new Set(chars(GLYPH_SET));
    for (const k of Object.keys(hand?.glyphs ?? {})) set.add(k);
    set.add(ch);
    return [...set];
  }, [hand?.glyphs, ch]);

  // Type a character to go to its glyph; arrows walk the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable], .ProseMirror") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = palette.indexOf(ch);
        const n = palette[(i + (e.key === "ArrowRight" ? 1 : -1) + palette.length) % palette.length];
        if (n) setCh(n);
        e.preventDefault();
      } else if (chars(e.key).length === 1 && e.key !== " ") setCh(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, ch]);

  const lazy = useDeferredValue(hand);

  if (missing) return <p className="muted">No hand by that name. It may have been put away (look in the world's .trash folder).</p>;
  if (!hand || !lazy) return <div className="hand-desk is-loading" aria-busy="true" />;

  const glyph = hand.glyphs[ch] ?? { strokes: [] };

  const doCast = async () => {
    setCast({ state: "busy" });
    await flush();
    try {
      const r = await api.castHand(id);
      await refreshFonts();
      setCast({ state: "done", file: r.file, glyphs: r.glyphs });
    } catch (err) {
      setCast({ state: "error", message: (err as Error).message });
    }
  };

  return (
    <div className="hand-desk">
      <nav className="glyph-palette" aria-label="Letters">
        {palette.map((c) => (
          <PaletteCell key={c} c={c} glyph={lazy.glyphs[c]} nib={lazy.nib} metrics={lazy.metrics} current={c === ch} onPick={setCh} />
        ))}
        <form
          className="palette-add"
          onSubmit={(e) => {
            e.preventDefault();
            const c = chars(extra.trim())[0];
            if (c) setCh(c);
            setExtra("");
          }}
        >
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="+" maxLength={4} aria-label="Add a character" title="Add any character: þ, ſ, ⁂…" />
        </form>
      </nav>

      <div className="hand-sheet-wrap">
        <div className="hand-sheet-head">
          <span className="hand-current" aria-live="polite">
            <span className="sc">Writing</span> <b>{ch}</b> <small>U+{ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}</small>
          </span>
          <div className="hand-tools" role="toolbar" aria-label="Pen">
            <button type="button" className="tool" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} title="Pen">
              <Sigil name="quill-ink" />
            </button>
            <button type="button" className="tool" aria-pressed={tool === "erase"} onClick={() => setTool("erase")} title="Eraser (or flip your stylus)">
              <Sigil name="broom" />
            </button>
            <button type="button" className="tool" onClick={() => step(past.current, future.current)} disabled={!past.current.length} title="Undo (Ctrl/⌘-Z)">
              ↶
            </button>
            <button type="button" className="tool" onClick={() => step(future.current, past.current)} disabled={!future.current.length} title="Redo">
              ↷
            </button>
            <button type="button" className="tool" onClick={() => setGlyph(ch, (g) => (g.strokes.length ? { ...g, strokes: [] } : g))} disabled={!glyph.strokes.length} title="Clear this letter">
              Clear
            </button>
          </div>
          <span className={`save save-${save}`}>{save === "wet" ? "drying…" : save === "blotted" ? "couldn't save, retrying on the next stroke" : "saved"}</span>
        </div>
        <GlyphSheet
          hand={hand}
          glyph={glyph}
          ch={ch}
          tool={tool}
          ghost={ghost}
          onStroke={(s) => setGlyph(ch, (g) => ({ ...g, strokes: [...g.strokes, s] }))}
          onErase={(p, key) =>
            setGlyph(
              ch,
              (g) => {
                const r = Math.max(26, hand.nib.size * 0.6);
                const keep = g.strokes.filter((s) => !touches(s, p, r));
                return keep.length === g.strokes.length ? g : { ...g, strokes: keep };
              },
              key,
            )
          }
        />
        <Proof hand={lazy} text={proof} onText={setProof} onPick={setCh} />
        {cast.state === "done" && (
          <p className="cast-proof" style={{ fontFamily: `"${hand.family.replace(/["\\]/g, "")}", var(--font-body)` }}>
            {proof}
          </p>
        )}
      </div>

      <aside className="hand-bench">
        <FamilyName family={hand.family} onChange={(family) => edit((h) => ({ ...h, family }), "family")} />

        <section className="bench-section">
          <h3 className="sc">Nib</h3>
          <div className="nib-kinds" role="radiogroup" aria-label="Nib">
            {NIBS.map((n) => (
              <button
                key={n.kind}
                type="button"
                role="radio"
                aria-checked={hand.nib.kind === n.kind}
                onClick={() => edit((h) => ({ ...h, nib: { ...h.nib, kind: n.kind } }))}
                title={n.gloss}
              >
                <NibSwatch nib={{ ...hand.nib, kind: n.kind }} />
                <span>{n.name}</span>
              </button>
            ))}
          </div>
          <Dial label="Width" value={hand.nib.size} min={8} max={200} onChange={(size) => edit((h) => ({ ...h, nib: { ...h.nib, size } }), "nib-size")} />
          {hand.nib.kind === "broad" && (
            <Dial label="Angle" unit="°" value={hand.nib.angle} min={-90} max={90} onChange={(angle) => edit((h) => ({ ...h, nib: { ...h.nib, angle } }), "nib-angle")} />
          )}
          <p className="bench-note">Changing the nib re-inks every letter you've drawn.</p>
        </section>

        <section className="bench-section">
          <h3 className="sc">Ruling</h3>
          {(
            [
              ["ascender", "Ascender", 500, 1100],
              ["capHeight", "Capitals", 300, 1000],
              ["xHeight", "x-height", 150, 800],
              ["descender", "Descender", -500, -50],
            ] as [keyof HandMetrics, string, number, number][]
          ).map(([k, label, min, max]) => (
            <Dial key={k} label={label} value={hand.metrics[k]} min={min} max={max} step={5} onChange={(v) => edit((h) => ({ ...h, metrics: { ...h.metrics, [k]: v } }), `metric-${k}`)} />
          ))}
        </section>

        <section className="bench-section">
          <h3 className="sc">Spacing</h3>
          <Dial label="Side bearing" value={hand.spacing} min={0} max={200} onChange={(spacing) => edit((h) => ({ ...h, spacing }), "spacing")} />
          <Dial label="Word space" value={hand.space} min={60} max={700} step={5} onChange={(space) => edit((h) => ({ ...h, space }), "space")} />
          <div className="bench-glyph">
            <span className="sc">This letter</span>
            <Dial label="Left" value={glyph.left ?? hand.spacing} min={-100} max={300} onChange={(left) => setGlyph(ch, (g) => ({ ...g, left }), `left-${ch}`)} />
            <Dial label="Right" value={glyph.right ?? hand.spacing} min={-100} max={300} onChange={(right) => setGlyph(ch, (g) => ({ ...g, right }), `right-${ch}`)} />
            {(glyph.left !== undefined || glyph.right !== undefined) && (
              <button type="button" className="pair-quiet" onClick={() => setGlyph(ch, ({ left: _l, right: _r, ...g }) => g)}>
                Use the hand's spacing
              </button>
            )}
          </div>
        </section>

        <section className="bench-section">
          <h3 className="sc">Trace over</h3>
          <GhostPicker value={ghost} onChange={setGhost} />
        </section>

        <section className="bench-section bench-cast">
          <button type="button" className="pair-primary" onClick={() => void doCast()} disabled={cast.state === "busy"}>
            <Sigil name="anvil" /> {cast.state === "busy" ? "Casting…" : "Cast the type"}
          </button>
          <p className="bench-note" aria-live="polite">
            {cast.state === "done"
              ? `Cast ${cast.glyphs} letters as world/fonts/${cast.file}. It's in your type case and every font menu now.`
              : cast.state === "error"
                ? cast.message
                : "Writes a real .otf into your world's fonts folder. Letters you haven't drawn fall back to the page's own face."}
          </p>
          <button
            type="button"
            className="quiet-danger"
            onClick={() => void api.removeHand(id).then(() => (location.hash = "#/forge/hands"))}
            title="Moves the hand's file to the world's .trash folder"
          >
            Put this hand away
          </button>
        </section>
      </aside>
    </div>
  );
}

function touches(s: GlyphStroke, [x, y]: readonly [number, number], r: number): boolean {
  for (let i = 0; i + 1 < s.pts.length; i += 3) if (Math.hypot(s.pts[i]! - x, s.pts[i + 1]! - y) <= r) return true;
  return false;
}

// ── the sheet: a ruled practice page you write on ───────────────────────

interface SheetProps {
  hand: Hand;
  glyph: Glyph;
  ch: string;
  tool: "pen" | "erase";
  ghost: string;
  onStroke: (s: GlyphStroke) => void;
  onErase: (p: readonly [number, number], key: string) => void;
}

function GlyphSheet({ hand, glyph, ch, tool, ghost, onStroke, onErase }: SheetProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [wet, setWet] = useState<GlyphStroke | null>(null);
  const gesture = useRef<{ id: number; kind: "pen" | "erase"; pts: number[]; pen: boolean; key: string } | null>(null);
  const penSeen = useRef(false);
  const { ascender: asc, descender: desc, capHeight: cap, xHeight: xh } = hand.metrics;
  const top = asc + 110;
  const bottom = desc - 90;

  const contours = contoursOf(glyph, hand.nib);
  const ink = useMemo(() => contoursToSvg(contours), [contours]);
  const placed = useMemo(() => placeGlyph(glyph, hand, contours), [glyph, hand, contours]);
  const wetPath = wet ? ringsToSvg(strokePolygons(wet, hand.nib)) : "";

  const toFont = (e: { clientX: number; clientY: number }): [number, number] | null => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [round(p.x, 1), round(-p.y, 1)];
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "pen") penSeen.current = true;
    else if (e.pointerType === "touch" && penSeen.current) return; // a palm resting while a stylus writes
    const p = toFont(e);
    if (!p) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone (or synthetic); keep drawing without capture */
    }
    const pen = e.pointerType === "pen";
    const erasing = tool === "erase" || (e.buttons & 32) !== 0; // 32: a stylus's eraser end
    gesture.current = { id: e.pointerId, kind: erasing ? "erase" : "pen", pts: [p[0], p[1], pen ? round(e.pressure || 0.5, 2) : 0.5], pen, key: `erase-${e.timeStamp}` };
    if (erasing) onErase(p, gesture.current.key);
    else setWet({ pts: gesture.current.pts.slice(), pen });
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ce of events.length ? events : [e.nativeEvent]) {
      const p = toFont(ce);
      if (!p) continue;
      if (g.kind === "erase") onErase(p, g.key);
      else g.pts.push(p[0], p[1], g.pen ? round(ce.pressure || 0.5, 2) : 0.5);
    }
    if (g.kind === "pen") setWet({ pts: g.pts.slice(), pen: g.pen });
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.kind === "pen") {
      setWet(null);
      onStroke(g.pen ? { pts: g.pts, pen: true } : { pts: g.pts });
    }
  };
  const cancel = () => {
    gesture.current = null;
    setWet(null);
  };

  const rules: [string, number, string][] = [
    ["ascender", asc, "is-faint"],
    ["capitals", cap, ""],
    ["x-height", xh, "is-x"],
    ["baseline", 0, "is-base"],
    ["descender", desc, "is-faint"],
  ];
  // Hairlines at the nib's angle: a calligrapher rules these to keep the pen honest.
  const a = (hand.nib.angle * Math.PI) / 180;
  const slants = hand.nib.kind === "broad" ? Array.from({ length: 24 }, (_, i) => -900 + i * 110) : [];

  return (
    <svg
      ref={svgRef}
      className={`hand-sheet${tool === "erase" ? " uses-eraser" : ""}`}
      viewBox={`-60 ${-top} 1120 ${top - bottom}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onLostPointerCapture={(e) => gesture.current?.id === e.pointerId && up(e)}
      role="img"
      aria-label={`Drawing sheet for ${ch}`}
    >
      <g className="sheet-slants" aria-hidden="true">
        {slants.map((x0) => (
          <line key={x0} x1={x0} y1={-desc + 90} x2={x0 + Math.cos(a) * 1600} y2={-desc + 90 - Math.sin(a) * 1600} />
        ))}
      </g>
      <g className="sheet-rules" aria-hidden="true">
        {rules.map(([name, y, cls]) => (
          <g key={name} className={cls}>
            <line x1={-60} x2={1060} y1={-y} y2={-y} />
            <text x={-52} y={-y - 8}>
              {name}
            </text>
          </g>
        ))}
      </g>
      {ghost && (
        <text className="sheet-ghost" x={500} y={0} fontSize={1000} textAnchor="middle" style={{ fontFamily: `"${ghost.replace(/["\\]/g, "")}"` }} aria-hidden="true">
          {ch}
        </text>
      )}
      {placed && (
        <g className="sheet-bearings" aria-hidden="true">
          <line x1={placed.bounds.xMin - (glyph.left ?? hand.spacing)} x2={placed.bounds.xMin - (glyph.left ?? hand.spacing)} y1={-top} y2={-bottom} />
          <line x1={placed.bounds.xMax + (glyph.right ?? hand.spacing)} x2={placed.bounds.xMax + (glyph.right ?? hand.spacing)} y1={-top} y2={-bottom} />
        </g>
      )}
      <path className="sheet-ink" d={ink} />
      {wetPath && <path className="sheet-ink is-wet" d={wetPath} />}
      {!glyph.strokes.length && !wet && (
        <text className="sheet-hint" x={500} y={-xh / 2} textAnchor="middle">
          write “{ch}” here
        </text>
      )}
    </svg>
  );
}

// ── palette, proof, controls ────────────────────────────────────────────

const PaletteCell = memo(function PaletteCell({
  c,
  glyph,
  nib,
  metrics,
  current,
  onPick,
}: {
  c: string;
  glyph: Glyph | undefined;
  nib: Nib;
  metrics: HandMetrics;
  current: boolean;
  onPick: (c: string) => void;
}) {
  const contours = glyph?.strokes.length ? contoursOf(glyph, nib) : null;
  const b = contours ? contoursBounds(contours) : null;
  const h = metrics.ascender - metrics.descender + 80;
  const w = Math.max(h * 0.8, b ? b.xMax - b.xMin + 80 : 0);
  const cx = b ? (b.xMin + b.xMax) / 2 : 0;
  return (
    <button type="button" className={`palette-cell${current ? " is-current" : ""}${contours ? " is-drawn" : ""}`} onClick={() => onPick(c)} aria-label={`Letter ${c}`} aria-current={current || undefined}>
      {contours && b ? (
        <svg viewBox={`${cx - w / 2} ${-(metrics.ascender + 40)} ${w} ${h}`} aria-hidden="true">
          <path d={contoursToSvg(contours)} />
        </svg>
      ) : (
        <span>{c}</span>
      )}
    </button>
  );
});

function Proof({ hand, text, onText, onPick }: { hand: Hand; text: string; onText: (t: string) => void; onPick: (c: string) => void }) {
  const { ascender: asc, descender: desc } = hand.metrics;
  const layout = useMemo(() => {
    let x = 0;
    const out: { c: string; x: number; d?: string; w: number }[] = [];
    for (const c of chars(text)) {
      if (c === " ") {
        x += hand.space;
        continue;
      }
      const g = hand.glyphs[c];
      const placed = g?.strokes.length ? placeGlyph(g, hand, contoursOf(g, hand.nib)) : null;
      if (placed) {
        out.push({ c, x, d: contoursToSvg(placed.contours, x + placed.dx), w: placed.advance });
        x += placed.advance;
      } else {
        out.push({ c, x, w: 420 });
        x += 420;
      }
    }
    return { glyphs: out, width: Math.max(x, 400) };
  }, [hand, text]);
  return (
    <div className="hand-proof">
      <input value={text} onChange={(e) => onText(e.target.value)} aria-label="Proof text" placeholder="Type a line to proof…" />
      <div className="hand-proof-strip">
        <svg viewBox={`-40 ${-(asc + 40)} ${layout.width + 80} ${asc - desc + 80}`} style={{ width: `${((layout.width + 80) / (asc - desc + 80)) * 5}rem` }}>
          {layout.glyphs.map((g, i) =>
            g.d ? (
              <path key={i} d={g.d} className="proof-ink" onClick={() => onPick(g.c)} />
            ) : (
              <g key={i} className="proof-missing" onClick={() => onPick(g.c)}>
                <rect x={g.x + 40} y={-hand.metrics.capHeight} width={g.w - 80} height={hand.metrics.capHeight} rx={18} />
                <text x={g.x + g.w / 2} y={-hand.metrics.capHeight / 2 + 60} textAnchor="middle">
                  {g.c}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>
    </div>
  );
}

/** A sample stroke drawn with the nib, so the choice is seen, not described. */
function NibSwatch({ nib }: { nib: Nib }) {
  const d = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      // a lazy S: down-left, across, down-right
      pts.push(220 + Math.sin(t * Math.PI * 1.6 + 0.6) * 150, 560 - t * 520, 0.25 + Math.sin(t * Math.PI) * 0.6);
    }
    return contoursToSvg(glyphContours({ strokes: [{ pts, pen: true }] }, nib));
  }, [nib]);
  return (
    <svg className="nib-swatch" viewBox="-40 -640 520 680" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Dial({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="dial">
      <span>
        {label} <output>{value}{unit}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function FamilyName({ family, onChange }: { family: string; onChange: (f: string) => void }) {
  const [v, setV] = useState(family);
  useEffect(() => setV(family), [family]);
  const commit = () => {
    const f = v.trim().slice(0, 60);
    if (f && f !== family) onChange(f);
    else setV(family);
  };
  return (
    <label className="family-name">
      <span className="sc">Family</span>
      <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), undefined)} maxLength={60} />
    </label>
  );
}

function GhostPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const families = useFontFamilies();
  return (
    <select className="ghost-pick" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Trace over a face">
      <option value="">Nothing: a clean sheet</option>
      {families.map((f) => (
        <option key={f.family} value={f.family}>
          {f.family}
        </option>
      ))}
    </select>
  );
}
