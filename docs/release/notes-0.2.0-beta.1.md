The first beta: everything built in phases 1–5, in a container that's
smaller, locked down, and published so nobody has to build it.

**To run it:** download `agelace-0.2.0-beta.1.zip` below, unzip it, and
follow `READ-ME-FIRST.txt`. The illustrated guide is at
https://mazzeleczzare.com/agelace/guide/. You need Docker Desktop and
nothing else.

**What's in it:** pages with a typesetter's editor (per-span faces, small
caps, drop caps, margin notes, `[[wikilinks]]`); boards (pen ink with
pressure, cards, threads, Mermaid timelines, Excalidraw sketches); the
Pattern (a living graph of everything that names everything else); the
Forge (a type case, pairings, and a scriptorium that casts your own hand
into a real `.otf`).

**Changed since the last build**

- All 13 Dependabot alerts closed. `npm audit` reports 0. The overrides
  come from theatre-of-dependencies, and a new browser suite proves the
  overridden code still works.
- Image 469 MB → 287 MB. Distroless runtime: no shell, no npm, no package
  manager. The server is one bundled file with no `node_modules`.
- Runs as a non-root user, read-only, with every Linux capability dropped.
  On mac and Linux the launcher runs it as you, so `world/` stays yours.
- If it can't write to `world/`, it says so in plain words and stops,
  instead of failing later.
- Mac launchers are now `.command` files, which open in Terminal on
  double-click.

**Known**

- Not yet run on a real Windows machine. Tested on arm64 natively and
  amd64 under emulation.
- Excalidraw renders sketch fonts on the main thread rather than a worker,
  so very large sketches export slowly.
