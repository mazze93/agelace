#!/bin/sh
cd "$(dirname "$0")" || exit 1
ENGINE=docker
docker info >/dev/null 2>&1 || { podman info >/dev/null 2>&1 && ENGINE=podman; }
$ENGINE compose down && echo "agelace is closed. Your world is safe in the world folder."
