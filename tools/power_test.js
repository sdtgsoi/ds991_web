#!/usr/bin/env node
/*
 * Exponent / power editing regression net for ds991.html.
 *
 * This suite is the Phase 0 deliverable of
 *   temp-docs/DS991_km_指数编辑系统错误分析与重构开发方案_v3.md
 * and freezes chapter 3 of that document ("现状行为基线") as executable
 * assertions, so the Phase 2/3 refactor cannot drift.
 *
 * Layout of the suite mirrors the document:
 *   I*  input      (I1..I11)     D*  delete   (D1..D11)
 *   N*  navigation (N1..N6)      V*  eval / serialization
 *   R*  render assets (source-level guard only - real R1..R4 need screenshots)
 *
 * Defects found during Phase 0 are fixed and their cases are ordinary
 * assertions now:
 *   P1  top-level mid-number + x^()               -> fixed in Phase 2 (I10a/I10b)
 *   N6  UP/DOWN not reversible in a power tower   -> fixed in Phase 3 (N6a-N6c)
 * The `xfail` machinery is kept for the next defect: a case marked xfail
 * asserts the CORRECT behaviour, reports "xfail" while the code is still wrong,
 * and reports XPASS (counted as a failure) once it is fixed - the signal to
 * drop the marker.
 *
 * Usage: node tools/power_test.js
 */
const fs=require("fs"),vm=require("vm"),path=require("path");
const {renderText}=require("./render_text.js");
const pageSrc=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
/* ---------------------------------------------------------------------------
   Minimal DOM shim. The page script is written against document.getElementById,
   createElement, appendChild, classList and innerHTML; implementing just those
   lets the real page code run under Node. Element handles are FAKE, so tests
   assert on the HTML string the renderer produced, not on layout.
   (Duplicated per suite on purpose: each suite is standalone, no dependencies.)
   --------------------------------------------------------------------------- */
class CL{constructor(){this.s=new Set();}add(...c){c.forEach(x=>this.s.add(x));}remove(...c){c.forEach(x=>this.s.delete(x));}
 contains(c){return this.s.has(c);}toggle(c,f){if(f===undefined)f=!this.s.has(c);f?this.s.add(c):this.s.delete(c);return f;}get value(){return [...this.s].join(" ");}}
