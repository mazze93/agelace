import Collaboration from "@tiptap/extension-collaboration";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import * as Y from "yjs";
import { DropCap, LetterSpacing, Ornament, SmallCaps, WikiLink } from "../editor/extensions";
import { WikiSuggest } from "../editor/wikiSuggest";
import { nodesOf } from "./model";
import type { CardProps } from "./cards";

/**
 * A rich-text card whose body is a Y.XmlFragment inside the canvas doc —
 * concurrent edits merge character by character, and it has its own
 * Yjs undo history (Cmd-Z while typing in it).
 */
export function TextCard({ node, doc, editing, lod }: CardProps) {
  const fragment = nodesOf(doc).get(node.id)?.get("body");
  if (!(fragment instanceof Y.XmlFragment)) return <div className="card-text muted">(unreadable card)</div>;
  return <TextCardEditor fragment={fragment} editing={editing} lod={lod} />;
}

interface EditorProps {
  fragment: Y.XmlFragment;
  editing: boolean;
  lod: CardProps["lod"];
}

function TextCardEditor({ fragment, editing }: EditorProps) {
  const editor = useEditor(
    {
      extensions: [
        // Yjs owns history here; ProseMirror's own would fight it.
        StarterKit.configure({ undoRedo: false, heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
        TextStyleKit,
        LetterSpacing,
        Highlight,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        SmallCaps,
        DropCap,
        Ornament,
        WikiLink,
        WikiSuggest,
        Placeholder.configure({ placeholder: "Write on the board…" }),
        Collaboration.configure({ fragment }),
      ],
      editable: false,
      editorProps: { attributes: { class: "prose card-prose", "aria-label": "Card text" } },
    },
    [fragment],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) requestAnimationFrame(() => editor.commands.focus("end"));
  }, [editor, editing]);

  return <EditorContent editor={editor} className="card-text" />;
}
