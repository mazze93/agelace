// Press screenshots for the landing page and the friend's guide: a small,
// invented sample world (not mazze's manuscripts), built through the real API
// on a throwaway agelace, then each room captured at 2x. Run with
// scripts/press-shots.sh. Exits non-zero if a room fails to render.
import { chromium } from "playwright";
import * as Y from "yjs";

const BASE = process.env.BASE ?? "http://agelace-press:8080";
const out = process.env.SHOTS ?? "/e2e/shots/press";
const failures = [];
const must = (name, ok) => {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) failures.push(name);
};
const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body instanceof Uint8Array ? { "content-type": "application/octet-stream" } : body ? { "content-type": "application/json" } : {},
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : (res.headers.get("content-type") ?? "").includes("json") ? res.json() : res.arrayBuffer();
};

// ── a world ──
const p = (...content) => ({ type: "paragraph", content });
const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });
const link = (e) => ({ type: "wikiLink", attrs: { id: e.id, label: e.title } });
const face = (fontFamily) => ({ type: "textStyle", attrs: { fontFamily } });

await api("PATCH", "/api/world", { name: "The Lamplit Archive", epigraph: "What the lamps saw, the archive keeps." });
const tallow = await api("POST", "/api/entries", { title: "The Age of Tallow", kind: "age", status: "canon", doc: { type: "doc", content: [p(t("Before gas, before the glass mantles, every street was lit by hand."))] } });
const quarter = await api("POST", "/api/entries", { title: "The Drowned Quarter", kind: "place", status: "question", doc: { type: "doc", content: [p(t("The streets below the river line. Nobody agrees on when the water came in."))] } });
const odile = await api("POST", "/api/entries", { title: "Odile Varre", kind: "person", status: "proposed", doc: { type: "doc", content: [p(t("Keeper of the lamp-rolls. She lived in "), link(quarter), t(" and never once let it go dark."))] } });
const compact = await api("POST", "/api/entries", { title: "The Lantern Compact", kind: "thing", status: "canon", doc: { type: "doc", content: [p(t("Signed in "), link(tallow), t(": every lamplighter swears to keep one light burning, whatever is ordered."))] } });
const night = await api("POST", "/api/entries", {
  title: "The Night the Lamps Went Out",
  kind: "chronicle",
  status: "proposed",
  doc: {
    type: "doc",
    content: [
      { type: "paragraph", attrs: { dropCap: true }, content: [t("It began, as these things do, with an order nobody would admit to signing. At the ninth bell every lamp in "), link(quarter), t(" was to be put out, "), t("by authority of the Board", [face("IM Fell English")]), t(".")] },
      p(t("Only "), link(odile), t(" refused. She held the "), link(compact), t(" above everything"), { type: "footnote", attrs: { text: "The lamp-rolls record her answer in four words, and a smudge where the fifth should be." } }, t(", and so one window stayed lit, and the archive kept what that window saw.")),
    ],
  },
});
must("sample world created", !!night?.id);

// ── a board ──
const board = await api("POST", "/api/canvases", { name: "The Night of the Lamps" });
const doc = new Y.Doc();
const nodes = doc.getMap("nodes");
const edges = doc.getMap("edges");
const ink = doc.getMap("ink");
let z = 1;
const node = (id, props) => {
  const m = new Y.Map();
  for (const [k, v] of Object.entries({ z: z++, ...props })) m.set(k, v);
  nodes.set(id, m);
};
doc.transact(() => {
  node("region", { type: "region", x: 60, y: 300, w: 760, h: 380, label: "The Drowned Quarter" });
  node("night", { type: "entry", entryId: night.id, x: 100, y: 360, w: 300, h: 190 });
  node("odile", { type: "entry", entryId: odile.id, x: 480, y: 360, w: 280, h: 170 });
  node("compact", { type: "entry", entryId: compact.id, x: 900, y: 380, w: 280, h: 170 });
  node("seal", { type: "seal", icon: "candle-light", color: "var(--ink-rubric)", x: 560, y: 560, w: 120, h: 120, label: "One light" });
  const src = new Y.Text();
  src.insert(0, "timeline\n  title The Lamps\n  The Age of Tallow : the Compact is signed\n  The Ninth Bell : the order comes\n             : Odile refuses\n  After : the archive remembers");
  node("tl", { type: "mermaid", source: src, x: 100, y: 40, w: 620, h: 220 });
  node("note", { type: "text", x: 900, y: 120, w: 280, h: 130 });
  // Text cards keep their words in a Y.XmlFragment under "body" (TextCard.tsx).
  const body = new Y.XmlFragment();
  nodes.get("note").set("body", body);
  const para = new Y.XmlElement("paragraph");
  para.insert(0, [new Y.XmlText("Who signed the order? Nobody will say.")]);
  body.insert(0, [para]);
  for (const [id, from, to, label] of [["e1", "night", "odile", "she refused"], ["e2", "odile", "compact", "sworn to"], ["e3", "note", "compact", "?"]]) {
    const m = new Y.Map();
    m.set("from", from);
    m.set("to", to);
    m.set("label", label);
    edges.set(id, m);
  }
  const pts = new Y.Array();
  const flat = [];
  for (let i = 0; i <= 40; i++) flat.push(780 + i * 4, 610 - Math.sin(i / 6) * 30, 0.35 + 0.4 * Math.sin((i / 40) * Math.PI));
  pts.push(flat);
  const stroke = new Y.Map();
  stroke.set("points", pts);
  stroke.set("color", "var(--ink-rubric)");
  stroke.set("size", 7);
  ink.set("s1", stroke);
}, "press");
await api("POST", `/api/canvases/${board.id}/update`, Y.encodeStateAsUpdate(doc));

