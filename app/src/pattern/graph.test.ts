import { describe, expect, it } from "vitest";
import type { CanvasSummary, EntryKind, EntrySummary, Status } from "@agelace/shared";
import { radiusOf, weave, type PatternFilter } from "./graph";

const entry = (id: string, links: string[] = [], status: Status = "canon", kind: EntryKind = "chronicle"): EntrySummary => ({
  id,
  title: id,
  kind,
  status,
  sigil: "quill",
  tags: [],
  created: "",
  updated: "",
  links,
  excerpt: "",
});
const board = (id: string, entries: string[], threads: CanvasSummary["threads"] = []): CanvasSummary => ({ id, name: id, updated: "", nodes: entries.length, entries, threads });

const ALL: PatternFilter = {
  statuses: new Set<Status>(["canon", "proposed", "question"]),
  kinds: new Set<EntryKind>(["chronicle", "person", "place", "age", "thing", "note"]),
  boards: true,
};

describe("weave", () => {
  it("turns wikilinks into strands, merging a link written both ways", () => {
    const p = weave([entry("a", ["b"]), entry("b", ["a"]), entry("c", ["a", "ghost"])], [], ALL);
    expect(p.strands.map((s) => [s.key, s.mutual])).toEqual([
      ["link:e:a|e:b", true],
      ["link:e:a|e:c", false],
    ]);
    expect(p.nodes.find((n) => n.ref === "a")?.degree).toBe(2);
  });

  it("weaves boards in with their threads and labels", () => {
    const p = weave([entry("a"), entry("b")], [board("map", ["a", "b"], [{ from: "a", to: "b", label: "betrays" }]), board("empty", [])], ALL);
    expect(p.nodes.map((n) => n.key).sort()).toEqual(["b:map", "e:a", "e:b"]);
    expect(p.strands.find((s) => s.kind === "thread")?.labels).toEqual(["betrays"]);
    expect(p.strands.filter((s) => s.kind === "holds")).toHaveLength(2);
  });

  it("filters by status and kind, and hides boards on request", () => {
    const p = weave([entry("a", ["b"]), entry("b", [], "question"), entry("c", [], "canon", "age")], [board("m", ["a"])], {
      ...ALL,
      statuses: new Set<Status>(["canon"]),
      kinds: new Set<EntryKind>(["chronicle"]),
      boards: false,
    });
    expect(p.nodes.map((n) => n.ref)).toEqual(["a"]);
    expect(p.strands).toEqual([]);
  });

  it("focus keeps only entries within depth strands", () => {
    const chain = [entry("a", ["b"]), entry("b", ["c"]), entry("c", ["d"]), entry("d")];
    expect(weave(chain, [], { ...ALL, focus: { id: "a", depth: 1 } }).nodes.map((n) => n.ref).sort()).toEqual(["a", "b"]);
    expect(weave(chain, [], { ...ALL, focus: { id: "b", depth: 2 } }).nodes.map((n) => n.ref).sort()).toEqual(["a", "b", "c", "d"]);
    expect(weave(chain, [], { ...ALL, focus: { id: "nowhere", depth: 3 } }).nodes).toEqual([]);
  });

  it("ages and well-woven entries loom larger", () => {
    expect(radiusOf({ type: "entry", kind: "age", degree: 0 })).toBeGreaterThan(radiusOf({ type: "entry", kind: "note", degree: 0 }));
    expect(radiusOf({ type: "entry", kind: "note", degree: 9 })).toBeGreaterThan(radiusOf({ type: "entry", kind: "note", degree: 1 }));
  });
});
