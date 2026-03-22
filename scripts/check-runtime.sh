#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# check-runtime.sh — Verify GhostClaw is running and healthy
#
# Usage:  ./scripts/check-runtime.sh
#         PORT=4000 ./scripts/check-runtime.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"
DB_PATH="${GHOSTCLAW_SQLITE_PATH:-$PROJECT_ROOT/data/ghostclaw.sqlite}"

PASS=0
FAIL=0
WARN=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
warn() { echo "  ? $1"; WARN=$((WARN + 1)); }

echo "╔══════════════════════════════════════════════╗"
echo "║  GhostClaw Runtime Check                      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Port check ────────────────────────────────────────────────────────────
echo "  Port $PORT"
if curl -sf "$BASE/api/health" > /dev/null 2>&1; then
  pass "Server responding on port $PORT"
else
  fail "Server NOT responding on port $PORT"
  echo ""
  echo "  Start with:  ./scripts/dev-sqlite.sh"
  echo ""
  exit 1
fi

# ── 2. SQLite DB check ──────────────────────────────────────────────────────
echo ""
echo "  SQLite"
if [ -f "$DB_PATH" ]; then
  DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
  pass "Database exists at $DB_PATH ($DB_SIZE)"
else
  warn "No SQLite database at $DB_PATH (running in memory mode?)"
fi

# ── 3. Health endpoint ───────────────────────────────────────────────────────
echo ""
echo "  Endpoints"

HEALTH=$(curl -sf "$BASE/api/health" 2>/dev/null || echo "FAIL")
if echo "$HEALTH" | grep -q '"ok":true'; then
  pass "GET /api/health"
else
  fail "GET /api/health — $HEALTH"
fi

# ── 4. Runtime status ────────────────────────────────────────────────────────
STATUS=$(curl -sf "$BASE/api/runtime/status" 2>/dev/null || echo "FAIL")
if [ "$STATUS" != "FAIL" ]; then
  SIGNAL_COUNT=$(echo "$STATUS" | grep -o '"signalCount":[0-9]*' | cut -d: -f2 || echo "?")
  ARTIFACT_COUNT=$(echo "$STATUS" | grep -o '"artifactCount":[0-9]*' | cut -d: -f2 || echo "?")
  pass "GET /api/runtime/status — signals: $SIGNAL_COUNT, artifacts: $ARTIFACT_COUNT"
else
  fail "GET /api/runtime/status"
fi

# ── 5. Agents ────────────────────────────────────────────────────────────────
AGENTS=$(curl -sf "$BASE/api/runtime/agents" 2>/dev/null || echo "FAIL")
if [ "$AGENTS" != "FAIL" ]; then
  AGENT_COUNT=$(echo "$AGENTS" | grep -o '"agentName"' | wc -l | tr -d ' ')
  pass "GET /api/runtime/agents — $AGENT_COUNT agents registered"
else
  fail "GET /api/runtime/agents"
fi

# ── 6. Blueprints ────────────────────────────────────────────────────────────
BLUEPRINTS=$(curl -sf "$BASE/api/blueprints/active" 2>/dev/null || echo "FAIL")
if [ "$BLUEPRINTS" != "FAIL" ]; then
  BP_COUNT=$(echo "$BLUEPRINTS" | grep -o '"id"' | wc -l | tr -d ' ')
  pass "GET /api/blueprints/active — $BP_COUNT active blueprints"
else
  fail "GET /api/blueprints/active"
fi

# ── 7. Approvals ─────────────────────────────────────────────────────────────
PENDING=$(curl -sf "$BASE/api/approvals/pending" 2>/dev/null || echo "FAIL")
if [ "$PENDING" != "FAIL" ]; then
  PENDING_COUNT=$(echo "$PENDING" | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "?")
  pass "GET /api/approvals/pending — $PENDING_COUNT pending"
else
  fail "GET /api/approvals/pending"
fi

# ── 8. Batches ───────────────────────────────────────────────────────────────
BATCHES=$(curl -sf "$BASE/api/batches" 2>/dev/null || echo "FAIL")
if [ "$BATCHES" != "FAIL" ]; then
  BATCH_COUNT=$(echo "$BATCHES" | grep -o '"count":[0-9]*' | cut -d: -f2 || echo "?")
  pass "GET /api/batches — $BATCH_COUNT batches"
else
  fail "GET /api/batches"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────────"
echo "  Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
