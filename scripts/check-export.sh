#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# check-export.sh — Verify batch export output (Patch 4 readiness check)
#
# Usage:  ./scripts/check-export.sh <batch-id>
#         ./scripts/check-export.sh              # checks the most recent batch
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
BATCH_ID="${1:-}"

echo "╔══════════════════════════════════════════════╗"
echo "║  GhostClaw — Batch Export Check               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Verify server is running ─────────────────────────────────────────────────
if ! curl -sf "$BASE/api/health" > /dev/null 2>&1; then
  echo "  ✗ Server not responding on port $PORT"
  echo "    Start with:  ./scripts/dev-sqlite.sh"
  exit 1
fi

# ── Resolve batch ID ─────────────────────────────────────────────────────────
if [ -z "$BATCH_ID" ]; then
  echo "  No batch ID provided — looking for the most recent batch..."
  BATCHES_RESP=$(curl -sf "$BASE/api/batches" 2>/dev/null || echo "FAIL")
  if [ "$BATCHES_RESP" = "FAIL" ]; then
    echo "  ✗ Could not fetch batches"
    exit 1
  fi

  BATCH_ID=$(echo "$BATCHES_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ -z "$BATCH_ID" ]; then
    echo "  ✗ No batches found. Run test-variation.sh first."
    exit 1
  fi
fi

echo "  Batch ID: $BATCH_ID"
echo ""

# ── Fetch batch detail ───────────────────────────────────────────────────────
BATCH=$(curl -sf "$BASE/api/batches/$BATCH_ID" 2>/dev/null || echo "FAIL")
if [ "$BATCH" = "FAIL" ]; then
  echo "  ✗ Batch not found: $BATCH_ID"
  exit 1
fi

TOTAL=$(echo "$BATCH" | grep -o '"totalSites":[0-9]*' | cut -d: -f2 || echo "?")
PROCESSED=$(echo "$BATCH" | grep -o '"processed":[0-9]*' | cut -d: -f2 || echo "?")
echo "  Sites: $PROCESSED/$TOTAL processed"
echo ""

# ── Check per-site publish status ────────────────────────────────────────────
echo "  Per-site status:"
echo "  ─────────────────────────────────────────────"

# Count statuses
PUBLISHED=$(echo "$BATCH" | grep -o '"status":"published"' | wc -l | tr -d ' ')
APPROVED=$(echo "$BATCH" | grep -o '"status":"approved"' | wc -l | tr -d ' ')
PENDING=$(echo "$BATCH" | grep -o '"status":"awaiting_approval"' | wc -l | tr -d ' ')
FAILED=$(echo "$BATCH" | grep -o '"status":"failed"' | wc -l | tr -d ' ')

echo "    Published:         $PUBLISHED"
echo "    Approved:          $APPROVED"
echo "    Awaiting approval: $PENDING"
echo "    Failed:            $FAILED"
echo ""

# ── Check batch export endpoint (Patch 4) ────────────────────────────────────
echo "  Batch export (Patch 4):"
echo "  ─────────────────────────────────────────────"

EXPORT_RESP=$(curl -sf "$BASE/api/batches/$BATCH_ID/export" 2>/dev/null || echo "NOT_READY")
if [ "$EXPORT_RESP" = "NOT_READY" ]; then
  EXPORT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/batches/$BATCH_ID/export" 2>/dev/null || echo "000")
  if [ "$EXPORT_STATUS" = "404" ]; then
    echo "    ? Export endpoint not implemented yet (404)"
    echo "      This is expected — Patch 4 adds GET /api/batches/:id/export"
  elif [ "$EXPORT_STATUS" = "000" ]; then
    echo "    ✗ Server not reachable"
  else
    echo "    ✗ Export returned HTTP $EXPORT_STATUS"
  fi
else
  echo "    ✓ Export endpoint responded"

  # Check for expected fields in manifest
  if echo "$EXPORT_RESP" | grep -q '"batchId"'; then
    echo "    ✓ Manifest has batchId"
  else
    echo "    ✗ Manifest missing batchId"
  fi

  if echo "$EXPORT_RESP" | grep -q '"exportedAt"'; then
    echo "    ✓ Manifest has exportedAt"
  else
    echo "    ✗ Manifest missing exportedAt"
  fi

  if echo "$EXPORT_RESP" | grep -q '"sites"'; then
    echo "    ✓ Manifest has sites array"
  else
    echo "    ✗ Manifest missing sites array"
  fi
fi

echo ""

# ── Check export filesystem artifacts ────────────────────────────────────────
EXPORT_DIR="$PROJECT_ROOT/output/batches/$BATCH_ID"

echo "  Export directory:"
echo "  ─────────────────────────────────────────────"

if [ ! -d "$EXPORT_DIR" ]; then
  echo "    ? No export directory at $EXPORT_DIR"
  echo "      This is expected before Patch 4 is implemented."
else
  echo "    ✓ Directory exists: $EXPORT_DIR"

  # Check for CSV
  if [ -f "$EXPORT_DIR/handoff.csv" ]; then
    CSV_LINES=$(wc -l < "$EXPORT_DIR/handoff.csv" | tr -d ' ')
    echo "    ✓ handoff.csv — $CSV_LINES lines (header + data)"
    echo ""
    echo "    CSV preview:"
    head -5 "$EXPORT_DIR/handoff.csv" | sed 's/^/      /'
  else
    echo "    ✗ Missing handoff.csv"
  fi

  echo ""

  # Check for manifest
  if [ -f "$EXPORT_DIR/manifest.json" ]; then
    MANIFEST_SIZE=$(du -h "$EXPORT_DIR/manifest.json" | cut -f1)
    echo "    ✓ manifest.json ($MANIFEST_SIZE)"
  else
    echo "    ✗ Missing manifest.json"
  fi

  echo ""

  # Check for archives
  ARCHIVES_DIR="$EXPORT_DIR/archives"
  if [ -d "$ARCHIVES_DIR" ]; then
    ARCHIVE_COUNT=$(find "$ARCHIVES_DIR" -name "*.tar.gz" 2>/dev/null | wc -l | tr -d ' ')
    echo "    ✓ archives/ — $ARCHIVE_COUNT .tar.gz files"

    find "$ARCHIVES_DIR" -name "*.tar.gz" 2>/dev/null | while read -r f; do
      SIZE=$(du -h "$f" | cut -f1)
      echo "      $(basename "$f") ($SIZE)"
    done
  else
    echo "    ? No archives/ directory"
  fi
fi

echo ""
echo "  Done."
