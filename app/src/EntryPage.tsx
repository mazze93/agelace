import { useCallback, useEffect, useRef, useState } from "react";
import { EntryKind, Status, type Entry, type EntryPatch, type RichDoc } from "@agelace/shared";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type { Transaction } from "@tiptap/pm/state";
import { api, subscribe } from "./api";
import { Editor } from "./editor/Editor";
import { IconGrid, Popover } from "./pickers";
import { Sigil } from "./Sigil";
import { StatusMark, statusLabel } from "./status";
import { useUndoTarget } from "./undo";
import { refreshEntries } from "./world";

export interface EntryPageProps {
  id: string;
}

type SaveState = "set" | "wet" | "drying" | "blotted";
type MetaField = "title" | "status" | "kind" | "sigil";
type MetaStep = { before: EntryPatch; after: EntryPatch; field: MetaField; at: number };

/** Typing a title is one undo step, not one per keystroke. */
const COALESCE_MS = 1200;
/** Matches ProseMirror history's own grouping window. */
const DOC_GROUP_MS = 500;

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
  const editorRef = useRef<TiptapEditor | null>(null);
  const entryRef = useRef<Entry | null>(null);
  entryRef.current = entry;
  // A single time-ordered journal interleaving text history (owned by the
  // editor) with metadata history (owned here), so Cmd-Z from the title or
  // the margin undoes whatever happened last, wherever it happened.
  const journal = useRef<("meta" | "doc")[]>([]);
  const redoJournal = useRef<("meta" | "doc")[]>([]);
  const metaUndo = useRef<MetaStep[]>([]);
  const metaRedo = useRef<MetaStep[]>([]);
  const lastDocAt = useRef(0);
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

  /** A user change to title/status/kind/sigil: recorded for undo, then queued. */
  const change = useCallback(
    (field: MetaField, value: string, delay = 0) => {
      const cur = entryRef.current;
      if (!cur) return;
      const now = Date.now();
      const top = metaUndo.current[metaUndo.current.length - 1];
      const after = { [field]: value } as EntryPatch;
      if (top && top.field === field && field === "title" && now - top.at < COALESCE_MS && journal.current.at(-1) === "meta") {
        top.after = after;
        top.at = now;
      } else {
        metaUndo.current.push({ before: { [field]: cur[field] } as EntryPatch, after, field, at: now });
        journal.current.push("meta");
      }
      metaRedo.current = [];
      redoJournal.current = [];
      queue(after, delay);
    },
    [queue],
  );

  const onTransaction = useCallback((tr: Transaction) => {
    if (!tr.docChanged || tr.getMeta("addToHistory") === false || tr.getMeta("history$")) return;
    const now = Date.now();
    if (journal.current.at(-1) !== "doc" || now - lastDocAt.current > DOC_GROUP_MS) journal.current.push("doc");
    lastDocAt.current = now;
    redoJournal.current = [];
  }, []);

  useUndoTarget({
    undo: () => {
      while (journal.current.length) {
        const kind = journal.current.pop()!;
        if (kind === "meta") {
          const step = metaUndo.current.pop();
          if (!step) continue;
          metaRedo.current.push(step);
          redoJournal.current.push("meta");
          queue(step.before, 0);
          return true;
        }
        if (editorRef.current?.commands.undo()) {
          redoJournal.current.push("doc");
          return true;
        }
      }
      return false;
    },
    redo: () => {
      while (redoJournal.current.length) {
        const kind = redoJournal.current.pop()!;
        if (kind === "meta") {
          const step = metaRedo.current.pop();
          if (!step) continue;
          metaUndo.current.push(step);
          journal.current.push("meta");
          queue(step.after, 0);
          return true;
        }
        if (editorRef.current?.commands.redo()) {
          journal.current.push("doc");
          return true;
        }
      }
      return false;
    },
  });

  useEffect(() => {
    let live = true;
    journal.current = [];
    redoJournal.current = [];
    metaUndo.current = [];
    metaRedo.current = [];
    setEntry(null);
    setMissing(false);
    setRevision(0);
    api
      .entry(id)
      .then((e) => live && setEntry(e))
      .catch(() => live && setMissing(true));
    const off = subscribe((ev) => {
      // Own echoes never arrive here (subscribe filters them); this is another
      // tab, another app, or a hand edit. Don't clobber unsaved local changes.
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
          {(close) => <IconGrid initialQuery="" onPick={(n) => (change("sigil", n), close())} />}
        </Popover>
        <div className="leaf-meta">
          <select className="meta-select" value={entry.kind} onChange={(e) => change("kind", EntryKind.parse(e.target.value))} aria-label="Kind">
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
                <input type="radio" name="status" value={st} checked={entry.status === st} onChange={() => change("status", st)} />
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
          onChange={(e) => e.target.value.trim() && change("title", e.target.value, 650)}
        />
      </header>
      <Editor
        entryId={id}
        doc={entry.doc}
        revision={revision}
        onChange={(doc: RichDoc) => queue({ doc })}
        onReady={(ed) => (editorRef.current = ed)}
        onTransaction={onTransaction}
      />
      <footer className="leaf-foot">
        <button type="button" className="quiet-danger" onClick={() => void remove()}>
          Tear out this page
        </button>
        <span className="muted">Torn pages go to the world’s .trash folder, never the fire.</span>
      </footer>
    </article>
  );
}
