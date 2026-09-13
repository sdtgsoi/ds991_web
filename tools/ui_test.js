#!/usr/bin/env node
/*
 * UI / rendering checks for ds991.html that the digit-level tests do not cover:
 *   - the caret disappears while an answer is shown and returns when editing
 *   - the answer line is empty while editing
 *   - the "/" keyboard shortcut inserts a fraction
 *   - SHIFT+OPTN no longer opens the constants menu
 *   - the integral puts its limits to the RIGHT of the integral sign
 *   - the log-with-base placeholder boxes (tall rectangle, solid base)
 * The DOM shim below is duplicated per file on purpose: each suite is a
 * standalone script with no dependencies.
 *
 * Usage: node tools/ui_test.js
 */
const fs=require("fs"),vm=require("vm"),path=require("path");
const pageSrc=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
class CL{constructor(){this.s=new Set();}add(...c){c.forEach(x=>this.s.add(x));}remove(...c){c.forEach(x=>this.s.delete(x));}
 contains(c){return this.s.has(c);}toggle(c,f){if(f===undefined)f=!this.s.has(c);f?this.s.add(c):this.s.delete(c);return f;}get value(){return [...this.s].join(" ");}}
class El{constructor(t){this.tagName=(t||"div").toUpperCase();this.children=[];this.style={};this._cls=new CL();this._html="";this.textContent="";this.attrs={};this.parentNode=null;}
 get classList(){return this._cls;}set className(v){this._cls=new CL();String(v||"").split(/\s+/).filter(Boolean).forEach(c=>this._cls.add(c));}get className(){return this._cls.value;}
 set innerHTML(v){this._html=String(v);}get innerHTML(){return this._html;}appendChild(c){c.parentNode=this;this.children.push(c);return c;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(){}querySelector(){return null;}querySelectorAll(){return [];}closest(){return null;}scrollIntoView(){}}
/* ---------------------------------------------------------------------------
   Minimal DOM shim. The page script is written against document.getElementById,
   createElement, appendChild, classList and innerHTML; implementing just those
   lets the real page code run under Node. The element handles are FAKE, so the
   suites assert on the HTML string the renderer produced, never on layout.
   --------------------------------------------------------------------------- */
function boot(){
  const cache={};const padMain=new El("div");cache.padMain=padMain;cache.padTop=new El("div");cache.calc=new El("div");
  const padTopCells=[];
  padMain.querySelectorAll=(s)=>/keycell/.test(s)?[]:[];
  const doc={getElementById:id=>cache[id]||(cache[id]=new El("div")),createElement:t=>new El(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},body:new El("body")};
  const ctx={console,setTimeout,clearTimeout,Math,JSON,Date,isFinite,isNaN,parseInt,parseFloat,String,Number,Array,Object,document:doc};ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(pageSrc,ctx,{filename:"p.js"});
  return {calc:ctx.__calc,screen:()=>cache.screen.innerHTML,padTop:cache.padTop};
}
/* like boot(), but also returns a function that fires the page's own keydown
   listener, so the physical-keyboard shortcuts can be exercised end to end */
function bootWithKeyboard(){
  const cache={};
  const padMain=new El("div");
  cache.padMain=padMain; cache.padTop=new El("div"); cache.calc=new El("div");
  padMain.querySelectorAll=(s)=>(/keycell/.test(s)?[]:[]);
  let listener=null;
  const doc={
    getElementById:(id)=>cache[id]||(cache[id]=new El("div")),
    createElement:(t)=>new El(t),
    querySelector:()=>null,
    querySelectorAll:()=>[],
    addEventListener:(t,f)=>{ if(t==="keydown") listener=f; },
    body:new El("body"),
  };
  const ctx={console,setTimeout,clearTimeout,Math,JSON,Date,isFinite,isNaN,parseInt,parseFloat,String,Number,Array,Object,document:doc};
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(pageSrc,ctx,{filename:"ds991-keyboard.js"});
  return {
    calc:ctx.__calc,
    /* fire the page's own keydown listener; `extra` overrides the defaults so
       tests can supply code/shiftKey/isComposing like a real browser event */
    keydown:(k,extra)=>listener(Object.assign(
      {key:k,code:"",shiftKey:false,metaKey:false,ctrlKey:false,altKey:false,
       isComposing:false,keyCode:0,preventDefault(){}}, extra||{})),
  };
}

let fail=0,pass=0;
function check(label,got,want){
  const ok=got===want; ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+label.padEnd(52)+(ok?"":"\n         got : "+JSON.stringify(got)+"\n         want: "+JSON.stringify(want)));
}
function exprLine(html){const m=/id="exprline">([\s\S]*?)$/.exec(html);return m?m[1].split('<div class="resultline"')[0]:"";}
function resultLine(html){const m=/id="resultline">([\s\S]*?)$/.exec(html);return m?m[1].split("</div></div>")[0]:"";}
const hasCaret=(h)=>/class="cursor"/.test(h);

