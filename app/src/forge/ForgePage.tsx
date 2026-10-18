import { PairingRoom } from "./PairingRoom";
import { HandDesk, HandsList } from "./Scriptorium";
import { TypeCase } from "./TypeCase";

export type ForgeRoom = { room: "case" } | { room: "pairing" } | { room: "hands" } | { room: "hand"; id: string };

const ROOMS = [
  { room: "case", href: "#/forge", name: "Type case", gloss: "every face you own" },
  { room: "pairing", href: "#/forge/pairing", name: "Pairing", gloss: "set them side by side" },
  { room: "hands", href: "#/forge/hands", name: "Scriptorium", gloss: "draw your own" },
] as const;

export function ForgePage({ at }: { at: ForgeRoom }) {
  const current = at.room === "hand" ? "hands" : at.room;
  return (
    <section className={`forge${at.room === "hand" ? " is-desk" : ""}`}>
      <header className="forge-head">
        <h1 className="forge-title">The Forge</h1>
        <nav className="forge-rooms" aria-label="Rooms of the forge">
          {ROOMS.map((r) => (
            <a key={r.room} href={r.href} aria-current={current === r.room ? "page" : undefined}>
              <span>{r.name}</span>
              <small>{r.gloss}</small>
            </a>
          ))}
        </nav>
      </header>
      {at.room === "case" ? <TypeCase /> : at.room === "pairing" ? <PairingRoom /> : at.room === "hands" ? <HandsList /> : <HandDesk id={at.id} />}
    </section>
  );
}
