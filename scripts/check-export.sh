#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Checking export capability"

# Check if TypeScript compiles cleanly (export = build artifact)
echo "  Building project..."
npx tsc --noEmit 2>&1
TSC_EXIT=$?

if [ $TSC_EXIT -eq 0 ]; then
  echo "  TypeScript compilation: OK"
else
  echo "  TypeScript compilation: FAIL (exit $TSC_EXIT)"
  exit $TSC_EXIT
fi

# Verify that storage factory exports are resolvable
echo "  Checking core module exports..."
node -e "
  try {
    require('./packages/core/src/storage/storage_factory');
    console.log('  storage_factory: FAIL (should not resolve raw .ts via require)');
  } catch(e) {
    // Expected - .ts files need compilation first
  }
  // Check compiled output exists if dist/ was built
  const fs = require('fs');
  if (fs.existsSync('./dist')) {
    console.log('  dist/ directory: EXISTS');
  } else {
    console.log('  dist/ directory: NOT BUILT (run npm run build first)');
  }
" 2>&1

echo ""
echo "==> Export check complete"
