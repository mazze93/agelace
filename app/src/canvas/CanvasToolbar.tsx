import { useState } from "react";
import { Popover } from "../pickers";
import { Sigil } from "../Sigil";
import { StatusMark } from "../status";
import { rankEntries } from "../editor/wikiSuggest";
import { useWorld } from "../world";
import { MERMAID_STARTER } from "./MermaidCard";
import type { NewNode } from "./model";
import type { SyncState } from "./sync";

export type Tool = "select" | "hand" | "pen" | "erase";

export interface CanvasToolbarProps {
  tool: Tool;
  setTool: (t: Tool) => void;
  ink: { color: string; size: number };
  setInk: (i: { color: string; size: number }) => void;
  zoom: number;
  onZoom: (factor: number) => void;
  onFit: () => void;
  saveState: SyncState;
  name: string;
  place: (n: Omit<NewNode, "x" | "y" | "w" | "h">) => void;
  onImage: (f: File) => Promise<void>;
  canDelete: boolean;
  onDelete: () => void;
  undo: () => void;
  redo: () => void;
}

const TOOLS: { id: Tool; key: string; label: string; icon: string }[] = [
  { id: "select", key: "V", label: "Select & move", icon: "arrow-cursor" },
  { id: "hand", key: "H", label: "Pan the board (or hold Space)", icon: "hand" },
  { id: "pen", key: "P", label: "Ink — a stylus draws in any tool", icon: "quill" },
  { id: "erase", key: "E", label: "Eraser — or flip the stylus", icon: "broom" },
];

const INKS = ["lampblack", "rubric", "verdigris", "ultramarine", "orpiment", "tyrian"];
const NIBS = [3, 6, 12];

const SAVE_TEXT: Record<SyncState, string> = {
  loading: "unrolling…",
  set: "set in type",
  wet: "ink still wet",
  drying: "drying…",
  blotted: "blotted — retrying",
  missing: "this board is gone",
};

export function CanvasToolbar(p: CanvasToolbarProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="board-bar" role="toolbar" aria-label="Board tools">
      <h1 className="board-name">{p.name}</h1>

      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tool"
            aria-pressed={p.tool === t.id}
            aria-label={`${t.label} (${t.key})`}
            title={`${t.label} (${t.key})`}
            onClick={() => p.setTool(t.id)}
          >
            <Sigil name={t.icon} size="1.15rem" />
          </button>
        ))}
      </div>

      <div className="tool-group">
        <button type="button" className="tool tool-word" onClick={() => p.place({ type: "text" })} title="A card to write on (or double-click the board)">
          Card
        </button>
        <Popover title="Place an entry on the board" label={<span className="tool-word">Entry</span>}>
          {(close) => <EntryPicker onPick={(id) => (p.place({ type: "entry", entryId: id }), close())} />}
        </Popover>
        <button type="button" className="tool tool-word" onClick={() => p.place({ type: "mermaid", source: MERMAID_STARTER })} title="Timeline, family tree or flow (Mermaid)">
          Timeline
        </button>
        <label className="tool tool-word" title="A map or image">
          Map
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) p.onImage(f).then(() => setError(null), (err: Error) => setError(err.message));
            }}
          />
        </label>
        <button type="button" className="tool tool-word" onClick={() => p.place({ type: "sketch" })} title="A sketch (Excalidraw)">
          Sketch
        </button>
        <button type="button" className="tool tool-word" onClick={() => p.place({ type: "region", label: "" })} title="A region that gathers cards — an age, a land">
          Region
        </button>
      </div>

      <div className="tool-group">
        <Popover title="Ink" label={<span className="ink-dot" style={{ color: p.ink.color }} />}>
          {(close) => (
            <div className="board-inks">
              <div className="board-ink-row">
                {INKS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-label={k}
                    title={k}
                    aria-pressed={p.ink.color === `var(--ink-${k})`}
                    style={{ color: `var(--ink-${k})` }}
                    onClick={() => (p.setInk({ ...p.ink, color: `var(--ink-${k})` }), p.setTool("pen"), close())}
                  >
                    <span className="ink-dot" />
                  </button>
                ))}
              </div>
              <div className="board-ink-row">
                {NIBS.map((n) => (
                  <button key={n} type="button" aria-label={`nib ${n}`} aria-pressed={p.ink.size === n} onClick={() => p.setInk({ ...p.ink, size: n })}>
                    <span className="nib" style={{ width: n + 2, height: n + 2 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Popover>
      </div>

      <div className="tool-group">
        <button type="button" className="tool" onClick={p.undo} aria-label="Undo" title="Undo (⌘Z / Ctrl-Z)">
          ↶
        </button>
        <button type="button" className="tool" onClick={p.redo} aria-label="Redo" title="Redo (⇧⌘Z / Ctrl-Y)">
          ↷
        </button>
        <button type="button" className="tool tool-word" onClick={p.onDelete} disabled={!p.canDelete} title="Remove (Delete)">
          Remove
        </button>
      </div>

      <div className="tool-group board-zoom">
        <button type="button" className="tool" onClick={() => p.onZoom(1 / 1.25)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="tool tool-word" onClick={p.onFit} title="Fit the board (Shift-1)">
          {Math.round(p.zoom * 100)}%
        </button>
        <button type="button" className="tool" onClick={() => p.onZoom(1.25)} aria-label="Zoom in">
          +
        </button>
      </div>

      <span className={`save save-${p.saveState}`} role="status" aria-live="polite">
        {error ?? SAVE_TEXT[p.saveState]}
      </span>
    </div>
  );
}

function EntryPicker({ onPick }: { onPick: (id: string) => void }) {
  const { entries } = useWorld();
  const [q, setQ] = useState("");
  const hits = rankEntries(entries, q, 30);
  return (
    <div className="entry-picker">
      <input autoFocus type="search" placeholder="Find an entry…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>
        {hits.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPick(e.id)}>
              <Sigil name={e.sigil} />
              <span>{e.title}</span>
              <StatusMark status={e.status} />
            </button>
          </li>
        ))}
        {!hits.length && <li className="muted">Nothing by that name. Drag from the index, or write it first.</li>}
      </ul>
    </div>
  );
}
