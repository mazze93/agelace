import { createRequire } from "node:module";
import { getIconData, iconToSVG, replaceIDs } from "@iconify/utils";
import type { IconifyJSON } from "@iconify/types";

// game-icons.net by Lorc, Delapouite & contributors — CC BY 3.0.
// Credited in the app's Colophon; the attribution must stay.
const require = createRequire(import.meta.url);
const set = require("@iconify-json/game-icons/icons.json") as IconifyJSON;

const names: string[] = Object.keys(set.icons).sort();
const svgCache = new Map<string, string>();

export function iconNames(): string[] {
  return names;
}

export function searchIcons(q: string, limit = 120): string[] {
  const terms = q.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (!terms.length) return names.slice(0, limit);
  const scored: [string, number][] = [];
  for (const n of names) {
    let score = 0;
    for (const t of terms) {
      if (n === t) score += 10;
      else if (n.startsWith(t)) score += 4;
      else if (n.split("-").includes(t)) score += 3;
      else if (n.includes(t)) score += 1;
      else {
        score = -1;
        break;
      }
    }
    if (score > 0) scored.push([n, score]);
  }
  return scored
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, limit)
    .map(([n]) => n);
}

/** Standalone SVG painted with currentColor, so it can be used as a CSS mask or inline. */
export function iconSvg(name: string): string | undefined {
  const hit = svgCache.get(name);
  if (hit) return hit;
  const data = getIconData(set, name);
  if (!data) return undefined;
  const { attributes, body } = iconToSVG(data, { height: "1em" });
  const attrs = Object.entries({ xmlns: "http://www.w3.org/2000/svg", ...attributes })
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  const svg = `<svg ${attrs}>${replaceIDs(body).replaceAll("#000", "currentColor").replaceAll("#fff", "transparent")}</svg>`;
  svgCache.set(name, svg);
  return svg;
}
