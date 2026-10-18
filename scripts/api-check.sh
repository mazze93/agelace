#!/bin/sh
# Run the Bruno collection (bruno/) headless against a throwaway server:
# a fresh seeded world in a temp dir, inside the dev container. Your ./world is never touched.
#   scripts/api-check.sh            all requests
#   scripts/api-check.sh entries    one folder
set -e
cd "$(dirname "$0")/.."
exec docker compose -f compose.dev.yaml run --rm -T dev sh -c '
  set -e
  world=$(mktemp -d)
  AGELACE_WORLD=$world PORT=8099 AGELACE_STATIC=/nonexistent npx tsx server/src/index.ts >/tmp/api.log 2>&1 &
  server=$!
  trap "kill $server 2>/dev/null; rm -rf $world" EXIT
  for i in $(seq 1 60); do
    curl -sf localhost:8099/api/health >/dev/null && break
    sleep 0.5
  done
  curl -sf localhost:8099/api/health >/dev/null || { cat /tmp/api.log; exit 1; }
  cd bruno
  npx -y @usebruno/cli@4.2.1 run ${1:-} -r --env throwaway
' api-check "$@"
