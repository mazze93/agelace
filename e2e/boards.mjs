// Boards, end to end, where the dependency overrides live: Mermaid 12 (lodash-es,
// katex), Excalidraw (nanoid 3) and Excalidraw's own Mermaid-to-Excalidraw
// converter (nanoid 5, a major jump from the 4.x it was published against).
// Run with scripts/browser-check.sh. Exits non-zero on any failure.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://host.docker.internal:8091";
const out = process.env.SHOTS ?? "/e2e/shots";
const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures.push(name);
};
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

const board = await (await fetch(`${BASE}/api/canvases`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Overrides probe" }),
})).json();
await page.goto(`${BASE}/#/c/${board.id}`);
await page.waitForSelector(".board-bar");

// ── Mermaid 12: a timeline renders, then maths in a label (KaTeX) ──
await page.getByRole("button", { name: "Timeline", exact: true }).click();
await page.waitForSelector(".mermaid-out svg", { timeout: 15000 });
check("a Mermaid timeline renders", (await page.locator(".mermaid-out svg text, .mermaid-out svg foreignObject").count()) > 0);
await page.locator(".card-mermaid").first().dblclick();
const src = page.getByLabel("Diagram source");
await src.waitFor();
await src.fill('flowchart LR\n  A["$$E = mc^2$$"] --> B[the Moon]');
await page.locator(".board-bar").click({ position: { x: 4, y: 4 } });
await page.waitForFunction(() => document.querySelector(".mermaid-out")?.innerHTML.includes("katex"), null, { timeout: 15000 }).catch(() => {});
check("KaTeX typesets maths in a Mermaid label", await page.evaluate(() => !!document.querySelector(".mermaid-out .katex, .mermaid-out [class*=katex]")));
await shot("b1-mermaid");

// ── Excalidraw: the Sketchbook opens ──
// Placing a sketch card opens the Sketchbook straight away.
await page.getByRole("button", { name: "Sketch", exact: true }).click();
await page.waitForSelector('[role=dialog][aria-label="Sketchbook"] .excalidraw', { timeout: 20000 });
check("the Sketchbook (Excalidraw) opens", true);

// ── Excalidraw's Mermaid-to-Excalidraw converter (nanoid 5) ──
const sketchbook = page.locator('[role=dialog][aria-label="Sketchbook"]');
await sketchbook.locator('[data-testid="toolbar-more-tools"], button[title="More tools"]').first().click();
await page.getByText("Mermaid to Excalidraw", { exact: false }).first().click();
const ttd = page.locator(".ttd-dialog");
await ttd.waitFor({ timeout: 15000 });
await ttd.locator("textarea").first().fill("flowchart TD\n  Crown --> Moon\n  Moon --> Thief");
await page.waitForTimeout(1200);
await ttd.getByRole("button", { name: /insert/i }).click();
await page.waitForTimeout(800);
await shot("b2-sketch-mermaid");
await sketchbook.getByRole("button", { name: "Done" }).click();
await page.waitForSelector("img.card-sketch", { timeout: 15000 }).catch(() => {});
const preview = await page.evaluate(() => {
  const img = document.querySelector("img.card-sketch");
  return img ? decodeURIComponent(img.getAttribute("src") ?? "") : "";
});
check("converted flowchart lands on the board", ["Crown", "Moon", "Thief"].every((w) => preview.includes(w)), `${preview.length} chars`);
await shot("b3-board");

// ── a long title wraps instead of clipping (it used to be an <input>) ──
const long = await (await fetch(`${BASE}/api/entries`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "The Night the Lamps Went Out Over the Drowned Quarter", kind: "chronicle" }),
})).json();
await page.goto(`${BASE}/#/e/${long.id}`);
await page.waitForSelector(".leaf-title");
await page.waitForTimeout(600);
const fit = await page.evaluate(() => {
  const el = document.querySelector(".leaf-title");
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return { clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1, lines: Math.round(el.clientHeight / lh) };
});
check("a long title wraps instead of clipping", !fit.clipped && fit.lines >= 2, JSON.stringify(fit));
await page.locator(".leaf-title").click();
await page.keyboard.press("End");
await page.keyboard.press("Enter");
check("Enter in the title moves into the text", await page.evaluate(() => !!document.activeElement?.closest(".ProseMirror")));
await shot("b4-long-title");

// Known, pre-existing (main@9e73923 too): Vite splits Excalidraw's font-subset
// worker so it imports the Sketchbook chunk, which needs a window; Excalidraw
// then subsets on the main thread. Logged as Open in docs/journal/CHECKPOINT.md.
const unexpected = errors.filter((e) => !/Failed to use workers for subsetting/.test(e));
check("no unexpected console errors", !unexpected.length, unexpected.join(" | "));
await browser.close();
if (failures.length) {
  console.error(`\n${failures.length} failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("\nall board checks passed");
