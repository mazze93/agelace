#!/usr/bin/env node
// Copies the curated built-in faces out of @fontsource into server/fonts-builtin
// and writes manifest.json (family, weight, style, unicode-range, licence).
// Runs at image build time; the output is gitignored.
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? join(root, "server", "fonts-builtin");
const require = createRequire(join(root, "package.json"));

// id → [weights, include italics?]. A library, not a costume box: book faces
// first, a few voices for old tongues and hands, nothing novelty.
const CURATED = {
  "im-fell-english": [[400], true],
  "im-fell-english-sc": [[400], false],
  "im-fell-dw-pica": [[400], true],
  "alegreya": [[400, 700], true],
  "alegreya-sc": [[400, 700], true],
  "alegreya-sans-sc": [[300, 500, 800], false],
  "eb-garamond": [[400, 600], true],
  "cormorant-garamond": [[300, 500, 700], true],
  "spectral": [[300, 400, 600], true],
  "libre-baskerville": [[400, 700], true],
  "uncial-antiqua": [[400], false],
  "unifrakturmaguntia": [[400], false],
  "noto-sans-runic": [[400], false],
  "caveat": [[400, 700], false],
  "kalam": [[300, 400], false],
};
const SUBSETS = new Set(["latin", "latin-ext", "runic"]);

await mkdir(out, { recursive: true });
const manifest = [];
for (const [id, [weights, italics]] of Object.entries(CURATED)) {
  const dir = dirname(require.resolve(`@fontsource/${id}/package.json`));
  const meta = JSON.parse(await readFile(join(dir, "metadata.json"), "utf8"));
  const ranges = JSON.parse(await readFile(join(dir, "unicode.json"), "utf8"));
  const files = await readdir(join(dir, "files"));
  for (const subset of meta.subsets.filter((s) => SUBSETS.has(s))) {
    for (const w of weights) {
      for (const style of italics ? ["normal", "italic"] : ["normal"]) {
        const file = `${id}-${subset}-${w}-${style}.woff2`;
        if (!files.includes(file)) continue;
        await copyFile(join(dir, "files", file), join(out, file));
        manifest.push({
          family: meta.family,
          file,
          weight: String(w),
          style,
          unicodeRange: ranges[subset],
          license: meta.license.type,
          category: meta.category,
        });
      }
    }
  }
  await copyFile(join(dir, "LICENSE"), join(out, `${id}.LICENSE.txt`));
}
await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`collected ${manifest.length} faces from ${Object.keys(CURATED).length} families → ${out}`);
