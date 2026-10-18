# agelace: build diary

A handoff spec and an honest record. CHECKPOINT.md says *where we are*; this
says *what was promised, what was actually built, where the two parted, why,
and what to do differently*. Written 2026-10-18 at the end of phase 5, from a
full audit of the session transcript and the code, by the agent that built it.

Read it in this order: **§1 the state of things**, **§4 open defects and
decisions**, **§5 high-value work not yet done**, then the rest as needed.

---

## 1. The state of things (2026-10-18)

| | |
|---|---|
| Phases built | 1 container + world API · 2 rich-text editor · 3 Yjs boards + undo · 4 the Pattern · 5 the Forge |
| Next | 6: tutorial modules from mazze's workshopped excerpts, prefab assets |
| Tests | server 33, app 18 (Vitest) · Bruno 26 requests / 52 assertions · browser 27 checks |
| Verify everything | `scripts/dev.sh npm test` · `scripts/dev.sh npm run typecheck` · `scripts/api-check.sh` · `scripts/browser-check.sh` |
| Ship check | `/portability-check` (amd64 image under emulation; last run 2026-10-18, healthy, casts a font) |
| Design system | https://claude.ai/artifact/7QYgLXsN7Ly3Nh4N9m2rL3 (shared by link). Static renditions of 12 app components; **edits there do not flow back into the app** |

Commits, oldest first: `4080389` setup · `838be5c` phases 1–2 · `7beebde` phase 3 ·
`68e8d4f` phase 4 · `28dbf36` · `dc22e8a` Bruno · `77b38e8` phase 5 · `014f4a8` · then
the audit commit that adds this file.

---

## 2. How this audit was done

1. Re-read every file written in phase 5 with the question "what does the user
   believe this does, and does it?", not "does it compile".
2. Checked every claim made to mazze (reports, README, the design system's
   brand book) against the code and the CSS on disk.
3. Swept the session transcript for bugs, retractions and "fixed" claims, and
   checked each against CHECKPOINT and the code.
4. Fixed what was wrong, wrote a test that would have caught it, and re-ran
   every suite (unit, Bruno, browser, typecheck).
5. Recorded the rest here as open, with a recommendation.

---

## 3. Findings: where production fell short of the promise

Severity: **H** = loses or corrupts the user's work, or a feature doesn't do
what it says · **M** = misleads, or works only by luck · **L** = polish.

### Fixed during this audit

| # | Sev | Promise | Reality found | Fix | Proof now |
|---|---|---|---|---|---|
| A1 | H | "Cast the type" makes a font in your fonts folder | Wrote `world/fonts/<Family>.otf` unconditionally, so a font mazze had dropped in with that filename, or another hand's cast, was **silently overwritten** | `HandStore.cast()` refuses (409, nothing written) unless the file is this hand's own previous cast; also refuses a family another font in the folder already claims | `server/test/forge.test.ts`: "never overwrites a font it didn't make", "two hands with one name…", "refuses a family a dropped-in font already uses…"; browser check "a second Moonthief is refused" |
| A2 | M | Renaming a hand renames its font | The old `.otf` stayed in `fonts/`, so both names appeared in every font menu | The hand records `cast`; recasting under a new name moves the old file to `.trash/` | test "recasting after a rename retires the old file" |
| A3 | M | Casting includes everything you've drawn | `flush()` returned early when a save was already in flight, so Cast could read the file from **before the last strokes** | Saves are chained on one promise; `flush()` waits for the one in flight | browser check "a stroke drawn just before casting was saved first" (checks the save completed before the cast ran, not the font's bytes; the ordering guarantees the rest) |
| A4 | H | Palm rejection for stylus users | After the first stylus stroke, **fingers could never draw again** until reload, with no explanation. On an iPad that's a trap | Visible mode ("Stylus found: fingers rest without drawing. Let fingers draw"), overlaid on the sheet so it never shifts under the pen | browser checks "stylus mode is visible", "Let fingers draw re-enables touch" |
| A5 | M | (introduced by the A4 fix, caught by the re-run) | The mode lived in React state; a touch landing before React re-rendered still drew | The decision reads a ref; the state only shows the notice | browser check "stylus pressure saved and palm ignored" (fails without the ref) |
| A6 | M | The proof sheet is a modal (`aria-modal`) | It never moved focus into itself or back out | Focus goes to Close on open and returns to the opening drawer on close | browser checks "proof sheet takes focus", "Escape closes it and returns focus" |
| A7 | L | Specimen size in points | Label said "pt", value was px | Says px | n/a |
| A8 | L | Routes | `#/forge/pairing/anything` opened a hand desk for "anything" | Route only accepts ids under `hands/` | browser check |
| A9 | M | "The world's hand sets every page, board and label" | Board region labels use the small-caps face `--font-display-sc`; overriding it with an arbitrary display family **lost the small capitals** | When a display face is set, `<html data-hand="display">` asks that family for small caps on those labels | CSS rule only; **not exercised in the browser check** (no region card in the test world) |
| A10 | L | Astral characters (runes, emoji) can be drawn | Glyph names were `uni1F319` (invalid AGL); unverified whether opentype.js writes a cmap that holds them | `uXXXXX` names beyond the BMP; round-trip test | test "casts characters beyond the Basic Multilingual Plane" |
| A11 | M | Design system: "the app's CSS, lifted" | Status marks were invented (bold `⸮`; the app uses the display face at 1.15em); rail rows approximated; toolbar frame invented; entry head showed one mark instead of the three-way status switch | Copied the real rules from `app.css` / `editor.css`; scaffolding classes now labelled as preview-only | re-rendered both lamps, compared with the app; published as version 3 |
| A12 | M | Design system brand book | Two claims with no source: a "British-leaning register" voice rule, and `⁂` as a break mark (the editor offers only `❦`) | Removed | n/a |
| A13 | H | Phase 5 "verified in the browser" | The 27-step browser suite lived in the session scratchpad and **would have vanished** at session end, so the evidence wasn't reproducible | `e2e/forge.mjs` + `scripts/browser-check.sh` in the repo, with real assertions and an exit code | `scripts/browser-check.sh`: all 27 checks pass on a fresh world |

