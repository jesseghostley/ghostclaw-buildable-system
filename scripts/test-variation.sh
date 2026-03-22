#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Running GhostClaw test suite"
npx jest --verbose 2>&1
EXIT=$?

echo ""
if [ $EXIT -eq 0 ]; then
  echo "==> All tests passed"
else
  echo "==> Tests failed (exit $EXIT)"
fi
exit $EXIT
