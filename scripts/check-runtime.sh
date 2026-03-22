#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_PATH="$PROJECT_ROOT/ghostclaw.db"

echo "=== GhostClaw Runtime Check ==="
echo ""

# Port status
echo "  Port $PORT:"
if ss -ltnp 2>/dev/null | grep -q ":$PORT "; then
  echo "    LISTENING"
else
  echo "    NOT LISTENING"
fi
echo ""

# Health
echo "  /api/health:"
HEALTH=$(curl -sf "$BASE/api/health" 2>/dev/null || echo "UNREACHABLE")
echo "    $HEALTH"
echo ""

# Approvals history
echo "  /api/approvals/history:"
HISTORY=$(curl -sf "$BASE/api/approvals/history" 2>/dev/null || echo "UNREACHABLE")
COUNT=$(echo "$HISTORY" | grep -o '"count":[0-9]*' | cut -d: -f2 2>/dev/null || echo "?")
echo "    $COUNT items"
echo ""

# SQLite DB
echo "  SQLite DB:"
if [ -f "$DB_PATH" ]; then
  SIZE=$(du -h "$DB_PATH" | cut -f1)
  echo "    EXISTS at $DB_PATH ($SIZE)"
else
  echo "    NOT FOUND at $DB_PATH"
fi

echo ""
echo "  Done."
