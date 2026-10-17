#!/bin/sh
# Run a command in the OrbStack dev container: scripts/dev.sh npm test
#   scripts/dev.sh up   → long-running dev servers
set -e
cd "$(dirname "$0")/.."
if [ "$1" = "up" ]; then
  exec docker compose -f compose.dev.yaml run --rm --service-ports dev npm run dev
fi
exec docker compose -f compose.dev.yaml run --rm dev "$@"