### Fixed during phase 5 (before the audit), recorded for the pattern

| Sev | What | Root cause |
|---|---|---|
| H | `PATCH /api/world {name}` **blanked the epigraph** (live since phase 1) | zod 4 `.partial()` still applies an inner `.default("")` |
| M | Every dropped-in font was named from its filename, never its name table | opentype.js 2.x nests names per platform (`names.windows.fontFamily.en`); code assumed 1.x's flat shape |
| H | `scripts/dev.sh up` could not start the API (since phase 2) | named import from a CommonJS package works in Vitest and esbuild, fails in Node ESM under `tsx` |
| M | Broad-nib O's fell back to unmerged outlines | polygon-clipping's sweep line throws on raw floats; snapping to ¼ unit and folding one by one fixed it |
| M | "Pair as display" was lost on arrival | the pairing room seeded its draft from the world's hand on first open, after the type case had set it |
| M | `bruno/world/*` never reached GitHub | `.gitignore` had `world/` (matches at any depth) instead of `/world/` |
| L | Cast fonts declared weight 500 | opentype.js defaults `usWeightClass` to MEDIUM |

---

## 4. Open defects and decisions (not fixed, and why)

| # | What | Why open | Recommendation |
|---|---|---|---|
| O1 | **Contrast.** `color-ink-faint` is 3.2:1 on daylight paper and 4.0:1 by candle, under the 4.5:1 small text needs, and it carries many small labels. Verdigris on daylight paper is 4.3:1. The editor inks are single-valued: by candle ultramarine is 2.4:1, oak-gall 2.1:1, Tyrian 2.0:1; in daylight orpiment is 2.6:1 | A palette is mazze's call, not an audit's | Smallest changes that pass on every paper: ink-faint **#6a5d4c** (daylight, ≥4.52:1) and **#8c806a** (candle, ≥4.51:1); verdigris **#3c7062** (daylight, ≥4.55:1). Give the editor inks a candle value each. Then update the design system's tokens to match |
| O2 | Real hardware never touched the pen code: no Apple Pencil, no Windows Ink | No device in the session | One sitting on each: pressure feel, the eraser end (Windows), palm rejection, iPad over LAN (see O3) |
| O3 | iPad over plain-http LAN is not a secure context | Needs local HTTPS (a cert the friend must trust) | Defer unless the iPad becomes a real use case; `mkcert` + a Caddy sidecar is the least-friction route |
| O4 | 14 npm advisories (6 high), all through `@excalidraw/excalidraw` 0.18 (lodash-es, nanoid, katex, braces via sass) | The only automatic fix is a breaking downgrade to 0.17.6 | Browser-side only; the server image is unaffected. Watch for an Excalidraw release; meanwhile keep the default `127.0.0.1` binding and warn before `--share` |
| O5 | Podman path never run on a real Podman | Not installed | Run the launchers once under Podman Desktop before telling anyone it works |
| O6 | `AGENTS.md` / `.agents/` (from the Codex import) are untracked and describe phases 1–3 | mazze's call whether Codex should get a copy | Either commit a regenerated copy or delete them; a stale guide is worse than none |
| O7 | Root `test-report.md` claims tests "pass" that never ran against any code | Reference material from the planning sessions, kept on purpose | Move the Perplexity files under `docs/reference/` with a one-line note, so the repo root only holds what's true |
| O8 | Workspace rot: `~/Projects/mazze93_secure-pride/` loose at the workspace root | secure-pride is sensitive; moving it is mazze's decision | Move it under `secure-pride/` and update WORKSPACE.md in the same commit |
| O9 | The design-system artifact's recorded sizes for the 10 sigils read 6 bytes smaller than the uploads reported | Cosmetic; source of the difference unknown | Ignore unless the page misbehaves |
| O10 | Phase 4 limitations still stand: margin notes can overlap, sketches can't hold images, Mermaid edits are last-writer-wins, Pattern labels can collide at medium zoom | Scope | See CHECKPOINT "Open" |

