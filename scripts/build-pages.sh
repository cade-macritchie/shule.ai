#!/usr/bin/env bash
# Static preview of the marketing pages (/, /start) for GitHub Pages.
# Copies apps/web to a temp dir, drops the server-only routes, exports with a base path.
# Usage: scripts/build-pages.sh [base-path] [out-dir]   (defaults: /shule.ai, ./pages-out)
set -euo pipefail
BASE="${1:-/shule.ai}"
OUT="$(cd "$(dirname "${2:-pages-out}")" && pwd)/$(basename "${2:-pages-out}")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -r "$ROOT/apps/web/." "$TMP/web"
rm -rf "$TMP/web/.next" "$TMP/web/app/api" "$TMP/web/app/room" "$TMP/web/app/portal" "$TMP/web/app/agent"
# reuse the workspace's installed packages
ln -s "$ROOT/node_modules" "$TMP/web/node_modules" 2>/dev/null || true
mkdir -p "$TMP/packages" && ln -s "$ROOT/packages/shared" "$TMP/packages/shared"

(cd "$TMP/web" && PAGES_BASE_PATH="$BASE" NEXT_PUBLIC_DEMO=1 NEXT_TELEMETRY_DISABLED=1 npx next build)
rm -rf "$OUT" && cp -r "$TMP/web/out" "$OUT"
touch "$OUT/.nojekyll"      # keep the _next/ folder (Jekyll would hide it)
echo "built $OUT"
