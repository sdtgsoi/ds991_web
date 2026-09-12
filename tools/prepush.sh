#!/usr/bin/env bash
#
# prepush.sh - run the checks that must pass before `git push`.
#
# It answers three questions, in this order (cheapest first):
#
#   1. are ds991.html and index.html in sync?   (./sync.sh --check)
#   2. do the regression suites pass?           (node tools/run_tests.js)
#   3. is the remote ahead of us?               (git fetch + compare)
#
# Usage:
#   ./tools/prepush.sh            run all checks
#   ./tools/prepush.sh --no-test  skip the test suites
#   ./tools/prepush.sh --help
#
# Exit status:
#   0  everything is clear - safe to push
#   1  a check failed (details are printed above the summary)
#   2  not inside a git work tree, or bad usage
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 2

RUN_TESTS=1
while [ $# -gt 0 ]; do
  case "$1" in
    --no-test) RUN_TESTS=0 ;;
    --help|-h) sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "prepush: unknown option '$1' (try --help)" >&2; exit 2 ;;
  esac
  shift
done

git rev-parse --git-dir >/dev/null 2>&1 || { echo "prepush: not inside a git work tree" >&2; exit 2; }

fail=0
step() { printf '\n=== %s ===\n' "$1"; }

# --- 1. source of truth vs published copy -------------------------------------
step "1/3  sync check (ds991.html -> index.html)"
if [ -x "$ROOT/sync.sh" ]; then
  if "$ROOT/sync.sh" --check; then
    :
  else
    fail=1
    echo "      -> run ./sync.sh, then 'git add -A' and commit again"
  fi
else
  fail=1
  echo "      sync.sh not found next to ds991.html"
fi

# --- 2. regression suites -----------------------------------------------------
if [ "$RUN_TESTS" -eq 1 ]; then
  step "2/3  regression suites"
  if command -v node >/dev/null 2>&1; then
    if node tools/run_tests.js; then
      :
    else
      fail=1
      echo "      -> fix the failing suites before pushing"
    fi
  else
    echo "      node not found - skipped"
  fi
else
  step "2/3  regression suites (skipped via --no-test)"
fi

# --- 3. is the remote ahead? --------------------------------------------------
step "3/3  remote state"
branch="$(git rev-parse --abbrev-ref HEAD)"
upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"

if [ -z "$upstream" ]; then
  echo "      '$branch' has no upstream - the first push will need -u"
else
  remote="$(git config "branch.$branch.remote" || echo origin)"
  if git fetch --quiet "$remote" 2>/dev/null; then
    counts="$(git rev-list --left-right --count "$upstream...HEAD" 2>/dev/null || echo "")"
    behind="${counts%%[[:space:]]*}"
    ahead="${counts##*[[:space:]]}"
    echo "      $branch vs $upstream: $((${ahead:-0})) to push, $((${behind:-0})) to pull"
    if [ "${behind:-0}" != "0" ]; then
      fail=1
      echo "      -> the remote has commits you do not have; pull or merge before pushing"
      echo "         (this is what causes the non-fast-forward rejection)"
    fi
    if git status --porcelain | grep -q .; then
      fail=1
      echo "      note: you have uncommitted changes - commit them first"
    fi
  else
    echo "      git fetch failed (offline?) - could not check the remote"
  fi
fi

# --- summary ------------------------------------------------------------------
printf '\n'
if [ "$fail" -eq 0 ]; then
  echo "prepush: all clear, go ahead and push"
else
  echo "prepush: NOT ready to push (see the notes above)"
fi
exit "$fail"
