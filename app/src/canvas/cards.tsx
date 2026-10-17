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
export function RegionCard({ node, doc, editing, onDone }: CardProps) {
  const [draft, setDraft] = useState(node.label ?? "");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(node.label ?? "");
      requestAnimationFrame(() => input.current?.select());
    }
  }, [editing, node.label]);
  const commit = () => {
    transact(doc, () => setNode(doc, node.id, { label: draft.trim() }));
    onDone();
  };
  return (
    <div className="card-region-label">
      {editing ? (
        <input
          ref={input}
          value={draft}
          aria-label="Region name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onDone();
          }}
        />
      ) : (
        <span>{node.label || "An unnamed region"}</span>
      )}
    </div>
  );
}
