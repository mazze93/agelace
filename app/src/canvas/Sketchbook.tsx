import "@excalidraw/excalidraw/index.css";
import { Excalidraw, exportToSvg } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useRef, useState } from "react";
import type * as Y from "yjs";
import { LOCAL, nodesOf } from "./model";

export interface SketchbookProps {
  doc: Y.Doc;
  nodeId: string;
  dark: boolean;
  onClose: () => void;
}

interface Scene {
  elements: readonly unknown[];
}

/**
 * Excalidraw, full-screen, for one sketch card. Loaded only when opened
 * (it is large). On close the scene and a rendered SVG preview are written
 * back to the card in one undoable step.
 *
 * Embedded images are not supported in sketches yet — use an image card.
 */
export default function Sketchbook({ doc, nodeId, dark, onClose }: SketchbookProps) {
  const ymap = nodesOf(doc).get(nodeId);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const initial = useRef<Scene>(parseScene(ymap?.get("scene")));
  const [saving, setSaving] = useState(false);

  const close = async () => {
    if (!api || !ymap) return onClose();
    setSaving(true);
    const elements = api.getSceneElements();
    let preview = "";
    if (elements.length) {
      const svg = await exportToSvg({
        elements,
        appState: { exportBackground: false, exportWithDarkMode: false, viewBackgroundColor: "transparent" },
        files: null,
        exportPadding: 12,
      });
      preview = svg.outerHTML;
    }
    doc.transact(() => {
      ymap.set("scene", JSON.stringify({ elements }));
      ymap.set("preview", preview);
    }, LOCAL);
    onClose();
  };

  return (
    <div className="sketchbook" role="dialog" aria-label="Sketchbook" data-native-undo="">
      <div className="sketchbook-bar">
        <span className="sketchbook-title">Sketchbook</span>
        <button type="button" onClick={() => void close()} disabled={saving}>
          {saving ? "Setting the ink…" : "Done"}
        </button>
      </div>
      <div className="sketchbook-surface">
        <Excalidraw
          excalidrawAPI={setApi}
          theme={dark ? "dark" : "light"}
          initialData={{ elements: initial.current.elements as never, appState: { viewBackgroundColor: "transparent" } }}
          UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false } }}
        />
      </div>
    </div>
  );
}

function parseScene(raw: unknown): Scene {
  if (typeof raw !== "string") return { elements: [] };
  try {
    const s = JSON.parse(raw) as Partial<Scene>;
    return { elements: Array.isArray(s.elements) ? s.elements : [] };
  } catch {
    return { elements: [] };
  }
}
