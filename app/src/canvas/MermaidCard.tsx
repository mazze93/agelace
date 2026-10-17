import { useEffect, useId, useRef, useState } from "react";
import * as Y from "yjs";
import { LOCAL, nodesOf } from "./model";
import type { CardProps } from "./cards";

export const MERMAID_STARTER = `timeline
  title The Ages
  The Age Before Names : the first question is asked
  The Long Dark : the Tower is raised
             : the Moon is stolen`;

type MermaidApi = typeof import("mermaid").default;
let mermaidReady: Promise<MermaidApi> | null = null;

/** Mermaid is large; it loads the first time a diagram is on screen, themed from our tokens. */
function loadMermaid(): Promise<MermaidApi> {
  mermaidReady ??= import("mermaid").then(({ default: m }) => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    m.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: "Alegreya, Georgia, serif",
      themeVariables: {
        fontFamily: "Alegreya, Georgia, serif",
        background: "transparent",
        primaryColor: v("--color-paper-raised"),
        primaryTextColor: v("--color-ink"),
        primaryBorderColor: v("--color-accent"),
        lineColor: v("--color-ink-soft"),
        secondaryColor: v("--color-paper-sunk"),
        tertiaryColor: v("--color-paper"),
        cScale0: v("--color-accent"),
        cScale1: v("--color-accent-2"),
        cScale2: v("--color-ink-soft"),
        cScaleLabel0: v("--color-paper"),
        cScaleLabel1: v("--color-paper"),
        cScaleLabel2: v("--color-paper"),
      },
    });
    return m;
  });
  return mermaidReady;
}

/** A timeline, family tree or flow — Mermaid source, rendered live, edited in place. */
export function MermaidCard({ node, doc, editing }: CardProps) {
  const text = nodesOf(doc).get(node.id)?.get("source");
  const source = node.source ?? "";
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const seq = useRef(0);

  useEffect(() => {
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const m = await loadMermaid();
        const { svg: out } = await m.render(`mm-${uid}-${n}`, source || "flowchart LR\n  A[Nothing yet]");
        if (n === seq.current) {
          setSvg(out);
          setError(null);
        }
      } catch (err) {
        if (n === seq.current) setError((err as Error).message.split("\n")[0] ?? "That diagram doesn't parse yet.");
      }
    }, 220);
    return () => clearTimeout(t);
  }, [source, uid]);

  const write = (value: string) => {
    if (!(text instanceof Y.Text)) return;
    doc.transact(() => {
      text.delete(0, text.length);
      text.insert(0, value);
    }, LOCAL);
  };

  return (
    <div className={`card-mermaid${editing ? " is-editing" : ""}`}>
      {/* mermaid renders with securityLevel "strict": labels are sanitised, no scripts, no clicks. */}
      <div className="mermaid-out" dangerouslySetInnerHTML={{ __html: svg }} />
      {editing && (
        <textarea
          className="mermaid-src"
          value={source}
          spellCheck={false}
          aria-label="Diagram source"
          onChange={(e) => write(e.target.value)}
          autoFocus
        />
      )}
      {error && editing && <p className="mermaid-err">{error}</p>}
    </div>
  );
}
