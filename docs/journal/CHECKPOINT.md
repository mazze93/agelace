# CHECKPOINT — agelace

Resume point. Append-only phase log below; the "Now" block is rewritten each phase.

## Now (2026-10-17)

Phases 1–3 done and verified. **Next: phase 4, the graph view + icons everywhere.**

## Plan

1. ✅ Skeleton: container, launchers, folder-backed API, design system, shell
2. ✅ Editor: per-span fonts/sizes/tracking/inks, small caps, drop caps, margin
   footnotes, `[[wikilinks]]` (naming an unwritten thing creates it as a Question),
   inline ornaments, fleuron breaks, statuses, autosave, live outside-edit reload
3. ✅ Canvas engine (custom, not tldraw): pan/zoom, cards that *reference* entries,
   connectors, pressure ink (perfect-freehand + Pointer Events), Mermaid cards,
   map/image cards, Excalidraw sketch cards, semantic zoom (prose → sigil as you
   zoom out). Stored as Yjs docs in `world/canvases/*.yjs`, plus a write-only
   JSON Canvas export (`*.canvas`) that Obsidian can open.
4. Graph view (d3-force, sigils as nodes) + the icon library everywhere
5. Font forge: library view and pairing; then stylus glyph drawing → opentype.js →
   `.otf` written into `world/fonts/`
6. Tutorial modules from mazze's workshopped excerpts (Merchants of War / How to
   Steal the Moon), plus prefab assets

## Decisions

- 2026-10-17 — Host-folder storage (`./world`) replaces browser storage.
- 2026-10-17 — Custom canvas engine. tldraw needs a production licence key, and
  its hobby key is discretionary and watermarked.
- 2026-10-17 — Aesthetic: "lamplit archive". IM Fell English (display), Alegreya
  (body), Alegreya Sans SC (labels); bone or lamp-black paper, vermilion rubric,
  verdigris. Laid-paper chain lines, no parchment texture. Status marks
  ◆ canon, ◇ proposed, ⸮ question.
- 2026-10-17 — Deletion moves entries to `world/.trash/`, never removes them.
- 2026-10-17 — Boards are Yjs docs from day one (mazze: "build it Yjs-ready"),
  so multi-writer collaboration needs no migration. Entries stay JSON for now.
- 2026-10-17 — Cmd/Ctrl-Z is a must-have everywhere (mazze). There is one
  router, with a time-ordered journal on entry pages and Y.UndoManager on boards.
- 2026-10-17 — Server listens on 127.0.0.1 by default; `--share` on the
  launchers opens it to the LAN (iPad).

## Verified

- Server tests 10/10 and app tests 3/3 in the dev container; typecheck clean.
- Production image runs in OrbStack. Typing in the browser autosaves to
  `world/entries/*.json`.
- amd64 image under emulation: health check, create, file on host, restart, still there.
- No console errors. 390 px width: no sideways scroll, and margin notes become
  endnotes.

## Verified (phase 3)

- Server 17 tests: two-client merge, state-vector deltas, .yjs/.canvas
  persistence across restart, asset type sniffing, echo tagging. App 13 tests.
- Browser (prod container):
  - Pen ink with pressure taper; Cmd-Z removed the stroke.
  - Entry cards placed; drag-move; thread drawn between cards.
  - Mermaid timeline themed in house inks.
  - Semantic zoom: medallions at far zoom.
  - Region named in window B appears live in window A.
  - Entry page: title typing coalesces into one undo step; status undo/redo
    persists to disk.
  - Sketchbook (Excalidraw) loads with zero CDN requests.

## Open

- Real Windows run (Docker Desktop) — still unverified; emulation is not parity.
- iPad over plain-http LAN: clipboard / service workers are blocked outside a
  secure context. Local HTTPS may be needed for the forge.
- Margin-note stacking uses heights measured before auto-grow, so notes can
  overlap slightly when several sit close together.
- Board: not yet tested with a real stylus (Windows Ink / Apple Pencil). Pen
  pressure and the flip-to-erase button are wired to Pointer Events but
  untested on hardware.
- Board: sketches don't support embedded images yet (use a Map card).
- Board: Mermaid source edits replace the whole Y.Text, so concurrent edits to
  the same diagram are last-writer-wins.
- amd64 portability check not re-run since phase 3 deps were added.

## Log

- 2026-10-17 — Phase 3 built. Bugs caught in-browser: React 18/19 duplicate
  (Excalidraw peer hoist), CSS class collisions (`tool-select` 33px surface;
  `card-image` wrapper killing pointer events), crypto.randomUUID in insecure
  contexts, one EventSource per subscriber exhausting connections.

- 2026-10-17 — Phases 1–2 built. Bugs caught by tests or the smoke run:
  zod defaults leaking into PATCH, opentype.js CJS import failing in prod,
  wikilinks lost on HTML round-trip.
