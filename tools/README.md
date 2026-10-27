# Test and inspection tools

Node.js **22+**, no third-party dependencies. Run commands below from the repository
root. The HTML is self-contained; the five `src/*.js` source files are embedded by `./sync.sh`.
See [testing and release checks](../docs/testing.md) for acceptance boundaries.

## Regression suites

| File | Coverage |
|---|---|
| `calc_optn_test.js` | Calculate OPTN categories, six hyperbolic functions, explicit angle suffixes, eleven engineering prefixes and editing/navigation |
| `complex_optn_test.js` | Complex OPTN pages, four functions, per-expression output conversion, numeric Ans, history, CALC and editing/error paths |
| `menu_test.js` | menu pages/back navigation, settings, reset confirmation, 47 constants, 40 conversions, mode entry and cell editors |
| `math_test.js` | standalone polynomial roots, scaling, real nth roots, invalid inputs |
| `cursor_test.js` | digit offsets, LEFT/RIGHT, UP/DOWN, deletion, fraction order |
| `fraction_test.js` | fraction templates, preceding-number absorption, evaluation |
| `dpad_test.js` | UP/DOWN across templates, caret paths |
| `power_test.js` | exponent input, deletion, navigation, evaluation and serialization |
| `regression_test.js` | calculation modes, memory/history, nonmonic polynomials, negative cube root and inequality boundaries |
| `ui_test.js` | caret/answer display, layout markup, keyboard handling, integral and logarithm markup |
| `run_tests.js` | runs all ten suites, nonzero exit on any failure |

```bash
./sync.sh
node tools/run_tests.js
./sync.sh --check
```

The eight page suites evaluate the embedded script against a small DOM shim and drive
`window.__calc.dispatch`. They test behavior and emitted markup, not browser layout.
The numerical suite requires `src/math-core.js` directly and needs no DOM.

## Publishing guard

```bash
node tools/sync_test.js    # source drift and invalid-publication scenarios
node tools/prepush_test.js # isolated failure/success scenarios; no network
node tools/browser_lifecycle_test.js # Chrome shutdown and profile cleanup failures
./tools/prepush.sh         # sync + regression + live upstream check + clean tree
./tools/prepush.sh --no-test
```

The guard fails when Node, upstream, fetch, commit comparison or working-tree checks
are unavailable, as well as for test failures or a remote ahead of HEAD. The
`--no-test` option reports explicitly that tests were skipped. It is a manual check,
not an installed Git hook. Commit reviewed changes before expecting a clean-tree pass.

## Chrome tools

Chrome/Chromium is discovered in common install locations or Linux PATH. Override
with `CHROME_PATH=/path/to/chrome`. The shared `browser.js` uses current Headless,
a fresh temporary profile, random localhost ports, CDP timeouts and cleanup on exit.
It requests Chrome's graceful shutdown, waits for the process to close, escalates
termination if needed and retries transient profile deletion failures. Cleanup errors
remain failures; if the browser operation also failed, both errors are reported.
Do not disable the Chrome sandbox unless required by a restricted container
(`CHROME_NO_SANDBOX=1`).

```bash
node tools/browser_test.js
./tools/shot.sh /tmp/ds991.png "2 POW 3" 390 940
node tools/computed.js '.key[data-key="MENU"] .sl.right'
node tools/rects.js --keys "INTG XKEY" '.lcd' '.bigop' '.lim.tall'
node tools/eval_page.js --keys "2 ADD 3 EQUALS" 'window.__calc.S.ans'
```

`browser_test.js` covers startup, keyboard dispatch, key construction, numeric
regressions, visible inequality symbols and calculator bounds at 390/1280 widths.
It also checks menu bounds, paging and pointer/click selection, including all
Calculate OPTN submenus and the two-column hyperbolic layout.
Add `--screenshots /tmp/ds991-menu-review` to save menu screenshots.
It is a smoke test; screenshots and full cross-browser/real-touch verification
remain separate tasks. The screenshot helper exits nonzero on browser failure.

`embed_sources.js --check|--write` is normally called by `sync.sh`; edit the corresponding
source file instead of a generated HTML block.
