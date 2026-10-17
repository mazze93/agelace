import type { RichDoc } from "@agelace/shared";
import type { WorldStore } from "./store.js";

// The first thing a new world contains. Phase 6 replaces this with the
// workshopped tutorial modules; until then it demonstrates every primitive.

const p = (...content: unknown[]): unknown => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]): unknown => (marks ? { type: "text", text, marks } : { type: "text", text });
const font = (fontFamily: string): unknown => ({ type: "textStyle", attrs: { fontFamily } });

export async function seedWorld(store: WorldStore): Promise<void> {
  await store.setMeta({
    name: "The Unwritten Annals",
    epigraph: "Every age begins as a question someone dared to write down.",
  });

  const age = await store.create({
    title: "The Age Before Names",
    kind: "age",
    status: "question",
    doc: {
      type: "doc",
      content: [
        p(t("Nothing is settled here yet. That is the point. Mark what you are sure of as "), t("Canon", [{ type: "bold" }]), t(", what you are trying on as "), t("Proposed", [{ type: "italic" }]), t(", and what keeps you up at night as a "), t("Question", [{ type: "smallCaps" }]), t(".")),
      ],
    } as RichDoc,
  });

  await store.create({
    title: "How to Begin",
    kind: "chronicle",
    status: "canon",
    sigil: "open-book",
    doc: {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { dropCap: true }, content: [t("Write as you would in any good book. Select words and give them a different face — "), t("a chancery hand", [font("IM Fell English")]), t(", "), t("an uncial for the old tongue", [font("Uncial Antiqua")]), t(", or "), t("ᚱᚢᚾᛖᛋ", [font("Noto Sans Runic")]), t(" for things carved rather than written.")] },
        p(
          t("Link to other parts of the world by typing two brackets, like "),
          { type: "wikiLink", attrs: { id: age.id, label: age.title } },
          t(". Asides belong in the margin"),
          { type: "footnote", attrs: { text: "As any footnote will tell you, the margin is where the truth goes to avoid being noticed by the main text." } },
          t(", where they can be as long and as digressive as they like."),
        ),
      ],
    } as RichDoc,
  });
}
