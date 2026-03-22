#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# test-variation.sh — Submit a 3-site same-trade batch and inspect copy variation
#
# Usage:  ./scripts/test-variation.sh
#         TRADE=plumbing ./scripts/test-variation.sh
#         PORT=4000 ./scripts/test-variation.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
TRADE="${TRADE:-roofing}"
LOCATION="${LOCATION:-Denver, CO}"

echo "╔══════════════════════════════════════════════╗"
echo "║  GhostClaw — Copy Variation Test              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Trade    : $TRADE"
echo "  Location : $LOCATION"
echo "  Port     : $PORT"
echo ""

# ── Verify server is running ─────────────────────────────────────────────────
if ! curl -sf "$BASE/api/health" > /dev/null 2>&1; then
  echo "  ✗ Server not responding on port $PORT"
  echo "    Start with:  ./scripts/dev-sqlite.sh"
  exit 1
fi
echo "  ✓ Server responding"
echo ""

# ── Submit 3-site same-trade batch ───────────────────────────────────────────
echo "  Submitting 3-site batch..."
echo ""

RESPONSE=$(curl -sf -X POST "$BASE/api/batches/contractor-sites" \
  -H "Content-Type: application/json" \
  -d "{
    \"sites\": [
      { \"businessName\": \"Acme ${TRADE^} LLC\",     \"trade\": \"$TRADE\", \"location\": \"$LOCATION\" },
      { \"businessName\": \"Pinnacle ${TRADE^} Co\",   \"trade\": \"$TRADE\", \"location\": \"$LOCATION\" },
      { \"businessName\": \"Summit ${TRADE^} Inc\",    \"trade\": \"$TRADE\", \"location\": \"$LOCATION\" }
    ]
  }" 2>/dev/null || echo "FAIL")

if [ "$RESPONSE" = "FAIL" ]; then
  echo "  ✗ Batch submission failed"
  exit 1
fi

BATCH_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  ✓ Batch submitted"
echo "    Batch ID: $BATCH_ID"
echo ""

# ── Print per-site status ────────────────────────────────────────────────────
echo "  Per-site status:"
echo "  ─────────────────────────────────────────────"

# Extract site info using grep/sed (no jq dependency)
echo "$RESPONSE" | tr ',' '\n' | grep -E '"businessName"|"status"|"publishEventIds"' | while read -r line; do
  echo "    $line"
done

echo ""

# ── Locate generated site output ─────────────────────────────────────────────
SITES_DIR="$PROJECT_ROOT/output/sites"
echo "  Generated output:"
echo "  ─────────────────────────────────────────────"

if [ ! -d "$SITES_DIR" ]; then
  echo "    No output/sites/ directory yet."
  echo "    Approve and publish sites first via POST /api/approvals/:id/approve"
  echo "    then POST /api/approvals/:id/publish"
  echo ""

  # Show pending approvals
  PENDING=$(curl -sf "$BASE/api/approvals/pending" 2>/dev/null || echo "")
  if [ -n "$PENDING" ]; then
    PENDING_IDS=$(echo "$PENDING" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PENDING_IDS" ]; then
      echo "  Pending approval IDs (approve + publish to generate sites):"
      echo "$PENDING_IDS" | while read -r id; do
        echo "    $id"
      done
      echo ""
      echo "  Quick approve + publish:"
      echo "$PENDING_IDS" | while read -r id; do
        echo "    curl -X POST $BASE/api/approvals/$id/approve -H 'Content-Type: application/json' -d '{\"approvedBy\":\"operator\"}'"
        echo "    curl -X POST $BASE/api/approvals/$id/publish -H 'Content-Type: application/json'"
      done
    fi
  fi
else
  # Find the 3 most recent site directories
  RECENT_DIRS=$(ls -dt "$SITES_DIR"/*/ 2>/dev/null | head -3)

  if [ -z "$RECENT_DIRS" ]; then
    echo "    No generated sites yet."
  else
    echo ""
    for dir in $RECENT_DIRS; do
      DIR_NAME=$(basename "$dir")
      INDEX="$dir/index.html"

      echo "    Site: $DIR_NAME"

      if [ -f "$INDEX" ]; then
        # Extract H1 content
        H1=$(grep -oP '<h1[^>]*>\K[^<]+' "$INDEX" 2>/dev/null | head -1 || echo "(no H1 found)")
        echo "      H1: $H1"

        # Extract hero/subtitle text
        HERO=$(grep -oP 'class="[^"]*hero[^"]*"[^>]*>\s*<[^>]+>\K[^<]+' "$INDEX" 2>/dev/null | head -1 || echo "")
        if [ -n "$HERO" ]; then
          echo "      Hero: $HERO"
        fi

        # Check for business name
        for biz in "Acme" "Pinnacle" "Summit"; do
          if grep -qi "$biz" "$INDEX" 2>/dev/null; then
            echo "      Contains: $biz"
          fi
        done

        # Count HTML files
        FILE_COUNT=$(find "$dir" -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
        echo "      Files: $FILE_COUNT HTML pages"
      else
        echo "      (no index.html)"
      fi
      echo ""
    done
  fi
fi

# ── Copy variation comparison ────────────────────────────────────────────────
echo "  Copy variation check (from artifacts):"
echo "  ─────────────────────────────────────────────"
echo ""

# Fetch runtime artifacts and look for generate_page_content type
ARTIFACTS=$(curl -sf "$BASE/api/runtime/artifacts" 2>/dev/null || echo "")

if [ -n "$ARTIFACTS" ]; then
  # Look for hero text in the most recent page content artifacts
  echo "$ARTIFACTS" | grep -o '"content":"[^"]*generate_page_content[^"]*"' 2>/dev/null | tail -3 | while read -r line; do
    # Extract hero text from the JSON content
    HERO=$(echo "$line" | grep -oP 'hero[^,]*' | head -1 || echo "")
    if [ -n "$HERO" ]; then
      echo "    $HERO"
    fi
  done

  # Simpler approach: count distinct hero strings across artifacts
  HERO_COUNT=$(echo "$ARTIFACTS" | grep -o '"hero":"[^"]*"' | sort -u | wc -l | tr -d ' ')
  if [ "$HERO_COUNT" -gt 0 ]; then
    echo ""
    echo "    Distinct hero lines found: $HERO_COUNT"
  fi
fi

echo ""
echo "  Done."