---

## 5. High-value work not yet done (out of scope, confident it matters)

Ordered by value per hour.

1. **Fix the contrast (O1).** Four hex values, then check the app in both
   lamps. It affects every screen.
2. **A token sync, app → design system.** `tokens.css` is the truth, and the
   artifact's `tokens.json` was written by hand from it. A small script that
   generates `tokens.json` from `tokens.css` (light block + dark block +
   `:root` lengths) ends the drift that A11 shows will happen.
3. **Composite glyphs in the Forge.** `é = e + ´` (and `ñ ü å`…) built by
   reference instead of drawn again. The friend's names and places will need
   accents. opentype.js can't write components, so place the base and mark
   contours at cast time, with an anchor per mark.
4. **Kerning.** Spacing is per-glyph side bearings only. A small pairs table
   (`AV To Ta LT …`), edited by dragging in the proof strip and cast as a
   `kern`/GPOS table, is the biggest jump in how "real" a cast hand reads.
5. **Lint + format hooks** (still not set up). ESLint with
   `react-hooks/exhaustive-deps` would have flagged the stale-closure family
   of bugs (A5) at write time.
6. **A broader browser suite.** `e2e/` covers the Forge only. The Pattern,
   boards (drag, thread, undo), and the editor (wikilinks, margin notes) were
   verified by hand in earlier phases; that evidence is gone. Port each into
   `e2e/` the same way.
7. **Stroke thinning on save.** Hands store every coalesced pointer sample; a
   long session makes `forge/<id>.json` large. Thin with the same RDP as the
   outlines (tolerance ~0.5 unit) before saving.
8. **Undo across reloads in the Scriptorium.** History is in memory; a
   reload loses it. Cheap to keep the last N snapshots in `sessionStorage`.

---

## 6. What went wrong, why, and what to do differently

Each pattern below happened at least twice. The "rule" is what the next agent
(or the next phase of this one) should do instead.

### 6.1 Tests that passed for the wrong reason
- Vitest accepted a CJS named import that real Node rejects; the bundle
  hid it too. Only running the server the third way (`tsx`) caught it.
- The first family-clash test passed because the *filename* rule fired, not
  the family rule it was named for.
- "Epigraph survives" passed on any non-empty epigraph, including the seed's.
- **Rule:** for every test, ask "what other mechanism could make this
  pass?" and make the test fail if that mechanism is the one responsible
  (rename the file, compare before/after, use the error message). Run the
  server the way users and devs run it, not just the way tests import it.

### 6.2 Library behaviour assumed from memory
- zod 4 partial + default, opentype.js 2 names, opentype.js default weight,
  polygon-clipping robustness: each was "known" and each was wrong or
  incomplete.
- **Rule:** before relying on a library behaviour that decides correctness,
  probe it in the dev container with a 3-line script (as was done, too late,
  for zod and opentype). Ten seconds, every time.

### 6.3 State and timing in React
- The pairing draft was seeded during render and overwrote an explicit
  choice. The palm-rejection mode read React state inside a pointer handler
  and lost a race.
- **Rule:** decisions inside event handlers read refs; state is for what the
  user sees. Module-level stores track "has the user chosen?" explicitly.

### 6.4 Destructive writes without ownership
- Casting overwrote whatever had the target filename. agelace's own promise
  is "nothing is ever destroyed" (deletes go to `.trash`), and the Forge
  broke it.
- **Rule:** any write into a folder the user also writes to (`fonts/`,
  `assets/`) must prove it owns the file it replaces, or refuse. Retire
  rather than delete.

