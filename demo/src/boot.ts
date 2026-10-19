// The sandbox's front door. Only the demo build imports this (main.tsx checks
// VITE_AGELACE_DEMO, so the normal build drops it). It installs the service
// worker that plays the server, waits until that worker controls the page,
// and puts a ribbon on screen saying what this is, with a way to start over.
// (A mode the app is in should be visible and reversible where it happens.)

const SW_URL = "/sandbox-sw.js";

export async function startSandbox(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    explain(
      "This sandbox needs a browser feature that's switched off here (service workers). " +
        "Private windows in some browsers turn it off. Try a normal window, or download agelace to run it yourself.",
    );
    throw new Error("no service worker");
  }
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    explain(`The sandbox couldn't start: ${(err as Error).message}`);
    throw err;
  }
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
  }
  ribbon();
}

function ribbon(): void {
  const bar = document.createElement("aside");
  bar.className = "sandbox-ribbon";
  bar.setAttribute("aria-label", "Sandbox");
  const style = document.createElement("style");
  style.textContent = `
    .sandbox-ribbon { position: fixed; z-index: 2147483000; left: 50%; bottom: 12px; transform: translateX(-50%);
      display: flex; gap: .75rem; align-items: center; max-width: calc(100vw - 24px); box-sizing: border-box;
      padding: .45rem .55rem .45rem .9rem; border: 1px solid var(--color-rule); border-radius: 999px;
      background: var(--color-paper-raised); color: var(--color-ink-soft); box-shadow: var(--shadow-leaf);
      font: 500 .78rem/1.2 var(--font-label); letter-spacing: .04em; }
    .sandbox-ribbon b { color: var(--color-accent); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .sandbox-ribbon a, .sandbox-ribbon button { font: inherit; color: var(--color-ink); background: none; cursor: pointer;
      border: 1px solid var(--color-rule); border-radius: 999px; padding: .3rem .7rem; text-decoration: none; white-space: nowrap; }
    .sandbox-ribbon a:hover, .sandbox-ribbon button:hover { border-color: var(--color-accent); }
    .sandbox-ribbon :focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
    @media (max-width: 560px) { .sandbox-ribbon .sandbox-say { display: none; } }
  `;
  const label = document.createElement("b");
  label.textContent = "Sandbox";
  const say = document.createElement("span");
  say.className = "sandbox-say";
  say.textContent = "Everything you make stays in this browser.";
  const over = document.createElement("button");
  over.type = "button";
  over.textContent = "Start over";
  over.addEventListener("click", async () => {
    over.disabled = true;
    over.textContent = "Clearing…";
    await fetch("/__sandbox/reset", { method: "POST" });
    location.hash = "";
    location.reload();
  });
  const get = document.createElement("a");
  get.href = "https://mazzeleczzare.com/agelace/";
  get.textContent = "Get agelace";
  bar.append(label, say, over, get);
  document.head.append(style);
  document.body.append(bar);
}

function explain(text: string): void {
  const p = document.createElement("p");
  p.style.cssText = "max-width:34rem;margin:20vh auto;padding:0 16px;font:1.1rem/1.5 Georgia,serif";
  p.textContent = text;
  document.body.replaceChildren(p);
}
