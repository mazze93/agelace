import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { borderPoint, fitView, lodFor, strokeHit, toWorld, zoomAt } from "./geometry";
import { LOCAL, addEdge, addNode, addStroke, removeNodes, snapshot, transact } from "./model";

describe("viewport math", () => {
  it("zooming keeps the point under the cursor fixed", () => {
    const v = { x: 120, y: -40, z: 0.8 };
    const at = { x: 500, y: 300 };
    const before = toWorld(v, at);
    const after = toWorld(zoomAt(v, at, 1.7), at);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("fits content into the screen and centres it", () => {
    const v = fitView({ x: 1000, y: 1000, w: 400, h: 200 }, 1200, 800);
    const centre = toWorld(v, { x: 600, y: 400 });
    expect(centre.x).toBeCloseTo(1200);
    expect(centre.y).toBeCloseTo(1100);
  });

  it("folds detail away as you zoom out", () => {
    expect([lodFor(1), lodFor(0.4), lodFor(0.1)]).toEqual(["full", "mid", "far"]);
  });

  it("edges leave a card from its border, not its centre", () => {
    const p = borderPoint({ x: 0, y: 0, w: 200, h: 100 }, { x: 1000, y: 50 });
    expect(p).toEqual({ x: 200, y: 50 });
  });
});

describe("canvas model", () => {
  it("removing a card removes the threads tied to it", () => {
    const doc = new Y.Doc();
    let a = "",
      b = "";
    transact(doc, () => {
      a = addNode(doc, { type: "text", x: 0, y: 0, w: 100, h: 100 });
      b = addNode(doc, { type: "entry", entryId: "x", x: 300, y: 0, w: 100, h: 100 });
      addEdge(doc, a, b);
    });
    expect(snapshot(doc).edges).toHaveLength(1);
    transact(doc, () => removeNodes(doc, [a]));
    expect(snapshot(doc)).toMatchObject({ edges: [], nodes: [{ id: b }] });
  });

  it("refuses self-loops and duplicate threads", () => {
    const doc = new Y.Doc();
    transact(doc, () => {
      const a = addNode(doc, { type: "text", x: 0, y: 0, w: 1, h: 1 });
      const b = addNode(doc, { type: "text", x: 0, y: 0, w: 1, h: 1 });
      expect(addEdge(doc, a, a)).toBeNull();
      expect(addEdge(doc, a, b)).toBe(addEdge(doc, a, b));
    });
  });

  it("undo manager reverts a whole gesture as one step", () => {
    const doc = new Y.Doc();
    const um = new Y.UndoManager([doc.getMap("nodes"), doc.getMap("ink")], { trackedOrigins: new Set([LOCAL]) });
    transact(doc, () => addStroke(doc, [0, 0, 0.5, 10, 10, 0.5], "red", 4));
    expect(snapshot(doc).ink).toHaveLength(1);
    um.undo();
    expect(snapshot(doc).ink).toHaveLength(0);
    um.redo();
    expect(snapshot(doc).ink[0]?.points).toEqual([0, 0, 0.5, 10, 10, 0.5]);
  });

  it("an eraser finds the stroke it touches", () => {
    const s = { id: "s", points: [0, 0, 0.5, 100, 0, 0.5], color: "x", size: 4 };
    expect(strokeHit(s, { x: 101, y: 3 }, 2)).toBe(true);
    expect(strokeHit(s, { x: 50, y: 3 }, 2)).toBe(true); // mid-segment, no sample there
    expect(strokeHit(s, { x: 50, y: 40 }, 2)).toBe(false);
  });
});
