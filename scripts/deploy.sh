#!/usr/bin/env bash
# Запускается на сервере под пользователем sport: ~/duo-sport/scripts/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch origin main
git reset --hard origin/main
npm ci
npm run build
pm2 restart duo-sport --update-env

# Ждём, пока сервер поднимется
for _ in $(seq 1 20); do
  if curl -fsS "http://localhost:${PORT:-3000}/api/health" >/dev/null; then
    echo "Деплой завершён"
    exit 0
  fi
  sleep 1
done

echo "Сервер не отвечает после перезапуска" >&2
pm2 logs duo-sport --lines 30 --nostream >&2 || true
exit 1