console.log("--- item 3: caret hidden for an answer, result hidden while editing ---");
{
  const {calc,screen}=boot();
  ["2","ADD","3"].forEach(k=>calc.dispatch(k));
  check("editing: caret shown", hasCaret(exprLine(screen())), true);
  check("editing: result line empty", resultLine(screen()).trim(), "");
  calc.dispatch("EQUALS");
  check("after =: caret hidden", hasCaret(exprLine(screen())), false);
  check("after =: answer shown", /5/.test(resultLine(screen())), true);
  calc.dispatch("4");
  check("typing again: caret returns", hasCaret(exprLine(screen())), true);
  check("typing again: result line cleared", resultLine(screen()).trim(), "");
}
{
  const {calc,screen}=boot();
  ["FRAC","1","DOWN","2","RIGHT","EQUALS"].forEach(k=>calc.dispatch(k));
  check("answer for a fraction: caret hidden", hasCaret(exprLine(screen())), false);
  check("answer for a fraction: fraction shown", /frac/.test(resultLine(screen())), true);
}

console.log("\n--- DEL just outside the integral acts on its last region ---");
{
  /* the caret can sit immediately right of the whole integral; DEL there must
     behave exactly like DEL at the end of the last region (the upper limit) */
  const {calc}=boot();
  ["INTG","1","RIGHT","2","RIGHT","3","RIGHT"].forEach(k=>calc.dispatch(k));
  check("caret is outside the integral", JSON.stringify(calc.getCursor().path), '["root"]');
  calc.dispatch("DEL");
  check("DEL outside removes the upper limit's last digit",
    String(calc.getExpr()[0].upper.length), "0");
  check("the rest of the integral is untouched",
    calc.getExpr()[0].lower.map(n=>n.v).join("")+"/"+calc.getExpr()[0].body.map(n=>n.v).join(""), "2/1");
  /* a second DEL from outside must continue into the integral (the upper limit
     is now empty, so this one reaches back to the lower limit) */
  calc.dispatch("DEL");
  check("a second DEL outside reaches the next region",
    String(calc.getExpr()[0].lower.length), "0");
  check("the integrand still survives",
    calc.getExpr()[0].body.map(n=>n.v).join(""), "1");
}

console.log("\n--- leaving the answer view to edit ---");
{
  /* While an answer is shown the caret is hidden. DEL and the arrow keys are
     editing keys, so they must first come back to the editing view - otherwise
     they modify the expression behind a frozen answer and appear to do
     nothing. The expression itself must survive. */
  const {calc,screen}=boot();
  ["2","ADD","3","EQUALS"].forEach(k=>calc.dispatch(k));
  check("answer shown, caret hidden", hasCaret(exprLine(screen())), false);
  calc.dispatch("DEL");
  check("DEL returns to editing (caret back)", hasCaret(exprLine(screen())), true);
  check("DEL clears the answer line", resultLine(screen()).trim(), "");
  check("DEL removed one character", calc.getExpr().map(n=>n.v||n.t).join(""), "2+");

  /* after an answer the caret comes back at the END of the expression, whatever
     position it happened to be left in before "=" */
  const e=boot();
  ["1","2","3","LEFT","LEFT","EQUALS"].forEach(k=>e.calc.dispatch(k));
  check("caret parked mid-expression before =", e.calc.getCursor().pos, 1);
  e.calc.dispatch("DEL");
  check("DEL after an answer removes the LAST character",
    e.calc.getExpr().map(n=>n.v||n.t).join(""), "12");

  const b=boot();
  ["2","ADD","3","EQUALS"].forEach(k=>b.calc.dispatch(k));
  b.calc.dispatch("LEFT");
  check("LEFT returns to editing", hasCaret(exprLine(b.screen())), true);
  check("LEFT keeps the whole expression", b.calc.getExpr().map(n=>n.v||n.t).join(""), "2+3");

  /* LEFT/RIGHT place the caret explicitly after an answer (the hidden caret's
     position is meaningless), and the two ends are joined so a further press at
     an end wraps round */
  const nav=(keys)=>{ const {calc}=boot(); keys.split(" ").forEach(k=>calc.dispatch(k)); return calc; };
  check("answer then LEFT -> end",
    nav("1 2 3 EQUALS LEFT").getCursor().pos, 3);
  check("answer then RIGHT -> start",
    nav("1 2 3 EQUALS RIGHT").getCursor().pos, 0);
  check("answer from the very end, RIGHT -> start",
    nav("1 2 3 EQUALS RIGHT").getCursor().pos, 0);
  check("answer, LEFT/RIGHT from the end place at end/start",
    nav("1 2 3 EQUALS LEFT").getCursor().pos+"|"+nav("1 2 3 EQUALS RIGHT").getCursor().pos, "3|0");
  /* the two ends of the expression are joined, at any time (not just after an
     answer): stepping past an end lands on the opposite one */
  check("editing: LEFT at the start wraps to the end",
    nav("1 2 3 LEFT LEFT LEFT LEFT").getCursor().pos, 3);
  check("editing: RIGHT at the end wraps to the start",
    nav("1 2 3 RIGHT").getCursor().pos, 0);
  /* LEFT LEFT LEFT reaches the start; one more wraps round to the end */
  check("editing: LEFT at the start wraps to the end",
    nav("1 2 3 LEFT LEFT LEFT LEFT").getCursor().pos, 3);
  /* wrapping is a top-level rule: inside a template slot the caret stays there */
  check("no wrap inside a template slot",
    nav("FRAC 1 LEFT").getCursor().path.join(","), "root,num");

  /* the same for an integral: DEL just past the integral edits its last region */
  const c=boot();
  ["INTG","0","RIGHT","1","RIGHT","XKEY","EQUALS"].forEach(k=>c.calc.dispatch(k));
  check("integral answer shown, caret hidden", hasCaret(exprLine(c.screen())), false);
  c.calc.dispatch("DEL");
  check("DEL after the integral edits it, caret back", hasCaret(exprLine(c.screen())), true);
  check("DEL after the integral removed the upper limit",
    String(c.calc.getExpr()[0].upper.length), "0");
}

