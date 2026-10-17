import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import type { MouseEvent } from "react";
import { api } from "../api";
import { Sigil } from "../Sigil";
import { refreshEntries, useWorld } from "../world";

/** 1-based index of the footnote at `pos` among all footnotes in the doc. */
export function footnoteNumber(props: Pick<ReactNodeViewProps, "editor" | "getPos">): number {
  const at = props.getPos();
  let n = 0;
  let found = 0;
  props.editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "footnote") {
      n++;
      if (pos === at) found = n;
    }
    return true;
  });
  return found || n;
}

export function FootnoteView(props: ReactNodeViewProps) {
  const n = footnoteNumber(props);
  const focusNote = () => window.dispatchEvent(new CustomEvent("agelace:focus-note", { detail: props.getPos() }));
  return (
    <NodeViewWrapper as="sup" className={`fn${props.selected ? " is-selected" : ""}`} data-footnote="">
      <button type="button" className="fn-mark" onClick={focusNote} aria-label={`Footnote ${n}`} contentEditable={false}>
        {n}
      </button>
    </NodeViewWrapper>
  );
}

export function OrnamentView(props: ReactNodeViewProps) {
  const name = String(props.node.attrs["name"]);
  return (
    <NodeViewWrapper as="span" className={`ornament${props.selected ? " is-selected" : ""}`} data-ornament="">
      <Sigil name={name} title={name.replace(/-/g, " ")} />
    </NodeViewWrapper>
  );
}

export function WikiLinkView(props: ReactNodeViewProps) {
  const { byId } = useWorld();
  const id = String(props.node.attrs["id"] ?? "");
  const label = String(props.node.attrs["label"] ?? id);
  const target = byId.get(id);

  // A link to something not yet written is a Question waiting to be asked —
  // following it creates the entry rather than punishing the dreamer.
  const follow = async (e: MouseEvent) => {
    e.preventDefault();
    if (!target) {
      const created = await api.create({ title: label || id, kind: "note", status: "question" });
      await refreshEntries();
      if (created.id !== id) props.updateAttributes({ id: created.id });
      location.hash = `#/e/${created.id}`;
      return;
    }
    location.hash = `#/e/${id}`;
  };

  return (
    <NodeViewWrapper as="span" className={`wikilink${target ? "" : " is-unwritten"}${props.selected ? " is-selected" : ""}`}>
      <a href={`#/e/${id}`} onClick={follow} data-wikilink="" title={target ? target.title : `${label} — not yet written`}>
        {target && <Sigil name={target.sigil} size="0.8em" />}
        {target?.title ?? label}
      </a>
    </NodeViewWrapper>
  );
}
