// In the worker build, demo/build.mjs answers this import with an empty icon
// set (a JSON placeholder) instead of the 6 MB file. The worker fills it from
// /icons/game-icons.json, a static file the browser caches, before the first
// request. Browsers keep a private window's storage in memory with a small
// quota, and a worker carrying the whole set failed to install there.
import set from "@iconify-json/game-icons/icons.json" with { type: "json" };

export async function loadIconSet(url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`icon set: ${res.status}`);
  Object.assign(set, (await res.json()) as object);
}