console.log("\n--- physical keyboard shortcuts ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const table=(()=>{ const m=/var KEYMAP=\{([\s\S]*?)\};/.exec(src); return m?m[1]:""; })();
  const entry=(k)=>{ const m=new RegExp('"'+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'":"([A-Za-z0-9]+)"').exec(table); return m?m[1]:null; };
  check('"^" maps to the power template', entry("^"), "POW");
  check('"/" maps to the fraction template', entry("/"), "FRAC");
  check('"!" maps to the reciprocal', entry("!"), "INV");
  check('"s" maps to SHIFT', entry("s"), "SHIFT");
  check("the physical Shift key is NOT a shortcut", /"Shift":/.test(table), false);
  check("there is no separate code table", /var KEYCODE=/.test(src), false);
  check("dispatch knows the POW key", /case "POW":/.test(src), true);
}
{
  /* drive the real keydown listener so the mapping is exercised end to end */
  const {calc,keydown}=bootWithKeyboard();
  keydown("2"); keydown("^"); keydown("3");
  calc.dispatch("EQUALS");
  check("^ types a power and it evaluates", calc.evalExpr(), 8);
}
{
  /* the physical Shift key must not do anything by itself */
  const {calc,keydown}=bootWithKeyboard();
  keydown("Shift",{code:"ShiftLeft"});
  check("pressing Shift alone is ignored", calc.S.shift, false);
  check("pressing Shift alone types nothing",
    JSON.stringify(calc.getExpr().map(n=>n.v||n.t)), "[]");
}
{
  /* the sticky SHIFT key still drives the shifted functions */
  const {calc,keydown}=bootWithKeyboard();
  keydown("2"); keydown("s");
  check("s arms SHIFT", calc.S.shift, true);
  /* `s` arms SHIFT, and SHIFT+"x^" is the n-th root template, so a bare "^"
     after "s" reaches the ROOT template (the power comes from "^" alone).
     A template lands beside its base in the expression, so look for it there
     rather than assuming it is the first token. */
  const kinds=(c)=>c.getExpr().map(n=>n.t);
  keydown("^");
  check("s then ^ reaches the shifted (n-th root) template",
    kinds(calc).indexOf("root")>=0, true);

  /* without SHIFT, "^" is the power template, and it absorbs the base */
  const p2=bootWithKeyboard();
  p2.keydown("2"); p2.keydown("^");
  check("^ alone reaches the power template",
    kinds(p2.calc).indexOf("pow")>=0, true);
  check("...and absorbs the 2 as its base",
    p2.calc.getExpr().filter(n=>n.t==="pow")[0].base.map(n=>n.v).join(""), "2");
}
{
  /* digits/operators still work through the character table */
  const {calc,keydown}=bootWithKeyboard();
  ["1","2",",","3"].forEach(k=>keydown(k));
  check("digits and a comma (decimal point) type through", calc.getExpr().map(n=>n.v).join(""), "12.3");
}
{
  /* keys typed mid-composition belong to the IME, not the calculator */
  const {calc,keydown}=bootWithKeyboard();
  keydown("m",{code:"KeyM",isComposing:true});
  check("a composing key is ignored", calc.S.menu, null);
  keydown("m",{code:"KeyM",keyCode:229});
  check("keyCode 229 (IME) is ignored", calc.S.menu, null);
  keydown("m",{code:"KeyM"});
  check("a plain key still works", calc.S.menu?calc.S.menu.type:null, "MAIN");
}