class El{constructor(t){this.tagName=(t||"div").toUpperCase();this.children=[];this.style={};this._cls=new CL();this._html="";this.textContent="";this.attrs={};this.parentNode=null;}
 get classList(){return this._cls;}set className(v){this._cls=new CL();String(v||"").split(/\s+/).filter(Boolean).forEach(c=>this._cls.add(c));}get className(){return this._cls.value;}
 set innerHTML(v){this._html=String(v);}get innerHTML(){return this._html;}appendChild(c){c.parentNode=this;this.children.push(c);return c;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(){}querySelector(){return null;}querySelectorAll(){return [];}closest(){return null;}scrollIntoView(){}}
function boot(){
  const cache={};const padMain=new El("div");cache.padMain=padMain;cache.padTop=new El("div");cache.calc=new El("div");
  padMain.querySelectorAll=()=>[];
  const doc={getElementById:id=>cache[id]||(cache[id]=new El("div")),createElement:t=>new El(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},body:new El("body")};
  const ctx={console,setTimeout,clearTimeout,Math,JSON,Date,isFinite,isNaN,parseInt,parseFloat,String,Number,Array,Object,document:doc};ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(pageSrc,ctx,{filename:"p.js"});
  return {calc:ctx.__calc,screen:()=>cache.screen.innerHTML};
}
function exprLine(h){const m=/id="exprline">([\s\S]*?)$/.exec(h);return m?renderText(m[1].split('<div class="resultline"')[0]):"(?)";}
function resultLine(h){const m=/id="resultline">([\s\S]*?)$/.exec(h);return m?renderText(m[1]):"(?)";}
/* compact, stable tree printer - one line per expression */
function brief(n){if(!n)return"?";const a=x=>"["+x.map(brief).join(",")+"]";
 if(n.t==="pow")return "pow{"+a(n.base)+"^"+a(n.exp)+"}";
 if(n.t==="frac")return "frac{"+a(n.num)+"/"+a(n.den)+"}";
 if(n.t==="mixed")return "mixed{"+a(n.whole)+"|"+a(n.num)+"/"+a(n.den)+"}";
 if(n.t==="intg")return "intg{lo"+a(n.lower)+",up"+a(n.upper)+",body"+a(n.body)+"}";
 if(n.t==="num")return "N"+n.v; if(n.t==="op")return "op"+n.v; if(n.t==="variable")return "V"+n.name;
 if(n.t==="paren")return "("+a(n.body)+")"; if(n.t==="sqrt")return "sqrt{"+a(n.body)+"}";
 return n.t;}
/* tree constructors for `setExpr` based D-cases */
function NT(v){return {t:"num",v:String(v)};}
function P(b,e){return {t:"pow",base:b||[],exp:e||[]};}

let pass=0,fail=0,xfail=0;
/* t(label, keys, want, opts)
     want = {line, tree, path, res}  (omit a field to skip that check)
     opts = {pre:<tree array>, xfail:<reason>} */
function t(label,keys,want,opts){
  want=want||{};opts=opts||{};
  const {calc,screen}=boot();
  if(opts.pre) calc.setExpr(opts.pre);
  let threw=null;
  try{ for(const k of keys.split(" ").filter(Boolean)) calc.dispatch(k); }catch(e){ threw=e.message; }
  const got={
    line:exprLine(screen()),
    tree:calc.getExpr().map(brief).join(","),
    path:JSON.stringify(calc.getCursor().path),
    res:resultLine(screen())
  };
  const bad=[];
  for(const k of ["line","tree","path","res"]) if(want[k]!==undefined && got[k]!==want[k]) bad.push(k);
  const ok=bad.length===0 && !threw;
  const detail=" line="+JSON.stringify(got.line).padEnd(16)+" tree="+got.tree+
    (threw?(" THREW "+threw):"");
  if(opts.xfail){
    if(ok){ fail++; console.log("XPASS "+label.padEnd(40)+"  ("+opts.xfail+" 已修复 -> 请删除 xfail 标记)"); }
    else { xfail++; console.log("xfail "+label.padEnd(40)+detail+"   ["+opts.xfail+"]"); }
    return;
  }
  if(ok){ pass++; console.log("ok    "+label.padEnd(40)); }
  else{
    fail++;
    console.log("FAIL  "+label.padEnd(40)+detail+
      "   wrong="+bad.join(",")+bad.map(k=>" want "+k+"="+JSON.stringify(want[k])).join(""));
  }
}

console.log("--- I. input (doc 3.1) ---");
t("I1  basic power","2 POW 3",{line:"23|",tree:"pow{[N2]^[N3]}"});
t("I2  power tower","2 POW 3 POW 4",{line:"234|",tree:"pow{[N2]^[pow{[N3]^[N4]}]}"});
t("I3  EXP_END + x2 wraps a layer","2 POW 3 SQR",{line:"232|",tree:"pow{[N2]^[pow{[N3]^[N2]}]}"});
t("I4  EXP_END + x^() wraps empty layer","2 POW 3 POW",{line:"23|",tree:"pow{[N2]^[pow{[N3]^[]}]}"});
t("I5a boundary + x2 ignored","2 POW 4 LEFT SQR",{line:"2|4",tree:"pow{[N2]^[N4]}"});
t("I5b boundary + x^() nests","2 POW 4 LEFT POW",{line:"2|4",tree:"pow{[N2]^[pow{[]^[N4]}]}"});
t("I6a OUTSIDE_POWER + x2 ignored","2 POW 4 RIGHT SQR",{line:"24|",tree:"pow{[N2]^[N4]}"});
t("I6b OUTSIDE_POWER + x^() ignored","2 POW 4 RIGHT POW",{line:"24|",tree:"pow{[N2]^[N4]}"});
t("I6c OUTSIDE_POWER + x3 ignored","2 POW 4 RIGHT SHIFT SQR",{line:"24|",tree:"pow{[N2]^[N4]}"});
t("I7  parenthesised power","LPAREN 2 POW 4 RPAREN SHIFT SQR",{line:"(24)3|",tree:"pow{[([pow{[N2]^[N4]}])]^[N3]}"});
t("I8  in-exponent mid-number + x2","2 POW 1 2 3 LEFT LEFT SQR",{line:"212|23",tree:"pow{[N2]^[pow{[N1]^[N2]},N23]}"});
t("I9  top-level mid-number + x2","1 2 3 LEFT LEFT SQR",{line:"12|23",tree:"pow{[N1]^[N2]},N23"});
t("I11a negative exponent is grouped","2 POW NEG 3",{line:"2-3|",tree:"pow{[N2]^[op-,N3]}"});
t("I11b operator joins the exponent","2 POW 3 ADD 4",{line:"23+4|",tree:"pow{[N2]^[N3,op+,N4]}"});

console.log("\n--- P1: top-level mid-number + x^() (fixed in Phase 2) ---");
t("I10a top-level 1|23 + x^() splits","1 2 3 LEFT LEFT POW",
  {line:"1|23",tree:"pow{[N1]^[N23]}"});
t("I10b top-level 123|456 + x^() splits","1 2 3 4 5 6 LEFT LEFT LEFT POW",
  {line:"123|456",tree:"pow{[N123]^[N456]}"});

console.log("\n--- D. delete (doc 3.2) ---");
t("D1  2^(3|) DEL -> 2^box","2 POW 3 DEL",{line:"2|",tree:"pow{[N2]^[]}"});
t("D2  2^(|) DEL -> 2","2 POW DEL",{line:"2|",tree:"N2"});
t("D3  2^(|3) DEL -> 2|3","2 POW 3 LEFT DEL",{line:"2|3",tree:"N2,N3"});
t("D4  123^(|45) DEL -> 123|45","1 2 3 POW 4 5 LEFT LEFT DEL",{line:"123|45",tree:"N123,N45"});
t("D5  123^(|45^67) DEL -> 123|45^67","1 2 3 POW 4 5 POW 6 7 LEFT LEFT LEFT LEFT LEFT DEL",
  {line:"123|4567",tree:"N123,pow{[N45]^[N67]}"});
t("D6  123^(|^45) DEL -> 123|^45","1 2 3 POW POW 4 5 LEFT LEFT DEL",
  {line:"123|45",tree:"pow{[N123]^[N45]}"});
t("D7  2^| (exp empty) DEL -> 2","RIGHT RIGHT DEL",{line:"2|",tree:"N2"},{pre:[P([NT(2)],[])]});
/* D8: the base side of the boundary (base@end) keeps its own stop one press
   left of the exponent side, and DEL there acts on the exponent, not the base. */
t("D8  2^|3 (base side) DEL -> 2^box","2 POW 3 LEFT LEFT DEL",{line:"2|",tree:"pow{[N2]^[]}"});
t("D9  template right edge DEL","FRAC 1 2 DOWN 3 4 RIGHT DEL",{line:"(12)/(3|)",tree:"frac{[N12]/[N3]}"});
t("D10 integral lower-slot start DEL","INTG XKEY DOWN DEL",{tree:"intg{lo[],up[],body[]}"});
t("D11 integral integrand start DEL","INTG XKEY DEL DEL",{line:"|",tree:""});
/* D12-D15: DEL at the end of a nested tower must remove ONE digit of the deepest
   level, not the whole inner subtree (2^3^4| -> 2^□ was the reported bug). */
t("D12 2^3^4 outside DEL -> 2^(3^(box))","2 POW 3 POW 4 RIGHT DEL",
  {line:"23|",tree:"pow{[N2]^[pow{[N3]^[]}]}"});
t("D13 2^3^4 deepest end DEL -> 2^(3^(box))","2 POW 3 POW 4 DEL",
  {line:"23|",tree:"pow{[N2]^[pow{[N3]^[]}]}"});
t("D14 2^3^4^5 outside DEL -> 2^(3^(4^(box)))","2 POW 3 POW 4 POW 5 RIGHT DEL",
  {line:"234|",tree:"pow{[N2]^[pow{[N3]^[pow{[N4]^[]}]}]}"});
t("D15 |2^3^4 DEL is a no-op at the start","2 POW 3 POW 4 LEFT LEFT LEFT LEFT LEFT DEL",
  {line:"|234",tree:"pow{[N2]^[pow{[N3]^[N4]}]}"});
/* D16: DEL on the base side of an inner boundary stays inside the exponent -
   it erases the exponent's last digit (same rule as D8), never the base. */
t("D16 2^3|4 (base side) DEL erases the exponent","2 POW 3 POW 4 LEFT LEFT DEL",
  {line:"23|",tree:"pow{[N2]^[pow{[N3]^[]}]}"});
/* D17: DEL on the exponent side of an inner boundary collapses that level. */
t("D17 2^3^|4 (exp side) DEL collapses one level","2 POW 3 POW 4 LEFT DEL",
  {line:"23|4",tree:"pow{[N2]^[N3,N4]}"});

console.log("\n--- N. navigation (doc 3.3) ---");
t("N2a empty exponent box: LEFT passes through","2 POW LEFT",{line:"|2\u2610",tree:"pow{[N2]^[]}"});
t("N2b empty exponent box: RIGHT passes through","2 POW RIGHT",{line:"2\u2610|",tree:"pow{[N2]^[]}"});
t("N3  top level wraps","2 POW 3 RIGHT RIGHT",{line:"|23",tree:"pow{[N2]^[N3]}"});
t("N4  UP/DOWN keep the digit offset","FRAC 1 2 DOWN 3 4 LEFT UP",{line:"(1|2)/(34)",tree:"frac{[N12]/[N34]}"});
t("N5a after answer LEFT lands at end","2 POW 3 EQUALS LEFT",{line:"23|",tree:"pow{[N2]^[N3]}"});
t("N5b after answer RIGHT lands at start","2 POW 3 EQUALS RIGHT",{line:"|23",tree:"pow{[N2]^[N3]}"});
t("N5c after answer DEL edits the end","2 POW 3 EQUALS DEL",{line:"2|",tree:"pow{[N2]^[]}"});

/* N1: each power boundary keeps exactly TWO stops - the base side (base@end,
   "2|3") and the exponent side (exp@0, "2|3") - so LEFT/RIGHT never stop three
   times at one screen position (N7) while the "step into the base" press is
   preserved. The two directions are exact mirrors and therefore have EQUAL cycle
   lengths (Phase 4 acceptance). */
console.log("\n--- N1: LEFT/RIGHT cycles (Phase 4) ---");
{
  const cycle=(keys,dir)=>{
    const {calc}=boot();
    for(const k of keys.split(" ").filter(Boolean)) calc.dispatch(k);
    const start=JSON.stringify(calc.getCursor().path)+"@"+calc.getCursor().pos;
    let n=0;
    for(;n<80;n++){
      calc.dispatch(dir);
      if(JSON.stringify(calc.getCursor().path)+"@"+calc.getCursor().pos===start) break;
    }
    return n+1;
  };
  const cases=[["2 POW 3",6,6],["2 POW 3 POW 4",8,8],["2 POW 3 POW 4 POW 5",10,10]];
  for(const [keys,wl,wr] of cases){
    const gl=cycle(keys,"LEFT"), gr=cycle(keys,"RIGHT");
    const ok=gl===wl&&gr===wr&&gl===gr;
    ok?pass++:fail++;
    console.log((ok?"ok   ":"FAIL ")+("N1 "+keys).padEnd(40)+" LEFT="+gl+" RIGHT="+gr+
      (ok?"":("   want LEFT="+wl+" RIGHT="+wr+" and LEFT=RIGHT")));
  }
}
/* N7: the direct counterpart of the user-visible complaint - walking LEFT through
   a tower must never stop three times at one screen position (the old model
   visited "2|34" three times in a row). */
console.log("\n--- N7: no screen position is visited 3x in a row ---");
{
  const {calc,screen}=boot();
  for(const k of "2 POW 3 POW 4".split(" ")) calc.dispatch(k);
  const lines=[];
  for(let i=0;i<8;i++){ calc.dispatch("LEFT"); lines.push(exprLine(screen())); }
  let worst=1, run=1;
  for(let i=1;i<lines.length;i++){
    run=(lines[i]===lines[i-1])?run+1:1;
    if(run>worst) worst=run;
  }
  const ok=worst<=2; ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"N7 longest run at one screen position".padEnd(40)+
    " max="+worst+"  ["+lines.join(" ")+"]");
}

