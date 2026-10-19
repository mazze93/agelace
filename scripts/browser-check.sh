#!/bin/sh
# Every e2e/*.mjs suite (the Forge, boards), in headless Chromium (Playwright's
# container), against a freshly built image on a throwaway world. Your ./world
# is never touched. Any failing suite fails the run.
#   scripts/browser-check.sh        → screenshots in e2e/shots/
set -e
cd "$(dirname "$0")/.."
ENGINE=$(command -v docker || command -v podman)
NAME=agelace-e2e
PORT=8091
world=$(mktemp -d "${TMPDIR:-/tmp}/agelace-e2e.XXXXXX")
NET=agelace-e2e-net
cleanup() {
  "$ENGINE" rm -f "$NAME" >/dev/null 2>&1 || true
  "$ENGINE" network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$world"
}
trap cleanup EXIT
# The world dir must be writable by the image's non-root user on any host.
chmod 777 "$world"
"$ENGINE" build -q -t "$NAME" . >/dev/null
# Playwright reaches the app by name on a private network. Going through the
# host's gateway works on OrbStack but not on a stock Linux Docker.
"$ENGINE" network create "$NET" >/dev/null
"$ENGINE" run -d --name "$NAME" --network "$NET" -p "127.0.0.1:$PORT:8080" -v "$world:/world" "$NAME" >/dev/null
up=""
for _ in $(seq 1 60); do
  curl -sf "localhost:$PORT/api/health" >/dev/null && { up=1; break; }
  sleep 1
done
[ -n "$up" ] || { echo "agelace never became healthy:"; "$ENGINE" logs "$NAME"; exit 1; }
mkdir -p e2e/shots
"$ENGINE" run --rm --network "$NET" \
  -e BASE="http://$NAME:8080" -e SHOTS=/e2e/shots \
  -v "$PWD/e2e:/e2e" mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && npm init -y >/dev/null && npm i -s playwright@1.49.1 >/dev/null 2>&1 && cp /e2e/*.mjs . && rc=0 && for t in /e2e/*.mjs; do echo "── $(basename "$t")"; node "$(basename "$t")" || rc=1; done; exit $rc'
