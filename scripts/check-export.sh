#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BATCH_ID="${1:-}"

echo "=== GhostClaw Export Check ==="
echo ""

# Resolve batch ID if not provided
if [ -z "$BATCH_ID" ]; then
  echo "  No batch ID provided — finding most recent..."
  BATCHES=$(curl -sf "$BASE/api/batches" 2>/dev/null || echo "FAIL")
  BATCH_ID=$(echo "$BATCHES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ -z "$BATCH_ID" ]; then
    echo "  No batches found. Run test-variation.sh first."
    exit 1
  fi
fi

echo "  Batch ID: $BATCH_ID"
echo ""

# Call export endpoint
echo "  Calling /api/batches/$BATCH_ID/export ..."
EXPORT=$(curl -sf "$BASE/api/batches/$BATCH_ID/export" 2>/dev/null || echo "FAILED")
echo "  Response:"
echo "$EXPORT" | head -50
echo ""

# List exported files
EXPORT_DIR="$PROJECT_ROOT/output/batches/$BATCH_ID"
echo "  Export directory: $EXPORT_DIR"
if [ -d "$EXPORT_DIR" ]; then
  echo "  Files:"
  find "$EXPORT_DIR" -type f 2>/dev/null | sed 's/^/    /'
else
  echo "  (not found — export may not have produced files)"
fi

echo ""
echo "  Done."
