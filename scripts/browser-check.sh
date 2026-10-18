#!/bin/sh
# The Forge, end to end, in headless Chromium (Playwright's container), against
# a freshly built image on a throwaway world. Your ./world is never touched.
#   scripts/browser-check.sh        → screenshots in e2e/shots/
set -e
cd "$(dirname "$0")/.."
ENGINE=$(command -v docker || command -v podman)
NAME=agelace-e2e
PORT=8091
world=$(mktemp -d "${TMPDIR:-/tmp}/agelace-e2e.XXXXXX")
cleanup() {
  "$ENGINE" rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$world"
}
trap cleanup EXIT
"$ENGINE" build -q -t "$NAME" . >/dev/null
"$ENGINE" run -d --name "$NAME" -p "127.0.0.1:$PORT:8080" -v "$world:/world" "$NAME" >/dev/null
for i in $(seq 1 60); do
  curl -sf "localhost:$PORT/api/health" >/dev/null && break
  sleep 1
done
mkdir -p e2e/shots
"$ENGINE" run --rm --add-host=host.docker.internal:host-gateway \
  -e BASE="http://host.docker.internal:$PORT" -e SHOTS=/e2e/shots \
  -v "$PWD/e2e:/e2e" mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && npm init -y >/dev/null && npm i -s playwright@1.49.1 >/dev/null 2>&1 && cp /e2e/forge.mjs . && node forge.mjs'
