import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { Editor } from "@tiptap/react";

export interface MarginProps {
  editor: Editor;
  /** The positioned element both the text and the margin are laid out in. */
  frame: RefObject<HTMLElement | null>;
}

interface Note {
  pos: number;
  text: string;
  n: number;
  top: number;
}

/**
 * The margin: footnotes set beside the line that calls them, Pratchett-style,
 * nudged down so they never overlap. Edited in place. On narrow screens the
 * stylesheet turns this into an endnotes list beneath the text.
 */
export function Margin({ editor, frame }: MarginProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const heights = useRef(new Map<number, number>());
  const fields = useRef(new Map<number, HTMLTextAreaElement>());

  const measure = () => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || editor.isDestroyed) return;
    const found: Note[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "footnote") return true;
      let top = 0;
      try {
        top = editor.view.coordsAtPos(pos).top - box.top;
      } catch {
        /* position not rendered yet */
      }
      found.push({ pos, text: String(node.attrs["text"] ?? ""), n: found.length + 1, top });
      return false;
    });
    // Stack: each note starts no higher than the bottom of the previous one.
    let floor = 0;
    for (const note of found) {
      note.top = Math.max(note.top - 4, floor);
      floor = note.top + (heights.current.get(note.n) ?? 60) + 14;
    }
    setNotes(found);
  };

  useLayoutEffect(() => {
    measure();
    const onUpdate = () => requestAnimationFrame(measure);
    editor.on("update", onUpdate);
    window.addEventListener("resize", onUpdate);
    const ro = new ResizeObserver(onUpdate);
    if (frame.current) ro.observe(frame.current);
    void document.fonts.ready.then(onUpdate);
    return () => {
      editor.off("update", onUpdate);
      window.removeEventListener("resize", onUpdate);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Size every note to its text whenever the set of notes changes.
  useLayoutEffect(() => {
    fields.current.forEach(autoGrow);
  }, [notes]);

  useEffect(() => {
    const focus = (e: Event) => {
      const pos = (e as CustomEvent<number>).detail;
      const field = [...fields.current.entries()].find(([p]) => p === pos)?.[1];
      field?.focus();
    };
    window.addEventListener("agelace:focus-note", focus);
    return () => window.removeEventListener("agelace:focus-note", focus);
  }, []);

  const write = (pos: number, text: string) =>
    editor
      .chain()
      .command(({ tr }) => {
        const node = tr.doc.nodeAt(pos);
        if (node?.type.name !== "footnote") return false;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, text });
        return true;
      })
      .run();

  if (!notes.length) return <aside className="margin" aria-label="Margin notes" />;

  return (
    <aside className="margin" aria-label="Margin notes">
      <ol>
        {notes.map((note) => (
          <li
            key={note.n}
            className="margin-note"
            style={{ "--note-top": `${note.top}px` } as CSSProperties}
            ref={(el) => {
              if (el) heights.current.set(note.n, el.offsetHeight);
            }}
          >
            <span className="margin-n" aria-hidden="true">
              {note.n}
            </span>
            <textarea
              ref={(el) => {
                if (el) fields.current.set(note.pos, el);
                else fields.current.delete(note.pos);
              }}
              aria-label={`Footnote ${note.n}`}
              placeholder="An aside, a digression, the truth…"
              value={note.text}
              rows={1}
              onChange={(e) => write(note.pos, e.target.value)}
              onInput={(e) => autoGrow(e.currentTarget)}
              onFocus={(e) => autoGrow(e.currentTarget)}
            />
          </li>
        ))}
      </ol>
    </aside>
  );
}

function autoGrow(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
