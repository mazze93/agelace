#!/bin/sh
# Start agelace (macOS / Linux). Needs Docker Desktop, OrbStack or Podman.
#   ./start-agelace.sh          this computer only
#   ./start-agelace.sh --share  also reachable from a tablet on your network
cd "$(dirname "$0")" || exit 1
if docker info >/dev/null 2>&1; then ENGINE=docker
elif podman info >/dev/null 2>&1; then ENGINE=podman
else
  echo "Docker isn't running. Open Docker Desktop (or OrbStack, or Podman Desktop), wait for it to settle, then run this again."
  exit 1
fi
[ "$1" = "--share" ] && export AGELACE_BIND=0.0.0.0
PORT="${AGELACE_PORT:-8080}"
# Run as you, so every file in ./world stays yours. Make the folder first: if
# Docker makes it, on Linux it belongs to root and agelace can't write there.
export AGELACE_UID="$(id -u)" AGELACE_GID="$(id -g)"
mkdir -p world
if [ -f Dockerfile ]; then
  echo "Setting the type… (the first start builds agelace and takes a few minutes)"
  $ENGINE compose up -d --build || exit 1
else
  echo "Fetching agelace… (the first start downloads it and takes a minute or two)"
  $ENGINE compose pull -q || exit 1
  $ENGINE compose up -d || exit 1
fi
i=0
until curl -fs "http://localhost:$PORT/api/health" >/dev/null 2>&1; do
  i=$((i + 1)); [ $i -gt 60 ] && { echo "agelace didn't answer. Try: $ENGINE compose logs"; exit 1; }
  sleep 1
done
echo "agelace is open at http://localhost:$PORT"
command -v open >/dev/null && open "http://localhost:$PORT" || { command -v xdg-open >/dev/null && xdg-open "http://localhost:$PORT"; }
