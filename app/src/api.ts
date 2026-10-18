import {
  CLIENT_HEADER,
  type CanvasSummary,
  type Entry,
  type EntryDraft,
  type EntryPatch,
  type EntrySummary,
  type FontFaceInfo,
  type Hand,
  type HandSummary,
  type HandWrite,
  type WorldEvent,
  type WorldMeta,
  type WorldPatch,
} from "@agelace/shared";

/** One id per tab: the server stamps events with it so we can ignore our own echoes. */
// getRandomValues, not randomUUID: the latter only exists in secure contexts,
// and a tablet reaching agelace over plain http on the LAN is not one.
export const CLIENT_ID: string = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const idHeader = { [CLIENT_HEADER]: CLIENT_ID };

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? idHeader : { ...idHeader, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  world: () => call<WorldMeta>("GET", "/api/world"),
  setWorld: (patch: WorldPatch) => call<WorldMeta>("PATCH", "/api/world", patch),
  entries: () => call<EntrySummary[]>("GET", "/api/entries"),
  entry: (id: string) => call<Entry>("GET", `/api/entries/${encodeURIComponent(id)}`),
  create: (draft: EntryDraft) => call<Entry>("POST", "/api/entries", draft),
  patch: (id: string, patch: EntryPatch) => call<Entry>("PATCH", `/api/entries/${encodeURIComponent(id)}`, patch),
  remove: (id: string) => call<void>("DELETE", `/api/entries/${encodeURIComponent(id)}`),
  fonts: () => call<FontFaceInfo[]>("GET", "/api/fonts"),
  icons: (q: string, limit = 120) => call<string[]>("GET", `/api/icons?q=${encodeURIComponent(q)}&limit=${limit}`),
  uploadFont: (file: File) => upload<{ file: string }>(`/api/fonts?name=${encodeURIComponent(file.name)}`, file),
  uploadAsset: (file: File) => upload<{ file: string; url: string }>(`/api/assets?name=${encodeURIComponent(file.name)}`, file),

  hands: () => call<HandSummary[]>("GET", "/api/hands"),
  hand: (id: string) => call<Hand>("GET", `/api/hands/${encodeURIComponent(id)}`),
  createHand: (family: string) => call<Hand>("POST", "/api/hands", { family }),
  saveHand: (id: string, hand: HandWrite) => call<Hand>("PUT", `/api/hands/${encodeURIComponent(id)}`, hand),
  removeHand: (id: string) => call<void>("DELETE", `/api/hands/${encodeURIComponent(id)}`),
  castHand: async (id: string): Promise<{ file: string; family: string; glyphs: number; bytes: number }> => {
    const res = await fetch(`/api/hands/${encodeURIComponent(id)}/cast`, { method: "POST", headers: idHeader });
    const json = (await res.json()) as { file: string; family: string; glyphs: number; bytes: number; error?: string };
    if (!res.ok) throw new Error(json.error ?? `cast failed (${res.status})`);
    return json;
  },

  canvases: () => call<CanvasSummary[]>("GET", "/api/canvases"),
  createCanvas: (name: string) => call<CanvasSummary>("POST", "/api/canvases", { name }),
  removeCanvas: (id: string) => call<void>("DELETE", `/api/canvases/${encodeURIComponent(id)}`),
  canvasState: async (id: string, sv?: Uint8Array): Promise<Uint8Array> => {
    const q = sv ? `?sv=${toBase64Url(sv)}` : "";
    const res = await fetch(`/api/canvases/${encodeURIComponent(id)}/state${q}`, { headers: idHeader });
    if (!res.ok) throw new Error(`canvas ${id} → ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
  canvasUpdate: async (id: string, update: Uint8Array, keepalive = false): Promise<void> => {
    const res = await fetch(`/api/canvases/${encodeURIComponent(id)}/update`, {
      method: "POST",
      headers: { ...idHeader, "content-type": "application/octet-stream" },
      body: update as BodyInit,
      keepalive,
    });
    if (!res.ok) throw new Error(`canvas update → ${res.status}`);
  },
};

async function upload<T>(url: string, file: File): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { ...idHeader, "content-type": "application/octet-stream" }, body: file });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `upload failed (${res.status})`);
  return json;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const iconUrl = (name: string): string => `/api/icons/${encodeURIComponent(name)}.svg`;

/**
 * Server-sent world events, multiplexed over ONE EventSource per tab (browsers
 * allow only ~6 connections per host over HTTP/1.1). EventSource reconnects on
 * its own. Pass `includeOwn` to also receive echoes of this tab's changes.
 */
type Listener = { fn: (e: WorldEvent) => void; includeOwn: boolean };
const listeners = new Set<Listener>();
let source: EventSource | null = null;

export function subscribe(fn: (e: WorldEvent) => void, includeOwn = false): () => void {
  const l: Listener = { fn, includeOwn };
  listeners.add(l);
  if (!source) {
    source = new EventSource("/api/events");
    source.onmessage = (m) => {
      let e: WorldEvent;
      try {
        e = JSON.parse(m.data as string) as WorldEvent;
      } catch {
        return;
      }
      const own = e.by === CLIENT_ID;
      for (const x of listeners) if (!own || x.includeOwn) x.fn(e);
    };
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size) {
      source?.close();
      source = null;
    }
  };
}
