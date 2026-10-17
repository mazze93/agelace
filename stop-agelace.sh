#!/bin/sh
cd "$(dirname "$0")" || exit 1
docker compose down && echo "agelace is closed. Your world is safe in the world folder."
