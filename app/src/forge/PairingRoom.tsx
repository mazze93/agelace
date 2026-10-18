import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { plainText, type Pairing, type Typeset } from "@agelace/shared";
import { api } from "../api";
import { useFontFamilies } from "../fonts";
import { FontList, Popover } from "../pickers";
import { StatusMark } from "../status";
import { refreshMeta, useWorld } from "../world";
import { ARCHIVE_PAIRINGS, HOUSE, ROLE_NAME, ROLES, cssFamily, sameTypeset, seedDraft, setDraft, setDraftRole, useDraft, type Role } from "./typeset";

// Shown when the world has no prose yet. Written for agelace; not a quotation.
const FALLBACK_PROSE = [
  "Before the roads had names, the river kept the only calendar. It rose, and the valley counted; it fell, and the valley forgot. The first archivists were ferrymen, who cut a mark in the landing post for every crossing that mattered: a wedding, a plague, a king who would not pay the fare.",
  "The posts burned in the Second Winter, and three hundred years of somebody's memory went up with them. What follows is rebuilt from the songs, which are unreliable, and the tax rolls, which are worse.",
];

export function PairingRoom() {
  const { meta, entries } = useWorld();
  const families = useFontFamilies();
  if (meta) seedDraft(meta.typeset);
  const draft = useDraft();
  const have = useMemo(() => new Set(families.map((f) => f.family)), [families]);

  const [scale, setScale] = useState(3.2);
  const [bodyPx, setBodyPx] = useState(18);
  const [leading, setLeading] = useState(1.55);
  const [entryId, setEntryId] = useState<string>("");
  const [prose, setProse] = useState<{ title: string; kind: string; status: "canon" | "proposed" | "question"; paras: string[] } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Prose from the world itself: the longest written entry, unless one is chosen.
  const written = useMemo(() => entries.filter((e) => e.excerpt.length > 60).sort((a, b) => b.excerpt.length - a.excerpt.length), [entries]);
  const chosen = entryId || written[0]?.id || "";
  useEffect(() => {
    if (!chosen) return setProse(null);
    let live = true;
    void api.entry(chosen).then((e) => {
      if (!live) return;
      // plainText flattens a whole doc; set it paragraph by paragraph instead.
      const blocks = (e.doc.content ?? []).filter((n) => (n as { type?: string }).type === "paragraph");
      const paras = blocks.map((n) => plainText({ type: "doc", content: [n] }, 900)).filter((p) => p.length > 1).slice(0, 4);
      setProse({ title: e.title, kind: e.kind, status: e.status, paras: paras.length ? paras : [plainText(e.doc, 1600)] });
    });
    return () => {
      live = false;
    };
  }, [chosen]);

  const vars = {
    "--pair-display": cssFamily(draft.display, "display"),
    "--pair-body": cssFamily(draft.body, "body"),
    "--pair-label": cssFamily(draft.label, "label"),
    "--pair-body-size": `${bodyPx}px`,
    "--pair-scale": scale,
    "--pair-leading": leading,
  } as CSSProperties;

  const saved = meta?.pairings ?? [];
  const isWorldHand = sameTypeset(draft, meta?.typeset);

  const act = async (label: string, patch: Parameters<typeof api.setWorld>[0]) => {
    setBusy(label);
    try {
      await api.setWorld(patch);
      await refreshMeta();
    } finally {
      setBusy(null);
    }
  };
  const keep = () => {
    const n = name.trim() || ROLES.map((r) => draft[r] || HOUSE[r]).join(" / ").slice(0, 80);
    const next: Pairing = { name: n, ...clean(draft) };
    void act("keep", { pairings: [...saved.filter((p) => p.name !== n), next] });
    setName("");
  };
  const paras = prose?.paras ?? FALLBACK_PROSE;

  return (
    <div className="pairing">
      <div className="pair-controls">
        <section className="pair-slots" aria-label="Faces">
          {ROLES.map((r) => (
            <div key={r} className="pair-slot">
              <span className="sc">{ROLE_NAME[r]}</span>
              <Popover
                title={`Choose the ${ROLE_NAME[r].toLowerCase()} face`}
                className="pair-pick"
                label={
                  <span className="pair-face" style={{ fontFamily: cssFamily(draft[r], r) }}>
                    {draft[r] || `${HOUSE[r]} (house)`}
                  </span>
                }
              >
                {(close) => (
                  <FontList
                    current={draft[r]}
                    onPick={(f) => {
                      setDraftRole(r, f ?? undefined);
                      close();
                    }}
                  />
                )}
              </Popover>
            </div>
          ))}
        </section>

        <section className="pair-dials" aria-label="Proportions">
          <label>
            <span className="sc">Display ×{scale.toFixed(1)}</span>
            <input type="range" min={1.6} max={5.5} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </label>
          <label>
            <span className="sc">Body {bodyPx}px</span>
            <input type="range" min={14} max={24} value={bodyPx} onChange={(e) => setBodyPx(Number(e.target.value))} />
          </label>
          <label>
            <span className="sc">Leading {leading.toFixed(2)}</span>
            <input type="range" min={1.2} max={1.9} step={0.05} value={leading} onChange={(e) => setLeading(Number(e.target.value))} />
          </label>
          {written.length > 0 && (
            <label>
              <span className="sc">Set the text of</span>
              <select value={chosen} onChange={(e) => setEntryId(e.target.value)}>
                {written.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>

        <section className="pair-hand" aria-label="The world's hand">
          <button type="button" className="pair-primary" disabled={isWorldHand || busy !== null} onClick={() => void act("hand", { typeset: clean(draft) })}>
            {isWorldHand ? "This is the world's hand" : "Set as the world's hand"}
          </button>
          {meta?.typeset && Object.values(meta.typeset).some(Boolean) && (
            <button type="button" className="pair-quiet" disabled={busy !== null} onClick={() => void act("house", { typeset: {} })}>
              Return to the archive's hand
            </button>
          )}
          <p className="muted">The world's hand sets every page, board and label in these faces.</p>
        </section>
      </div>

      <article className="pair-leaf" style={vars} aria-label="Proof of the pairing">
        <p className="pair-kicker">Being the annals of {meta?.name ?? "an unwritten world"}</p>
        <h2 className="pair-title">{prose?.title ?? "The Ferrymen's Calendar"}</h2>
        <p className="pair-meta">
          {prose ? <StatusMark status={prose.status} /> : "◇"} {prose ? `${prose.status} · ${prose.kind}` : "proposed · chronicle"}
        </p>
        <div className="pair-body">
          {paras.map((p, i) => (
            <p key={i} className={i === 0 ? "has-drop" : undefined}>
              {p}
            </p>
          ))}
        </div>
        <aside className="pair-note">
          <span className="pair-note-mark">†</span> A margin note sits in the body face, set small and italic, to see how it holds up.
        </aside>
        <h3 className="pair-sub">Of the Second Winter</h3>
        <p className="pair-small">
          <span className="pair-label-row">Canon · Proposed · Question</span> — and numerals: 1066, 3/4, xiv.
        </p>
      </article>

      <aside className="pair-shelf">
        <section>
          <h3 className="sc">From the archive's case</h3>
          <ul className="pair-list">
            {ARCHIVE_PAIRINGS.filter((p) => ROLES.every((r) => have.has(p[r]))).map((p) => (
              <li key={p.name}>
                <button type="button" aria-pressed={sameTypeset(draft, p)} onClick={() => setDraft(p)}>
                  <span className="pair-list-name" style={{ fontFamily: cssFamily(p.display, "display") }}>
                    {p.name}
                  </span>
                  <span className="pair-list-body" style={{ fontFamily: cssFamily(p.body, "body") }}>
                    {p.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="sc">Kept in this world</h3>
          <form
            className="pair-keep"
            onSubmit={(e) => {
              e.preventDefault();
              keep();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this pairing…" maxLength={80} aria-label="Pairing name" />
            <button type="submit" disabled={busy !== null}>
              Keep
            </button>
          </form>
          {saved.length ? (
            <ul className="pair-list">
              {saved.map((p) => (
                <li key={p.name} className="pair-kept">
                  <button type="button" aria-pressed={sameTypeset(draft, p)} onClick={() => setDraft(p)}>
                    <span className="pair-list-name" style={{ fontFamily: cssFamily(p.display, "display") }}>
                      {p.name}
                    </span>
                    <span className="pair-list-body" style={{ fontFamily: cssFamily(p.body, "body") }}>
                      {ROLES.map((r) => p[r] || HOUSE[r]).join(" · ")}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="tool pair-forget"
                    aria-label={`Forget ${p.name}`}
                    title="Forget this pairing"
                    onClick={() => void act("forget", { pairings: saved.filter((s) => s.name !== p.name) })}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing kept yet.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

/** Only the roles that name a face; empty ones mean the house face. */
function clean(t: Typeset): Typeset {
  const out: Typeset = {};
  for (const r of ROLES) if (t[r]) out[r as Role] = t[r];
  return out;
}
