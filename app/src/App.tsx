import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EntryKind, KIND_SIGIL, type EntrySummary } from "@agelace/shared";
import { api, subscribe } from "./api";
import { CanvasPage } from "./canvas/CanvasPage";
import { Colophon } from "./Colophon";
import { EntryPage } from "./EntryPage";
import { PatternPage } from "./pattern/PatternPage";
import { refreshFonts } from "./fonts";
import { Sigil } from "./Sigil";
import { StatusMark } from "./status";
import { refreshCanvases, refreshEntries, refreshMeta, useWorld } from "./world";

type Route =
  | { page: "home" }
  | { page: "entry"; id: string }
  | { page: "canvas"; id: string }
  | { page: "pattern"; focus: string | null }
  | { page: "colophon" };

function parseRoute(hash: string): Route {
  const m = /^#\/e\/([a-z0-9-]+)$/.exec(hash);
  if (m?.[1]) return { page: "entry", id: m[1] };
  const c = /^#\/c\/([a-z0-9-]+)$/.exec(hash);
  if (c?.[1]) return { page: "canvas", id: c[1] };
  const p = /^#\/pattern(?:\/([a-z0-9-]+))?$/.exec(hash);
  if (p) return { page: "pattern", focus: p[1] ?? null };
  if (hash === "#/colophon") return { page: "colophon" };
  return { page: "home" };
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const KIND_ORDER: EntryKind[] = ["age", "chronicle", "place", "person", "thing", "note"];
const KIND_HEAD: Record<EntryKind, string> = {
  age: "Ages",
  chronicle: "Chronicles",
  place: "Places",
  person: "People",
  thing: "Things",
  note: "Loose Leaves",
};

export function App() {
  const route = useRoute();
  const { meta } = useWorld();

  useEffect(() => {
    void refreshMeta();
    void refreshEntries();
    void refreshCanvases();
    void refreshFonts();
    return subscribe((e) => {
      if (e.type === "entry") void refreshEntries();
      else if (e.type === "canvas") void refreshCanvases();
      else if (e.type === "fonts") void refreshFonts();
      else void refreshMeta();
    });
  }, []);

  useEffect(() => {
    document.title = meta ? `${meta.name} · agelace` : "agelace";
  }, [meta]);

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden="true" />
      <IndexRail current={route.page === "entry" || route.page === "canvas" ? route.id : route.page === "pattern" ? "pattern" : null} />
      <main className={`desk${route.page === "canvas" || route.page === "pattern" ? " desk-board" : ""}`} id="main">
        {route.page === "entry" ? (
          <EntryPage id={route.id} />
        ) : route.page === "canvas" ? (
          <CanvasPage id={route.id} />
        ) : route.page === "pattern" ? (
          <PatternPage focus={route.focus} />
        ) : route.page === "colophon" ? (
          <Colophon />
        ) : (
          <Frontispiece />
        )}
      </main>
    </div>
  );
}

