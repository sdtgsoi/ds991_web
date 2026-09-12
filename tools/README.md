# tools/

Test and inspection helpers for `../ds991.html`. Plain Node, no dependencies,
no build step.

`../ds991.html` is the source of truth; `../sync.sh` (in the repository root,
next to the page) copies it to `index.html` for GitHub Pages.

## Suites

| file | covers |
|---|---|
| `cursor_test.js` | per-digit LEFT/RIGHT, UP/DOWN slot offsets, DEL, fraction order |
| `fraction_test.js` | fraction templates, absorbing a preceding number, evaluation |
| `dpad_test.js` | UP/DOWN across every template type, caret never stranded |
| `regression_test.js` | every calculation mode plus editing, memory and history |
| `ui_test.js` | caret/answer display, key layout, shortcuts, integral and log markup |
| `run_tests.js` | runs all of the above; exits non-zero on any failure |

```bash
node tools/run_tests.js      # run all suites
../sync.sh                   # then publish ds991.html -> index.html
```

## Pre-push check

```bash
./prepush.sh            # sync check + all suites + "is the remote ahead?"
./prepush.sh --no-test  # quicker: skip the suites
```

Exits non-zero unless all three are true:

1. `ds991.html` and `index.html` are in sync (delegates to `../sync.sh --check`),
2. every suite passes,
3. the remote has no commits you are missing and your tree is clean.

Step 3 is the one that catches a `non-fast-forward` rejection before you try to
push; step 1 catches the "forgot to sync" case that otherwise forces an amend.

## How the Node suites work

`ds991.html` is one self-contained page. Each suite extracts its `<script>`
block, evaluates it inside `vm` against a ~30-line DOM shim, and then drives the
**real** dispatcher (`window.__calc.dispatch`) with key sequences. Assertions are
made against the rendered LCD HTML converted to text by `render_text.js`, so
they stay readable:

```
(12|)/(☐)      caret sits after "12" in the numerator, denominator still empty
(12)/(34|)     caret at the end of the denominator
[0..1]         integral limits, lower..upper
```

These suites check logic and the emitted markup. They cannot check *visual*
layout - use the screenshot helper for that.

## Inspection helpers

```bash
# screenshot any state; keys are replayed via the page's ?keys= hook
../tools/shot.sh out.png "INTG 0 RIGHT 1 RIGHT XKEY"

# ask the browser for an element's COMPUTED style (catches CSS cascade bugs)
node computed.js '.key[data-key="MENU"] .sl.right'

# element geometry: is anything overflowing or overlapping?
node rects.js --keys "INTG XKEY SQR" ".lcd" ".bigop" ".lim.tall"
```

`computed.js` and `rects.js` exist because a rule can look correct in the source
and still lose on specificity or overflow its container - reading the browser's
own computed style and bounding rectangles is the only way to be sure.
