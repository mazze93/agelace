import { useEffect, useRef } from "react";

/**
 * One Cmd/Ctrl-Z for the whole app.
 *
 * Rich-text surfaces (anything inside .ProseMirror) keep their own history —
 * TipTap's for entries, Yjs's for canvas text cards — and handle the keys
 * themselves. Everywhere else (titles, statuses, margin notes, the canvas)
 * the most recently mounted target gets the keystroke. Native input undo is
 * suppressed so there is exactly one notion of "undo" per surface.
 */
export interface UndoTarget {
  undo: (from: Element | null) => boolean;
  redo: (from: Element | null) => boolean;
}

const targets: UndoTarget[] = [];

export function useUndoTarget(target: UndoTarget): void {
  const ref = useRef(target);
  ref.current = target;
  useEffect(() => {
    const proxy: UndoTarget = { undo: (el) => ref.current.undo(el), redo: (el) => ref.current.redo(el) };
    targets.push(proxy);
    return () => {
      const i = targets.indexOf(proxy);
      if (i >= 0) targets.splice(i, 1);
    };
  }, []);
}

export type UndoKey = "undo" | "redo" | null;

export function undoKey(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">, mac: boolean): UndoKey {
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "z") return e.shiftKey ? "redo" : "undo";
  if (k === "y" && !mac && !e.shiftKey) return "redo";
  return null;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);

function onKey(e: KeyboardEvent): void {
  const which = undoKey(e, isMac);
  if (!which) return;
  const el = e.target instanceof Element ? e.target : null;
  if (el?.closest(".ProseMirror")) return; // the editor's own history handles it
  if (el?.closest("[data-native-undo]")) return; // opt-out (e.g. the Excalidraw sketchbook)
  const top = targets[targets.length - 1];
  if (!top) return;
  e.preventDefault();
  if (which === "undo") top.undo(el);
  else top.redo(el);
}

window.addEventListener("keydown", onKey);
