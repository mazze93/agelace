#!/bin/sh
# Codex reads AGENTS.md and .agents/skills/; Claude Code reads CLAUDE.md and
# .claude/skills/. CLAUDE.md is the one we edit; this writes the Codex copies.
#   scripts/sync-agents.sh          regenerate
#   scripts/sync-agents.sh --check  exit 1 if the copies are stale
set -e
cd "$(dirname "$0")/.."
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

sed '3s/.*/This file provides guidance to Codex when working with code in this repository.\
It is generated from CLAUDE.md by `scripts\/sync-agents.sh`: edit CLAUDE.md, not this./' \
  CLAUDE.md >"$out/AGENTS.md"
mkdir -p "$out/skills"
cp -R .claude/skills/. "$out/skills/"

if [ "$1" = "--check" ]; then
  stale=0
  cmp -s "$out/AGENTS.md" AGENTS.md || { echo "AGENTS.md is stale"; stale=1; }
  diff -r "$out/skills" .agents/skills >/dev/null 2>&1 || { echo ".agents/skills is stale"; stale=1; }
  [ $stale = 0 ] && echo "AGENTS.md and .agents/skills match CLAUDE.md"
  exit $stale
fi

cp "$out/AGENTS.md" AGENTS.md
rm -rf .agents/skills
mkdir -p .agents
cp -R "$out/skills" .agents/skills
echo "wrote AGENTS.md and .agents/skills from CLAUDE.md"
