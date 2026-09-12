#!/usr/bin/env node
/*
 * Cursor model checks for ds991.html:
 *   - LEFT/RIGHT move ONE digit inside a multi-digit number
 *   - UP/DOWN keep the digit offset when moving between fraction slots
 *   - DEL removes the single digit immediately left of the caret
 *   - a fraction's order is: left of fraction -> numerator -> denominator -> right
 * The DOM shim below is duplicated per file on purpose: each suite is a
 * standalone script with no dependencies.
 *
 * Usage: node tools/cursor_test.js
 */
const fs=require("fs"),vm=require("vm"),path=require("path");
const {renderText}=require("./render_text.js");
const pageSrc=fs.readFileSync(path.join(__dirname,"..","ds991.html"),"utf8").match(/<script>([\s\S]*?)<\/script>/)[1];
/* ---------------------------------------------------------------------------
   Minimal DOM shim. The page script is written against document.getElementById,
   createElement, appendChild, classList and innerHTML; implementing just those
   lets the real page code run under Node. Element handles are FAKE, so tests
   assert on the HTML string the renderer produced, not on layout.
   --------------------------------------------------------------------------- */
class CL{constructor(){this.s=new Set();}add(...c){c.forEach(x=>this.s.add(x));}remove(...c){c.forEach(x=>this.s.delete(x));}
 contains(c){return this.s.has(c);}toggle(c,f){if(f===undefined)f=!this.s.has(c);f?this.s.add(c):this.s.delete(c);return f;}get value(){return [...this.s].join(" ");}}
