# Multi-arch: docker buildx build --platform linux/amd64,linux/arm64 .
# Image names are fully qualified so Podman never has to guess a registry, and
# pinned by digest so a build today and a build next month are the same build.
# Dependabot (docker ecosystem) moves the digests.
#
# Posture follows mazze93/secure-container-template: fixed non-root UID, no
# shell or package manager at runtime, SBOM + provenance from CI.

# ── build: app bundle, server bundle, built-in font library ─────────────
# Runs on the builder's own platform: its output is JavaScript and fonts, so a
# multi-arch build compiles once, natively, and only the copy stage is per-arch.
FROM --platform=$BUILDPLATFORM docker.io/library/node:26-bookworm-slim@sha256:28147155d47dc31abe0a46e0d12b59b2fb3d0a2dcc5dc65fce76a074180b16fe AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY app/package.json app/
COPY demo/package.json demo/
RUN npm ci --no-fund --no-audit
COPY . .
# The server bundle carries every dependency (no node_modules at runtime).
RUN node scripts/collect-fonts.mjs server/fonts-builtin && npm run build \
 && mkdir -p /out/server /out/app /out/world \
 && cp -r server/dist server/fonts-builtin /out/server/ \
 && cp -r app/dist /out/app/

# ── runtime: Node and the built files, nothing else ─────────────────────
# Distroless: no shell, no npm, no apt. Node lives at /nodejs/bin/node.
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:59c479c9b8c123e66047315c968aa2d35e31ae5149c856e4110a79c8b3563f0b
LABEL org.opencontainers.image.title="agelace" \
      org.opencontainers.image.description="A local-first story-world workshop: pages, boards, the Pattern and the Forge." \
      org.opencontainers.image.source="https://github.com/mazze93/agelace" \
      org.opencontainers.image.licenses="NOASSERTION"
ENV NODE_ENV=production \
    AGELACE_WORLD=/world \
    AGELACE_STATIC=/app/app/dist \
    AGELACE_FONTS=/app/server/fonts-builtin \
    AGELACE_POLL=1 \
    PORT=8080
WORKDIR /app
COPY --from=build --chown=10001:10001 /out/ /app/
# An empty /world the runtime user owns, for runs without a bind mount.
COPY --from=build --chown=10001:10001 /out/world /world
# Fixed UID/GID (template: 10001). compose.yaml lets the mac/Linux launcher run
# as the host user instead, so files in ./world stay the user's own.
USER 10001:10001
VOLUME /world
EXPOSE 8080
# Health check lives in compose.yaml: Podman's default (OCI) image format drops
# HEALTHCHECK. The base image's entrypoint is node, so CMD is just the script.
CMD ["server/dist/index.js"]
