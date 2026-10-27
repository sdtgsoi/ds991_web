#!/usr/bin/env bash
# Usage: tools/shot.sh OUT.png [KEYS] [WIDTH] [HEIGHT]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/tools/screenshot.js" "$@"
