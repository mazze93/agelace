#!/bin/sh
# The in-browser sandbox, end to end: build demo/dist in the dev container,
# then run e2e/sandbox/demo.mjs in Playwright's container, which serves the
# build on localhost (service workers need a secure context) with the same
# headers Cloudflare Pages will send.
#   scripts/demo-check.sh          → screenshots in e2e/shots/s*.png
set -e
cd "$(dirname "$0")/.."
ENGINE=$(command -v docker || command -v podman)
docker compose -f compose.dev.yaml run --rm -T dev npm run build -w demo >/dev/null
mkdir -p e2e/shots
"$ENGINE" run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -e DEMO_DIR=/demo -e SHOTS=/e2e/shots \
  -v "$PWD/demo/dist:/demo:ro" -v "$PWD/e2e:/e2e" mcr.microsoft.com/playwright:v1.49.1-noble \
  sh -c 'cd /tmp && npm init -y >/dev/null && npm i -s playwright@1.49.1 >/dev/null 2>&1 && cp /e2e/sandbox/demo.mjs . && node demo.mjs'
