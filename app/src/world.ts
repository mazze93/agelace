import { useSyncExternalStore } from "react";
import type { EntrySummary, WorldMeta } from "@agelace/shared";
import { api } from "./api";

// Small app-wide store for the world index. Entries' bodies are fetched per page.
interface WorldState {
  meta: WorldMeta | null;
  entries: EntrySummary[];
  byId: Map<string, EntrySummary>;
}

let state: WorldState = { meta: null, entries: [], byId: new Map() };
const listeners = new Set<() => void>();
const set = (next: Partial<WorldState>): void => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export async function refreshEntries(): Promise<void> {
  const entries = await api.entries();
  set({ entries, byId: new Map(entries.map((e) => [e.id, e])) });
}

export async function refreshMeta(): Promise<void> {
  set({ meta: await api.world() });
}

export function getWorld(): WorldState {
  return state;
}

export function useWorld(): WorldState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
