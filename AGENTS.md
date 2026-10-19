# CLAUDE.md

This file provides guidance to Codex when working with code in this repository.
It is generated from CLAUDE.md by `scripts/sync-agents.sh`: edit CLAUDE.md, not this.

## What this is

agelace — a local-first, containerized story-world app. Primarily a **gift for a
friend**; mazze pressure-tests it with their own work (*Merchants of War*, and it
may become the generative engine behind the tabletop RPG *How to Steal the Moon*).

**Posture: MAX CREATIVITY, everything else relaxed** — with one condition: it must
actually work. Ship it fleshed out (dynamic artifacts, custom engines, prefab
digital assets), but no façade features. Anything that looks functional must be
real and tested underneath.

## Status

Phases 1–5 built (2026-10-18): container + folder-backed API + design system +
rich-text editor + Yjs canvas ("boards") + the Pattern (graph view, `#/pattern`) +
the Forge (`#/forge`: type case, pairing, Scriptorium glyph drawing → .otf).
Next: phase 6, tutorial modules and prefab assets. Plan, decisions and
resume point: `docs/journal/CHECKPOINT.md`. The Perplexity planning files are
reference only, in `docs/reference/perplexity/`; its `test-report.md` "passes"
tests that never ran against any code.

**Decisions (2026-10-17)**
- Story data lives in files on the host (`./world`, mounted at `/world`). This
  replaces the browser-storage plan in `docs/reference/perplexity/agelace.md`.
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
- The Pattern (`app/src/pattern/`): `graph.ts` is the pure model (tested);
  `PatternPage.tsx` runs d3-force and moves DOM nodes through refs on each tick,
  never through React state. Board summaries carry `entries` + `threads` so the
  graph never loads Y.Docs. Saved layout is per-viewer localStorage, whole view only.
- The Forge (`app/src/forge/`): a *hand* is `world/forge/<id>.json` (pen strokes
  in font units, y up, 1000/em). `shared/src/glyph.ts` is the one geometry path
  for the live proof and the cast: nib → polygons → polygon-clipping union →
  lines and quadratics. The server casts with opentype.js into
  `world/fonts/<Family>.otf`, and only ever overwrites its own previous cast
  (recorded as `cast` in the hand; a rename retires the old file to `.trash`).
  World font URLs carry `?v=<mtime>` so a recast reloads. `typeset` in `world.json` is the world's hand, applied app-wide by
  overriding the `--font-*` tokens.
- Runtime-agnostic: image names are fully qualified (`docker.io/library/…`), the
  healthcheck lives in `compose.yaml` (Podman's OCI format drops a Dockerfile
  HEALTHCHECK), and launchers fall back from `docker` to `podman`.
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
- API: `bruno/` is a Bruno collection, one documented request per route (open
  the folder in Bruno.app). `scripts/api-check.sh [folder]` runs it headless
  with `@usebruno/cli` against a throwaway seeded world in the dev container.
  When you add or change a route, add or change its `.bru` file too.
- Browser: `scripts/browser-check.sh` builds the image, starts it on a throwaway
  world (:8091) and runs every `e2e/*.mjs` suite in Playwright's container:
  `forge.mjs` (28 checks) and `boards.mjs` (7: Mermaid + KaTeX, the
  Sketchbook, Excalidraw's Mermaid converter (where the dependency
  overrides live), long titles wrap). Exits non-zero on failure, screenshots in `e2e/shots/`. Run
  it after any UI change, or any change to `overrides`; extend it rather than
  testing by hand.
