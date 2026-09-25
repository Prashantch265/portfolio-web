#!/usr/bin/env bash
# Runs ON THE VPS, not in CI (backend PRD §15). Pull-based deploy: this
# script pulls whatever release.yml most recently pushed to GHCR — GitHub
# never gets shell access to this box, and no inbound port needs to be
# opened for it.
#
# Trigger: not yet wired (§16 — VPS doesn't exist yet). Two documented
# options once it does, either is fine:
#   1. Cron: run this script every N minutes; it's a no-op if the GHCR
#      digest hasn't changed (`docker compose pull` reports "up to date").
#   2. Webhook: a small always-running receiver (e.g. a one-route Nest
#      controller, or `webhook`/similar) that GHCR/Actions calls to invoke
#      this script on push, instead of polling.
#
# Requires: docker-compose.yml + docker-compose.prod.yml + .env already
# present in the deploy directory on the VPS (.env is never in the repo).

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "==> Pulling latest images"
$COMPOSE pull

echo "==> Running migrations (blocking — before the new api container receives traffic)"
$COMPOSE run --rm api pnpm db:migrate

echo "==> Rolling replace: starting new containers, waiting for healthchecks"
$COMPOSE up -d --wait

echo "==> Pruning old images"
docker image prune -f

echo "==> Deploy complete"
