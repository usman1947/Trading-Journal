#!/bin/bash
set -e

echo "=== 1/5 TypeScript Check ==="
npx tsc --noEmit

echo ""
echo "=== 2/5 ESLint ==="
npm run lint

echo ""
echo "=== 3/5 Prettier ==="
npm run format:check

echo ""
echo "=== 4/5 Unit Tests ==="
npm test -- --ci

echo ""
echo "=== 5/5 Build ==="
npm run build

echo ""
echo "=== ALL CHECKS PASSED ==="
