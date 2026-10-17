import * as Y from "yjs";
import { api, subscribe } from "../api";
import { REMOTE } from "./model";

export type SyncState = "loading" | "set" | "wet" | "drying" | "blotted" | "missing";

/**
 * Minimal Yjs provider over plain HTTP + the shared SSE stream.
 *
 *   load   GET  /state            → full state
 *   push   POST /update           ← merged local updates (debounced)
 *   pull   GET  /state?sv=…        → only what we're missing, on another
 *                                    client's "canvas" event
 *
 * CRDT merges make ordering irrelevant, so a dropped push is simply retried.
 * Swapping this for y-websocket later changes nothing above it.
 */
export class CanvasSync {
  readonly doc = new Y.Doc();
  readonly id: string;
  private queue: Uint8Array[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private inflight: Promise<void> | null = null;
  private unsub: (() => void) | null = null;
  private listeners = new Set<(s: SyncState) => void>();
  state: SyncState = "loading";

  constructor(id: string) {
    this.id = id;
    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE) return;
      this.queue.push(update);
      this.set("wet");
      this.schedule(250);
    });
  }

  onState(fn: (s: SyncState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private set(s: SyncState): void {
    this.state = s;
    this.listeners.forEach((l) => l(s));
  }

  async start(): Promise<void> {
    try {
      Y.applyUpdate(this.doc, await api.canvasState(this.id), REMOTE);
    } catch {
      this.set("missing");
      return;
    }
    this.set("set");
    this.unsub = subscribe((e) => {
      if (e.type === "canvas" && e.id === this.id && e.op === "upsert") void this.pull();
      if (e.type === "canvas" && e.id === this.id && e.op === "delete") this.set("missing");
    });
    window.addEventListener("pagehide", this.onHide);
  }

  async pull(): Promise<void> {
    try {
      Y.applyUpdate(this.doc, await api.canvasState(this.id, Y.encodeStateVector(this.doc)), REMOTE);
    } catch {
      /* next event or the next push will reconcile */
    }
  }

  private schedule(ms: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  async flush(keepalive = false): Promise<void> {
    clearTimeout(this.timer);
    if (this.inflight) await this.inflight;
    if (!this.queue.length) return;
    const merged = Y.mergeUpdates(this.queue);
    this.queue = [];
    this.set("drying");
    this.inflight = api
      .canvasUpdate(this.id, merged, keepalive)
      .then(() => {
        if (!this.queue.length) this.set("set");
      })
      .catch(() => {
        this.queue.unshift(merged);
        this.set("blotted");
        this.schedule(3000);
      })
      .finally(() => (this.inflight = null));
    await this.inflight;
  }

  private onHide = (): void => void this.flush(true);

  async stop(): Promise<void> {
    window.removeEventListener("pagehide", this.onHide);
    this.unsub?.();
    await this.flush(true);
    this.doc.destroy();
  }
}
