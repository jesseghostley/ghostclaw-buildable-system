#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
BASE="http://localhost:${PORT}"
PASS=0
FAIL=0

check() {
  local label="$1" url="$2"
  printf "  %-40s" "$label"
  HTTP_CODE=$(curl -s -o /tmp/gc_check_body -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "OK ($HTTP_CODE)"
    PASS=$((PASS + 1))
  else
    echo "FAIL ($HTTP_CODE)"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> Checking GhostClaw runtime at $BASE"
check "GET /api/health"                   "$BASE/api/health"
check "GET /api/runtime/status"           "$BASE/api/runtime/status"
check "GET /api/runtime/queue"            "$BASE/api/runtime/queue"
check "GET /api/runtime/agents"           "$BASE/api/runtime/agents"
check "GET /api/runtime/artifacts"        "$BASE/api/runtime/artifacts"
check "GET /api/jobs"                     "$BASE/api/jobs"
check "GET /api/skill-invocations"        "$BASE/api/skill-invocations"
check "GET /api/runtime-events"           "$BASE/api/runtime-events"

echo ""
echo "==> Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