console.log("\n--- item 4: the \"/\" key is a fraction, not a division ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const m=/"\/":"([A-Z]+)"/.exec(src);
  check('KEYMAP["/"] maps to FRAC', m?m[1]:"(missing)", "FRAC");
}

console.log("\n--- item 6: SHIFT+OPTN no longer opens constants ---");
{
  const {calc}=boot();
  calc.dispatch("SHIFT"); calc.dispatch("OPTN");
  check("SHIFT+OPTN opens OPTN, not CONST", calc.S.menu?calc.S.menu.type:"(none)", "OPTN");
}
{
  const {calc}=boot();
  calc.dispatch("AC");
  calc.dispatch("OPTN");
  check("plain OPTN still opens OPTN", calc.S.menu?calc.S.menu.type:"(none)", "OPTN");
}

console.log("\n--- item 1: integral limits sit to the right of the sign ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const m=/case "intg": return '([\s\S]*?)';\n/.exec(src);
  const tpl=m?m[1]:"";
  const iSym=tpl.indexOf('\\u222b'), iLim=tpl.indexOf('class="lim');
  check("integral symbol comes before the limits", (iSym>=0&&iLim>=0&&iSym<iLim), true);
  check("limits hug the top and bottom of the sign", /class="lim tall"/.test(tpl), true);
  /* the tall limits must overflow their container symmetrically instead of
     stretching the line box (that is what used to push the integral off screen) */
  check("limits do not stretch the line box",
    !/\.bigop:has\(>\.lim\.tall\)\{[^}]*min-height/.test(src), true);
}

console.log("\n--- integral navigation order: integrand, then the bounds ---");
{
  /* the integrand is the integral's leftmost slot, so RIGHT at its end enters
     the lower bound (and the bounds are written after the integrand) */
  const {calc}=boot();
  ["INTG","XKEY","SQR","RIGHT"].forEach(k=>calc.dispatch(k));
  check("RIGHT at the end of the integrand -> lower bound",
    JSON.stringify(calc.getCursor().path), '["root","lower"]');
  calc.dispatch("0"); calc.dispatch("RIGHT");
  check("RIGHT from the lower bound -> upper bound",
    JSON.stringify(calc.getCursor().path), '["root","upper"]');
  calc.dispatch("1"); calc.dispatch("RIGHT");
  check("RIGHT from the upper bound leaves the integral",
    JSON.stringify(calc.getCursor().path), '["root"]');
  const {calc:calc2}=boot();
  calc2.dispatch("INTG");
  check("INTG lands in the integrand", JSON.stringify(calc2.getCursor().path), '["root","body"]');

  /* LEFT onto a template enters its LAST slot (upper limit for an integral),
     rather than an offset in the middle of its digit span */
  const {calc:calc3}=boot();
  ["INTG","0","RIGHT","1","RIGHT","XKEY","RIGHT"].forEach(k=>calc3.dispatch(k));
  check("caret is past the integral", JSON.stringify(calc3.getCursor().path), '["root"]');
  calc3.dispatch("LEFT");
  check("LEFT from past the integral -> UPPER bound",
    JSON.stringify(calc3.getCursor().path), '["root","upper"]');
  calc3.dispatch("LEFT");
  check("LEFT again -> a digit back in the upper bound",
    JSON.stringify(calc3.getCursor().path)+"|"+calc3.getCursor().pos, '["root","upper"]|0');
}

