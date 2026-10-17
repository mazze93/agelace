import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { api } from "./api";
import { refreshFonts, useFontFamilies } from "./fonts";
import { Sigil } from "./Sigil";

export interface PopoverProps {
  label: ReactNode;
  title: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}

/** Disclosure popover: click to open, Escape or click-away to close. */
export function Popover({ label, title, className, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className={`popover${className ? ` ${className}` : ""}`} ref={ref}>
      <button type="button" className="tool" aria-expanded={open} title={title} aria-label={title} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && (
        <div className="popover-panel" role="dialog" aria-label={title}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export interface IconGridProps {
  onPick: (name: string) => void;
  initialQuery?: string;
}

/** Search across ~4,000 game-icons (CC BY 3.0). */
export function IconGrid({ onPick, initialQuery = "" }: IconGridProps) {
  const [q, setQ] = useState(initialQuery);
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => void api.icons(q, 96).then((n) => live && setNames(n)), 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  return (
    <div className="icon-grid">
      <input autoFocus type="search" placeholder="Search sigils — tower, moon, sword…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="icon-grid-cells">
        {names.map((n) => (
          <button key={n} type="button" title={n.replace(/-/g, " ")} onClick={() => onPick(n)}>
            <Sigil name={n} size="1.6rem" />
          </button>
        ))}
        {!names.length && <p className="muted">No sigil by that name.</p>}
      </div>
    </div>
  );
}

export interface FontListProps {
  current?: string | undefined;
  onPick: (family: string | null) => void;
}

/** Every family in the library, each previewed in itself. Drop a font file to add one. */
export function FontList({ current, onPick }: FontListProps) {
  const families = useFontFamilies();
  const [q, setQ] = useState("");
  const [drop, setDrop] = useState<"idle" | "over" | "busy" | string>("idle");

  const accept = async (files: FileList | null) => {
    if (!files?.length) return;
    setDrop("busy");
    try {
      for (const f of Array.from(files)) await api.uploadFont(f);
      await refreshFonts();
      setDrop("idle");
    } catch (err) {
      setDrop((err as Error).message);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void accept(e.dataTransfer.files);
  };

  const shown = families.filter((f) => f.family.toLowerCase().includes(q.toLowerCase()));
  return (
    <div
      className={`font-list${drop === "over" ? " is-over" : ""}`}
      onDragOver={(e) => (e.preventDefault(), setDrop("over"))}
      onDragLeave={() => setDrop("idle")}
      onDrop={onDrop}
    >
      <input autoFocus type="search" placeholder="Find a face…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul>
        <li>
          <button type="button" className={!current ? "is-current" : ""} onClick={() => onPick(null)}>
            <span className="font-sample" style={{ fontFamily: "var(--font-body)" }}>
              The house face
            </span>
            <small>default</small>
          </button>
        </li>
        {shown.map((f) => (
          <li key={f.family}>
            <button type="button" className={current === f.family ? "is-current" : ""} onClick={() => onPick(f.family)}>
              <span className="font-sample" style={{ fontFamily: `"${f.family}", var(--font-body)` }}>
                {f.family}
              </span>
              <small>{f.source === "world" ? "yours" : f.category}</small>
            </button>
          </li>
        ))}
      </ul>
      <label className="font-drop">
        <input type="file" accept=".ttf,.otf,.woff,.woff2" multiple hidden onChange={(e) => void accept(e.target.files)} />
        {drop === "busy" ? "Setting type…" : drop !== "idle" && drop !== "over" ? drop : "Drop a font here, or choose a file"}
      </label>
    </div>
  );
}
