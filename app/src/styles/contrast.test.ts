import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Every colour that sets text must read at 4.5:1 (WCAG AA, small text) on every
// paper it sits on, in both lamps. Parsed from the real stylesheets, so a palette
// change that drops below the line fails here, not in someone's eyes.

const css = (f: string) => readFileSync(join(__dirname, f), "utf8");
const tokens = css("tokens.css");
const editor = css("editor.css");

/** `--name: #hex` pairs from the first block that starts with `selector`. */
function block(src: string, selector: string): Record<string, string> {
  const at = src.indexOf(selector);
  if (at < 0) throw new Error(`no block ${selector}`);
  const body = src.slice(src.indexOf("{", at) + 1, src.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)) out[m[1]!] = m[2]!.toLowerCase();
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const daylight = { ...block(tokens, ":root {"), ...block(tokens.slice(tokens.indexOf("Inks offered")), ":root {") };
const candle = { ...daylight, ...block(tokens, ':root[data-theme="dark"]'), ...block(editor, ':root[data-theme="dark"]') };

const TEXT = ["color-ink", "color-ink-soft", "color-ink-faint", "color-accent", "color-accent-2", "color-focus", "ink-ultramarine", "ink-oak-gall", "ink-orpiment", "ink-tyrian"];
const PAPERS = ["color-paper", "color-paper-raised"];

describe("contrast", () => {
  for (const [lamp, theme] of [
    ["daylight", daylight],
    ["candle", candle],
  ] as const) {
    it(`every text colour reads at 4.5:1 on every paper by ${lamp}`, () => {
      const failing: string[] = [];
      for (const t of TEXT)
        for (const p of PAPERS) {
          const fg = theme[t];
          const bg = theme[p];
          expect(fg, `${t} in ${lamp}`).toMatch(/^#/);
          expect(bg, `${p} in ${lamp}`).toMatch(/^#/);
          const r = ratio(fg!, bg!);
          if (r < 4.5) failing.push(`${t} on ${p}: ${r.toFixed(2)}:1`);
        }
      expect(failing).toEqual([]);
    });
  }

  it("the dark block in editor.css is really the candle inks (guards the parser)", () => {
    expect(candle["ink-ultramarine"]).not.toBe(daylight["ink-ultramarine"]);
    expect(candle["color-paper"]).toBe("#15120e");
  });
});
