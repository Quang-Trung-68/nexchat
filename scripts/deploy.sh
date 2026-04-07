#!/usr/bin/env bash
# chat-app — build & start production stack (docker-compose.prod.yml)
# Dùng cho lần deploy thủ công đầu tiên trên VPS (sau đó CI/CD tự động qua GitHub Actions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "🚀 Deploying chat-app (compose: $COMPOSE_FILE)..."

if git rev-parse --git-dir >/dev/null 2>&1; then
  git pull origin main || true
fi

docker compose -f "$COMPOSE_FILE" down
docker compose -f "$COMPOSE_FILE" build --no-cache
docker compose -f "$COMPOSE_FILE" up -d

echo "⏳ Waiting for PostgreSQL..."
set +u
# shellcheck disable=SC1091
[ -f "$ROOT/.env" ] && . "$ROOT/.env"
set -u
PG_USER="${POSTGRES_USER:-chatapp}"
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$PG_USER" >/dev/null 2>&1; do
  sleep 2
done

echo "📦 Prisma generate + migrate..."
docker compose -f "$COMPOSE_FILE" exec -T chat-server npx prisma generate
docker compose -f "$COMPOSE_FILE" exec -T chat-server npx prisma migrate deploy

echo "✅ Deploy finished. Services:"
docker compose -f "$COMPOSE_FILE" ps
