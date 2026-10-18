// The Forge, end to end, in headless Chromium against a throwaway agelace.
// Run with scripts/browser-check.sh (it builds the image, starts a fresh world,
// and runs this inside the Playwright container). Exits non-zero on any failure.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://host.docker.internal:8081";
const out = process.env.SHOTS ?? "/e2e/shots";
const log = (...a) => console.log("•", ...a);
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
const api = (p, init) => page.evaluate(async ([p, init]) => (await fetch(p, init)).json(), [p, init]);

const epigraphBefore = (await (await fetch(`${BASE}/api/world`)).json()).epigraph;

// ── type case ──
await page.goto(`${BASE}/#/forge`);
await page.waitForSelector(".drawer-open");
await page.waitForTimeout(800);
log("drawers:", await page.locator(".drawer-open").count());
await shot("01-case");
await page.locator(".drawer-open", { hasText: "Uncial Antiqua" }).click();
await page.waitForSelector(".proof-sheet");
check("proof sheet takes focus", (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "Close the proof");
await page.keyboard.press("Escape");
check("Escape closes it and returns focus", (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "Open Uncial Antiqua");
await page.locator(".drawer-open", { hasText: "Uncial Antiqua" }).click();
await page.waitForSelector(".proof-sheet");
await page.waitForTimeout(500);
await shot("02-proof");
await page.getByRole("button", { name: "Pair as display" }).click();
await page.waitForURL(/pairing/);
check("Pair as display goes to pairing", page.url().endsWith("#/forge/pairing"));

// ── pairing ──
await page.waitForSelector(".pair-leaf");
await page.waitForTimeout(600);
check("the chosen face arrives in the display slot", (await page.locator(".pair-slot").first().innerText()).includes("Uncial Antiqua"));
await shot("03-pairing-draft");
await page.locator(".pair-list button", { hasText: "Garamond's Room" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Set as the world's hand" }).click();
await page.waitForTimeout(700);
check("world's hand saved", (await api("/api/world")).typeset?.display === "Cormorant Garamond");
check("world's hand applied app-wide", (await page.evaluate(() => document.documentElement.style.getPropertyValue("--font-display"))).startsWith('"Cormorant Garamond"'));
await shot("04-pairing-hand");
await page.getByPlaceholder("Name this pairing…").fill("For the Moon");
await page.getByRole("button", { name: "Keep", exact: true }).click();
await page.waitForTimeout(500);
check("pairing kept", JSON.stringify((await api("/api/world")).pairings?.map((p) => p.name)) === '["For the Moon"]');
check("epigraph survives settings saves", (await api("/api/world")).epigraph === epigraphBefore && epigraphBefore !== "", JSON.stringify(epigraphBefore));
await page.getByRole("button", { name: "Return to the archive's hand" }).click();
await page.waitForTimeout(500);
check("return to the archive's hand", (await page.evaluate(() => document.documentElement.style.getPropertyValue("--font-display"))) === "");

// ── scriptorium ──
await page.goto(`${BASE}/#/forge/hands`);
await page.getByPlaceholder("Name a new hand…").fill("Moonthief");
await page.getByRole("button", { name: "Begin a hand" }).click();
await page.waitForURL(/hands\/moonthief/);
await page.waitForSelector(".hand-sheet");
await page.waitForTimeout(400);
await shot("05-desk-empty");

/** font units → page pixels, through the sheet's own transform */
const toPage = (x, y) =>
  page.evaluate(([x, y]) => {
    const svg = document.querySelector(".hand-sheet");
    const p = new DOMPoint(x, -y).matrixTransform(svg.getScreenCTM());
    return [p.x, p.y];
  }, [x, y]);
const stroke = async (pts) => {
  const [x0, y0] = await toPage(...pts[0]);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = pts[i - 1];
    const [c, d] = pts[i];
    for (let t = 1; t <= 8; t++) {
      const [x, y] = await toPage(a + ((c - a) * t) / 8, b + ((d - b) * t) / 8);
      await page.mouse.move(x, y);
    }
  }
  await page.mouse.up();
};
const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});
const P = Math.PI;
const X = 450, C = 690, A = 800;
const LETTERS = {
  H: [[[300, C], [300, 0]], [[620, C], [620, 0]], [[300, 360], [620, 360]]],
  M: [[[250, 0], [270, C], [460, 200], [650, C], [670, 0]]],
  o: [arc(460, X / 2, 170, X / 2, 0, 2 * P, 20)],
  w: [[[260, X], [340, 0], [450, 320], [560, 0], [640, X]]],
  t: [[[440, 620], [440, 60], [500, 0], [560, 40]], [[340, X], [580, X]]],
  s: [[[600, 400], [480, X], [350, 380], [380, 260], [540, 200], [590, 80], [470, 0], [330, 50]]],
  e: [[[300, 230], [620, 230], ...arc(460, 225, 160, 225, 0, 1.75 * P, 16)]],
  a: [arc(450, 200, 150, 190, 0.1, 2 * P + 0.1, 18), [[600, X], [600, 0]]],
  l: [[[460, A], [460, 0]]],
  h: [[[320, A], [320, 0]], [[320, 280], ...arc(460, 280, 140, 170, P, 0, 10), [600, 0]]],
  n: [[[320, X], [320, 0]], [[320, 280], ...arc(460, 280, 140, 170, P, 0, 10), [600, 0]]],
};
// The sheet listens for typed characters on window; click on empty chrome first so no input has focus.
for (const [ch, strokes] of Object.entries(LETTERS)) {
  await page.locator(".forge-title").click();
  await page.keyboard.press(ch);
  await page.waitForTimeout(60);
  for (const s of strokes) await stroke(s);
}
await page.locator(".hand-proof input").fill("How to steal the Moon");
await page.waitForTimeout(1500);
const saved = await api("/api/hands/moonthief");
check("eleven letters drawn and saved", Object.keys(saved.glyphs).sort().join("") === "MHaehlnostw".split("").sort().join(""), Object.keys(saved.glyphs).join(""));
await shot("06-desk-written");

// undo / redo (Cmd/Ctrl-Z through the app's router)
await page.locator(".forge-title").click();
await page.keyboard.press("n");
const before = (await api("/api/hands/moonthief")).glyphs.n.strokes.length;
await page.keyboard.press("Control+z");
await page.waitForTimeout(1200);
const afterUndo = (await api("/api/hands/moonthief")).glyphs.n?.strokes.length ?? 0;
await page.keyboard.press("Control+Shift+z");
await page.waitForTimeout(1200);
const afterRedo = (await api("/api/hands/moonthief")).glyphs.n.strokes.length;
check("undo and redo", afterUndo === before - 1 && afterRedo === before, `${before} → ${afterUndo} → ${afterRedo}`);

// eraser tool: scrub across the H's crossbar
await page.keyboard.press("H");
await page.getByTitle("Eraser (or flip your stylus)").click();
await stroke([[420, 360], [500, 360]]);
await page.getByTitle("Pen").click();
await page.waitForTimeout(1200);
check("eraser removes the crossbar", (await api("/api/hands/moonthief")).glyphs.H.strokes.length === 2);
await page.keyboard.press("Control+z");
await page.waitForTimeout(1200);
check("undoing the erase restores it", (await api("/api/hands/moonthief")).glyphs.H.strokes.length === 3);

// a stylus: synthetic pen pointer events with pressure, then the eraser end (buttons=32)
await page.keyboard.press("i");
const penResult = await page.evaluate(async () => {
  const svg = document.querySelector(".hand-sheet");
  const at = (x, y) => new DOMPoint(x, -y).matrixTransform(svg.getScreenCTM());
  const fire = (type, x, y, pressure, buttons = 1) => {
    const p = at(x, y);
    svg.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: "pen", clientX: p.x, clientY: p.y, pressure, buttons, button: 0, isPrimary: true }));
  };
  fire("pointerdown", 460, 440, 0.2);
  for (let i = 1; i <= 20; i++) fire("pointermove", 460, 440 - i * 22, 0.2 + i * 0.035);
  fire("pointerup", 460, 0, 0);
  // a palm resting on the screen while the stylus is in use must not draw
  const palm = at(700, 300);
  svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, pointerType: "touch", clientX: palm.x, clientY: palm.y, buttons: 1, isPrimary: false }));
  svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch", clientX: palm.x, clientY: palm.y }));
  fire("pointerdown", 300, 700, 0.5);
  fire("pointerup", 300, 700, 0);
  await new Promise((r) => setTimeout(r, 1300));
  const g = (await (await fetch("/api/hands/moonthief")).json()).glyphs.i;
  const ps = g.strokes[0].pts.filter((_, k) => k % 3 === 2);
  return { strokes: g.strokes.length, pen: g.strokes[0].pen, pressure: [ps[0], ps[ps.length - 1]] };
});
check("stylus pressure saved and palm ignored", penResult.strokes === 2 && penResult.pen === true && penResult.pressure[0] < penResult.pressure[1], JSON.stringify(penResult));
check("stylus mode is visible", await page.locator(".sheet-stylus").isVisible());
await page.getByRole("button", { name: "Let fingers draw" }).click();
const fingers = await page.evaluate(async () => {
  const svg = document.querySelector(".hand-sheet");
  const p = new DOMPoint(700, -300).matrixTransform(svg.getScreenCTM());
  svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 11, pointerType: "touch", clientX: p.x, clientY: p.y, buttons: 1 }));
  svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 11, pointerType: "touch", clientX: p.x, clientY: p.y }));
  await new Promise((r) => setTimeout(r, 1300));
  return (await (await fetch("/api/hands/moonthief")).json()).glyphs.i.strokes.length;
});
check("Let fingers draw re-enables touch", fingers === 3);
await page.keyboard.press("Control+z");
await page.waitForTimeout(900);
const eraseEnd = await page.evaluate(async () => {
  const svg = document.querySelector(".hand-sheet");
  const at = (x, y) => new DOMPoint(x, -y).matrixTransform(svg.getScreenCTM());
  const p = at(460, 220);
  svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 8, pointerType: "pen", clientX: p.x, clientY: p.y, pressure: 0.5, buttons: 32 }));
  svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 8, pointerType: "pen", clientX: p.x, clientY: p.y }));
  await new Promise((r) => setTimeout(r, 1300));
  return (await (await fetch("/api/hands/moonthief")).json()).glyphs.i?.strokes.length ?? 0;
});
check("the stylus eraser end erases", eraseEnd === 1);
await page.keyboard.press("Control+z");
await page.waitForTimeout(900);

