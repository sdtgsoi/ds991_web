#!/usr/bin/env node
/*
 * Headless probe for ds991.html fraction / template input.
 *
 * Runs the page's <script> inside a minimal DOM shim and replays key
 * sequences through the real dispatcher, printing the rendered LCD line
 * plus the raw expression tree after every key.
 *
 * The DOM shim below is duplicated per file on purpose: each suite is a
 * standalone script with no dependencies.
 *
 * Usage:  node tools/fraction_test.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const FILE = path.join(__dirname, "..", "ds991.html");
const pageSrc = fs.readFileSync(FILE, "utf8").match(/<script>([\s\S]*?)<\/script>/)[1];

class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach((x) => this.s.add(x)); }
  remove(...c) { c.forEach((x) => this.s.delete(x)); }
  contains(c) { return this.s.has(c); }
  toggle(c, f) { if (f === undefined) f = !this.s.has(c); if (f) this.s.add(c); else this.s.delete(c); return f; }
  get value() { return [...this.s].join(" "); }
}
class El {
  constructor(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this.children = []; this.style = {}; this._cls = new ClassList();
    this._html = ""; this.textContent = ""; this.attrs = {}; this.parentNode = null;
  }
  get classList() { return this._cls; }
  set className(v) { this._cls = new ClassList(); String(v || "").split(/\s+/).filter(Boolean).forEach((c) => this._cls.add(c)); }
  get className() { return this._cls.value; }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  closest() { return null; }
  scrollIntoView() {}
}

/* ---------------------------------------------------------------------------
   Minimal DOM shim. The page script is written against document.getElementById,
   createElement, appendChild, classList and innerHTML; implementing just those
   lets the real page code run under Node. The element handles are FAKE, so the
   suites assert on the HTML string the renderer produced, never on layout.
   --------------------------------------------------------------------------- */
