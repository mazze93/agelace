# Multi-arch: docker buildx build --platform linux/amd64,linux/arm64 .

# ── build: app bundle, server bundle, built-in font library ─────────────
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci --no-fund --no-audit
COPY . .
RUN node scripts/collect-fonts.mjs server/fonts-builtin && npm run build

# ── runtime: server deps only, no toolchain ─────────────────────────────
FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    AGELACE_WORLD=/world \
    AGELACE_STATIC=/app/app/dist \
    AGELACE_FONTS=/app/server/fonts-builtin \
    AGELACE_POLL=1 \
    PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci --omit=dev --no-fund --no-audit -w @agelace/server && npm cache clean --force
COPY --from=build /src/server/dist server/dist
COPY --from=build /src/server/fonts-builtin server/fonts-builtin
COPY --from=build /src/app/dist app/dist
VOLUME /world
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