// ── a hand, drawn and cast ──
const hand = await api("POST", "/api/hands", { family: "Lamplighter" });
const { id: handId, format, created, updated, cast: _c, ...rest } = hand;
const line = (x0, y0, x1, y1) => ({ pts: Array.from({ length: 41 }, (_, i) => [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * i) / 40, 0.5]).flat() });
const arc = (cx, cy, r, a0, a1) => ({ pts: Array.from({ length: 49 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 48; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.5]; }).flat() });
const glyphs = {
  L: { strokes: [line(100, 690, 100, 0), line(100, 0, 420, 0)] },
  A: { strokes: [line(60, 0, 280, 690), line(280, 690, 500, 0), line(150, 250, 410, 250)] },
  M: { strokes: [line(80, 0, 120, 690), line(120, 690, 330, 200), line(330, 200, 540, 690), line(540, 690, 580, 0)] },
  P: { strokes: [line(100, 0, 100, 690), arc(100, 520, 170, Math.PI / 2, -Math.PI / 2)] },
  O: { strokes: [arc(320, 345, 300, 0, Math.PI * 2)] },
};
await api("PUT", `/api/hands/${handId}`, { ...rest, glyphs });
const cast = await api("POST", `/api/hands/${handId}/cast`);
must("a hand is cast", cast.file === "Lamplighter.otf");

// ── the rooms ──
const browser = await chromium.launch();
const errors = [];
async function shoot(name, hash, { wait, lamp = "light", width = 1440, height = 900, after } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: lamp === "dark" ? "dark" : "light" });
  page.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await page.addInitScript((l) => { try { localStorage.setItem("agelace-theme", l); } catch {} }, lamp);
  await page.goto(`${BASE}/${hash}`);
  const ok = await page.waitForSelector(wait, { timeout: 20000 }).then(() => true, () => false);
  await page.evaluate(() => document.fonts.ready);
  if (after) await after(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}.png` });
  must(`${name}: ${wait} rendered`, ok);
  await page.close();
}

await shoot("home", "", { wait: "main h1" });
await shoot("entry", `#/e/${night.id}`, { wait: ".ProseMirror" });
await shoot("entry-night", `#/e/${night.id}`, { wait: ".ProseMirror", lamp: "dark" });
await shoot("board", `#/c/${board.id}`, { wait: ".mermaid-out svg", after: async (pg) => { await pg.keyboard.press("Shift+1"); } });
await shoot("board-night", `#/c/${board.id}`, { wait: ".mermaid-out svg", lamp: "dark", after: async (pg) => { await pg.keyboard.press("Shift+1"); } });
await shoot("pattern", "#/pattern", { wait: ".pattern-node, [class*=seal]", after: async (pg) => pg.waitForTimeout(2500) });
await shoot("forge-case", "#/forge", { wait: ".drawer-open" });
await shoot("forge-desk", `#/forge/hands/${handId}`, { wait: ".hand-sheet" });
await shoot("phone-entry", `#/e/${night.id}`, { wait: ".ProseMirror", width: 390, height: 844 });

await browser.close();
must("no page errors", !errors.length);
if (errors.length) console.error(errors.join("\n"));
if (failures.length) {
  console.error(`\n${failures.length} failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\npress shots in", out);
