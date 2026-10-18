import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { EntrySummary, WorldEvent } from "@agelace/shared";
import { buildApp } from "../src/app.js";

let dir: string;
let app: FastifyInstance;

// compose.yaml sets AGELACE_POLL=1, so this is the watcher the friend runs.
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "agelace-watch-"));
  app = await buildApp({ worldDir: dir, builtinFontsDir: join(dir, "nope"), watch: true, poll: true });
  await new Promise((r) => setTimeout(r, 1000)); // let the first scan finish
});
afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const next = (want: (e: WorldEvent) => boolean) =>
  new Promise<WorldEvent>((resolve) => {
    const fn = (e: WorldEvent) => {
      if (!want(e)) return;
      app.worldEvents.delete(fn);
      resolve(e);
    };
    app.worldEvents.add(fn);
  });

describe("outside edits, polling", () => {
  it("a page written into entries/ by hand reaches the index", async () => {
    const made = (await app.inject({ method: "POST", url: "/api/entries", payload: { title: "Salt", kind: "place" } })).json();
    const copy = { ...JSON.parse(await readFile(join(dir, "entries", `${made.id}.json`), "utf8")), id: "iron", title: "Iron" };
    const seen = next((e) => e.type === "entry" && e.id === "iron");
    await writeFile(join(dir, "entries", "iron.json"), JSON.stringify(copy));
    expect(await seen).toMatchObject({ type: "entry", id: "iron", op: "upsert" });
    const list = (await app.inject("/api/entries")).json() as EntrySummary[];
    expect(list.map((e) => e.title)).toContain("Iron");
  }, 10_000);

  it("a font dropped into fonts/ announces itself", async () => {
    const seen = next((e) => e.type === "fonts");
    await writeFile(join(dir, "fonts", "Dropped.ttf"), new Uint8Array(64));
    expect(await seen).toMatchObject({ type: "fonts" });
  }, 10_000);
});
