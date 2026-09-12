#!/usr/bin/env bash
#
# sync.sh - keep index.html identical to ds991.html
#
# ds991.html is the SOURCE OF TRUTH. Edit only that file; index.html exists
# solely because GitHub Pages serves index.html from the repository root.
#
# Usage:
#   ./sync.sh            copy ds991.html -> index.html, then report
#   ./sync.sh --check    report whether the two are in sync; change nothing
#   ./sync.sh --help
#
# Exit status:
#   0  copied successfully, or (with --check) the files already match
#   1  files differ when running --check, or the source failed validation
#   2  bad usage / missing source file
#
set -euo pipefail

SRC_NAME="ds991.html"
DST_NAME="index.html"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT/$SRC_NAME"
DST="$ROOT/$DST_NAME"

usage() {
  sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

CHECK_ONLY=0
case "${1:-}" in
  "")        ;;
  --check|-c) CHECK_ONLY=1 ;;
  --help|-h) usage; exit 0 ;;
  *) echo "sync: unknown option '$1' (try --help)" >&2; exit 2 ;;
esac

[ -f "$SRC" ] || { echo "sync: missing source file: $SRC" >&2; exit 2; }

# --- validate the source before trusting it -----------------------------------
# A truncated or half-written page must never be propagated to the published
# copy, so refuse to sync anything that does not look like the calculator.
fail() { echo "sync: refusing to sync - $1" >&2; exit 1; }
[ -s "$SRC" ] || fail "$SRC_NAME is empty"

for marker in '<!DOCTYPE html>' 'class="calculator"' 'id="padMain"' '<script>' '</html>'; do
  grep -qF -- "$marker" "$SRC" || fail "$SRC_NAME is missing $marker"
done

# the page's script must at least be syntactically valid JavaScript
if command -v node >/dev/null 2>&1; then
  node -e '
    const fs=require("fs");
    const html=fs.readFileSync(process.argv[1],"utf8");
    const m=html.match(/<script>([\s\S]*?)<\/script>/);
    if(!m){ console.error("no <script> block"); process.exit(1); }
    new (require("vm").Script)(m[1]);           // throws on a syntax error
  ' "$SRC" 2>/dev/null || fail "$SRC_NAME has a JavaScript syntax error"
fi

sum() { shasum "$1" | awk '{print $1}'; }

# --- --check: report only -----------------------------------------------------
if [ "$CHECK_ONLY" -eq 1 ]; then
  if [ ! -f "$DST" ]; then
    echo "sync: $DST_NAME does not exist yet - run ./sync.sh"
    exit 1
  fi
  if cmp -s "$SRC" "$DST"; then
    echo "sync: in sync ($(sum "$SRC" | cut -c1-12))"
    exit 0
  fi
  echo "sync: OUT OF SYNC"
  echo "        $SRC_NAME $(sum "$SRC" | cut -c1-12)  $(wc -c <"$SRC" | tr -d ' ') bytes"
  echo "        $DST_NAME $(sum "$DST" | cut -c1-12)  $(wc -c <"$DST" | tr -d ' ') bytes"
  echo "      run ./sync.sh to copy $SRC_NAME over $DST_NAME"
  exit 1
fi

# --- copy ---------------------------------------------------------------------
before="$( [ -f "$DST" ] && sum "$DST" || echo none )"
cp "$SRC" "$DST"
after="$(sum "$DST")"
src="$(sum "$SRC")"

[ "$src" = "$after" ] || fail "verification failed after copy"

if [ "$before" = "$after" ]; then
  echo "sync: $DST_NAME already up to date ($(echo "$after" | cut -c1-12))"
else
  echo "sync: $SRC_NAME -> $DST_NAME  ($(echo "$after" | cut -c1-12), $(wc -c <"$DST" | tr -d ' ') bytes)"
fi