console.log("\n--- N6: UP/DOWN are reversible in a power tower (fixed in Phase 3) ---");
/* DOWN from the start of an exponent must advance into the nested power exactly
   like RIGHT, instead of leaving the whole tower and skipping the inner slots. */
t("N6a UP then DOWN is reversible","2 POW 3 POW 4 UP UP DOWN",
  {path:'["root","exp","base"]'});
t("N6b UP UP then DOWN DOWN returns","2 POW 3 POW 4 UP UP DOWN DOWN",
  {path:'["root","exp","exp"]'});
t("N6c UP reaches the outer base, DOWN comes back","2 POW 3 POW 4 UP UP UP DOWN",
  {path:'["root","exp"]',line:"2|34"});

console.log("\n--- V. evaluation / serialization (doc 3.5) ---");
{
  const {calc,screen}=boot();
  for(const k of "2 POW 3 POW 2 EQUALS".split(" ")) calc.dispatch(k);
  const got=resultLine(screen());
  const ok=got==="512"; ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"V1  right-associative 2^3^2=512".padEnd(40)+" got="+JSON.stringify(got));
}
{
  const {calc}=boot();
  for(const k of "2 POW 3".split(" ")) calc.dispatch(k);
  const snap=JSON.stringify(calc.getExpr());
  const copy=JSON.parse(snap);
  const round=JSON.stringify(copy)===snap;
  calc.dispatch("4");                                  /* mutate the live tree */
  const independent=JSON.stringify(copy)===snap;
  const ok=round&&independent; ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"V2  expression tree is plain-object JSON".padEnd(40)+
    " roundtrip="+round+" independent="+independent+" (C1)");
}

console.log("\n--- R. render assets (source guard; R1..R4 visuals need screenshots) ---");
{
  const checks=[
    ["R1 exponent font ratio 0.70",/EXP_FONT_RATIO\s*=\s*0\.70/],
    ["R1 exponent lift step 0.80em",/EXP_STEP_EM\s*=\s*0\.80/],
    ["R2 vertical shift cap 60px",/MAX_VERTICAL_SHIFT\s*=\s*60/],
    ["R2 ensureCursorVisible present",/function ensureCursorVisible/],
    ["R4 hideCaret present",/var hideCaret\s*=\s*false/]
  ];
  for(const [label,re] of checks){
    const ok=re.test(pageSrc); ok?pass++:fail++;
    console.log((ok?"ok   ":"FAIL ")+label.padEnd(40));
  }
}

console.log("\n"+pass+" passed, "+fail+" failed, "+xfail+" expected-fail");
process.exit(fail?1:0);
