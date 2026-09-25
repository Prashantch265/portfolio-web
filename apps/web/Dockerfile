# syntax=docker/dockerfile:1
# Multi-stage build using `turbo prune`, mirroring apps/api/Dockerfile.

FROM node:22-alpine AS base
RUN corepack enable

FROM base AS pruner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN pnpm dlx turbo@^2.3.0 prune @portfolio/web --docker

FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@portfolio/web

# ---- Slim runtime image — Next's standalone output ----
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
