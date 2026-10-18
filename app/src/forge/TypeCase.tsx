import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { api } from "../api";
import { refreshFonts, useFontFamilies, type FontFamily } from "../fonts";
import { Sigil } from "../Sigil";
import { ROLE_NAME, ROLES, setDraftRole, type Role } from "./typeset";

const SHELVES: { id: string; name: string }[] = [
  { id: "all", name: "Every face" },
  { id: "yours", name: "Your own" },
  { id: "serif", name: "Book faces" },
  { id: "display", name: "Display & black letter" },
  { id: "handwriting", name: "Hands" },
  { id: "sans-serif", name: "Sans" },
];
const shelfOf = (f: FontFamily): string => (f.source === "world" ? "yours" : f.category);
const SHELF_WORD: Record<string, string> = { yours: "your own", serif: "book face", display: "display", handwriting: "hand", "sans-serif": "sans" };

const SPECIMEN_DEFAULT = "Sphinx of black quartz, judge my vow";
const CHARSET = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "&.,;:!?'\"‘’“”-–—()[]*/†‡§¶",
  "ÆŒæœßþðÞÐſ",
];
const WATERFALL = [12, 16, 21, 28, 38, 52, 72];

function remembered<T extends string | number>(key: string, fallback: T): [T, (v: T) => void] {
  let initial = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) initial = (typeof fallback === "number" ? Number(raw) || fallback : raw) as T;
  } catch {
    /* private mode */
  }
  return [
    initial,
    (v: T) => {
      try {
        localStorage.setItem(key, String(v));
      } catch {
        /* private mode */
      }
    },
  ];
}

const face = (family: string): CSSProperties => ({ fontFamily: `"${family.replace(/["\\]/g, "")}", var(--font-body)` });

