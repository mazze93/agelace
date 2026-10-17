import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FootnoteView, OrnamentView, WikiLinkView } from "./nodeviews";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    smallCaps: { toggleSmallCaps: () => ReturnType };
    footnote: { insertFootnote: (text?: string) => ReturnType };
    ornament: { insertOrnament: (name: string) => ReturnType };
    wikiLink: { insertWikiLink: (id: string, label: string) => ReturnType };
    dropCap: { toggleDropCap: () => ReturnType };
    letterSpacing: { setLetterSpacing: (value: string | null) => ReturnType };
  }
}

/** True small capitals (font-variant), not shrunken uppercase. */
export const SmallCaps = Mark.create({
  name: "smallCaps",
  parseHTML: () => [{ tag: "span[data-small-caps]" }, { style: "font-variant=small-caps" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-small-caps": "", class: "sc" }), 0],
  addCommands() {
    return { toggleSmallCaps: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-k": () => this.editor.commands.toggleSmallCaps() };
  },
});

/** Letter-spacing as a textStyle attribute, for tracked capitals and titling. */
export const LetterSpacing = Extension.create({
  name: "letterSpacing",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (el) => el.style.letterSpacing || null,
            renderHTML: (attrs) => (attrs["letterSpacing"] ? { style: `letter-spacing: ${attrs["letterSpacing"]}` } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLetterSpacing:
        (value) =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: value }).removeEmptyTextStyle().run(),
    };
  },
});

/** A rubricated initial on any paragraph. */
export const DropCap = Extension.create({
  name: "dropCap",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          dropCap: {
            default: false,
            parseHTML: (el) => el.classList.contains("drop-cap"),
            renderHTML: (attrs) => (attrs["dropCap"] ? { class: "drop-cap" } : {}),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      toggleDropCap:
        () =>
        ({ editor, commands }) =>
          commands.updateAttributes("paragraph", { dropCap: !editor.getAttributes("paragraph")["dropCap"] }),
    };
  },
});

/**
 * Footnote: an inline atom whose text lives in an attribute. The editor shows
 * a numbered marker; the page renders the note in the margin beside it.
 */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes: () => ({
    text: {
      default: "",
      parseHTML: (el) => el.getAttribute("data-text") ?? el.textContent ?? "",
      renderHTML: (attrs) => ({ "data-text": attrs["text"] }),
    },
  }),
  parseHTML: () => [{ tag: "sup[data-footnote]" }],
  renderHTML: ({ HTMLAttributes }) => ["sup", mergeAttributes(HTMLAttributes, { "data-footnote": "", class: "fn" })],
  addNodeView() {
    return ReactNodeViewRenderer(FootnoteView, { as: "span" });
  },
  addCommands() {
    return {
      insertFootnote:
        (text = "") =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { text } }),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Alt-f": () => this.editor.commands.insertFootnote() };
  },
});

/** An inline game-icon that sits in the text at the current size and ink. */
export const Ornament = Node.create({
  name: "ornament",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    name: { default: "fleur-de-lys", renderHTML: (a) => ({ "data-name": a["name"] }), parseHTML: (el) => el.getAttribute("data-name") },
  }),
  parseHTML: () => [{ tag: "span[data-ornament]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { "data-ornament": "" })],
  addNodeView() {
    return ReactNodeViewRenderer(OrnamentView, { as: "span" });
  },
  addCommands() {
    return {
      insertOrnament:
        (name) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { name } }),
    };
  },
});

/** [[Link]] to another entry, by id; the label is a snapshot shown if the entry is gone. */
export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    id: { default: null, renderHTML: (a) => ({ "data-id": a["id"] }), parseHTML: (el) => el.getAttribute("data-id") },
    label: { default: "", renderHTML: (a) => ({ "data-label": a["label"] }), parseHTML: (el) => el.getAttribute("data-label") ?? el.textContent },
  }),
  parseHTML: () => [{ tag: "a[data-wikilink]", priority: 1100 }], // beat the Link mark
  renderHTML: ({ node, HTMLAttributes }) => [
    "a",
    mergeAttributes(HTMLAttributes, { "data-wikilink": "", href: `#/e/${node.attrs["id"]}` }),
    String(node.attrs["label"]),
  ],
  renderText: ({ node }) => String(node.attrs["label"]),
  addNodeView() {
    return ReactNodeViewRenderer(WikiLinkView, { as: "span" });
  },
  addCommands() {
    return {
      insertWikiLink:
        (id, label) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { id, label } }, { type: "text", text: " " }]),
    };
  },
});