function boot() {
  const cache = {};
  const padMain = new El("div");
  cache.padMain = padMain; cache.padTop = new El("div"); cache.calc = new El("div");
  padMain.querySelectorAll = (s) => (/keycell/.test(s) ? [] : []);
  const doc = {
    getElementById: (id) => cache[id] || (cache[id] = new El("div")),
    createElement: (t) => new El(t),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: new El("body"),
  };
  const ctx = {
    console, setTimeout, clearTimeout, Math, JSON, Date,
    isFinite, isNaN, parseInt, parseFloat, String, Number, Array, Object,
    document: doc,
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(pageSrc, ctx, { filename: "ds991-page.js" });
  return { calc: ctx.__calc, screen: () => cache.screen.innerHTML };
}

/* structured HTML -> text: understands the nested template markup */
const {renderText}=require("./render_text.js");


function exprLine(html) {
  const m = /id="exprline">([\s\S]*?)$/.exec(html);
  return m ? renderText(m[1].split('<div class="resultline"')[0]) : "(?)";
}
function resultLine(html) {
  const m = /id="resultline">([\s\S]*?)$/.exec(html);
  return m ? renderText(m[1]) : "(?)";
}
function brief(n) {
  if (!n) return String(n);
  const arr = (a) => "[" + a.map(brief).join(",") + "]";
  switch (n.t) {
    case "num": return "N" + n.v;
    case "op": return "op" + n.v;
    case "variable": return "V" + n.name;
    case "const": return "C" + n.name;
    case "post": return "post" + n.v;
    case "func": return "func(" + n.name + ")" + arr(n.arg);
    case "frac": return "frac{num:" + arr(n.num) + ",den:" + arr(n.den) + "}";
    case "mixed": return "mixed{whole:" + arr(n.whole) + ",num:" + arr(n.num) + ",den:" + arr(n.den) + "}";
    case "pow": return "pow{base:" + arr(n.base) + ",exp:" + arr(n.exp) + "}";
    case "sqrt": return "sqrt" + arr(n.body);
    case "root": return "root{n:" + arr(n.n) + ",body:" + arr(n.body) + "}";
    case "paren": return "paren" + arr(n.body);
    case "abs": return "abs" + arr(n.body);
    case "logbase": return "logbase{base:" + arr(n.base) + ",arg:" + arr(n.arg) + "}";
    case "intg": return "intg{lo:" + arr(n.lower) + ",hi:" + arr(n.upper) + ",body:" + arr(n.body) + "}";
    case "sum": return "sum{lo:" + arr(n.lower) + ",hi:" + arr(n.upper) + ",body:" + arr(n.body) + "}";
    case "deriv": return "deriv{body:" + arr(n.body) + ",at:" + arr(n.at) + "}";
    default: return n.t;
  }
}

let failures = 0;
function check(label, got, want) {
  const ok = got === want;
  if (!ok) failures++;
  console.log((ok ? "  ok   " : "  FAIL ") + label.padEnd(48) +
    (ok ? "" : "\n         got : " + JSON.stringify(got) + "\n         want: " + JSON.stringify(want)));
}
function trace(label, keys) {
  const { calc, screen } = boot();
  const steps = keys.split(" ").filter(Boolean);
  console.log("\n=== " + label + " ===  [" + steps.join(" ") + "]");
  console.log("  start   : " + exprLine(screen()));
  for (const k of steps) {
    let threw = null;
    try { calc.dispatch(k); } catch (e) { threw = e.message; }
    console.log("  " + k.padEnd(8) + ": " + exprLine(screen()).padEnd(18) +
      "  tree=" + (calc.getExpr().map(brief).join(",") || "(empty)") +
      (threw ? "   *** THREW " + threw : ""));
  }
  return calc;
}
function value(label, keys, want) {
  const { calc, screen } = boot();
  for (const k of keys.split(" ").filter(Boolean)) calc.dispatch(k);
  check(label, calc.S.error ? "ERR:" + calc.S.error : resultLine(screen()), want);
}

console.log("################################################################");
console.log("# 1. placeholders before anything is typed");
console.log("################################################################");
trace("FRAC pressed alone", "FRAC");
trace("mixed fraction pressed alone", "SHIFT FRAC");
trace("sqrt pressed alone", "SQRT");
trace("power template", "2 POW");
trace("log with base", "LOG");

console.log("\n################################################################");
console.log("# 2. UP / DOWN move between the template slots");
console.log("################################################################");
trace("FRAC 1 DOWN 2", "FRAC 1 DOWN 2");
trace("FRAC 1 2 DOWN 3 4", "FRAC 1 2 DOWN 3 4");
trace("FRAC 1 UP 2  (UP at the first slot steps out)", "FRAC 1 UP 2");
trace("FRAC 1 DOWN 2 UP 3", "FRAC 1 DOWN 2 UP 3");
trace("mixed: whole -> num -> den", "SHIFT FRAC 2 DOWN 3 DOWN 4");
trace("sqrt: UP at the only slot steps out", "SQRT 4 UP 5");
trace("power exponent: DOWN steps out, UP returns", "2 POW 3 DOWN 4");

console.log("\n################################################################");
console.log("# 3. LEFT / RIGHT still work");
console.log("################################################################");
trace("FRAC 1 RIGHT 2", "FRAC 1 RIGHT 2");
trace("FRAC 1 RIGHT 2 LEFT 3", "FRAC 1 RIGHT 2 LEFT 3");
trace("FRAC 1 RIGHT 2 RIGHT + 3", "FRAC 1 RIGHT 2 RIGHT ADD 3");

console.log("\n################################################################");
console.log("# 4. DEL inside a template no longer nukes the expression");
console.log("################################################################");
trace("FRAC 1 DOWN 2 DEL", "FRAC 1 DOWN 2 DEL");
trace("FRAC 1 2 DOWN 3 DEL DEL", "FRAC 1 2 DOWN 3 DEL DEL");
trace("FRAC 1 DOWN DEL", "FRAC 1 DOWN DEL");
trace("1 2 3 LEFT LEFT DEL", "1 2 3 LEFT LEFT DEL");
trace("SQRT 4 RIGHT DEL", "SQRT 4 RIGHT DEL");
trace("SHIFT FRAC 2 DOWN 3 DEL", "SHIFT FRAC 2 DOWN 3 DEL");

console.log("\n################################################################");
console.log("# 4b. the fraction key absorbs a number that is already typed");
console.log("################################################################");
trace("7 then FRAC  (7 becomes the numerator)", "7 FRAC");
trace("7 FRAC 3      -> 7/3", "7 FRAC 3");
trace("1 + 2 FRAC 3  -> 1+2/3", "1 ADD 2 FRAC 3");
trace("12 + 34 FRAC 5 (whole number is taken)", "1 2 ADD 3 4 FRAC 5");
trace("7 FRAC 1 2 -> 3 (two-digit numerator)", "7 FRAC 1 2 UP 3");
trace("2 x 3 FRAC 4", "2 MUL 3 FRAC 4");
trace("mid-expression: 1+2 FRAC with caret after 1", "1 ADD 2 LEFT LEFT FRAC");
trace("SHIFT FRAC absorbs as the integer part", "2 SHIFT FRAC 3 DOWN 4");
trace("FRAC with nothing in front stays empty", "FRAC");
trace("1 + FRAC (no number to absorb)", "1 ADD FRAC");

console.log("\n################################################################");
console.log("# 5. evaluation is unchanged");
console.log("################################################################");
const evals = [
  ["FRAC 1 DOWN 2 RIGHT EQUALS", "(1)/(2)"],
  ["FRAC 1 DOWN 2 RIGHT ADD FRAC 1 DOWN 3 RIGHT EQUALS", "(5)/(6)"],
  ["1 DIV 3 EQUALS", "(1)/(3)"],
  ["SHIFT FRAC 1 DOWN 2 DOWN 3 RIGHT EQUALS", "(5)/(3)"],
  ["SHIFT FRAC 1 DOWN 2 DOWN 3 RIGHT EQUALS SHIFT SD", "1(2)/(3)"],
  ["SQRT 9 EQUALS", "3"],
  ["2 POW 1 0 EQUALS", "1024"],
  ["FRAC 2 DOWN 4 RIGHT EQUALS", "(1)/(2)"],
  ["SHIFT FRAC 2 DOWN 1 DOWN 2 RIGHT EQUALS", "(5)/(2)"],
  ["MENU 2 ALPHA ENG EQUALS", "i"],
  ["7 FRAC 3 EQUALS", "(7)/(3)"],
  ["1 ADD 2 FRAC 3 EQUALS", "(5)/(3)"],
  ["1 2 ADD 3 4 FRAC 1 0 0 EQUALS", "(617)/(50)"],   /* 12 + 34/100 */
  ["1 ADD 2 FRAC 3 EQUALS SHIFT SD", "1(2)/(3)"],
  ["2 SHIFT FRAC 3 DOWN 4 RIGHT EQUALS", "(11)/(4)"],
];
for (const [keys, want] of evals) value(keys, keys, want);

console.log("\n################################################################");
console.log("# 6. history recall still reachable outside a template");
console.log("################################################################");
{
  const { calc, screen } = boot();
  ["2", "ADD", "3", "EQUALS", "AC", "4", "ADD", "5", "EQUALS"].forEach((k) => calc.dispatch(k));
  calc.dispatch("UP");
  check("UP recalls the newest entry", exprLine(screen()), "4+5|");
  calc.dispatch("UP");
  check("UP again goes further back", exprLine(screen()), "2+3|");
}
{
  const { calc, screen } = boot();
  ["2", "ADD", "3", "EQUALS", "AC", "4", "ADD", "5", "EQUALS"].forEach((k) => calc.dispatch(k));
  calc.dispatch("UP"); calc.dispatch("DOWN");
  check("DOWN returns to what was being typed", exprLine(screen()), "|");
}
{
  const { calc, screen } = boot();
  ["2", "ADD", "3", "EQUALS", "AC"].forEach((k) => calc.dispatch(k));
  calc.dispatch("FRAC"); calc.dispatch("7"); calc.dispatch("DOWN"); calc.dispatch("9");
  check("UP/DOWN inside a template does not touch history",
    calc.getExpr().map(brief).join(","), "frac{num:[N7],den:[N9]}");
  check("...and typing 9 lands in the denominator", exprLine(screen()), "(7)/(9|)");
}
{
  const { calc } = boot();
  ["2", "ADD", "3", "EQUALS", "AC", "FRAC", "5", "DOWN", "6"].forEach((k) => calc.dispatch(k));
  calc.dispatch("UP"); calc.dispatch("UP");
  check("repeated UP inside a template stays in the editor",
    calc.getExpr().map(brief).join(","), "frac{num:[N5],den:[N6]}");
}

console.log("\n" + (failures ? failures + " FAILURE(S)" : "all checks passed"));
process.exit(failures ? 1 : 0);
