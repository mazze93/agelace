import { useCallback, useEffect, useRef, useState } from "react";
import { EntryKind, Status, type Entry, type EntryPatch, type RichDoc } from "@agelace/shared";
import { api, subscribe } from "./api";
import { Editor } from "./editor/Editor";
import { IconGrid, Popover } from "./pickers";
import { Sigil } from "./Sigil";
import { StatusMark, statusLabel } from "./status";
import { refreshEntries } from "./world";

export interface EntryPageProps {
  id: string;
}

type SaveState = "set" | "wet" | "drying" | "blotted";

const KIND_LABEL: Record<EntryKind, string> = {
  chronicle: "Chronicle",
  person: "Person",
  place: "Place",
  age: "Age",
  thing: "Thing",
  note: "Note",
};

export function EntryPage({ id }: EntryPageProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [missing, setMissing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [save, setSave] = useState<SaveState>("set");
  const pending = useRef<EntryPatch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setSave("drying");
    try {
      await api.patch(id, patch);
      setSave("set");
      if (patch.title || patch.status || patch.sigil || patch.kind || patch.doc) void refreshEntries();
    } catch {
      // Keep the words; try again on the next keystroke or in a moment.
      pending.current = { ...patch, ...pending.current };
      setSave("blotted");
      timer.current = setTimeout(() => void flush(), 3000);
    }
  }, [id]);

  const queue = useCallback(
    (patch: EntryPatch, delay = 650) => {
      pending.current = { ...pending.current, ...patch };
      setEntry((e) => (e ? { ...e, ...patch } : e));
      setSave("wet");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  useEffect(() => {
    let live = true;
    setEntry(null);
    setMissing(false);
    setRevision(0);
    api
      .entry(id)
      .then((e) => live && setEntry(e))
      .catch(() => live && setMissing(true));
    const off = subscribe((ev) => {
      if (ev.type !== "entry" || ev.id !== id || Object.keys(pending.current).length) return;
      api
        .entry(id)
        .then((e) => {
          if (!live) return;
          setEntry(e);
          setRevision((r) => r + 1);
        })
        .catch(() => live && setMissing(true));
    });
    const beforeUnload = () => void flush();
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      live = false;
      off();
      window.removeEventListener("beforeunload", beforeUnload);
      void flush();
    };
  }, [id, flush]);

  if (missing) {
    return (
      <article className="leaf leaf-empty">
        <p className="muted">This page has been torn out — it is no longer in the world folder.</p>
      </article>
    );
  }
  if (!entry) return <article className="leaf leaf-loading" aria-busy="true" />;

  const remove = async () => {
    await api.remove(id);
    await refreshEntries();
    location.hash = "#/";
  };

  return (
    <article className="leaf" key={id}>
      <header className="leaf-head">
        <Popover title="Change sigil" className="sigil-pop" label={<Sigil name={entry.sigil} size="100%" className="chapter-sigil" />}>
          {(close) => <IconGrid initialQuery="" onPick={(n) => (queue({ sigil: n }, 0), close())} />}
        </Popover>
        <div className="leaf-meta">
          <select className="meta-select" value={entry.kind} onChange={(e) => queue({ kind: EntryKind.parse(e.target.value) }, 0)} aria-label="Kind">
            {EntryKind.options.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <span className="meta-sep" aria-hidden="true">
            ·
          </span>
          <fieldset className="status-switch" aria-label="Status">
            {Status.options.map((st) => (
              <label key={st} className={`status-${st}${entry.status === st ? " is-on" : ""}`}>
                <input type="radio" name="status" value={st} checked={entry.status === st} onChange={() => queue({ status: st }, 0)} />
                <StatusMark status={st} />
                {statusLabel[st]}
              </label>
            ))}
          </fieldset>
          <span className={`save save-${save}`} role="status" aria-live="polite">
            {save === "set" ? "set in type" : save === "wet" ? "ink still wet" : save === "drying" ? "drying…" : "blotted — retrying"}
          </span>
        </div>
        <input
          className="leaf-title"
          value={entry.title}
          aria-label="Title"
          onChange={(e) => e.target.value.trim() && queue({ title: e.target.value })}
        />
      </header>
      <Editor entryId={id} doc={entry.doc} revision={revision} onChange={(doc: RichDoc) => queue({ doc })} />
      <footer className="leaf-foot">
        <button type="button" className="quiet-danger" onClick={() => void remove()}>
          Tear out this page
        </button>
        <span className="muted">Torn pages go to the world’s .trash folder, never the fire.</span>
      </footer>
    </article>
  );
}