console.log("\n--- integral DEL walks the regions ---");
{
  const seq=(keys)=>{ const {calc}=boot(); keys.split(" ").forEach(k=>calc.dispatch(k)); return calc; };
  /* bounds filled, integrand empty */
  const a=seq("INTG RIGHT 0 RIGHT 1 UP UP DEL");
  check("DEL at the left edge of the empty integrand removes the integral",
    a.getExpr().length, 0);
  /* UP from the upper bound lands at the END of the lower bound, so this DEL
     just removes that digit */
  const b=seq("INTG RIGHT 0 RIGHT 1 UP DEL");
  check("DEL inside the lower bound eats its own digit",
    b.getExpr()[0].lower.length, 0);
  /* At the left edge of the UPPER bound, DEL reaches back into the region that
     precedes it in the caret order, which is the lower bound. (From the lower
     bound the previous region is the integrand, so an empty integrand there
     means the template goes instead.) */
  const b2=seq("INTG RIGHT 0 RIGHT 1 LEFT DEL");
  check("DEL at the left edge of the upper bound reaches the lower bound",
    b2.getExpr()[0].lower.length, 0);
  /* previous region is the (empty) integrand -> nothing left to erase, so the
     template is dropped */
  const b3=seq("INTG RIGHT 0 RIGHT 1 UP LEFT DEL");
  check("no region left of the lower bound -> template dropped",
    b3.getExpr().length, 0);
  const c=seq("INTG RIGHT 0 RIGHT 1 DEL");
  check("DEL inside the upper bound eats its own digit",
    c.getExpr()[0].upper.length, 0);
  const d=seq("INTG 1 RIGHT 2 RIGHT 3 UP UP DEL");
  check("DEL after walking back to the integrand empties it",
    d.getExpr()[0].body.length, 0);
  /* typing "55" then DEL must leave "5" - DEL edits, it does not tear the
     template apart unless the caret is at the template's left edge */
  const e=seq("INTG 5 5 DEL");
  check("DEL mid-integrand only edits that region",
    e.getExpr()[0].body.map(n=>n.v).join(""), "5");
  /* "INTG 5 DEL" empties the integrand, so the template is then untouched and
     the next DEL drops it */
  const f=seq("INTG 5 DEL DEL");
  check("DEL at the left edge of an emptied integrand removes the integral",
    f.getExpr().length, 0);
}