// nib change re-inks everything
await page.getByRole("radio", { name: /Quill/ }).click();
await page.waitForTimeout(900);
await shot("07-desk-quill");
await page.getByRole("radio", { name: /Broad edge/ }).click();
await page.waitForTimeout(600);

// cast, racing the autosave: draw then cast at once
await page.keyboard.press("l");
await stroke([[600, 700], [600, 100]]);
await page.getByRole("button", { name: /Cast the type/ }).click();
await page.waitForSelector(".cast-proof", { timeout: 15000 });
check("cast reports its file", (await page.locator(".bench-cast .bench-note").innerText()).includes("world/fonts/Moonthief.otf"));
const loaded = await page.evaluate(async () => {
  await document.fonts.load('40px "Moonthief"', "How");
  return document.fonts.check('40px "Moonthief"', "How");
});
check("the browser loads the cast font", loaded);
check("a stroke drawn just before casting was saved first", (await api("/api/hands/moonthief")).glyphs.l.strokes.length === 2);
const fonts = await api("/api/fonts");
check("the cast font is served at weight 400", fonts.some((f) => f.family === "Moonthief" && f.weight === "400"));
await page.waitForTimeout(500);
await shot("08-desk-cast");

// a second hand with the same name is refused, with a reason, and nothing is overwritten
await page.goto(`${BASE}/#/forge/hands`);
await page.getByPlaceholder("Name a new hand…").fill("Moonthief");
await page.getByRole("button", { name: "Begin a hand" }).click();
await page.waitForURL(/moonthief-2/);
await page.waitForSelector(".hand-sheet");
await page.locator(".forge-title").click();
await page.keyboard.press("o");
await stroke([[300, 200], [600, 200]]);
await page.waitForTimeout(1000);
await page.getByRole("button", { name: /Cast the type/ }).click();
await page.waitForTimeout(1200);
check("a second Moonthief is refused, nothing overwritten", (await page.locator(".bench-cast .bench-note").innerText()).includes("didn't make"));
await page.goto(`${BASE}/#/forge/pairing/x`);
await page.waitForTimeout(500);
check("#/forge/pairing/x is not a hand desk", (await page.locator(".hand-desk").count()) === 0);

