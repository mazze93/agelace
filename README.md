# agelace

A place to write a world: its histories, people, places and ages, each marked
as **Canon**, **Proposed** or a **Question**. Everything lives on your own
computer, in a folder you can see and back up.

## Opening it

1. Install **Docker Desktop** (free) and start it. Wait until it says it's running.
2. Double-click **`start-agelace.cmd`** on Windows, or run `./start-agelace.sh`
   on a Mac.
3. Your browser opens at <http://localhost:8080>. The first start takes a few
   minutes. After that it's quick.

To close it, double-click **`stop-agelace.cmd`** (or run `./stop-agelace.sh`).

## Your world

Everything you write is in the **`world`** folder next to these files:

- `entries/`: every page, one file each
- `fonts/`: drop any `.ttf`, `.otf`, `.woff` or `.woff2` here and it shows up in
  the typeface menu. You can also drag a font onto that menu.
- `.trash/`: torn-out pages wait here. Nothing is ever destroyed.

Back up the `world` folder and you have backed up everything.

## Writing on a tablet

Start with `start-agelace.cmd --share` (or `./start-agelace.sh --share`), then
open `http://<this computer's address>:8080` on the tablet. Only do this on a
network you trust.