- Sandbox (`demo/`): the real app build plus a service worker that runs the
  server's own route table (`server/src/routes.ts`) and stores on an
  in-memory filesystem written through to IndexedDB (`demo/src/fs.ts`).
  `scripts/dev.sh npm run build -w demo` → `demo/dist` (Cloudflare Pages,
  its own origin: a worker scoped to the blog's domain would sit in front of
  the whole blog). `scripts/demo-check.sh` runs `e2e/sandbox/demo.mjs`
  (16 checks) against it on localhost, which is a secure context. With
  `BASE=https://agelace-demo.pages.dev` the same suite checks the live deploy.
  Deploy with `wrangler pages deploy demo/dist --project-name agelace-demo`
  from a folder with no `functions/` (wrangler bundles the cwd's `functions/`;
  run from the blog it shipped the blog's middleware into the sandbox). Rules: a
  new route goes in `routes.ts` only; a store may only use the fs calls the
  shim exports (`demo/tsconfig.json` maps `node:fs/promises` to it, so a
  missing one fails typecheck); keep the worker small (private windows
  refused to install it at 7 MB), which is why the icon set loads at runtime.
- Codex copies: `AGENTS.md` and `.agents/skills/` are generated from this file
  and `.claude/skills/` by `scripts/sync-agents.sh`. After editing either, run
  it; `--check` exits 1 when they're stale. Never edit the copies.
- Production: `docker compose up -d --build`, which serves :8080. Launchers
  (`start-agelace.*`, `stop-agelace.*`) sit at the repo root so a
  non-technical user finds them. They build when a `Dockerfile` sits beside
  them, else pull the published image. Mac double-click needs the `.command`
  wrappers (a `.sh` opens in an editor).
- Release: `scripts/release-bundle.sh <ver>` makes the friend's zip
  (launchers, a compose file that pulls `ghcr.io/mazze93/agelace:<ver>`,
  `docs/release/READ-ME-FIRST.txt`). A `v*.*.*` tag runs
  `.github/workflows/release.yml`: multi-arch push, SBOM + provenance, cosign
  keyless, GitHub Release with the zip. It needs
  `docs/release/notes-<ver>.md` and a matching root `package.json` version.
- CI (`.github/workflows/ci.yml`): typecheck, tests, build, Codex sync,
  `npm audit`, the theatre-of-dependencies gate, Bruno, both browser suites,
  and a non-root read-only smoke run; main publishes `:edge`. Every action is
  pinned to a full SHA; resolve new pins from the API, never from memory.
- Built-in fonts are curated in `scripts/collect-fonts.mjs` (from @fontsource,
  OFL) and collected at image build. Icons are game-icons.net (CC BY 3.0). The
  Colophon page carries the required attribution, so keep it.

## Gotchas

- Don't use zod `.default()` on any schema you `.partial()` for a PATCH: the
  default is injected into every PATCH and overwrites real data. `EntryPatch`
  avoids it; `WorldPatch` is built from default-free fields (a `.partial()` of
  `WorldMeta` used to blank the epigraph on every rename).
- polygon-clipping's sweep line throws "Unable to complete output ring" on raw
  floats. `glyphContours` snaps to ¼ unit and folds polygons in one by one on
  failure. Keep both.
- opentype.js 2.x nests names per platform (`names.windows.fontFamily.en`);
  read them through `fontName()` in `server/src/fonts.ts`.
- Server deps that are CommonJS-only (e.g. opentype.js) must be bundled by
  esbuild, not marked `--external`, and imported by their **default** export.
  Vitest accepts named CJS imports that Node's ESM loader rejects, so a named
  import passes tests and then breaks `tsx` (`dev.sh up`, `api-check.sh`).
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
- Icon names: `server/test/store.test.ts` scans app source for literal
  `<Sigil name="…">` / `icon: "…"` and fails on any glyph game-icons lacks.
  Keep sigil names literal so the guard can see them.
- The world watcher polls in production (`AGELACE_POLL=1` in `compose.yaml`).
  Docker Desktop on Windows doesn't forward file events from a bind mount, so
  without polling the app never sees files the user adds. Keep it on.
- The client id comes from `crypto.getRandomValues`. `randomUUID` only exists
  in secure contexts, and the iPad over LAN http is not one.

## Working rules (from docs/journal/BUILD-DIARY.md §6; the evidence is there)

- A test must be able to fail for the reason in its name: before trusting it,
  break the thing it guards and watch it go red. Compare before/after, not
  "non-empty".
- Probe a library behaviour that decides correctness in the dev container
  before relying on it (zod defaults, opentype.js names, CJS imports were all
  wrong from memory).
- A claim about a value comes from every place that sets it: grep the
  property, don't stop at the token file.
- Writes into folders the user also writes to (`fonts/`, `assets/`) prove they
  own the file they replace, or refuse. Retire to `.trash/`; never delete.
- Event handlers decide from refs; React state is for what the user sees.
- Any mode the app enters on its own is visible and reversible where it happens.
- Docs that describe the code (the design-system artifact included) are
  checked against the code before publishing; uncited prose is a proposal.
- If a check was worth running once, it lives in the repo with an exit code
  (`e2e/`, `bruno/`, Vitest). Nothing that proves a phase lives in scratch.
- Shell: always quote heredocs (`<<'EOF'`); pass values through the environment.
- At each phase boundary append to `BUILD-DIARY.md`: promised, shipped,
  diverged, and the rule learned. Never rewrite old entries.
- Every text colour reads at 4.5:1 on every paper in both lamps;
  `app/src/styles/contrast.test.ts` enforces it.

## Container + portability contract

- Develop and run in **OrbStack**, but use nothing OrbStack-specific (no
  `*.orb.local` domains, no OrbStack-only mounts). The target is plain Docker
  Desktop on Windows.
- The friend's Windows skill level is unknown, so **design for the least
  technical user**. The host should only need Docker, plus double-click launchers
  (`start-agelace.cmd` for Windows, `start-agelace.sh` for mac/Linux). They
  should never need Node, git, or a terminal.
- **Images must be multi-arch** (`linux/amd64` + `linux/arm64`). mazze's Mac is
  arm64 and the friend's PC is almost certainly amd64. The build stage runs on
  `$BUILDPLATFORM` (its output is JS and fonts), so only the copy stage is
  per-arch.
- Runtime is distroless (`gcr.io/distroless/nodejs24-debian13`, by digest):
  no shell, no npm, node at `/nodejs/bin/node` (the compose healthcheck uses
  that path). The server is one esbuild bundle with no `node_modules`, so a
  server dependency must be importable statically (the icon set is a JSON
  import, not `createRequire`).
- The container runs non-root (UID 10001; the mac/Linux launcher passes your
  own UID via `AGELACE_UID`/`AGELACE_GID`), `read_only`, `cap_drop: ALL`. The
  server refuses to start, in words, if `/world` isn't writable (exit 78).
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
