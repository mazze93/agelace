#!/bin/sh
# Screenshots for the landing page and the friend's guide: builds the image,
# starts it on a throwaway world, fills a small invented sample world through
# the real API, and captures each room at 2x into e2e/shots/press/.
set -e
cd "$(dirname "$0")/.."
ENGINE=$(command -v docker || command -v podman)
NAME=agelace-press
NET=agelace-press-net
world=$(mktemp -d "${TMPDIR:-/tmp}/agelace-press.XXXXXX")
cleanup() {
  "$ENGINE" rm -f "$NAME" >/dev/null 2>&1 || true
  "$ENGINE" network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$world"
}
trap cleanup EXIT
"$ENGINE" build -q -t "$NAME" . >/dev/null
"$ENGINE" network create "$NET" >/dev/null
"$ENGINE" run -d --name "$NAME" --network "$NET" --user "$(id -u):$(id -g)" -v "$world:/world" "$NAME" >/dev/null
mkdir -p e2e/shots/press
"$ENGINE" run --rm --network "$NET" --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e BASE="http://$NAME:8080" -e SHOTS=/e2e/shots/press -v "$PWD/e2e:/e2e" \
  mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && npm init -y >/dev/null && npm i -s playwright@1.49.1 yjs@13.6.33 >/dev/null 2>&1 && cp /e2e/press/press.mjs . && for _ in $(seq 1 60); do node -e "fetch(process.env.BASE+\"/api/health\").then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" && break; sleep 1; done && node press.mjs'
