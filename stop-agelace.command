#!/bin/sh
# macOS opens .command files in Terminal on double-click (a .sh opens in an editor).
exec "$(dirname "$0")/stop-agelace.sh" "$@"
