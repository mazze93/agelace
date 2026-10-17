import type { Entry, EntryDraft, EntryPatch, EntrySummary, FontFaceInfo, WorldEvent, WorldMeta } from "@agelace/shared";

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? {} : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  world: () => call<WorldMeta>("GET", "/api/world"),
  setWorld: (patch: Partial<WorldMeta>) => call<WorldMeta>("PATCH", "/api/world", patch),
  entries: () => call<EntrySummary[]>("GET", "/api/entries"),
  entry: (id: string) => call<Entry>("GET", `/api/entries/${encodeURIComponent(id)}`),
  create: (draft: EntryDraft) => call<Entry>("POST", "/api/entries", draft),
  patch: (id: string, patch: EntryPatch) => call<Entry>("PATCH", `/api/entries/${encodeURIComponent(id)}`, patch),
  remove: (id: string) => call<void>("DELETE", `/api/entries/${encodeURIComponent(id)}`),
  fonts: () => call<FontFaceInfo[]>("GET", "/api/fonts"),
  icons: (q: string, limit = 120) => call<string[]>("GET", `/api/icons?q=${encodeURIComponent(q)}&limit=${limit}`),
  uploadFont: async (file: File): Promise<{ file: string }> => {
    const res = await fetch(`/api/fonts?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: file,
    });
    const json = (await res.json()) as { file: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? `upload failed (${res.status})`);
    return json;
  },
};

export const iconUrl = (name: string): string => `/api/icons/${encodeURIComponent(name)}.svg`;

/** Server-sent world events; reconnects on its own (EventSource does). */
export function subscribe(onEvent: (e: WorldEvent) => void): () => void {
  const es = new EventSource("/api/events");
  es.onmessage = (m) => {
    try {
      onEvent(JSON.parse(m.data as string) as WorldEvent);
    } catch {
      /* ignore malformed frames */
    }
  };
  return () => es.close();
}
