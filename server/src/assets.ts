import { writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { hex, latin1, randomHex } from "./bytes.js";

// Images only — this folder is served back to the browser, so nothing that
// could execute (no SVG with scripts, no HTML) is accepted.
const SIGNATURES: [string, (b: Uint8Array) => boolean][] = [
  [".png", (b) => hex(b.subarray(0, 8)) === "89504e470d0a1a0a"],
  [".jpg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  [".jpeg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  [".gif", (b) => latin1(b.subarray(0, 4)) === "GIF8"],
  [".webp", (b) => latin1(b.subarray(0, 4)) === "RIFF" && latin1(b.subarray(8, 12)) === "WEBP"],
  [".avif", (b) => latin1(b.subarray(4, 12)).startsWith("ftypavi")],
];

export const isAssetFile = (path: string): boolean => SIGNATURES.some(([ext]) => path.toLowerCase().endsWith(ext));

export async function saveAsset(dir: string, rawName: string, data: Uint8Array): Promise<string> {
  const ext = extname(rawName).toLowerCase();
  const sig = SIGNATURES.find(([e]) => e === ext);
  if (!sig) throw new Error(`images only (png, jpg, gif, webp, avif) — got ${ext || "no extension"}`);
  if (!sig[1](data)) throw new Error("that file isn't the image it claims to be");
  const stem =
    basename(rawName, extname(rawName))
      .normalize("NFKD")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "image";
  // A short suffix keeps two "map.png" uploads from overwriting each other.
  const file = `${stem}-${randomHex(3)}${ext}`;
  await writeFile(join(dir, file), data);
  return file;
}
