import { beforeEach, describe, expect, it } from "vitest";
import * as fs from "../src/fs";
import * as path from "../src/path";

beforeEach(async () => fs.reset());

describe("fs shim: the Node semantics the stores rely on", () => {
  it("writes need an existing parent; mkdir -p makes one", async () => {
    await expect(fs.writeFile("/w/a.json", "{}")).rejects.toThrow(/ENOENT/);
    await fs.mkdir("/w/entries", { recursive: true });
    await fs.mkdir("/w/entries", { recursive: true }); // idempotent
    await expect(fs.mkdir("/w/entries")).rejects.toThrow(/EEXIST/);
    await fs.writeFile("/w/entries/a.json", '{"x":1}');
    expect(await fs.readFile("/w/entries/a.json", "utf8")).toBe('{"x":1}');
  });

  it("readdir lists direct children only, sorted", async () => {
    await fs.mkdir("/w/b/deep", { recursive: true });
    await fs.writeFile("/w/z.txt", "");
    await fs.writeFile("/w/b/deep/x.txt", "");
    expect(await fs.readdir("/w")).toEqual(["b", "z.txt"]);
    await expect(fs.readdir("/nope")).rejects.toThrow(/ENOENT/);
  });

  it("rename replaces the target, rm force ignores absence", async () => {
    await fs.mkdir("/w", { recursive: true });
    await fs.writeFile("/w/a.tmp", "new");
    await fs.writeFile("/w/a", "old");
    await fs.rename("/w/a.tmp", "/w/a");
    expect(await fs.readFile("/w/a", "utf8")).toBe("new");
    await expect(fs.readFile("/w/a.tmp")).rejects.toThrow(/ENOENT/);
    await fs.rm("/w/a.tmp", { force: true });
    await expect(fs.rm("/w/a.tmp")).rejects.toThrow(/ENOENT/);
  });

  it("returns copies, so a caller can't mutate the stored bytes", async () => {
    await fs.mkdir("/w", { recursive: true });
    await fs.writeFile("/w/b", new Uint8Array([1, 2, 3]));
    const got = (await fs.readFile("/w/b")) as Uint8Array;
    got[0] = 9;
    expect(Array.from((await fs.readFile("/w/b")) as Uint8Array)).toEqual([1, 2, 3]);
  });

  it("writes through to persistence and loads it back", async () => {
    const saved = new Map<string, unknown>();
    const p: fs.Persistence = {
      load: async () => [...saved] as never,
      put: async (k, v) => void saved.set(k, v),
      remove: async (k) => void saved.delete(k),
      clear: async () => saved.clear(),
    };
    await fs.usePersistence(p);
    await fs.mkdir("/w", { recursive: true });
    await fs.writeFile("/w/kept", "yes");
    await fs.usePersistence(null);
    // A fresh worker: memory gone, persistence remains.
    await fs.reset();
    saved.set("/w", { kind: "dir", mtimeMs: 1 });
    saved.set("/w/kept", { kind: "file", data: new TextEncoder().encode("yes"), mtimeMs: 1 });
    await fs.usePersistence(p);
    expect(await fs.readFile("/w/kept", "utf8")).toBe("yes");
    await fs.usePersistence(null);
  });
});

describe("path shim matches node:path on the stores' inputs", () => {
  it.each([
    [["/world", "entries"], "/world/entries"],
    [["/world/", "./fonts", "a.otf"], "/world/fonts/a.otf"],
    [["/world", "..", "x"], "/x"],
  ])("join %j", (parts, want) => expect(path.join(...parts)).toBe(want));
  it("basename / extname / relative", () => {
    expect(path.basename("/w/fonts/Moon Thief.otf", ".otf")).toBe("Moon Thief");
    expect(path.extname("map.final.PNG")).toBe(".PNG");
    expect(path.extname(".trash")).toBe("");
    expect(path.relative("/world", "/world/entries/a.json")).toBe("entries/a.json");
  });
});
