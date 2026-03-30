#!/usr/bin/env bash
# Chạy Redis local cho dev: redis-server (apt) → Docker (chỉ khi có quyền daemon) → placeholder.
set -euo pipefail
PORT="${REDIS_PORT:-6379}"

if command -v redis-server >/dev/null 2>&1; then
  # File riêng: tránh Ubuntu nạp /etc/redis/redis.conf (requirepass/ACL) khiến app không AUTH được
  CONF="$(mktemp "${TMPDIR:-/tmp}/chat-app-redis.XXXXXX.conf")"
  cat > "$CONF" <<EOF
bind 127.0.0.1
port ${PORT}
protected-mode no
save ""
appendonly no
EOF
  echo "[redis-dev] redis-server trên cổng $PORT (config tối giản, không dùng /etc/redis/redis.conf)"
  exec redis-server "$CONF"
fi

docker_usable() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

if docker_usable; then
  echo "[redis-dev] Docker: redis:7-alpine → localhost:$PORT"
  exec docker run --rm --name chat-app-redis-dev -p "${PORT}:6379" redis:7-alpine
fi

echo "[redis-dev] Không có redis-server và không dùng được Docker (cần quyền socket hoặc: sudo usermod -aG docker \"\$USER\" rồi đăng nhập lại)."
echo "[redis-dev] Cài Redis cục bộ (một lần, không cần sudo khi chạy npm): sudo apt install redis-server"
echo "[redis-dev] Chờ — server vẫn chạy nhưng Socket.IO adapter/typing dùng RAM cho đến khi Redis có trên cổng $PORT."
exec tail -f /dev/null
