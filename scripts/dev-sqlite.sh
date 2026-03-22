#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

DB_PATH="$PROJECT_ROOT/ghostclaw.db"
PORT="${PORT:-3000}"

echo "=== GhostClaw dev-sqlite ==="
echo "  Project: $PROJECT_ROOT"
echo "  DB:      $DB_PATH"
echo "  Port:    $PORT"
echo ""

# Kill existing node processes on this port
EXISTING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "  Killing existing process on port $PORT (PID $EXISTING_PID)..."
  kill "$EXISTING_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$EXISTING_PID" 2>/dev/null || true
fi

echo "  Starting server..."

export GHOSTCLAW_STORAGE_MODE=sqlite
export GHOSTCLAW_SQLITE_PATH="$DB_PATH"
export PORT="$PORT"

exec npm run dev
