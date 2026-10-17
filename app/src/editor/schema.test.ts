import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { extractLinks, plainText, type RichDoc } from "@agelace/shared";
import { extensions } from "./schema";

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

// Node views render through React and need a live view; the schema itself is
// what decides whether a writer's formatting survives a save → load cycle.
const make = (content: RichDoc) => (editor = new Editor({ extensions: extensions(false), content: content as JSONContent }));

const rich: RichDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      attrs: { dropCap: true, textAlign: "justify" },
      content: [
        { type: "text", text: "Old tongue ", marks: [{ type: "textStyle", attrs: { fontFamily: "Uncial Antiqua", fontSize: "1.5em", letterSpacing: "0.14em", color: "var(--ink-rubric)" } }] },
        { type: "text", text: "small caps", marks: [{ type: "smallCaps" }] },
        { type: "footnote", attrs: { text: "A margin note." } },
        { type: "wikiLink", attrs: { id: "the-moon", label: "The Moon" } },
        { type: "ornament", attrs: { name: "crescent-moon" } },
      ],
    },
    { type: "horizontalRule" },
  ],
};

describe("editor schema", () => {
  it("round-trips every custom node, mark and attribute losslessly", () => {
    const out = make(rich).getJSON();
    const para = out.content?.[0];
    expect(para?.attrs).toMatchObject({ dropCap: true, textAlign: "justify" });
    expect(para?.content?.[0]?.marks?.[0]?.attrs).toMatchObject({
      fontFamily: "Uncial Antiqua",
      fontSize: "1.5em",
      letterSpacing: "0.14em",
      color: "var(--ink-rubric)",
    });
    expect(para?.content?.map((n) => n.type)).toEqual(["text", "text", "footnote", "wikiLink", "ornament"]);
    expect(out.content?.[1]?.type).toBe("horizontalRule");
  });

  it("survives HTML paste/export through the same schema", () => {
    const html = make(rich).getHTML();
    editor!.destroy();
    const again = (editor = new Editor({ extensions: extensions(false), content: html })).getJSON() as RichDoc;
    expect(extractLinks(again)).toEqual(["the-moon"]);
    expect(html).toContain('data-text="A margin note."');
    expect(html).toContain("drop-cap");
  });

  it("indexes links and leaves footnotes out of excerpts", () => {
    expect(extractLinks(rich)).toEqual(["the-moon"]);
    expect(plainText(rich)).toBe("Old tongue small capsThe Moon");
  });
});
