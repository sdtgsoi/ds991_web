#!/usr/bin/env bash
#
# Screenshot ds991.html with headless Chrome. Use it to eyeball layout changes
# that the Node suites cannot see.
#
# Usage: tools/shot.sh OUT.png [KEYS] [WIDTH] [HEIGHT]
#   KEYS  optional space-separated key ids replayed before the shot,
#         e.g. "INTG 0 RIGHT 1 RIGHT XKEY"  (the page reads ?keys= on load)
#
# A throwaway profile dir is used per run so concurrent shots do not collide.
set -u
OUT="${1:-/tmp/ds991_shot.png}"
KEYS="${2:-}"
W="${3:-520}"
H="${4:-940}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="${DS991_PORT:-8931}"
PROFILE="$(mktemp -d /tmp/ds991_prof.XXXXXX)"

# make sure a server is serving the workspace
if ! curl -s -o /dev/null "http://127.0.0.1:$PORT/ds991.html"; then
  ( cd "$ROOT" && nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & )
  sleep 1.5
fi

URL="http://127.0.0.1:$PORT/ds991.html"
if [ -n "$KEYS" ]; then
  URL="$URL?keys=$(printf '%s' "$KEYS" | sed 's/ /%20/g')"
fi

rm -f "$OUT"
"$CHROME" --headless=old --disable-gpu --no-sandbox --no-first-run \
  --disable-extensions --hide-scrollbars --virtual-time-budget=3000 \
  --user-data-dir="$PROFILE" --window-size="$W,$H" \
  --screenshot="$OUT" "$URL" >/dev/null 2>&1 &
PID=$!
for _ in $(seq 1 40); do
  sleep 0.5
  [ -s "$OUT" ] && break
done
kill $PID 2>/dev/null
wait $PID 2>/dev/null
rm -rf "$PROFILE"
[ -s "$OUT" ] && echo "wrote $OUT" || { echo "FAILED to write $OUT"; exit 1; }
