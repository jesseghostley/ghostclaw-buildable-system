#!/usr/bin/env bash
set -euo pipefail

# Start GhostClaw API with SQLite storage mode
export STORAGE_MODE=sqlite
export SQLITE_PATH="${SQLITE_PATH:-./ghostclaw-dev.sqlite}"
export PORT="${PORT:-3000}"

echo "==> Starting GhostClaw API (SQLite mode)"
echo "    STORAGE_MODE=$STORAGE_MODE"
echo "    SQLITE_PATH=$SQLITE_PATH"
echo "    PORT=$PORT"

cd "$(dirname "$0")/.."
exec npx ts-node apps/api/src/server.ts
