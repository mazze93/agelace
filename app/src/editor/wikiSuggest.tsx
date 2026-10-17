import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { createRoot, type Root } from "react-dom/client";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { EntrySummary } from "@agelace/shared";
import { api } from "../api";
import { Sigil } from "../Sigil";
import { getWorld, refreshEntries } from "../world";

type Item = { kind: "entry"; entry: EntrySummary } | { kind: "new"; title: string };

export function rankEntries(entries: EntrySummary[], query: string, limit = 8): EntrySummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries.slice(0, limit);
  return entries
    .map((e) => {
      const t = e.title.toLowerCase();
      const score = t === q ? 4 : t.startsWith(q) ? 3 : t.split(/\s+/).some((w) => w.startsWith(q)) ? 2 : t.includes(q) ? 1 : 0;
      return [e, score] as const;
    })
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || a[0].title.localeCompare(b[0].title))
    .slice(0, limit)
    .map(([e]) => e);
}

function itemsFor(query: string): Item[] {
  const hits: Item[] = rankEntries(getWorld().entries, query).map((entry) => ({ kind: "entry", entry }));
  const exact = getWorld().entries.some((e) => e.title.toLowerCase() === query.trim().toLowerCase());
  if (query.trim() && !exact) hits.push({ kind: "new", title: query.trim() });
  return hits;
}

async function choose(editor: Editor, range: Range, item: Item): Promise<void> {
  if (item.kind === "entry") {
    editor.chain().focus().deleteRange(range).insertWikiLink(item.entry.id, item.entry.title).run();
    return;
  }
  // Naming something new makes it exist — as a Question, never as Canon.
  const created = await api.create({ title: item.title, kind: "note", status: "question" });
  await refreshEntries();
  editor.chain().focus().deleteRange(range).insertWikiLink(created.id, created.title).run();
}

interface MenuHandle {
  onKeyDown: (p: SuggestionKeyDownProps) => boolean;
}
interface MenuProps {
  items: Item[];
  pick: (item: Item) => void;
}

const Menu = forwardRef<MenuHandle, MenuProps>(function Menu({ items, pick }, ref) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") return setI((i + 1) % items.length), true;
      if (event.key === "ArrowUp") return setI((i - 1 + items.length) % items.length), true;
      if (event.key === "Enter" || event.key === "Tab") {
        const it = items[i];
        if (it) pick(it);
        return true;
      }
      return false;
    },
  }));
  if (!items.length) return null;
  return (
    <ul className="suggest" role="listbox" aria-label="Link to an entry">
      {items.map((it, n) => (
        <li key={it.kind === "entry" ? it.entry.id : "__new"} role="option" aria-selected={n === i}>
          <button type="button" onMouseDown={(e) => (e.preventDefault(), pick(it))}>
            {it.kind === "entry" ? (
              <>
                <Sigil name={it.entry.sigil} />
                <span>{it.entry.title}</span>
                <small className={`status-${it.entry.status}`}>{it.entry.status}</small>
              </>
            ) : (
              <>
                <span className="suggest-new">⸮</span>
                <span>
                  Name <em>{it.title}</em> as a new question
                </span>
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
});

export const WikiSuggest = Extension.create({
  name: "wikiSuggest",
  addProseMirrorPlugins() {
    return [
      Suggestion<Item, Item>({
        pluginKey: new PluginKey("wikiSuggest"),
        editor: this.editor,
        char: "[[",
        allowSpaces: true,
        startOfLine: false,
        items: ({ query }) => itemsFor(query.replace(/\]+$/, "")),
        command: ({ editor, range, props }) => void choose(editor, range, props),
        render: () => {
          let host: HTMLDivElement | null = null;
          let root: Root | null = null;
          let handle: MenuHandle | null = null;
          const place = (p: SuggestionProps<Item, Item>) => {
            const rect = p.clientRect?.();
            if (!host || !rect) return;
            host.style.left = `${rect.left + window.scrollX}px`;
            host.style.top = `${rect.bottom + window.scrollY + 6}px`;
          };
          const draw = (p: SuggestionProps<Item, Item>) =>
            root?.render(<Menu ref={(h) => void (handle = h)} items={p.items} pick={(it) => p.command(it)} />);
          return {
            onStart: (p) => {
              host = document.createElement("div");
              host.className = "suggest-host";
              document.body.append(host);
              root = createRoot(host);
              draw(p);
              place(p);
            },
            onUpdate: (p) => {
              draw(p);
              place(p);
            },
            onKeyDown: (p) => (p.event.key === "Escape" ? (host?.remove(), true) : (handle?.onKeyDown(p) ?? false)),
            onExit: () => {
              const r = root;
              queueMicrotask(() => r?.unmount());
              host?.remove();
              host = null;
              root = null;
            },
          };
        },
      }),
    ];
  },
});
