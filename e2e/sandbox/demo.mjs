// The in-browser sandbox, end to end: demo/dist served on localhost (a secure
// context, so service workers run) with the headers Cloudflare Pages will send.
// Run with scripts/demo-check.sh. Exits non-zero on any failure.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIR = process.env.DEMO_DIR ?? "/demo";
const out = process.env.SHOTS ?? "/e2e/shots";
const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(name);
};

// ── a static host that honours demo/dist/_headers, as Pages does ──
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json", ".txt": "text/plain", ".wasm": "application/wasm" };
const rules = [];
{
  let cur = null;
  for (const line of (await readFile(join(DIR, "_headers"), "utf8")).split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) rules.push((cur = { pattern: line.trim(), headers: {} }));
    else if (cur) {
      const i = line.indexOf(":");
      cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
}
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = normalize(join(DIR, path));
  if (!file.startsWith(DIR)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    return res.writeHead(404).end();
  }
  for (const r of rules) if (r.pattern === "/*" || r.pattern === path) for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(4173, "127.0.0.1", r));
const BASE = "http://localhost:4173";

const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const api = (method, url, body) =>
  page.evaluate(async ([method, url, body]) => {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, type: res.headers.get("content-type"), body: res.status === 204 ? null : (res.headers.get("content-type") ?? "").includes("json") ? await res.json() : null };
  }, [method, url, body]);

// ── it starts, says what it is, and the worker is the server ──
await page.goto(BASE);
await page.waitForSelector(".sandbox-ribbon", { timeout: 30000 });
check("the sandbox ribbon says what this is", (await page.locator(".sandbox-ribbon").innerText()).includes("stays in this browser"));
check("a service worker controls the page", await page.evaluate(() => !!navigator.serviceWorker.controller));
const seeded = await api("GET", "/api/entries");
check("the seeded world is there", seeded.status === 200 && seeded.body.map((e) => e.id).sort().join() === "how-to-begin,the-age-before-names");
await page.waitForTimeout(800);
await shot("s1-home");

// ── the real UI against the worker: open a seeded page ──
await page.goto(`${BASE}/#/e/how-to-begin`);
await page.waitForSelector(".ProseMirror", { timeout: 15000 });
check("a seeded page opens in the editor", (await page.locator(".ProseMirror").innerText()).length > 40);
await shot("s2-entry");

// ── writes persist, even when the browser stops the worker ──
const made = await api("POST", "/api/entries", { title: "The Moon, stolen", kind: "chronicle" });
check("creating a page through the worker", made.status === 201);
const cdp = await context.newCDPSession(page);
await cdp.send("ServiceWorker.enable");
await cdp.send("ServiceWorker.stopAllWorkers");
await page.reload();
await page.waitForSelector(".sandbox-ribbon", { timeout: 30000 });
const after = await api("GET", "/api/entries/the-moon-stolen");
check("it survives the worker being stopped", after.status === 200 && after.body?.title === "The Moon, stolen");

// ── a board: Yjs over the worker, Mermaid under the page's CSP ──
const board = await api("POST", "/api/canvases", { name: "Heist plan" });
await page.goto(`${BASE}/#/c/${board.body.id}`);
await page.waitForSelector(".board-bar");
await page.getByRole("button", { name: "Timeline", exact: true }).click();
await page.waitForSelector(".mermaid-out svg", { timeout: 15000 }).catch(() => {});
check("a Mermaid timeline renders under the CSP", (await page.locator(".mermaid-out svg").count()) > 0);
await page.waitForTimeout(1200);
const state = await page.evaluate(async (id) => (await fetch(`/api/canvases/${id}/state`)).arrayBuffer().then((b) => b.byteLength), board.body.id);
check("the board's Yjs state is saved by the worker", state > 40, `${state} bytes`);
await shot("s3-board");

// ── the Forge: cast a real font in the browser, served back by the worker ──
const hand = await api("POST", "/api/hands", { family: "Moonthief" });
const { id, format, created, updated, cast: _c, ...rest } = hand.body;
const line = (x0, y0, x1, y1) => ({ pts: Array.from({ length: 41 }, (_, i) => [x0 + ((x1 - x0) * i) / 40, y0 + ((y1 - y0) * i) / 40, 0.5]).flat() });
await api("PUT", `/api/hands/${id}`, { ...rest, glyphs: { L: { strokes: [line(100, 690, 100, 0), line(100, 0, 420, 0)] } } });
const cast = await api("POST", `/api/hands/${id}/cast`);
check("the Forge casts in the browser", cast.status === 201 && cast.body?.file === "Moonthief.otf", JSON.stringify(cast.body));
const fonts = await api("GET", "/api/fonts");
const mine = fonts.body.find((f) => f.family === "Moonthief");
const otf = mine ? await page.evaluate(async (u) => { const r = await fetch(u); return [r.status, r.headers.get("content-type"), new Uint8Array(await r.arrayBuffer()).subarray(0, 4)]; }, mine.url) : null;
check("the cast font is served back as an OpenType file", !!otf && otf[0] === 200 && otf[1] === "font/otf" && String.fromCharCode(...Object.values(otf[2])) === "OTTO");
check("built-in faces load from the static host", fonts.body.filter((f) => f.source === "builtin").length > 50);
await page.goto(`${BASE}/#/forge`);
await page.waitForSelector(".drawer-open", { timeout: 15000 });
await page.waitForTimeout(800);
await shot("s4-forge");

// ── nothing leaves: every request stays on this origin ──
const offsite = [];
page.on("request", (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) offsite.push(r.url()); });
await page.goto(`${BASE}/#/pattern`);
await page.waitForTimeout(2500);
await shot("s5-pattern");
check("no request leaves the sandbox's origin", !offsite.length, offsite.slice(0, 3).join(" "));

// ── start over ──
await page.getByRole("button", { name: "Start over" }).click();
await page.waitForSelector(".sandbox-ribbon", { timeout: 30000 });
await page.waitForTimeout(500);
const fresh = await api("GET", "/api/entries");
check("Start over returns to the seeded world", fresh.body.map((e) => e.id).sort().join() === "how-to-begin,the-age-before-names");

// ── small screens ──
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE);
await page.waitForSelector(".sandbox-ribbon");
await page.getByText("Unwritten", { exact: false }).last().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1200);
const titled = await page.evaluate(() => [...document.querySelectorAll("main h1, main [class*=title]")].some((el) => el.textContent?.includes("Unwritten") && el.getBoundingClientRect().height > 0));
check("390px: the world's title shows on the home page", titled);
const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check("390px: no sideways scroll with the ribbon", over <= 0, `${over}px`);
await shot("s6-phone");

// Known and pre-existing (see e2e/boards.mjs): Excalidraw's subset worker.
const unexpected = errors.filter((e) => !/Failed to use workers for subsetting/.test(e));
check("no console errors (CSP included)", !unexpected.length, unexpected.slice(0, 3).join(" | "));
await browser.close();
server.close();
if (failures.length) {
  console.error(`\n${failures.length} failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nall sandbox checks passed");