console.log("\n--- integral layout and evaluation ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const tpl=/case "intg": return '([\s\S]*?)';\n/.exec(src)[1];
  /* document order is navigation order (integrand first); the limits are then
     placed beside the sign with CSS so the printed result still reads
     "sign, bounds, integrand" */
  check("sign and bounds are printed before the integrand",
    tpl.indexOf('class="sym"')<tpl.indexOf('class="lim tall"')
    && tpl.indexOf('class="lim tall"')<tpl.indexOf("slotOrBox(n.body)"), true);
  const lim=tpl.slice(tpl.indexOf('class="lim tall"'));
  check("bounds print upper above lower",
    lim.indexOf("slotOrBox(n.upper)")<lim.indexOf("slotOrBox(n.lower)"), true);
  check("limits sit beside the sign, not in the text flow",
    /\.bigop\.intgb>\.lim\.tall\{position:absolute/.test(src), true);
}
{
  /* the integral evaluates correctly in both typing orders */
  const evals=[
    ["INTG XKEY SQR RIGHT 0 RIGHT 1","1/3"],
    ["INTG 1 RIGHT 0 RIGHT 1","1"],
    ["INTG XKEY RIGHT 0 RIGHT 2","2"],
  ];
  for(const [keys,want] of evals){
    const {calc}=boot();
    for(const k of keys.split(" ")) calc.dispatch(k);
    let got;
    try{ got=String(formatNum(calc.evalExpr())); }catch(e){ got="ERR"; }
    const ok = want==="1/3" ? Math.abs(parseFloat(got)-1/3)<1e-6 : got===want;
    ok?pass++:fail++;
    console.log((ok?"ok   ":"FAIL ")+("integral "+keys).padEnd(52)+" = "+got+(ok?"":" want "+want));
  }
}
function formatNum(v){ return (typeof v==="number")?(Math.abs(v-Math.round(v))<1e-9?String(Math.round(v)):String(v)):String(v); }

console.log("\n--- integral DEL rules ---");
{
  const {calc}=boot();
  ["INTG","DEL"].forEach(k=>calc.dispatch(k));
  check("empty integral: DEL removes it", calc.getExpr().length, 0);

  const b=boot();
  ["INTG","1","2","LEFT","LEFT","DEL"].forEach(k=>b.calc.dispatch(k));
  check("DEL at the left edge of the integrand pulls it out",
    b.calc.getExpr().map(n=>n.t==="num"?n.v:n.t).join(""), "12");

  const c2=boot();
  ["INTG","1","2","DEL"].forEach(k=>c2.calc.dispatch(k));
  check("DEL elsewhere in the integrand just edits it",
    c2.calc.getExpr()[0].body.map(n=>n.v).join(""), "1");
}

console.log("\n--- exponent rendering and DEL ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  /* the exponent is raised with a relative offset, NOT vertical-align: the
     surrounding .math boxes are inline-flex, so vertical-align is ignored on
     their children (it used to leave the exponent centred on the right).
     Every exponent renders at ONE size whatever its depth - spec section 7:
     only the position moves up and to the right. */
  /* the lift is emitted per level by renderExponent (spec step 6: no constant
     `top` in the CSS, and no `.sup .sup` nesting rule either) */
  /* the lift is a CONSTANT step, not depth*step: a .sup sits inside its parent
     .sup, so the offsets already accumulate and multiplying by the depth made
     the gaps grow (13.6 / 18.3 / 22.8 px instead of an even step) */
  check("the exponent lift is computed by the renderer",
    /function expStyle/.test(src) && /ctx\.rootFont\*EXP_STEP_EM/.test(src), true);
  check("the lift is one constant step, not scaled by depth",
    /EXP_STEP_EM\*\(ctx\.powerDepth/.test(src), false);
  check("nothing animates the expression offset",
    /\.exprline\{[^}]*transition/.test(src), false);
  check("the exponent size is decided by the renderer",
    /function expCtx/.test(src) && /fontMode:"EXPONENT"/.test(src), true);
  check("no constant top offset in the .sup rule",
    /\.sup\{[^}]*position:relative;\}/.test(src), true);
  check("no CSS nesting hack for the exponent size", /\.sup \.sup/.test(src), false);
  check("no depth-scaled exponent font", /power-depth-/.test(src), false);
}
{
  /* the exponent box must go when DEL is pressed with an empty exponent */
  const {calc}=boot();
  ["2","POW"].forEach(k=>calc.dispatch(k));
  calc.dispatch("DEL");
  check("DEL with an empty exponent removes the power wrapper",
    JSON.stringify(calc.getExpr().map(n=>n.t)), '["num"]');
  check("the base survives", calc.getExpr()[0].v, "2");

  const b=boot();
  ["2","POW","3","DEL"].forEach(k=>b.calc.dispatch(k));
  check("first DEL clears the exponent digit",
    JSON.stringify(b.calc.getExpr()[0].exp.length), "0");
  b.calc.dispatch("DEL");
  check("second DEL removes the wrapper too",
    JSON.stringify(b.calc.getExpr().map(n=>n.t)), '["num"]');

  const c=boot();
  ["2","POW","3","4","DEL","DEL","DEL"].forEach(k=>c.calc.dispatch(k));
  check("multi-digit exponent: digits first, then the wrapper",
    JSON.stringify(c.calc.getExpr().map(n=>n.t)), '["num"]');
}

console.log("\n--- power keys: the four contexts of the spec ---");
{
  const shape=(c)=>{ const f=(n)=>{ if(!n) return "?"; const a=x=>"["+x.map(f).join("")+"]";
      if(n.t==="num") return n.v; if(n.t==="pow") return "("+a(n.base)+"^"+a(n.exp)+")";
      if(n.t==="paren") return "("+a(n.body)+")"; return n.t; };
    return c.getExpr().map(f).join(""); };
  const run=(keys)=>{ const c=boot().calc; keys.forEach(k=>c.dispatch(k)); return c; };
  const val=(keys)=>{ const c=run(keys); try{ return c.evalExpr(); }catch(e){ return "Syntax ERROR"; } };
  const SRC=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");

  /* --- basics ------------------------------------------------------------- */
  check("2 x^2 = 4", val(["2","SQR"]), 4);
  check("2 x^3 = 8", val(["2","SHIFT","SQR"]), 8);
  check("2 x^() opens an exponent", shape(run(["2","POW"])), "([2]^[])");
  check("(1+1) x^2 = 4 (manual p.14)", val(["LPAREN","1","ADD","1","RPAREN","SQR"]), 4);
  check("2 x^2 + 3 x^2 = 13", val(["2","SQR","ADD","3","SQR"]), 13);

  /* --- A: outside a power, at its trailing edge -> every key ignored ------- */
  for(const key of [["SQR"],["SHIFT","SQR"],["POW"]]){
    const c=run(["2","POW","4","RIGHT"]);      /* leave the exponent: 2^4| */
    check("A: caret is outside the power", c.getCursor().slot, null);
    const before=shape(c);
    key.forEach(k=>c.dispatch(k));
    check("A: "+key.join("+")+" ignored right of a power", shape(c), before);
  }
  /* a parenthesised power is NOT a power context: NORMAL applies */
  check("A/paren: (2^4)| + x^3 -> (2^4)^3",
    shape(run(["LPAREN","2","POW","4","RPAREN","SHIFT","SQR"])), "([([([2]^[4])])]^[3])");

  /* --- B: at the END of an exponent --------------------------------------- */
  /* 2^(4|) + x^3 raises what is inside that exponent */
  check("B: 2^(4|) + x^2", shape(run(["2","POW","4","SQR"])), "([2]^[([4]^[2])])");
  check("B: 2^(4|) + x^3", shape(run(["2","POW","4","SHIFT","SQR"])), "([2]^[([4]^[3])])");
  check("B: 2^(4|) + x^() leaves a square",
    shape(run(["2","POW","4","POW"])), "([2]^[([4]^[])])");
  check("B: ...and the caret enters that square", run(["2","POW","4","POW"]).getCursor().slot, "exp");

  /* --- C: between a base and its exponent (2|^4) -------------------------- */
  const CB=["2","POW","4","LEFT","LEFT"];          /* caret at base@1 = "2|^4" */
  check("C: caret sits at the base/exponent boundary",
    (()=>{ const c=run(CB); return c.getCursor().slot+"@"+c.getCursor().pos; })(), "base@1");
  for(const key of [["SQR"],["SHIFT","SQR"]]){
    const c=run(CB);
    const before=shape(c);
    key.forEach(k=>c.dispatch(k));
    check("C: "+key.join("+")+" ignored between base and exponent", shape(c), before);
  }
  check("C: x^() gives 2^(square^4)",
    shape(run(CB.concat(["POW"]))), "([2]^[([]^[4])])");
  check("C: the caret enters that square", run(CB.concat(["POW"])).getCursor().slot, "base");
  check("C: typing then fills it",
    shape(run(CB.concat(["POW","5"]))), "([2]^[([5]^[4])])");

  /* --- D: inside a number ------------------------------------------------ */
  /* the number is cut at the caret: left -> base, right -> exponent/stays */
  check("D: 2^(3|4) + x^2", shape(run(["2","POW","3","4","LEFT","SQR"])), "([2]^[([3]^[2])4])");
  check("D: 2^(3|4) + x^3", shape(run(["2","POW","3","4","LEFT","SHIFT","SQR"])), "([2]^[([3]^[3])4])");
  check("D: 2^(3|4) + x^() puts the right part in the exponent",
    shape(run(["2","POW","3","4","LEFT","POW"])), "([2]^[([3]^[4])])");
  check("D: multi-digit, cut at the caret offset",
    shape(run(["2","POW","1","2","3","4","5","6","LEFT","LEFT","SQR"])),
    "([2]^[([1234]^[2])56])");
  /* NORMAL position: a number the caret sits inside is split too */
  check("a caret inside a number raises only its left part",
    shape(run(["1","2","LEFT","SQR"])), "([1]^[2])2");

  /* --- DEL never reaches from an exponent into the base ------------------- */
  check("DEL on an empty exponent drops the box, keeps the base",
    shape(run(["2","5","POW","DEL"])), "25");
  check("...and the next DEL then erases the base",
    shape(run(["2","5","POW","DEL","DEL"])), "2");
  check("DEL inside an exponent erases its own digit",
    shape(run(["2","POW","3","DEL"])), "([2]^[])");
  check("...then drops the box",
    shape(run(["2","POW","3","DEL","DEL"])), "2");
  /* DEL at the base/exponent boundary acts on the EXPONENT, never the base:
     it erases the exponent's last digit, and only then does the next DEL reach
     the base */
  check("DEL at the base/exponent boundary erases the exponent",
    shape(run(["2","POW","4","LEFT","DEL"])), "24");
  /* the next DEL drops the now-empty box, leaving "2" beside the merged "4" */
  /* 2^4 with the caret at the exponent's start merges to "24", caret just
     right of the base's last token (2); the next DEL erases at that spot */
  check("...and the next DEL erases the merged digit to its left",
    shape(run(["2","POW","4","LEFT","DEL","DEL"])), "4");
  /* the bug was that DEL ate the base's last digit ("123^" -> "12"): the base
     must come through completely intact */
  check("a multi-digit base is untouched by DEL on an empty exponent",
    shape(run(["1","2","3","POW","DEL"])), "123");

  /* DEL from the base's right edge with an exponent present acts on the
     exponent, not the base */
  check("DEL at the base's right edge erases the exponent's last digit",
    shape(run(["2","POW","4","3","LEFT","LEFT","DEL"])), "243");
  check("...and the next DEL erases the digit left of that spot",
    shape(run(["2","POW","4","3","LEFT","LEFT","DEL","DEL"])), "43");
  check("a multi-digit base is never touched from the exponent side",
    shape(run(["2","5","POW","LEFT","DEL"])), "([25]^[])");

  /* --- an empty exponent box does not swallow the caret ------------------- */
  check("LEFT from an empty exponent leaves the power",
    (function(){ const c=run(["2","POW","LEFT"]); return c.getCursor().depth; })(), 1);
  check("LEFT from an empty exponent lands just before the power",
    (function(){ const c=run(["2","POW","LEFT"]); return String(c.getCursor().slot)+"@"+c.getCursor().pos; })(),
    "null@0");
  check("RIGHT then steps back into the base, not the empty box",
    (function(){ const c=run(["2","POW","LEFT","RIGHT"]); return c.getCursor().slot+"@"+c.getCursor().pos; })(),
    "base@1");

  /* --- DEL at the START of an exponent box: drop that level --------------- */
  /* the bracket goes away and its contents are appended to the base */
  /* Walk LEFT until the caret sits at offset 0 of the OUTERMOST exponent box
     (the shallowest exponent frame - an expression can nest several). */
  const atExpStart=(keys)=>{
    const c=run(keys);
    /* keep walking LEFT while the caret is inside a nested exponent, then stop
       at the first exponent frame of the outermost power */
    for(let i=0;i<14;i++){
      const g=c.getCursor();
      if(g.slot==="exp" && g.pos===0 && g.depth<=2) break;
      c.dispatch("LEFT");
    }
    c.dispatch("DEL");
    return c;
  };
  check("123^(|456) + DEL -> 123456",
    shape(atExpStart(["1","2","3","POW","4","5","6"])), "123456");
  check("123^(|) + DEL -> 123",
    shape(atExpStart(["1","2","3","POW"])), "123");
  /* 123^(45^67): the exponent holds the power 45^67, which lands after the base */
  check("123^(|45^67) + DEL -> 12345^67",
    shape(atExpStart(["1","2","3","POW","4","5","POW","6","7"])), "123([45]^[67])");
  /* 123^(^45): the exponent is an empty base raised to 45, so the base becomes
     empty and 45 stays as this power's exponent -> 123^45 */
  /* 123^(^45): the exponent holds the power []^45, a level with nothing on its
     own base side, so DEL LIFTS that exponent one level down - the inner 45
     becomes 123's exponent */
  check("123^(|^45) + DEL -> 123^45",
    shape(atExpStart(["1","2","3","POW","POW","4","5"])), "([123]^[45])");
  /* nothing typed is ever lost by the merge */
  /* nothing typed is lost: the merged "123456" is one number again */
  check("the merged content is one number",
    shape(atExpStart(["1","2","3","POW","4","5","6"])), "123456");

  /* --- renderer: one exponent size, position only ------------------------- */
  check("exponent lift comes from the render context",
    /expStyle\(expCtx\(ctx\)\)/.test(SRC), true);
  check("every exponent renders at one size",
    /\.sup\{[^}]*font-size:\.70em/.test(SRC), true);
}

console.log("\n--- item 5: log-base placeholder boxes ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  check("argument box is a tall rectangle",
    /\.logbase \.lbp>\.box\{[^}]*height:1\.5em/.test(src), true);
  check("base box is solid",
    /\.logbase \.sub>\.box\{[^}]*background:var\(--lcd-ink\)/.test(src), true);
}

