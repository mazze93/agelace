import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomHex } from "./bytes.js";
import {
  Entry,
  type EntryDraft,
  type EntryPatch,
  type EntrySummary,
  type Id,
  KIND_SIGIL,
  WorldMeta,
  emptyDoc,
  extractLinks,
  plainText,
  slugify,
} from "@agelace/shared";

/**
 * A world is one folder on the host:
 *
 *   world.json            name, epigraph, format version
 *   entries/<id>.json     one Entry per file (lossless rich doc)
 *   canvases/<id>.yjs     boards (Yjs docs), plus a write-only <id>.canvas export
 *   assets/               images, maps
 *   fonts/                user fonts — drop a file in, it appears in the forge
 *   forge/<id>.json       hands drawn in the forge (cast into fonts/)
 *   .trash/               deleted entries land here, never hard-deleted
 *
 * The in-memory index is a cache; the folder is the truth. `invalidate()`
 * is called by the watcher when something outside the app edits a file.
 */
export class WorldStore {
  readonly root: string;
  private index: Map<Id, Entry> | null = null;
  /** Paths we wrote ourselves recently — the watcher ignores their echo. */
  readonly recentWrites = new Map<string, number>();

  constructor(root: string) {
    this.root = root;
  }

  get entriesDir(): string {
    return join(this.root, "entries");
  }
  get fontsDir(): string {
    return join(this.root, "fonts");
  }
  get assetsDir(): string {
    return join(this.root, "assets");
  }

  async init(seed?: (store: WorldStore) => Promise<void>): Promise<void> {
    for (const d of ["entries", "canvases", "assets", "fonts", "forge", ".trash"]) {
      await mkdir(join(this.root, d), { recursive: true });
    }
    const fresh = !(await exists(join(this.root, "world.json")));
    if (fresh) {
      await this.writeJson(join(this.root, "world.json"), {
        name: "An Unwritten World",
        epigraph: "",
        format: 1,
      } satisfies WorldMeta);
      if (seed) await seed(this);
    }
  }

  async meta(): Promise<WorldMeta> {
    return WorldMeta.parse(JSON.parse(await readFile(join(this.root, "world.json"), "utf8")));
  }

  async setMeta(patch: Partial<WorldMeta>): Promise<WorldMeta> {
    const next = WorldMeta.parse({ ...(await this.meta()), ...patch, format: 1 });
    await this.writeJson(join(this.root, "world.json"), next);
    return next;
  }

  invalidate(): void {
    this.index = null;
  }

  private async load(): Promise<Map<Id, Entry>> {
    if (this.index) return this.index;
    const map = new Map<Id, Entry>();
    for (const name of await readdir(this.entriesDir)) {
      if (!name.endsWith(".json") || name.startsWith(".")) continue;
      const path = join(this.entriesDir, name);
      try {
        const parsed = Entry.safeParse(JSON.parse(await readFile(path, "utf8")));
        if (parsed.success) map.set(parsed.data.id, parsed.data);
        else console.warn(`[store] skipping invalid entry ${name}: ${parsed.error.issues[0]?.message}`);
      } catch (err) {
        // A half-synced or hand-edited file must never take the whole world down.
        console.warn(`[store] unreadable entry ${name}: ${(err as Error).message}`);
      }
    }
    this.index = map;
    return map;
  }

  async list(): Promise<EntrySummary[]> {
    const map = await this.load();
    return [...map.values()]
      .map(({ doc, ...rest }) => ({ ...rest, links: extractLinks(doc), excerpt: plainText(doc, 240) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async get(id: Id): Promise<Entry | undefined> {
    return (await this.load()).get(id);
  }

  async create(draft: EntryDraft): Promise<Entry> {
    const map = await this.load();
    const base = slugify(draft.title);
    let id = base;
    for (let n = 2; map.has(id); n++) id = `${base}-${n}`;
    const now = new Date().toISOString();
    const entry = Entry.parse({
      id,
      title: draft.title,
      kind: draft.kind,
      status: draft.status ?? "question",
      sigil: draft.sigil ?? KIND_SIGIL[draft.kind],
      tags: draft.tags ?? [],
      doc: draft.doc ?? emptyDoc(),
      created: now,
      updated: now,
    });
    await this.persist(entry);
    return entry;
  }

  async patch(id: Id, patch: EntryPatch): Promise<Entry | undefined> {
    const current = await this.get(id);
    if (!current) return undefined;
    const next = Entry.parse({ ...current, ...patch, id, created: current.created, updated: new Date().toISOString() });
    await this.persist(next);
    return next;
  }

  async remove(id: Id): Promise<boolean> {
    const map = await this.load();
    if (!map.has(id)) return false;
    const from = join(this.entriesDir, `${id}.json`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.markWrite(from);
    await rename(from, join(this.root, ".trash", `${id}.${stamp}.json`));
    map.delete(id);
    return true;
  }

  private async persist(entry: Entry): Promise<void> {
    await this.writeJson(join(this.entriesDir, `${entry.id}.json`), entry);
    (await this.load()).set(entry.id, entry);
  }

  markWrite(path: string): void {
    const now = Date.now();
    for (const [p, t] of this.recentWrites) if (now - t > 10_000) this.recentWrites.delete(p);
    this.recentWrites.set(path, now);
  }

  /**
   * Atomic write: temp file in the same directory, then rename over the target.
   * A crash or a sync client mid-read never sees a half-written file.
   */
  async writeJson(path: string, value: unknown): Promise<void> {
    await this.writeBytes(path, JSON.stringify(value, null, 2) + "\n");
  }

  async writeBytes(path: string, data: Uint8Array | string): Promise<void> {
    const tmp = `${path}.${randomHex(4)}.tmp`;
    await writeFile(tmp, data);
    this.markWrite(path);
    try {
      await rename(tmp, path);
    } catch (err) {
      await rm(tmp, { force: true });
      throw err;
    }
  }
}


async function exists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
