import { useSyncExternalStore } from "react";
import type { FontFaceInfo } from "@agelace/shared";
import { api } from "./api";

export interface FontFamily {
  family: string;
  source: FontFaceInfo["source"];
  category: string;
  faces: FontFaceInfo[];
}

// One registry for the whole app: every face from /api/fonts becomes a real
// FontFace in document.fonts, so any span in any entry can use any family.
let families: FontFamily[] = [];
const loaded = new Map<string, FontFace>();
const listeners = new Set<() => void>();

const key = (f: FontFaceInfo): string => `${f.source}:${f.file}`;

export async function refreshFonts(): Promise<void> {
  const faces = await api.fonts();
  const seen = new Set<string>();
  for (const f of faces) {
    const k = key(f);
    seen.add(k);
    if (loaded.has(k)) continue;
    const face = new FontFace(f.family, `url("${f.url}") format("${f.format}")`, {
      weight: f.weight,
      style: f.style,
      display: "swap",
      ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}),
    });
    document.fonts.add(face);
    loaded.set(k, face);
    // Faces load lazily when text first uses them; nothing blocks here.
  }
  for (const [k, face] of loaded) {
    if (!seen.has(k)) {
      document.fonts.delete(face);
      loaded.delete(k);
    }
  }
  const byFamily = new Map<string, FontFamily>();
  for (const f of faces) {
    const fam = byFamily.get(f.family) ?? { family: f.family, source: f.source, category: f.category ?? "yours", faces: [] };
    fam.faces.push(f);
    byFamily.set(f.family, fam);
  }
  families = [...byFamily.values()].sort((a, b) =>
    a.source === b.source ? a.family.localeCompare(b.family) : a.source === "world" ? -1 : 1,
  );
  listeners.forEach((l) => l());
}

export function useFontFamilies(): FontFamily[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => families,
  );
}
