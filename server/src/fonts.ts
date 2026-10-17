import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { parse as parseFont } from "opentype.js";
import type { FontFaceInfo } from "@agelace/shared";

const FORMATS: Record<string, FontFaceInfo["format"]> = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype",
};

export const isFontFile = (name: string): boolean => extname(name).toLowerCase() in FORMATS;

/** Built-in faces ship with a manifest written by scripts/collect-fonts.mjs. */
interface BuiltinManifestRow {
  family: string;
  file: string;
  weight: string;
  style: "normal" | "italic";
  unicodeRange?: string;
  license?: string;
  category?: string;
}

export async function listBuiltinFonts(dir: string): Promise<FontFaceInfo[]> {
  try {
    const rows = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as BuiltinManifestRow[];
    return rows.map((r) => ({
      ...r,
      url: `/fonts/builtin/${encodeURIComponent(r.file)}`,
      format: FORMATS[extname(r.file).toLowerCase()] ?? "woff2",
      source: "builtin" as const,
    }));
  } catch {
    return [];
  }
}

// Parsing a font is the expensive part; key by name + mtime-free content length.
const nameCache = new Map<string, Pick<FontFaceInfo, "family" | "weight" | "style">>();

/**
 * User fonts: whatever sits in <world>/fonts. Family/weight/style come from the
 * font's own name and OS/2 tables when opentype.js can read it (ttf/otf/woff);
 * woff2 needs brotli which opentype.js lacks, so those fall back to the filename.
 */
export async function listWorldFonts(dir: string): Promise<FontFaceInfo[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const out: FontFaceInfo[] = [];
  for (const file of names.sort()) {
    if (file.startsWith(".") || !isFontFile(file)) continue;
    const ext = extname(file).toLowerCase();
    const buf = await readFile(join(dir, file));
    const key = `${file}:${buf.byteLength}`;
    let meta = nameCache.get(key);
    if (!meta) {
      meta = describe(file, ext, buf);
      nameCache.set(key, meta);
    }
    out.push({
      ...meta,
      file,
      url: `/fonts/world/${encodeURIComponent(file)}`,
      format: FORMATS[ext]!,
      source: "world",
    });
  }
  return out;
}

function describe(file: string, ext: string, buf: Buffer): Pick<FontFaceInfo, "family" | "weight" | "style"> {
  const fallback = fromFilename(file);
  if (ext === ".woff2") return fallback;
  try {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    const font = parseFont(ab);
    const names = font.names as unknown as Record<string, Record<string, string> | undefined>;
    const family =
      names["typographicFamily"]?.["en"] ?? names["preferredFamily"]?.["en"] ?? names["fontFamily"]?.["en"];
    const os2 = font.tables["os2"] as { usWeightClass?: number; fsSelection?: number } | undefined;
    const italic = ((os2?.fsSelection ?? 0) & 1) === 1 || /italic|oblique/i.test(names["fontSubfamily"]?.["en"] ?? "");
    return {
      family: family?.trim() || fallback.family,
      weight: String(os2?.usWeightClass ?? fallback.weight),
      style: italic ? "italic" : "normal",
    };
  } catch {
    return fallback;
  }
}

const WEIGHT_WORDS: [RegExp, string][] = [
  [/thin|hairline/i, "100"],
  [/extra-?light|ultra-?light/i, "200"],
  [/light/i, "300"],
  [/medium/i, "500"],
  [/semi-?bold|demi/i, "600"],
  [/extra-?bold|ultra-?bold/i, "800"],
  [/black|heavy/i, "900"],
  [/bold/i, "700"],
];

export function fromFilename(file: string): Pick<FontFaceInfo, "family" | "weight" | "style"> {
  const stem = basename(file, extname(file));
  const style = /italic|oblique/i.test(stem) ? "italic" : "normal";
  const weight = WEIGHT_WORDS.find(([re]) => re.test(stem))?.[1] ?? "400";
  const family = stem
    .replace(/[-_ ]?(regular|italic|oblique|thin|hairline|extra-?light|ultra-?light|light|medium|semi-?bold|demi|extra-?bold|ultra-?bold|bold|black|heavy|\d{3})\b/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return { family: family || stem, weight, style };
}

/** Accept an uploaded font. The filename is reduced to a safe, portable form. */
export async function saveWorldFont(dir: string, rawName: string, data: Buffer): Promise<string> {
  const ext = extname(rawName).toLowerCase();
  if (!(ext in FORMATS)) throw new Error(`unsupported font type ${ext || "(none)"}`);
  if (!looksLikeFont(data)) throw new Error("file is not a font");
  const stem =
    basename(rawName, extname(rawName))
      .normalize("NFKD")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .slice(0, 80) || "font";
  const file = `${stem}${ext}`;
  await writeFile(join(dir, file), data);
  return file;
}

/** Magic numbers: TrueType, OpenType CFF, WOFF, WOFF2. */
export function looksLikeFont(data: Buffer): boolean {
  if (data.byteLength < 12) return false;
  const tag = data.subarray(0, 4);
  const hex = tag.toString("hex");
  return hex === "00010000" || ["OTTO", "true", "wOFF", "wOF2"].includes(tag.toString("latin1"));
}
