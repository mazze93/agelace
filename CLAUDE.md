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

Pre-code (as of 2026-10-17). The root `*.md` files are Perplexity planning output
(2026-09-28). `agelace.md` is the build plan; the other four describe a Perplexity
Spaces prompt workflow and are reference material only. `test-report.md` "passes"
tests that never ran against any code — it is not evidence of anything.

**Decision (2026-10-17): story data lives in files on the host**, mounted into the
container. This replaces the browser-storage plan in `agelace.md`, so the stack
needs a real server process that writes files. A static nginx-only image is not
enough. JSON backup/import and Markdown export (Obsidian/Scrivener) still stand.

## Container + portability contract

- Develop and run in **OrbStack**, but use nothing OrbStack-specific (no
  `*.orb.local` domains, no OrbStack-only mounts). The target is plain Docker
  Desktop on Windows.
- The friend's Windows skill level is unknown, so **design for the least
  technical user**. The host should only need Docker, plus double-click launchers
  (`.cmd` for Windows, `.sh` for mac/Linux). They should never need Node, git, or
  a terminal.
- **Images must be multi-arch** (`linux/amd64` + `linux/arm64`). mazze's Mac is
  arm64 and the friend's PC is almost certainly amd64.
- Line endings are LF via `.gitattributes`, except `*.cmd`/`*.bat`, which stay
  CRLF. A CRLF entrypoint or shell script breaks the container.
- Host data folder: use a path relative to the compose file (e.g. `./data`),
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
