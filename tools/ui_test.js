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
    keydown:(k)=>listener({key:k,preventDefault(){},metaKey:false,ctrlKey:false,altKey:false}),
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
  const map=/var KEYMAP=\{([\s\S]*?)\};/.exec(src)[1];
  const entry=(k)=>{ const m=new RegExp('"'+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'":"([A-Z0-9]+)"').exec(map); return m?m[1]:null; };
  check('"^" maps to the power template', entry("^"), "POW");
  check('"/" maps to the fraction template', entry("/"), "FRAC");
  check('"!" maps to the reciprocal', entry("!"), "INV");
  check("dispatch knows the POW key", /case "POW":/.test(src), true);
}
{
  /* drive the real keydown listener so the mapping is exercised end to end */
  const {calc,keydown}=bootWithKeyboard();
  ["2","^","3"].forEach(k=>keydown(k));
  calc.dispatch("EQUALS");
  check("^ types a power and it evaluates", calc.evalExpr(), 8);
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
     their children (it used to leave the exponent centred on the right) */
  check("exponent uses an offset, not vertical-align",
    /\.sup\{[^}]*position:relative[^}]*top:-/.test(src), true);
  check("exponent is smaller than the base", /\.sup\{[^}]*font-size:\.7em/.test(src), true);
  check("nested exponents reset to the same size",
    /\.sup \.sup\{font-size:1em;\}/.test(src), true);
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
