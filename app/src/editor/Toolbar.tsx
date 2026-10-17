import { useEditorState, type Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import { FontList, IconGrid, Popover } from "../pickers";
import { Sigil } from "../Sigil";

export interface ToolbarProps {
  editor: Editor;
}

const INKS = ["lampblack", "rubric", "verdigris", "ultramarine", "oak-gall", "orpiment", "tyrian"] as const;
const SIZES = ["0.75em", "0.875em", "1em", "1.25em", "1.5em", "2em", "3em", "4.5em"];
const TRACKING = [
  ["normal", null],
  ["tight", "-0.02em"],
  ["open", "0.06em"],
  ["wide", "0.14em"],
  ["titling", "0.28em"],
] as const;

export function Toolbar({ editor }: ToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : e.isActive("blockquote")
              ? "quote"
              : "p",
      font: e.getAttributes("textStyle")["fontFamily"] as string | undefined,
      size: (e.getAttributes("textStyle")["fontSize"] as string | undefined) ?? "",
      tracking: (e.getAttributes("textStyle")["letterSpacing"] as string | undefined) ?? null,
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      sc: e.isActive("smallCaps"),
      highlight: e.isActive("highlight"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      dropCap: Boolean(e.getAttributes("paragraph")["dropCap"]),
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  const setBlock = (v: string) => {
    if (v === "p") c().setParagraph().run();
    else if (v === "quote") c().setParagraph().toggleBlockquote().run();
    else c().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <div className="tool-group">
        <button type="button" className="tool" onClick={() => c().undo().run()} disabled={!s.canUndo} aria-label="Undo" title="Undo">
          ↶
        </button>
        <button type="button" className="tool" onClick={() => c().redo().run()} disabled={!s.canRedo} aria-label="Redo" title="Redo">
          ↷
        </button>
      </div>

      <div className="tool-group">
        <select className="tool-select" value={s.block} onChange={(e) => setBlock(e.target.value)} aria-label="Block style">
          <option value="p">Body</option>
          <option value="h1">Title</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
          <option value="quote">Epigraph</option>
        </select>
        <Popover
          title="Typeface"
          className="font-pop"
          label={<span style={s.font ? { fontFamily: `"${s.font}"` } : undefined}>{s.font ?? "Face"}</span>}
        >
          {(close) => (
            <FontList
              current={s.font}
              onPick={(f) => {
                if (f) c().setFontFamily(`${f}`).run();
                else c().unsetFontFamily().run();
                close();
              }}
            />
          )}
        </Popover>
        <select
          className="tool-select"
          value={s.size}
          onChange={(e) => (e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run())}
          aria-label="Size"
        >
          <option value="">Size</option>
          {SIZES.map((z) => (
            <option key={z} value={z}>
              {z.replace("em", "×")}
            </option>
          ))}
        </select>
      </div>

      <div className="tool-group">
        <Tool on={s.bold} label="Bold" onClick={() => c().toggleBold().run()}>
          <b>B</b>
        </Tool>
        <Tool on={s.italic} label="Italic" onClick={() => c().toggleItalic().run()}>
          <i>I</i>
        </Tool>
        <Tool on={s.underline} label="Underline" onClick={() => c().toggleUnderline().run()}>
          <u>U</u>
        </Tool>
        <Tool on={s.strike} label="Strike through" onClick={() => c().toggleStrike().run()}>
          <s>S</s>
        </Tool>
        <Tool on={s.sc} label="Small capitals" onClick={() => c().toggleSmallCaps().run()}>
          <span className="sc">Sc</span>
        </Tool>
        <select
          className="tool-select"
          value={s.tracking ?? "null"}
          onChange={(e) => c().setLetterSpacing(e.target.value === "null" ? null : e.target.value).run()}
          aria-label="Letter spacing"
        >
          {TRACKING.map(([name, v]) => (
            <option key={name} value={v ?? "null"}>
              {name === "normal" ? "Tracking" : name}
            </option>
          ))}
        </select>
        <Popover title="Ink" label={<span className="ink-swatch" />}>
          {(close) => (
            <div className="inks">
              {INKS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  onClick={() => (c().setColor(`var(--ink-${ink})`).run(), close())}
                  style={{ color: `var(--ink-${ink})` }}
                >
                  <span className="ink-dot" />
                  {ink.replace("-", " ")}
                </button>
              ))}
              <button type="button" onClick={() => (c().unsetColor().run(), close())}>
                plain ink
              </button>
            </div>
          )}
        </Popover>
        <Tool on={s.highlight} label="Gloss (highlight)" onClick={() => c().toggleHighlight().run()}>
          <mark>G</mark>
        </Tool>
      </div>

      <div className="tool-group">
        {(["left", "center", "right", "justify"] as const).map((a) => (
          <Tool key={a} on={s.align === a} label={`Align ${a}`} onClick={() => c().setTextAlign(a).run()}>
            <AlignGlyph a={a} />
          </Tool>
        ))}
        <Tool on={s.bullet} label="Bulleted list" onClick={() => c().toggleBulletList().run()}>
          •≡
        </Tool>
        <Tool on={s.ordered} label="Numbered list" onClick={() => c().toggleOrderedList().run()}>
          i≡
        </Tool>
      </div>

      <div className="tool-group">
        <Tool on={s.dropCap} label="Drop capital" onClick={() => c().toggleDropCap().run()}>
          <span className="glyph-dropcap">A</span>
        </Tool>
        <Tool label="Footnote in the margin" onClick={() => c().insertFootnote().run()}>
          †
        </Tool>
        <Tool label="Link to an entry ([[)" onClick={() => c().insertContent("[[").run()}>
          ⟦⟧
        </Tool>
        <Popover title="Ornament" label={<Sigil name="fleur-de-lys" />}>
          {(close) => <IconGrid onPick={(n) => (c().insertOrnament(n).run(), close())} />}
        </Popover>
        <Tool label="Section break" onClick={() => c().setHorizontalRule().run()}>
          ❦
        </Tool>
      </div>
    </div>
  );
}

interface ToolProps {
  on?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function Tool({ on, label, onClick, children }: ToolProps) {
  return (
    <button type="button" className="tool" aria-pressed={on} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function AlignGlyph({ a }: { a: "left" | "center" | "right" | "justify" }) {
  const rows = [14, 9, 14, 7];
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
      {rows.map((w, i) => {
        const width = a === "justify" ? 14 : w;
        const x = a === "left" || a === "justify" ? 1 : a === "right" ? 15 - width : (16 - width) / 2;
        return <rect key={i} x={x} y={1 + i * 3.3} width={width} height="1.4" fill="currentColor" />;
      })}
    </svg>
  );
}