console.log("\n--- item 2: top keys are silver circles with the name above ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const rk=/\.key\.roundk\{([\s\S]*?)\}/.exec(src);
  check("top key is a circle", !!(rk && /border-radius:50%/.test(rk[1])), true);
  check("top key is silver", !!(rk && /radial-gradient/.test(rk[1]) && /#fdfdfd/.test(rk[1])), true);
  const menu=/id:"MENU"[^}]*\}/.exec(src);
  check("MENU carries 菜单 + yellow 设置", !!(menu && /\\u83dc\\u5355/.test(menu[0]) && /shift:"\\u8bbe\\u7f6e"/.test(menu[0])), true);
  /* The SETTINGS label lives on a .roundk key, so it must beat the
     .key.roundk .sl { color:#e8eaec } white rule on specificity — that rule is
     0,3,0 while .key .sl is only 0,2,0, which is why a plain .key .sl rule was
     silently ignored. Guard the dedicated rule explicitly. */
  check("设置 has its own higher-specificity yellow rule",
    /\.key\.roundk \.sl\.right\{color:var\(--shift\)/.test(src), true);
  check("menu names have breathing room",
    /\.key\.roundk \.sl\.right\{right:0;\}/.test(src) && /\.key\.roundk \.sl\.left\{left:0;\}/.test(src), true);
  const on=/id:"ON"[^}]*\}/.exec(src);
  check("ON is labelled 开机 above", !!(on && /label:"\\u5f00\\u673a"/.test(on[0])), true);
  check("top-key name is not SHIFT-yellow", /\.key\.roundk \.sl\{[^}]*color:#e8eaec/.test(src), true);
}

console.log("\n--- OPTN no longer advertises VAR ---");
{
  const src=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8");
  const optn=/id:"OPTN"[^}]*\}/.exec(src);
  check("OPTN has no VAR shift label", !!(optn && !/VAR/.test(optn[0])), true);
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