function IndexRail({ current }: { current: string | null }) {
  const { meta, entries, canvases } = useWorld();
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("agelace-theme") ?? "auto";
    } catch {
      return "auto";
    }
  });

  useEffect(() => {
    if (theme === "auto") delete document.documentElement.dataset["theme"];
    else document.documentElement.dataset["theme"] = theme;
    try {
      localStorage.setItem("agelace-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = (e: EntrySummary) => !needle || e.title.toLowerCase().includes(needle) || e.tags.some((t) => t.includes(needle));
    return KIND_ORDER.map((k) => [k, entries.filter((e) => e.kind === k && hit(e))] as const).filter(([, list]) => list.length);
  }, [entries, q]);

  return (
    <nav className="rail" aria-label="Index">
      <a className="rail-world" href="#/">
        <span className="rail-mark" aria-hidden="true">
          ◇
        </span>
        <span>{meta?.name ?? "…"}</span>
      </a>
      <NewEntry />
      <input className="rail-search" type="search" placeholder="Search the index" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
      <a className="rail-pattern" href="#/pattern" aria-current={current === "pattern" ? "page" : undefined}>
        <Sigil name="spider-web" />
        <span>The Pattern</span>
        <small>{entries.length}</small>
      </a>
      <div className="rail-scroll">
        {canvases.length > 0 && (
          <section className="rail-group">
            <h2>
              <Sigil name="treasure-map" /> Boards
            </h2>
            <ul>
              {canvases
                .filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()))
                .map((c) => (
                  <li key={c.id}>
                    <a href={`#/c/${c.id}`} aria-current={c.id === current ? "page" : undefined}>
                      <Sigil name="treasure-map" />
                      <span className="rail-title">{c.name}</span>
                      <span className="rail-count">{c.nodes}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        )}
        {groups.map(([kind, list]) => (
          <section key={kind} className="rail-group">
            <h2>
              <Sigil name={KIND_SIGIL[kind]} /> {KIND_HEAD[kind]}
            </h2>
            <ul>
              {list.map((e) => (
                <li key={e.id}>
                  <a
                    href={`#/e/${e.id}`}
                    aria-current={e.id === current ? "page" : undefined}
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData("application/x-agelace-entry", e.id);
                      ev.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <Sigil name={e.sigil} />
                    <span className="rail-title">{e.title}</span>
                    <StatusMark status={e.status} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!entries.length && <p className="muted rail-empty">The index is empty. Name something.</p>}
      </div>
      <footer className="rail-foot">
        <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Light">
          <option value="auto">Lamp: follow the hour</option>
          <option value="light">Lamp: daylight</option>
          <option value="dark">Lamp: candle</option>
        </select>
        <a href="#/colophon">Colophon</a>
      </footer>
    </nav>
  );
}

function NewEntry() {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EntryKind | "board">("chronicle");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (kind === "board") {
      const board = await api.createCanvas(title.trim());
      setTitle("");
      await refreshCanvases();
      location.hash = `#/c/${board.id}`;
      return;
    }
    const created = await api.create({ title: title.trim(), kind });
    setTitle("");
    await refreshEntries();
    location.hash = `#/e/${created.id}`;
  };
  return (
    <form className="rail-new" onSubmit={(e) => void submit(e)}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name something new…" aria-label="New entry title" />
      <div className="rail-new-row">
        <select value={kind} onChange={(e) => setKind(e.target.value === "board" ? "board" : EntryKind.parse(e.target.value))} aria-label="Kind">
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {KIND_HEAD[k]}
            </option>
          ))}
          <option value="board">A Board</option>
        </select>
        <button type="submit" disabled={!title.trim()}>
          Inscribe
        </button>
      </div>
    </form>
  );
}

function Frontispiece() {
  const { meta, entries } = useWorld();
  const counts = { canon: 0, proposed: 0, question: 0 };
  for (const e of entries) counts[e.status]++;
  const [epigraph, setEpigraph] = useState<string | null>(null);
  return (
    <section className="frontispiece">
      <p className="fp-kicker">Being the annals of</p>
      <h1>{meta?.name}</h1>
      <blockquote
        className="fp-epigraph"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setEpigraph(e.currentTarget.textContent ?? "")}
        onBlur={() => epigraph !== null && void api.setWorld({ epigraph }).then(refreshMeta)}
        aria-label="Epigraph"
      >
        {meta?.epigraph || "Write an epigraph for this world."}
      </blockquote>
      <dl className="fp-tally">
        <div>
          <dt>
            <StatusMark status="canon" /> Canon
          </dt>
          <dd>{counts.canon}</dd>
        </div>
        <div>
          <dt>
            <StatusMark status="proposed" /> Proposed
          </dt>
          <dd>{counts.proposed}</dd>
        </div>
        <div>
          <dt>
            <StatusMark status="question" /> Questions
          </dt>
          <dd>{counts.question}</dd>
        </div>
      </dl>
    </section>
  );
}
