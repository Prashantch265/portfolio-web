# syntax=docker/dockerfile:1
# Multi-stage build using `turbo prune` to keep the final image to only
# what apps/api actually depends on (backend PRD §2 topology).

# node:22-slim (Debian, glibc) for every stage, not just the runner —
# a native addon (bcrypt) built against musl in an alpine builder stage
# fails to load at all under the glibc runner below ("libc.musl-
# aarch64.so.1: cannot open shared object file"), a real error hit
# switching the runner alone for Playwright's Chromium (§8). Matching
# libc across every stage is the fix, not a musl-compatible workaround.
FROM node:22-slim AS base
RUN corepack enable

# ---- Prune the workspace down to apps/api's dependency graph ----
FROM base AS pruner
WORKDIR /app
COPY . .
RUN pnpm dlx turbo@^2.3.0 prune @portfolio/api --docker

# ---- Install deps for the pruned subset, then build ----
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
# This stage never runs the built app — the browser `playwright` would
# otherwise auto-download on install is only needed in the runner stage
# below (glibc, not this alpine stage's musl), so skip it here entirely.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@portfolio/api

# ---- Runtime image ----
FROM node:22-slim AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nestjs
RUN corepack enable

COPY --from=builder /app .

# --with-deps installs the OS libraries Chromium needs (fonts, libgtk,
# etc.) alongside the browser binary itself — must run as root, before
# the USER switch below. PLAYWRIGHT_BROWSERS_PATH pins the install
# location to somewhere explicitly chown'd to nestjs afterward — left at
# the default, it installs under root's home, unreadable by the
# unprivileged user below (the exact same class of bug A5 hit with the
# media volume, caught this time before it ever shipped).
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers
RUN pnpm --filter @portfolio/api exec playwright install --with-deps chromium && chown -R nestjs:nodejs /app/.playwright-browsers

# §2's media volume mounts over this directory as root-owned by default
# (Docker's own behavior for a fresh named volume) — without this, the
# unprivileged nestjs user below can never write an upload to it
# (EACCES), a bug that went unnoticed until A5 first exercised the real
# upload path end to end. Owning it here means a freshly created volume
# inherits this ownership from the image on first mount.
RUN mkdir -p /app/media && chown -R nestjs:nodejs /app/media

USER nestjs
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "apps/api/dist/main.js"]
