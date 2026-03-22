#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# dev-sqlite.sh — Start GhostClaw in SQLite mode for local development
#
# Usage:  ./scripts/dev-sqlite.sh
#         ./scripts/dev-sqlite.sh /tmp/my-test.sqlite   # custom db path
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_PATH="${1:-$PROJECT_ROOT/data/ghostclaw.sqlite}"
PORT="${PORT:-3000}"

# Ensure data directory exists
mkdir -p "$(dirname "$DB_PATH")"

echo "╔══════════════════════════════════════════════╗"
echo "║  GhostClaw — SQLite Dev Server               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  DB path : $DB_PATH"
echo "  Port    : $PORT"
echo ""

# ── Kill any existing GhostClaw process on this port ─────────────────────────
EXISTING_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "  Killing existing process on port $PORT (PID $EXISTING_PID)..."
  kill "$EXISTING_PID" 2>/dev/null || true
  sleep 1
  # Force kill if still alive
  kill -9 "$EXISTING_PID" 2>/dev/null || true
  echo "  Done."
else
  echo "  No existing process on port $PORT."
fi

echo ""
echo "  Starting server..."
echo "  ─────────────────────────────────────────────"
echo ""

cd "$PROJECT_ROOT"

export GHOSTCLAW_STORAGE_MODE=sqlite
export GHOSTCLAW_SQLITE_PATH="$DB_PATH"
export PORT="$PORT"

exec npx ts-node apps/api/src/server.ts
