# syntax=docker/dockerfile:1
# Multi-stage build using `turbo prune` to keep the final image to only
# what apps/api actually depends on (backend PRD §2 topology).

FROM node:22-alpine AS base
RUN corepack enable

# ---- Prune the workspace down to apps/api's dependency graph ----
FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@^2.3.0 prune @portfolio/api --docker

# ---- Install deps for the pruned subset, then build ----
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@portfolio/api

# ---- Slim runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
RUN corepack enable

COPY --from=builder /app .

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