// the type case shows it on "Your own"
await page.goto(`${BASE}/#/forge`);
await page.getByRole("button", { name: /Your own/ }).click();
await page.waitForTimeout(800);
check("the cast hand is on Your own", (await page.locator(".drawer-label span").allInnerTexts()).includes("Moonthief"));
await shot("09-case-yours");

// narrow screen
await page.setViewportSize({ width: 500, height: 900 });
for (const [hash, name] of [["#/forge", "10-narrow-case"], ["#/forge/pairing", "11-narrow-pairing"], ["#/forge/hands/moonthief", "12-narrow-desk"]]) {
  await page.goto(`${BASE}/${hash}`);
  await page.waitForTimeout(900);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`${name}: no sideways scroll at 500px`, over <= 0, `${over}px`);
  await shot(name);
}
// dark lamp
await page.setViewportSize({ width: 1440, height: 980 });
await page.emulateMedia({ colorScheme: "dark" });
await page.goto(`${BASE}/#/forge/hands/moonthief`);
await page.waitForTimeout(900);
await shot("13-dark-desk");
await page.goto(`${BASE}/#/forge/pairing`);
await page.waitForTimeout(900);
await shot("14-dark-pairing");

// The refused second cast is an expected 409; the browser logs it as a failed resource.
const unexpected = errors.filter((e) => !/status of 409/.test(e));
check("no unexpected console errors", !unexpected.length, unexpected.join(" | "));
await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED: ${failures.join("; ")}` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
