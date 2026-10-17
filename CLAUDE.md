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

Phases 1–2 built (2026-10-17): container + folder-backed API + design system +
rich-text editor. Next: phase 3, the custom canvas engine. Plan, decisions and
resume point: `docs/journal/CHECKPOINT.md`. The root Perplexity `*.md` files are
reference only. `test-report.md` "passes" tests that never ran against any code.

**Decisions (2026-10-17)**
- Story data lives in files on the host (`./world`, mounted at `/world`). This
  replaces the browser-storage plan in `agelace.md`.
- Stack: Vite + React + TS strict (app), Node + Fastify (server), TipTap
  (editor). This is a local app, so no Astro or Cloudflare.
- The canvas is our own engine, **not tldraw**: its licence needs a key in
  production, and the hobby key is discretionary and watermarked. Excalidraw
  (MIT) is fine for embedded sketch cards.

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
