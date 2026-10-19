#!/bin/sh
# Build the friend's download: a zip with the launchers, a compose file that
# pulls the published image (no build, no source), and a plain-text guide.
#   scripts/release-bundle.sh 0.2.0-beta.1   → dist/agelace-0.2.0-beta.1.zip
# The release workflow runs this and attaches the zip to the GitHub Release.
set -eu
cd "$(dirname "$0")/.."
VERSION="${1:?usage: scripts/release-bundle.sh <version, e.g. 0.2.0-beta.1>}"
case "$VERSION" in v*) VERSION="${VERSION#v}" ;; esac
IMAGE="${AGELACE_IMAGE:-ghcr.io/mazze93/agelace}"
NAME="agelace-$VERSION"
out="dist/$NAME"
rm -rf "$out" "dist/$NAME.zip"
mkdir -p "$out/world"

# compose.yaml, minus the build: the bundle pulls the signed image instead.
grep -q '^    build: \.$' compose.yaml
grep -q '^    image: agelace:local$' compose.yaml
sed -e '/^    build: \.$/d' \
    -e "s|^    image: agelace:local\$|    image: $IMAGE:$VERSION|" \
    compose.yaml > "$out/compose.yaml"
if grep -q -e 'build:' -e 'agelace:local' "$out/compose.yaml"; then
  echo "release-bundle: compose.yaml still builds locally" >&2; exit 1
fi

cp start-agelace.sh stop-agelace.sh start-agelace.command stop-agelace.command start-agelace.cmd stop-agelace.cmd "$out/"
chmod 755 "$out"/*.sh "$out"/*.command
sed "s|@VERSION@|$VERSION|g" docs/release/READ-ME-FIRST.txt > "$out/READ-ME-FIRST.txt"
cp docs/release/world-README.txt "$out/world/README.txt"

# The .cmd files must stay CRLF or cmd.exe misreads labels.
for f in "$out"/*.cmd; do
  if ! grep -q "$(printf '\r')" "$f"; then echo "release-bundle: $f lost its CRLF endings" >&2; exit 1; fi
done

(cd dist && zip -qr -X "$NAME.zip" "$NAME")
echo "dist/$NAME.zip"
