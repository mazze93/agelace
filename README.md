# agelace

A place to write a world: its histories, people, places and ages, each marked
as **Canon**, **Proposed** or a **Question**. Everything lives on your own
computer, in a folder you can see and back up.

## Opening it

1. Install **Docker Desktop** (free) and start it. Wait until it says it's running.
   (Podman Desktop works too, if you already use it.)
2. Double-click **`start-agelace.cmd`** on Windows, or run `./start-agelace.sh`
   on a Mac.
3. Your browser opens at <http://localhost:8080>. The first start takes a few
   minutes. After that it's quick.

To close it, double-click **`stop-agelace.cmd`** (or run `./stop-agelace.sh`).

## Finding your way

- **Pages**: name something in the box at the top left and choose what it is
  (an age, a person, a place…). Type `[[` inside a page to link another one.
- **Boards**: choose "A Board" in the same box. Lay entries, notes, maps,
  timelines, sketches and seals (any of ~4,000 symbols) on an endless table,
  tie threads between them, or draw with a pen.
- **The Pattern**: everything at once, as a web. Each seal is a page; lines show
  which pages name each other and which sit together on a board. Drag a seal to
  pin it, click to open it. Every page has a "Strands" box at its foot with a
  link to its own small web.
- **Undo** is Ctrl-Z (⌘Z on a Mac), everywhere.

## Your world

Everything you write is in the **`world`** folder next to these files:

- `entries/`: every page, one file each
- `canvases/`: every board (`.yjs`, plus a `.canvas` copy that Obsidian can open)
- `assets/`: maps and pictures you've dropped onto boards
- `fonts/`: drop any `.ttf`, `.otf`, `.woff` or `.woff2` here and it shows up in
  the typeface menu. You can also drag a font onto that menu.
- `.trash/`: torn-out pages wait here. Nothing is ever destroyed.

Back up the `world` folder and you have backed up everything.

## Writing on a tablet

Start with `start-agelace.cmd --share` (or `./start-agelace.sh --share`), then
open `http://<this computer's address>:8080` on the tablet. Only do this on a
network you trust.
