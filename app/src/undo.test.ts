import { describe, expect, it } from "vitest";
import { undoKey } from "./undo";

const k = (key: string, mods: Partial<Record<"metaKey" | "ctrlKey" | "shiftKey" | "altKey", boolean>> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("undo keys", () => {
  it("mac: Cmd-Z undo, Cmd-Shift-Z redo, Ctrl-Z ignored", () => {
    expect(undoKey(k("z", { metaKey: true }), true)).toBe("undo");
    expect(undoKey(k("Z", { metaKey: true, shiftKey: true }), true)).toBe("redo");
    expect(undoKey(k("z", { ctrlKey: true }), true)).toBeNull();
  });
  it("windows/linux: Ctrl-Z undo, Ctrl-Shift-Z and Ctrl-Y redo", () => {
    expect(undoKey(k("z", { ctrlKey: true }), false)).toBe("undo");
    expect(undoKey(k("z", { ctrlKey: true, shiftKey: true }), false)).toBe("redo");
    expect(undoKey(k("y", { ctrlKey: true }), false)).toBe("redo");
    expect(undoKey(k("z"), false)).toBeNull();
  });
});
