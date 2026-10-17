# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

agelace — a local-first, containerized story-world app. Primarily a **gift for a
friend**; mazze pressure-tests it with their own work (*Merchants of War*, and it
may become the generative engine behind the tabletop RPG *How to Steal the Moon*).

**Posture: MAX CREATIVITY, everything else relaxed** — with one condition: it must
actually work. Ship it fleshed out (dynamic artifacts, custom engines, prefab
digital assets), but no façade features. Anything that looks functional must be
real and tested underneath.

## Status

Phases 1–3 built (2026-10-17): container + folder-backed API + design system +
rich-text editor + Yjs canvas ("boards"). Next: phase 4, the graph view. Plan, decisions and
resume point: `docs/journal/CHECKPOINT.md`. The root Perplexity `*.md` files are
reference only. `test-report.md` "passes" tests that never ran against any code.

**Decisions (2026-10-17)**
- Story data lives in files on the host (`./world`, mounted at `/world`). This
  replaces the browser-storage plan in `agelace.md`.
- Stack: Vite + React + TS strict (app), Node + Fastify (server), TipTap
  (editor). This is a local app, so no Astro or Cloudflare.
- The canvas is our own engine, **not tldraw**: its licence needs a key in
  production, and the hobby key is discretionary and watermarked. Excalidraw
  (MIT) powers sketch cards, opened full-screen in the Sketchbook.
- Canvases are **Yjs docs** (`world/canvases/<id>.yjs` is the truth;
  `<id>.canvas` is a JSON Canvas export for Obsidian, write-only). Sync is
  plain HTTP + SSE (`app/src/canvas/sync.ts`). All local mutations go through
  `transact()` with the `LOCAL` origin, which is what `Y.UndoManager` tracks.
  Entries are still JSON files, single-writer.
- Undo: one Cmd/Ctrl-Z router (`app/src/undo.ts`). `.ProseMirror` surfaces keep
  their own history. Everything else goes to the most recently mounted target.

## Develop (all Node runs in OrbStack, never on the host)

- `scripts/dev.sh <cmd>` runs a command in the dev container, e.g.
  `scripts/dev.sh npm test`, `scripts/dev.sh npm run typecheck`.
  `scripts/dev.sh up` starts Vite on :5173 plus the API on :8080.
- `node_modules` live in named Docker volumes. The host has none, so editors
  can't resolve deps. After changing any `package.json`, run
  `scripts/dev.sh npm install`.
- npm `allowScripts` in the root `package.json` is pinned per esbuild version.
  After an esbuild bump, run `scripts/dev.sh npm install-scripts approve esbuild`.
- Production: `docker compose up -d --build`, which serves :8080. Launchers
  (`start-agelace.*`, `stop-agelace.*`) sit at the repo root so a
  non-technical user finds them.
- Built-in fonts are curated in `scripts/collect-fonts.mjs` (from @fontsource,
  OFL) and collected at image build. Icons are game-icons.net (CC BY 3.0). The
  Colophon page carries the required attribution, so keep it.

## Gotchas

- Don't use zod `.default()` on `Entry` fields. `EntryPatch` is a `.partial()`
  of it, so defaults get injected into every PATCH and overwrite real data.
- Server deps that are CommonJS-only (e.g. opentype.js) must be bundled by
  esbuild, not marked `--external`. Vitest accepts named CJS imports that
  Node's ESM loader rejects at runtime, so only the container smoke test
  catches this.
- Custom TipTap nodes that render `<a>` need a parse `priority` above the Link
  mark's, or the node is lost on an HTML round-trip.
- There must be exactly one React. npm once hoisted React 18 to satisfy
  Excalidraw's jotai peer, and every library hook then threw
  "reading 'useRef'". Root `overrides` plus Vite `resolve.dedupe` prevent this.
  After changing deps, check `scripts/dev.sh npm ls react` shows no 18.x.
- CSS modifier classes must not reuse component class names. `tool-select`
  and `card-image` both collided and broke layout and pointer events. Use
  `is-*` / `uses-*` for state modifiers.
- Live events carry `by` (the tab's client id). `subscribe()` drops a tab's
  own echoes, so never re-apply your own save from the event stream.
- The client id comes from `crypto.getRandomValues`. `randomUUID` only exists
  in secure contexts, and the iPad over LAN http is not one.

## Container + portability contract

- Develop and run in **OrbStack**, but use nothing OrbStack-specific (no
  `*.orb.local` domains, no OrbStack-only mounts). The target is plain Docker
  Desktop on Windows.
- The friend's Windows skill level is unknown, so **design for the least
  technical user**. The host should only need Docker, plus double-click launchers
  (`start-agelace.cmd` for Windows, `start-agelace.sh` for mac/Linux). They
  should never need Node, git, or a terminal.
- **Images must be multi-arch** (`linux/amd64` + `linux/arm64`). mazze's Mac is
  arm64 and the friend's PC is almost certainly amd64.
- Line endings are LF via `.gitattributes`, except `*.cmd`/`*.bat`, which stay
  CRLF. A CRLF entrypoint or shell script breaks the container.
- Host data folder: use a path relative to the compose file (`./world`),
  never an absolute or mac-specific path. Expect Windows-mounted files to be owned
  by root and case-insensitive. Don't rely on symlinks or on chmod sticking.
- Run `/portability-check` before anything ships to the friend.

## Story-model invariant

Every story element has a status: **Canon / Proposed / Question**. AI-generated
or engine-generated material enters as Proposed and never becomes Canon without
an explicit user action.

## AI and cost

No paid AI automation, no API keys required, no background agents. AI help is
manual: "Copy AI handoff" actions. Optional integrations are fine only if the app
is fully usable without them.

## Sample content

Workshopped excerpts from mazze's writing may ship as examples and tutorial
modules. Full or unworkshopped manuscripts stay out of the repo.
