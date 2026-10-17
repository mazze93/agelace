import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
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
  /** The live editor, for undo routing from outside the text. */
  onReady?: (editor: TiptapEditor | null) => void;
  /** Every transaction, so the page can interleave text history with its own. */
  onTransaction?: (tr: Transaction) => void;
}

export function Editor({ entryId, doc, revision, onChange, onReady, onTransaction }: EditorProps) {
  const body = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const trRef = useRef(onTransaction);
  trRef.current = onTransaction;

  const editor = useEditor(
    {
      extensions: extensions(),
      content: doc as JSONContent,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: { attributes: { class: "prose", spellcheck: "true", "aria-label": "Entry text" } },
      onUpdate: ({ editor: e }) => changeRef.current(e.getJSON() as RichDoc),
      onTransaction: ({ transaction }) => trRef.current?.(transaction),
    },
    [entryId],
  );

  useEffect(() => {
    onReady?.(editor);
    return () => onReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Outside edit arrived: take it, unless the writer is mid-sentence here.
  useEffect(() => {
    if (!editor || revision === 0 || editor.isFocused) return;
    // Not undoable: undo should never resurrect what another app replaced.
    editor.chain().command(({ tr }) => (tr.setMeta("addToHistory", false), true)).setContent(doc as JSONContent, { emitUpdate: false }).run();
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