export function TypeCase() {
  const families = useFontFamilies();
  const [initialText, keepText] = useMemo(() => remembered<string>("agelace-specimen", SPECIMEN_DEFAULT), []);
  const [initialSize, keepSize] = useMemo(() => remembered<number>("agelace-specimen-size", 34), []);
  const [text, setText] = useState(initialText);
  const [size, setSize] = useState(initialSize);
  const [shelf, setShelf] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => keepText(text), [text, keepText]);
  useEffect(() => keepSize(size), [size, keepSize]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: families.length };
    for (const f of families) c[shelfOf(f)] = (c[shelfOf(f)] ?? 0) + 1;
    return c;
  }, [families]);
  const shown = families.filter((f) => (shelf === "all" || shelfOf(f) === shelf) && f.family.toLowerCase().includes(q.trim().toLowerCase()));
  const opened = families.find((f) => f.family === open) ?? null;

  return (
    <div className="type-case">
      <div className="case-bench">
        <label className="case-specimen">
          <span className="sc">Specimen</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={SPECIMEN_DEFAULT} />
        </label>
        <label className="case-size">
          <span className="sc">{size} pt</span>
          <input type="range" min={14} max={96} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Specimen size" />
        </label>
        <input className="case-find" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a face…" aria-label="Find a face" />
      </div>
      <nav className="case-shelves" aria-label="Shelves">
        {SHELVES.filter((s) => s.id === "all" || s.id === "yours" || counts[s.id]).map((s) => (
          <button key={s.id} type="button" aria-pressed={shelf === s.id} onClick={() => setShelf(s.id)}>
            {s.name} <small>{counts[s.id] ?? 0}</small>
          </button>
        ))}
      </nav>

      <div className="case-drawers">
        {(shelf === "all" || shelf === "yours") && <AddFace />}
        {shown.map((f, i) => (
          <article key={f.family} className="drawer" style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}>
            <button type="button" className="drawer-open" onClick={() => setOpen(f.family)} aria-label={`Open ${f.family}`}>
              <header className="drawer-label">
                <span>{f.family}</span>
                <small>
                  {f.faces.length} {f.faces.length === 1 ? "face" : "faces"} · {SHELF_WORD[shelfOf(f)] ?? f.category}
                </small>
              </header>
              <p className="drawer-specimen" style={{ ...face(f.family), fontSize: `${size}px` }}>
                {text || SPECIMEN_DEFAULT}
              </p>
            </button>
          </article>
        ))}
        {!shown.length && shelf !== "yours" && <p className="muted">No face by that name on this shelf.</p>}
      </div>
      {opened && <ProofSheet family={opened} text={text || SPECIMEN_DEFAULT} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Drop or choose font files; they land in world/fonts and appear here at once. */
function AddFace() {
  const [state, setState] = useState<"idle" | "over" | "busy" | { error: string } | { added: number }>("idle");
  const accept = async (files: FileList | null) => {
    if (!files?.length) return;
    setState("busy");
    try {
      for (const f of Array.from(files)) await api.uploadFont(f);
      await refreshFonts();
      setState({ added: files.length });
    } catch (err) {
      setState({ error: (err as Error).message });
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void accept(e.dataTransfer.files);
  };
  return (
    <label
      className={`drawer drawer-add${state === "over" ? " is-over" : ""}`}
      onDragOver={(e) => (e.preventDefault(), setState("over"))}
      onDragLeave={() => setState("idle")}
      onDrop={onDrop}
    >
      <input type="file" accept=".ttf,.otf,.woff,.woff2" multiple hidden onChange={(e) => void accept(e.target.files)} />
      <Sigil name="anvil" size="2rem" />
      <span className="drawer-add-title">Add a typeface</span>
      <span className="muted">
        {state === "busy"
          ? "Setting type…"
          : typeof state === "object" && "error" in state
            ? state.error
            : typeof state === "object"
              ? `${state.added} added. Drop more?`
              : "Drop .otf, .ttf, .woff or .woff2 here, or choose files. They go to your world's fonts folder."}
      </span>
      <a className="drawer-add-forge" href="#/forge/hands" onClick={(e) => e.stopPropagation()}>
        or draw one in the Scriptorium →
      </a>
    </label>
  );
}

function ProofSheet({ family, text, onClose }: { family: FontFamily; text: string; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const faces = [...family.faces].sort((a, b) => Number(a.weight) - Number(b.weight) || a.style.localeCompare(b.style));
  const use = (role: Role) => {
    setDraftRole(role, family.family);
    location.hash = "#/forge/pairing";
  };
  const licence = faces.find((f) => f.license)?.license;
  return (
    <div className="proof-backdrop" onClick={onClose}>
      <aside className="proof-sheet" role="dialog" aria-modal="true" aria-label={`${family.family}, a proof`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="tool proof-close" onClick={onClose} aria-label="Close the proof">
          ✕
        </button>
        <p className="proof-kicker sc">{family.source === "world" ? "From your world's fonts" : `Built in · ${family.category}`}</p>
        <h2 className="proof-name" style={face(family.family)}>
          {family.family}
        </h2>
        <div className="proof-use">
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => use(r)}>
              Pair as {ROLE_NAME[r].toLowerCase()}
            </button>
          ))}
        </div>

        <section className="proof-section">
          <h3 className="sc">Faces</h3>
          <ul className="proof-faces">
            {faces.map((f) => (
              <li key={f.url}>
                <span className="proof-face-sample" style={{ ...face(family.family), fontWeight: f.weight as CSSProperties["fontWeight"], fontStyle: f.style }}>
                  Hamburgefonstiv
                </span>
                <small>
                  {f.weight} {f.style === "italic" ? "italic" : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>

        <section className="proof-section">
          <h3 className="sc">Waterfall</h3>
          {WATERFALL.map((px) => (
            <p key={px} className="proof-fall" style={{ ...face(family.family), fontSize: `${px}px` }}>
              <small>{px}</small>
              <span>{text}</span>
            </p>
          ))}
        </section>

        <section className="proof-section">
          <h3 className="sc">The case</h3>
          <div className="proof-glyphs" style={face(family.family)}>
            {CHARSET.join("")
              .split("")
              .map((ch, i) => (
                <span key={i}>{ch}</span>
              ))}
          </div>
          <p className="proof-ligatures" style={face(family.family)}>
            fi fl ff ffi ffl Th st ct · 1066 · 3/4
          </p>
        </section>

        <p className="proof-foot muted">
          {family.source === "world" ? `File: world/fonts/${faces[0]?.file ?? ""}` : (licence ?? "SIL Open Font License")}
        </p>
      </aside>
    </div>
  );
}
