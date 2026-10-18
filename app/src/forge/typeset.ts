import { useSyncExternalStore } from "react";
import type { Pairing, Typeset } from "@agelace/shared";

export type Role = "display" | "body" | "label";
export const ROLES: Role[] = ["display", "body", "label"];
export const ROLE_NAME: Record<Role, string> = { display: "Display", body: "Body", label: "Labels" };

/** The archive's own faces: what an empty role falls back to. Mirrors tokens.css. */
export const HOUSE: Required<Typeset> = { display: "IM Fell English", body: "Alegreya", label: "Alegreya Sans SC" };
const FALLBACK: Record<Role, string> = {
  display: '"Iowan Old Style", Georgia, serif',
  body: '"Iowan Old Style", Georgia, serif',
  label: '"Gill Sans", "Trebuchet MS", sans-serif',
};

/** A family name as a CSS font-family value, with the role's fallbacks. */
export function cssFamily(family: string | undefined, role: Role): string {
  const fam = (family || HOUSE[role]).replace(/["\\]/g, "");
  return `"${fam}", ${FALLBACK[role]}`;
}

/** Curated from the built-in case. Each note says why the two (or three) get on. */
export const ARCHIVE_PAIRINGS: (Required<Pairing> & { note: string })[] = [
  { name: "The Chancery", display: "IM Fell English", body: "Alegreya", label: "Alegreya Sans SC", note: "The archive's own hand: Fell's rough-cut capitals over a calligraphic text face." },
  { name: "Garamond's Room", display: "Cormorant Garamond", body: "EB Garamond", label: "Alegreya SC", note: "Two Garamonds: a tall, sharp display cut over a sturdy text cut." },
  { name: "The Abbey", display: "Uncial Antiqua", body: "Spectral", label: "Alegreya Sans SC", note: "Insular capitals for the heads, and a quiet modern serif to read by." },
  { name: "The Ledger", display: "UnifrakturMaguntia", body: "Libre Baskerville", label: "Alegreya Sans SC", note: "Black letter for titles only; Baskerville keeps the accounts." },
  { name: "Field Notes", display: "Caveat", body: "Spectral", label: "Alegreya Sans SC", note: "A traveller's hand above a printed page." },
  { name: "Pica & Clerk", display: "IM Fell DW Pica", body: "Cormorant Garamond", label: "Kalam", note: "Fell's pica for titles, Cormorant for the text, the labels in a clerk's hand." },
  { name: "Old Style", display: "Libre Baskerville", body: "EB Garamond", label: "Alegreya SC", note: "Transitional heads over an old-style text: a printer's sensible pairing." },
];

// ── the pairing being composed (shared between the type case and the pairing room) ──

let draft: Typeset = {};
let seeded = false;
const listeners = new Set<() => void>();

export function setDraft(next: Typeset): void {
  seeded = true; // an explicit choice (e.g. "Pair as display" in the type case) outranks the world's hand
  draft = { ...next };
  listeners.forEach((l) => l());
}

export function setDraftRole(role: Role, family: string | undefined): void {
  setDraft({ ...draft, [role]: family });
}

export function useDraft(): Typeset {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}

/** Start the draft from the world's hand, once per session. */
export function seedDraft(typeset: Typeset | undefined): void {
  if (seeded) return;
  seeded = true;
  draft = { ...(typeset ?? {}) };
}

/** Apply the world's hand to the whole app by overriding the font tokens. */
export function applyTypeset(t: Typeset | undefined): void {
  const root = document.documentElement.style;
  const set = (prop: string, family: string | undefined, role: Role) =>
    family ? root.setProperty(prop, cssFamily(family, role)) : root.removeProperty(prop);
  set("--font-display", t?.display, "display");
  set("--font-display-sc", t?.display, "display");
  set("--font-body", t?.body, "body");
  set("--font-label", t?.label, "label");
}

export const sameTypeset = (a: Typeset | undefined, b: Typeset | undefined): boolean =>
  ROLES.every((r) => (a?.[r] || undefined) === (b?.[r] || undefined));
