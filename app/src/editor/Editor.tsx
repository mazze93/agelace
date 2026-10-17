import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import type { RichDoc } from "@agelace/shared";
import { Margin } from "./Margin";
import { extensions } from "./schema";
import { Toolbar } from "./Toolbar";

export interface EditorProps {
  /** Changes when a different entry is opened. */
  entryId: string;
  doc: RichDoc;
  /** Bumped when the doc changed outside this editor (another window, Obsidian, sync). */
  revision: number;
  onChange: (doc: RichDoc) => void;
}

export function Editor({ entryId, doc, revision, onChange }: EditorProps) {
  const body = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const editor = useEditor(
    {
      extensions: extensions(),
      content: doc as JSONContent,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: { attributes: { class: "prose", spellcheck: "true", "aria-label": "Entry text" } },
      onUpdate: ({ editor: e }) => changeRef.current(e.getJSON() as RichDoc),
    },
    [entryId],
  );

  // Outside edit arrived: take it, unless the writer is mid-sentence here.
  useEffect(() => {
    if (!editor || revision === 0 || editor.isFocused) return;
    editor.commands.setContent(doc as JSONContent, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  if (!editor) return null;
  return (
    <>
      <Toolbar editor={editor} />
      <div className="leaf-body" ref={body}>
        <EditorContent editor={editor} className="prose-host" />
        <Margin editor={editor} frame={body} />
      </div>
    </>
  );
}
