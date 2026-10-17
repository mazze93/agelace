import { useEffect, useState } from "react";
import { Board } from "./Board";
import { CanvasSync, type SyncState } from "./sync";

export interface CanvasPageProps {
  id: string;
}

export function CanvasPage({ id }: CanvasPageProps) {
  const [sync, setSync] = useState<CanvasSync | null>(null);
  const [state, setState] = useState<SyncState>("loading");

  useEffect(() => {
    const s = new CanvasSync(id);
    const off = s.onState(setState);
    setSync(s);
    void s.start();
    return () => {
      off();
      void s.stop();
      setSync(null);
    };
  }, [id]);

  if (state === "missing") {
    return (
      <div className="board board-missing">
        <p className="muted">This board has been rolled up and put away — it is no longer in the world folder.</p>
      </div>
    );
  }
  if (!sync || state === "loading") return <div className="board" aria-busy="true" />;
  return <Board key={id} doc={sync.doc} canvasId={id} saveState={state} />;
}
