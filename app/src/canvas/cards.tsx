import { useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { Sigil } from "../Sigil";
import { StatusMark } from "../status";
import { useWorld } from "../world";
import type { Lod } from "./geometry";
import { setNode, transact, type NodeSnap } from "./model";

export interface CardProps {
  node: NodeSnap;
  doc: Y.Doc;
  lod: Lod;
  editing: boolean;
  onDone: () => void;
}

/** A card that points at an entry — never a copy. Edit the entry, every board updates. */
export function EntryCard({ node, lod }: CardProps) {
  const { byId } = useWorld();
  const e = node.entryId ? byId.get(node.entryId) : undefined;
  if (!e) {
    return (
      <div className="card-entry is-torn">
        <p>This page was torn out.</p>
      </div>
    );
  }
  return (
    <div className={`card-entry kind-${e.kind}`}>
      <div className="card-entry-head">
        <Sigil name={e.sigil} className="card-sigil" />
        <span className="card-kind">{e.kind}</span>
        <StatusMark status={e.status} />
      </div>
      <h3 className="card-title">{e.title}</h3>
      {lod === "full" && e.excerpt && <p className="card-excerpt">{e.excerpt}</p>}
      {/* Far out, the card folds into its sigil, counter-scaled to stay legible. */}
      <div className="card-medallion" aria-hidden="true">
        <Sigil name={e.sigil} />
        <span>{e.title}</span>
      </div>
    </div>
  );
}

export function ImageCard({ node }: CardProps) {
  return node.src ? <img className="card-image" src={node.src} alt={node.label ?? ""} draggable={false} /> : null;
}

/** A sketch shows the SVG Excalidraw rendered on save; Excalidraw itself only loads to edit. */
export function SketchCard({ node }: CardProps) {
  if (!node.preview) {
    return (
      <div className="card-sketch is-empty">
        <Sigil name="quill-ink" size="2rem" />
        <p>Double-click to draw</p>
      </div>
    );
  }
  return (
    <img
      className="card-sketch"
      // As an <img>, any script inside the SVG can never run.
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(node.preview)}`}
      alt="sketch"
      draggable={false}
    />
  );
}

/** Regions gather cards — an age, a continent, a chapter. Label edits in place. */
export function RegionCard(p: CardProps) {
  return (
    <div className="card-region-label">
      <LabelEditor {...p} placeholder="An unnamed region" aria="Region name" />
    </div>
  );
}

const SEAL_INKS = ["lampblack", "rubric", "verdigris", "ultramarine", "orpiment", "tyrian"];

/**
 * A seal: one sigil, struck at any size — a map marker, a house device, a
 * warning in the margin of an age. Double-click to name it or change its ink.
 */
export function SealCard(p: CardProps) {
  const { node, doc, editing } = p;
  return (
    <div className="card-seal" style={{ color: node.color ?? "var(--ink-lampblack)" }}>
      <Sigil name={node.icon ?? "fleur-de-lys"} className="card-seal-glyph" />
      {(editing || node.label) && (
        <div className="card-seal-label">
          <LabelEditor {...p} placeholder="" aria="Seal name" />
        </div>
      )}
      {editing && (
        <div className="card-seal-inks" onPointerDown={(e) => e.preventDefault()}>
          {SEAL_INKS.map((k) => (
            <button
              key={k}
              type="button"
              aria-label={k}
              title={k}
              aria-pressed={node.color === `var(--ink-${k})`}
              style={{ color: `var(--ink-${k})` }}
              onClick={() => transact(doc, () => setNode(doc, node.id, { color: `var(--ink-${k})` }))}
            >
              <span className="ink-dot" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LabelEditor({ node, doc, editing, onDone, placeholder, aria }: CardProps & { placeholder: string; aria: string }) {
  const [draft, setDraft] = useState(node.label ?? "");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(node.label ?? "");
      requestAnimationFrame(() => input.current?.select());
    }
  }, [editing, node.label]);
  const commit = () => {
    if (draft.trim() !== (node.label ?? "")) transact(doc, () => setNode(doc, node.id, { label: draft.trim() }));
    onDone();
  };
  return editing ? (
    <input
      ref={input}
      value={draft}
      aria-label={aria}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone();
      }}
    />
  ) : (
    <span>{node.label || placeholder}</span>
  );
}
