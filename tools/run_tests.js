#!/usr/bin/env node
/*
 * Run every ds991 regression suite and print a one-line summary per suite.
 * Exits non-zero if any suite fails, so it can be used as a single check.
 *
 * Usage: node tools/run_tests.js
 */
const {execFileSync}=require("child_process");
const path=require("path");
const suites=["cursor_test.js","fraction_test.js","dpad_test.js","regression_test.js","ui_test.js"];
let failed=0;
for(const s of suites){
  let out="",ok=true;
  try{ out=execFileSync(process.execPath,[path.join(__dirname,s)],{encoding:"utf8"}); }
  catch(e){ ok=false; out=(e.stdout||"")+(e.stderr||""); }
  const last=(out.trim().split("\n").pop()||"").trim();
  console.log((ok?"PASS ":"FAIL ")+s.padEnd(20)+last);
  if(!ok){ failed++; console.log(out.split("\n").filter(l=>/FAIL|got :|want:/.test(l)).join("\n")); }
}
console.log(failed?("\n"+failed+" suite(s) failed"):"\nall suites passed");
process.exit(failed?1:0);
