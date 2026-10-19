// node:fs/promises for the in-browser demo: exactly the calls the server's
// stores make (readFile, writeFile, readdir, mkdir, rename, rm, stat), with
// Node's semantics where the stores depend on them (missing parent → throws,
// rename replaces, rm force ignores absence). Files live in memory and are
// written through to IndexedDB, because a browser may stop an idle service
// worker at any moment. Read-only mounts map a folder to URLs (built-in fonts).

type FileNode = { kind: "file"; data: Uint8Array; mtimeMs: number };
type DirNode = { kind: "dir"; mtimeMs: number };
type Node = FileNode | DirNode;

const nodes = new Map<string, Node>([["/", { kind: "dir", mtimeMs: Date.now() }]]);
const mounts: { prefix: string; base: string }[] = [];

/** Where writes go besides memory. Absent in tests; IndexedDB in the worker. */
export interface Persistence {
  load(): Promise<[string, Node][]>;
  put(path: string, node: Node): Promise<void>;
  remove(path: string): Promise<void>;
  clear(): Promise<void>;
}
let persistence: Persistence | null = null;

export async function usePersistence(p: Persistence | null): Promise<void> {
  persistence = p;
  if (!p) return;
  for (const [path, node] of await p.load()) nodes.set(path, node);
}

/** Serve `prefix/…` read-only from `base` + the rest of the path. */
export function mount(prefix: string, base: string): void {
  mounts.push({ prefix: norm(prefix), base });
}

/** Forget every file (the sandbox's "start over"). */
export async function reset(): Promise<void> {
  nodes.clear();
  nodes.set("/", { kind: "dir", mtimeMs: Date.now() });
  await persistence?.clear();
}

class FsError extends Error {
  constructor(
    public code: "ENOENT" | "ENOTDIR" | "EISDIR" | "EEXIST",
    syscall: string,
    path: string,
  ) {
    super(`${code}: ${syscall} '${path}'`);
  }
}

function norm(p: string): string {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}
const parent = (p: string): string => (p === "/" ? "/" : p.slice(0, p.lastIndexOf("/")) || "/");

function mounted(p: string): string | null {
  for (const m of mounts) if (p === m.prefix || p.startsWith(m.prefix + "/")) return m.base + p.slice(m.prefix.length + 1);
  return null;
}

async function save(path: string, node: Node): Promise<void> {
  nodes.set(path, node);
  await persistence?.put(path, node);
}

export async function readFile(path: string, encoding?: "utf8" | { encoding: "utf8" }): Promise<any> {
  const p = norm(path);
  const url = mounted(p);
  let data: Uint8Array;
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new FsError("ENOENT", "open", p);
    data = new Uint8Array(await res.arrayBuffer());
  } else {
    const n = nodes.get(p);
    if (!n) throw new FsError("ENOENT", "open", p);
    if (n.kind === "dir") throw new FsError("EISDIR", "read", p);
    data = n.data.slice();
  }
  return encoding ? new TextDecoder().decode(data) : data;
}

export async function writeFile(path: string, data: Uint8Array | string): Promise<void> {
  const p = norm(path);
  const dir = nodes.get(parent(p));
  if (!dir) throw new FsError("ENOENT", "open", p);
  if (dir.kind !== "dir") throw new FsError("ENOTDIR", "open", p);
  if (nodes.get(p)?.kind === "dir") throw new FsError("EISDIR", "open", p);
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  await save(p, { kind: "file", data: bytes, mtimeMs: Date.now() });
}

export async function readdir(path: string): Promise<string[]> {
  const p = norm(path);
  const n = nodes.get(p);
  if (!n) throw new FsError("ENOENT", "scandir", p);
  if (n.kind !== "dir") throw new FsError("ENOTDIR", "scandir", p);
  const prefix = p === "/" ? "/" : p + "/";
  const names: string[] = [];
  for (const key of nodes.keys()) {
    if (key === p || !key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    if (!rest.includes("/")) names.push(rest);
  }
  return names.sort();
}

export async function mkdir(path: string, opts?: { recursive?: boolean }): Promise<void> {
  const p = norm(path);
  const existing = nodes.get(p);
  if (existing) {
    if (existing.kind === "dir" && opts?.recursive) return;
    throw new FsError("EEXIST", "mkdir", p);
  }
  if (!nodes.has(parent(p))) {
    if (!opts?.recursive) throw new FsError("ENOENT", "mkdir", p);
    await mkdir(parent(p), opts);
  }
  await save(p, { kind: "dir", mtimeMs: Date.now() });
}

export async function rename(from: string, to: string): Promise<void> {
  const a = norm(from);
  const b = norm(to);
  const n = nodes.get(a);
  if (!n) throw new FsError("ENOENT", "rename", a);
  if (!nodes.has(parent(b))) throw new FsError("ENOENT", "rename", b);
  if (n.kind === "dir") throw new FsError("EISDIR", "rename", a); // the stores only move files
  nodes.delete(a);
  await persistence?.remove(a);
  await save(b, n);
}

export async function rm(path: string, opts?: { force?: boolean }): Promise<void> {
  const p = norm(path);
  const n = nodes.get(p);
  if (!n) {
    if (opts?.force) return;
    throw new FsError("ENOENT", "rm", p);
  }
  if (n.kind === "dir") throw new FsError("EISDIR", "rm", p);
  nodes.delete(p);
  await persistence?.remove(p);
}

export async function stat(path: string): Promise<{ mtimeMs: number; size: number; isFile(): boolean; isDirectory(): boolean }> {
  const p = norm(path);
  const n = nodes.get(p);
  if (!n) throw new FsError("ENOENT", "stat", p);
  return {
    mtimeMs: n.mtimeMs,
    size: n.kind === "file" ? n.data.byteLength : 0,
    isFile: () => n.kind === "file",
    isDirectory: () => n.kind === "dir",
  };
}

/** IndexedDB write-through, one record per path. */
export function indexedDbPersistence(name = "agelace-sandbox"): Persistence {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  let db: Promise<IDBDatabase> | null = null;
  const tx = async (mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<unknown> => {
    const d = await (db ??= open());
    return new Promise((resolve, reject) => {
      const t = d.transaction("files", mode);
      const req = fn(t.objectStore("files"));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
    });
  };
  return {
    async load() {
      const keys = (await tx("readonly", (s) => s.getAllKeys())) as string[];
      const values = (await tx("readonly", (s) => s.getAll())) as Node[];
      return keys.map((k, i) => [k, values[i]!] as [string, Node]);
    },
    put: async (path, node) => void (await tx("readwrite", (s) => s.put(node, path))),
    remove: async (path) => void (await tx("readwrite", (s) => s.delete(path))),
    clear: async () => void (await tx("readwrite", (s) => s.clear())),
  };
}
