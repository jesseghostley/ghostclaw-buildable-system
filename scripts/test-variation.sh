#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== GhostClaw Variation Test ==="
echo ""
echo "  Submitting 3-site batch..."
echo ""

RESPONSE=$(curl -sf -X POST "$BASE/api/batches/contractor-sites" \
  -H 'Content-Type: application/json' \
  -d '{
    "sites": [
      { "businessName": "Summit HVAC", "trade": "hvac", "location": "Denver, CO", "phone": "303-555-0100", "email": "info@summithvac.example.com" },
      { "businessName": "Apex Roofing Co", "trade": "roofing", "location": "Austin, TX", "phone": "512-555-0199", "email": "hello@apexroofing.example.com" },
      { "businessName": "BrightWire Electric", "trade": "electrical", "location": "Portland, OR", "phone": "503-555-0177", "email": "service@brightwire.example.com" }
    ]
  }' 2>/dev/null || echo "FAILED")

echo "  Response:"
echo "$RESPONSE" | head -100
echo ""

# Show output folders
echo "  Output sites:"
ls -d "$PROJECT_ROOT"/output/sites/*/ 2>/dev/null | tail -10 || echo "    (none)"
echo ""
echo "  Done."