class El{constructor(t){this.tagName=(t||"div").toUpperCase();this.children=[];this.style={};this._cls=new CL();this._html="";this.textContent="";this.attrs={};this.parentNode=null;}
 get classList(){return this._cls;}set className(v){this._cls=new CL();String(v||"").split(/\s+/).filter(Boolean).forEach(c=>this._cls.add(c));}get className(){return this._cls.value;}
 set innerHTML(v){this._html=String(v);}get innerHTML(){return this._html;}appendChild(c){c.parentNode=this;this.children.push(c);return c;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(){}querySelector(){return null;}querySelectorAll(){return [];}closest(){return null;}scrollIntoView(){}}
function boot(){
  const cache={};const padMain=new El("div");cache.padMain=padMain;cache.padTop=new El("div");cache.calc=new El("div");
  padMain.querySelectorAll=(s)=>/keycell/.test(s)?[]:[];
  const doc={getElementById:id=>cache[id]||(cache[id]=new El("div")),createElement:t=>new El(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},body:new El("body")};
  const ctx={console,setTimeout,clearTimeout,Math,JSON,Date,isFinite,isNaN,parseInt,parseFloat,String,Number,Array,Object,document:doc};ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(pageSrc,ctx,{filename:"p.js"});
  return {calc:ctx.__calc,screen:()=>cache.screen.innerHTML};
}
function exprLine(h){const m=/id="exprline">([\s\S]*?)$/.exec(h);return m?renderText(m[1].split('<div class="resultline"')[0]):"(?)";}
function resultLine(h){const m=/id="resultline">([\s\S]*?)$/.exec(h);return m?renderText(m[1]):"(?)";}
function brief(n){if(!n)return"?";const a=x=>"["+x.map(brief).join(",")+"]";
 if(n.t==="frac")return "frac{num:"+a(n.num)+",den:"+a(n.den)+"}";
 if(n.t==="mixed")return "mixed{whole:"+a(n.whole)+",num:"+a(n.num)+",den:"+a(n.den)+"}";
 if(n.t==="pow")return "pow{base:"+a(n.base)+",exp:"+a(n.exp)+"}";
 if(n.t==="num")return "N"+n.v; if(n.t==="op")return "op"+n.v; if(n.t==="variable")return "V"+n.name;
 return n.t;}
let fail=0,pass=0;
function t(label,keys,wantScreen,wantTree){
  const {calc,screen}=boot();
  let threw=null;
  try{ for(const k of keys.split(" ").filter(Boolean)) calc.dispatch(k); }catch(e){ threw=e.message; }
  const got=exprLine(screen());
  const tree=calc.getExpr().map(brief).join(",");
  const okS=got===wantScreen, okT=(wantTree===undefined||tree===wantTree);
  (okS&&okT&&!threw)?pass++:fail++;
  console.log(((okS&&okT&&!threw)?"ok   ":"FAIL ")+label.padEnd(42)+" line="+JSON.stringify(got).padEnd(26)+
    (threw?(" THREW "+threw):"")+((!okS||!okT)?("  want "+JSON.stringify(wantScreen)+(wantTree!==undefined?" tree="+wantTree:"")+"  got tree="+tree):""));
}
console.log("--- LEFT / RIGHT move one digit at a time ---");
t("123  LEFT          caret after 2","1 2 3 LEFT","12|3");
t("123  LEFT LEFT     caret after 1","1 2 3 LEFT LEFT","1|23");
t("123  LEFT LEFT RIGHT","1 2 3 LEFT LEFT RIGHT","12|3");
t("12   LEFT RIGHT    caret after 12","1 2 LEFT RIGHT","12|");
t("12 in numerator, LEFT LEFT","FRAC 1 2 LEFT LEFT","(|12)/(\u2610)");
t("12+34 LEFT  walks into 34","1 2 ADD 3 4 LEFT","12+3|4");

console.log("\n--- UP / DOWN keep the digit offset (DOWN enters the den, UP comes back) ---");
t("FRAC 12 DOWN 34","FRAC 1 2 DOWN 3 4","(12)/(34|)");
t("caret after 1st den digit","FRAC 1 2 DOWN 3 4 LEFT LEFT","(12)/(|34)");
t("UP moves den -> num keeping the offset","FRAC 1 2 DOWN 3 4 LEFT UP","(1|2)/(34)");
t("offset clamps to the target slot","FRAC 1 2 3 4 DOWN 5 6 UP","(12|34)/(56)");
t("mixed 2 then 3/4","SHIFT FRAC 2 DOWN 3 DOWN 4","2(3)/(4|)");
t("nested: inner -> outer numerator","FRAC FRAC 1 2 DOWN 3 4 RIGHT","((12)/(34)|)/(\u2610)");
t("UP at the numerator leaves the template #2","FRAC 1 2 UP 9","9|(12)/(☐)");
t("UP at the numerator leaves the template","FRAC 1 2 UP 9","9|(12)/(\u2610)");

console.log("\n--- DEL removes the digit immediately left of the caret ---");
t("123 DEL             -> 12","1 2 3 DEL","12|");
t("123 LEFT LEFT DEL   -> 23","1 2 3 LEFT LEFT DEL","|23");
t("123 LEFT DEL        -> 13","1 2 3 LEFT DEL","1|3");
t("12+34 LEFT LEFT DEL removes the +","1 2 ADD 3 4 LEFT LEFT DEL","12|34");
t("frac: DEL in denominator","FRAC 1 2 DOWN 3 4 DEL","(12)/(3|)");
t("frac: DEL at den start steps into num","FRAC 1 2 DOWN 3 DEL DEL","(1|)/(\u2610)");
t("caret right of fraction, DEL eats den digit","FRAC 1 2 DOWN 3 4 RIGHT DEL","(12)/(3|)");

console.log("\n--- fraction order: left -> num -> den -> right ---");
t("RIGHT num -> den","FRAC 1 2 RIGHT","(12)/(|)");
t("RIGHT den -> right of fraction","FRAC 1 2 RIGHT 3 4 RIGHT","(12)/(34)|");
/* LEFT onto a template lands in its LAST slot, then walks its digits
   right-to-left - the same rule for fractions and integrals */
t("LEFT from right of fraction -> den, at its end","FRAC 1 2 RIGHT 3 4 RIGHT LEFT","(12)/(34|)");
t("LEFT again -> one digit back inside the den","FRAC 1 2 RIGHT 3 4 RIGHT LEFT LEFT","(12)/(3|4)");
t("LEFT to the den start, then into the num","FRAC 1 2 RIGHT 3 4 RIGHT LEFT LEFT LEFT LEFT","(12|)/(34)");
t("nested: RIGHT descends into outer num","FRAC FRAC 1 2 RIGHT 3 4 RIGHT 5 6 RIGHT","((12)/(34)56)/(|)");
t("DOWN from num offset 1 lands in den offset 1","FRAC 1 2 DOWN 3 4 LEFT LEFT LEFT LEFT DOWN","(12)/(3|4)");
t("UP   from den offset 1 lands in num offset 1","FRAC 1 2 DOWN 3 4 LEFT UP","(1|2)/(34)");
t("DEL right of fraction deletes last den digit","FRAC 1 2 DOWN 3 4 RIGHT DEL","(12)/(3|)");

console.log("\n--- evaluation is unaffected ---");
for(const [keys,want] of [["1 2 ADD 3 4 EQUALS","46"],["FRAC 1 2 RIGHT 3 EQUALS","4"],
  ["7 FRAC 3 EQUALS","(7)/(3)"],["2 SQR EQUALS","4"],["1 DIV 3 EQUALS","(1)/(3)"],
  ["1 2 3 LEFT LEFT DEL EQUALS","23"]]){
  const {calc,screen}=boot();
  for(const k of keys.split(" ")) calc.dispatch(k);
  const got=calc.S.error?("ERR:"+calc.S.error):resultLine(screen());
  const ok=got===want; ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+keys.padEnd(42)+" = "+JSON.stringify(got)+(ok?"":" want "+JSON.stringify(want)));
}
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
