import type { AnyExtension } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { DropCap, Footnote, LetterSpacing, Ornament, SmallCaps, WikiLink } from "./extensions";
import { WikiSuggest } from "./wikiSuggest";

/** The full extension set. `interactive` adds UI-only plugins (suggestions). */
export function extensions(interactive = true): AnyExtension[] {
  const base: AnyExtension[] = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    TextStyleKit,
    LetterSpacing,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    SmallCaps,
    DropCap,
    Footnote,
    Ornament,
    WikiLink,
  ];
  if (interactive) {
    base.push(
      Placeholder.configure({ placeholder: "Begin anywhere. Type [[ to name a place, a person, an age…" }),
      WikiSuggest,
    );
  }
  return base;
}
