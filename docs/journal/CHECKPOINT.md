# CHECKPOINT — agelace

Resume point. Append-only phase log below; the "Now" block is rewritten each phase.
What was promised vs what shipped, and the lessons: `BUILD-DIARY.md` beside this file
(also published as a page: https://claude.ai/artifact/NQvUz4JAF5fbeXYr7xYa9h; the repo copy is the one to append to).

## Now (2026-10-18)

Phases 1–5 done and verified. **Next: phase 6**, tutorial modules from mazze's
workshopped excerpts, plus prefab assets.

Design system for mazze to workshop (private Claude Design System artifact,
built from main@77b38e8): https://claude.ai/artifact/7QYgLXsN7Ly3Nh4N9m2rL3
Tokens (both lamps), house faces, 10 sigils, 12 static component renditions
using the app's real CSS, plus a cover. Edits made there do NOT flow back into
the app: port them into `app/src/styles/tokens.css` by hand.

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
4. ✅ The Pattern: graph view (d3-force, sigil seals as nodes, boards as lozenges,
   wikilinks / board threads / board membership as strands), local weave per
   entry, Strands (backlinks) panel on every entry, seal cards on boards, kind
   sigils in the rail
5. ✅ The Forge: type case (specimens, proof sheet, drop to add), pairing (three
   roles, proof leaf from the world's own prose, curated + kept pairings, "the
   world's hand" applied app-wide), Scriptorium (broad/quill/round nibs, stylus
   pressure + eraser end + palm rejection, undo, live proof, cast → `.otf`)
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

## Verified (phase 5)

- Server 28/28 (new: geometry: union, counters as holes under every nib, broad
  nib thick/thin by direction, pressure spreads a stylus's broad nib; world
  patch keeps the epigraph; hand create → draw → cast → opentype.js reads the
  family, glyph, bearings, word space, weight 400 → trash). App 18/18.
  Typecheck clean. Bruno 26/26 headless (`scripts/api-check.sh`).
- Headless Chromium (Playwright 1.49.1 container; neither browser extension was
  connected) against a test container on :8081: type case renders 15 families;
  proof sheet; "Pair as display" carries over; set and return the world's hand
  (the `--font-*` tokens change and revert); keep a pairing; draw "How to steal
  the Moon" with the mouse; Ctrl-Z / Ctrl-Shift-Z; eraser tool and undo of it;
  synthetic stylus (pressure 0.2→0.9 saved with `pen: true`, palm touch ignored,
  eraser end removes a stroke); nib change re-inks; cast → `document.fonts`
  loads `Moonthief`; it appears on "Your own"; 500px wide: no horizontal
  overflow on any forge room; dark lamp. No console errors.

## Verified (phase 4)

- Server 18 tests (board summaries name entries + threads; icon guard now scans
  app source). App 18 tests (`weave`: mutual links, boards, filters, focus depth).
- Browser (prod image, isolated test world on :8081, 17 linked entries + a board):
  - Pattern renders and fits beside the panel; status reads from the seal.
  - Drag pins a seal (saved, click suppressed), pin button loosens it.
  - Hover lights the neighbourhood; search highlights and Enter centres.
  - Click opens the entry; its Strands panel lists named-in / names / laid-on.
  - Local weave `#/pattern/<id>`: depth 1 → 5 seals, depth 2 → 11.
  - Board joins the weave; labelled thread "taxed by" renders.
  - Seal card: struck from the icon grid, named, re-inked; undo/redo round-trip.
  - 500 px (narrowest the window goes) + light theme: no sideways scroll, panel folds.
- Compose healthcheck reports `healthy` (moved out of the Dockerfile for Podman).
- amd64 image (emulated) builds, serves health and the new board summaries.

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
  On that run, drop a font into `world/fonts/` and confirm it appears without a
  restart (the polling watcher is what makes that work there).
- iPad over plain-http LAN: clipboard / service workers are blocked outside a
  secure context. Local HTTPS may be needed for the forge.
- Margin-note stacking uses heights measured before auto-grow, so notes can
  overlap slightly when several sit close together.
- Forge: stylus tested with synthetic pen events only, not real hardware.
  Kerning is not cast (spacing is per-glyph side bearings only).
- Board: not yet tested with a real stylus (Windows Ink / Apple Pencil). Pen
  pressure and the flip-to-erase button are wired to Pointer Events but
  untested on hardware.
- Board: sketches don't support embedded images yet (use a Map card).
- Board: Mermaid source edits replace the whole Y.Text, so concurrent edits to
  the same diagram are last-writer-wins.
- Podman path untested on a real Podman install (Docker path verified).
- Dependabot / `npm audit`: transitive advisories (braces, katex, lodash-es,
  nanoid, …) under Excalidraw and Mermaid. `audit fix --force` would make
  breaking downgrades, so review by hand. The app runs on localhost by default,
  so exposure is low, but `--share` widens it.

## Log

- 2026-10-18 — Outside edits on Windows: compose sets `AGELACE_POLL=1`, because
  Docker Desktop on Windows doesn't forward file-change events into the
  container, so a dropped-in font or hand-edited page would have gone unseen.
  `server/test/watch.test.ts` covers the watcher (shown red with it off). Codex
  copies (`AGENTS.md`, `.agents/skills/`) are now generated by
  `scripts/sync-agents.sh` and committed (diary O6).

- 2026-10-18 — Contrast fixed (ink-faint both lamps, verdigris and orpiment by
  daylight; highlights keep the bright gold via `--wash-orpiment`), enforced by
  `contrast.test.ts`. Working rules from the diary written into CLAUDE.md.

- 2026-10-18 — Audit of phases 1–5 (see BUILD-DIARY.md §3). Fixed: casts could
  overwrite a dropped-in font or another hand's cast; renames left ghost
  families; a save/cast race; palm rejection locked fingers out silently (and
  the first fix raced React); proof sheet focus; px label; a route; small caps
  under the world's hand; astral glyph names; design-system CSS that wasn't the
  app's. The browser suite moved from scratch into `e2e/` +
  `scripts/browser-check.sh` (27 checks). Server tests 33.

- 2026-10-18 — Phase 5 built. Caught: PATCH /api/world blanked the epigraph
  (zod default under `.partial()`), a live bug since phase 1; font family names
  were never read from font files (opentype.js 2.x nests names by platform), so
  dropped fonts were named from their filenames; polygon-clipping failed on
  broad-nib O's (fixed by snapping + incremental fold); "Pair as display" was
  overwritten by the pairing room's first-open seed; cast fonts claimed weight
  500 (opentype.js default).

- 2026-10-17 — API mapped as a Bruno collection (`bruno/`, 20 requests, every
  route documented) plus `scripts/api-check.sh` (headless, throwaway world):
  20/20 pass. It caught a live bug: `fonts.ts` imported opentype.js by name,
  which Node's ESM loader rejects under `tsx`, so `scripts/dev.sh up` had been
  broken since phase 2 (the esbuild bundle and Vitest both hid it). Not covered:
  SSE `/api/events`, binary asset/font uploads.

- 2026-10-17 — Phase 4 built. Caught in-browser: the first fit ran against an
  empty index (marked "fitted" before entries loaded); fit ignored the panel;
  far-zoom labels counter-scaled into a pile; a local weave would have saved its
  centred layout (and the subject's pin) over the whole Pattern's.

- 2026-10-17 — Phase 3 built. Bugs caught in-browser: React 18/19 duplicate
  (Excalidraw peer hoist), CSS class collisions (`tool-select` 33px surface;
  `card-image` wrapper killing pointer events), crypto.randomUUID in insecure
  contexts, one EventSource per subscriber exhausting connections.

- 2026-10-17 — Phases 1–2 built. Bugs caught by tests or the smoke run:
  zod defaults leaking into PATCH, opentype.js CJS import failing in prod,
  wikilinks lost on HTML round-trip.