### 6.5 Silent modes
- Palm rejection locked fingers out with no sign.
- **Rule:** any mode the app enters on its own must be visible and
  reversible where it happens.

### 6.6 Claims written ahead of the evidence
- The design system said "the app's CSS, lifted" while several rules were
  paraphrased; the brand book invented a voice rule and a break mark; a
  report called the artifact private after mazze had shared it.
- **Rule:** documentation that describes the code is generated from it or
  diffed against it before publishing. Prose that can't cite a file is
  marked as a proposal, not a rule.

### 6.7 Verification that couldn't be repeated
- The browser suite lived in scratch. Earlier phases' browser checks were
  done by hand through an MCP that later wasn't connected.
- **Rule:** if it was worth checking once, it goes in the repo with an exit
  code. Neither browser extension was connected this session; a Playwright
  container proved to be the more dependable tool anyway. Default to it.

### 6.8 Shell quoting (process, not product)
- Twice an unquoted heredoc (`<<EOF`) let the shell execute backticked text
  from Python strings, mangling a design-system edit and a test script. The
  first time was harmless only by luck.
- **Rule:** always `<<'EOF'`, and pass variables through the environment.

### 6.9 What went right, worth keeping
- Building a failing check before the fix (A1–A10 each have one).
- A throwaway world for every live test; mazze's `./world` was never written
  to by tests.
- One geometry path (`shared/src/glyph.ts`) for the live proof and the cast,
  so what you see on the sheet is what the font contains.
- Rendering the design-system previews locally in both lamps before
  publishing caught three defects the page would have shown mazze.

---

## 7. Handoff spec: the Forge (phase 5)

### Data
- `world/forge/<id>.json`: a **hand**. `{ id, family, format: 1, nib: {kind:
  broad|quill|round, size, angle}, metrics: {ascender, descender, capHeight,
  xHeight}, spacing, space, glyphs: { "<one char>": { strokes: [{ pts: [x,y,p,…],
  pen? }], left?, right? } }, cast?, created, updated }`. Font units: 1000/em,
  y up, 0 on the baseline. `cast` is server-owned.
- `world/fonts/<Family>.otf`: a cast hand, an ordinary font from then on.
- `world.json` gains `typeset` (`{display?, body?, label?}`: the world's hand)
  and `pairings` (`[{name, display?, body?, label?}]`). Patched through
  `WorldPatch`, which has no defaults.

### Code
- `shared/src/glyph.ts`: stroke → polygons (broad nib = union of hulls of a
  rotated thin rectangle, width scaled by pressure for stylus strokes; quill/
  round via perfect-freehand) → snapped union (polygon-clipping, with an
  incremental fallback) → RDP-simplified rings, outer CCW / holes CW → path
  commands (corners > 52° stay sharp, the rest become quadratics through edge
  midpoints) → `placeGlyph` (side bearings).
- `server/src/hands.ts`: storage, the cast guard (§3 A1/A2), `castHand()`
  with opentype.js (CFF, weight 400, `.notdef` box, `uniXXXX`/`uXXXXX`).
- `app/src/forge/`: `TypeCase`, `PairingRoom`, `Scriptorium` (`HandsList`,
  `HandDesk`, `GlyphSheet`), `typeset.ts` (house faces, curated pairings,
  draft store, `applyTypeset`).

### Invariants
- What the sheet shows is what the font contains (one geometry path).
- A cast never overwrites a file the hand didn't make; never deletes, only
  retires to `.trash`.
- The app never names a font family in CSS; it reads `--font-display`,
  `--font-body`, `--font-label`, so the world's hand reaches everything.
- Edits go through `edit()` (one undo step per gesture); saves are serialized.

### Not built / known limits
No kerning, no composites, no hinting (fine for screens at reading sizes;
small print sizes will look soft), no italic or bold of a hand, no undo across
reloads. Characters not drawn fall back to the page's face, which is a
feature, not a bug.

---

## 8. Process notes for whoever picks this up

- Everything Node runs in the OrbStack dev container (`scripts/dev.sh`). The
  host has no `node_modules`.
- Docker here needs the session's credential-helper workaround (an expired
  Docker Hub token in the keychain); `docker logout` on the host fixes it for
  good.
- Commit trailer (mazze's rule): `Signed-off-by: Mazze LeCzzare Frazer
  <mazze@mazzeleczzare.com>` first, then the Claude lines. Commit and push
  together.
- Append to this diary at each phase boundary: what was promised, what
  shipped, what diverged, and the rule learned. Don't rewrite old entries.
