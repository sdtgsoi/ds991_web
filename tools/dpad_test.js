/*
 * UP / DOWN slot navigation check for ds991.html.
 * Asserts the cursor PATH (which slot holds the caret) and that the caret is
 * actually visible on the rendered line, rather than raw pixel text.
 *
 * The DOM shim below is duplicated per file on purpose: each suite is a
 * standalone script with no dependencies.
 *
 * Usage: node tools/dpad_test.js
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
  padMain.querySelectorAll=(s)=>/keycell/.test(s)?[]:[];
  const doc={getElementById:id=>cache[id]||(cache[id]=new El("div")),createElement:t=>new El(t),querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},body:new El("body")};
  const ctx={console,setTimeout,clearTimeout,Math,JSON,Date,isFinite,isNaN,parseInt,parseFloat,String,Number,Array,Object,document:doc};ctx.window=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);vm.runInContext(pageSrc,ctx,{filename:"p.js"});
  return {calc:ctx.__calc,screen:()=>cache.screen.innerHTML};
}
const {renderText}=require("./render_text.js");

function exprLine(h){
  const m=/id="exprline">([\s\S]*?)$/.exec(h);
  if(!m) return "(?)";
  return renderText(m[1].split('<div class="resultline"')[0]);
}
let fail=0, pass=0;
function t(label,keys,wantPath,opts){
  opts=opts||{};
  const {calc,screen}=boot();
  for(const k of keys.split(" ").filter(Boolean)) calc.dispatch(k);
  const path=JSON.stringify(calc.getCursor().path);
  const line=exprLine(screen());
  const caret = line.indexOf("|")>=0;
  const checks=[path===wantPath];
  if(opts.caret!==undefined) checks.push(caret===opts.caret);
  const ok=checks.every(Boolean);
  ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+label.padEnd(40)+" path="+path.padEnd(24)+" caret="+caret+
    (ok?"":"   want path="+wantPath+(opts.caret!==undefined?" caret="+opts.caret:"")));
}
console.log("--- UP/DOWN walk the slots of every template ---");
t("frac:  num ->DOWN-> den","FRAC 7 DOWN",'["root","den"]',{caret:true});
t("frac:  den ->UP-> num","FRAC 7 DOWN UP",'["root","num"]',{caret:true});
t("frac:  num ->UP-> out of template","FRAC 7 UP",'["root"]',{caret:true});
t("frac:  den ->DOWN-> out of template","FRAC 7 DOWN DOWN",'["root"]',{caret:true});
t("mixed: whole ->DOWN-> num","SHIFT FRAC 2 DOWN",'["root","num"]',{caret:true});
t("mixed: num ->DOWN-> den","SHIFT FRAC 2 DOWN 3 DOWN",'["root","den"]',{caret:true});
t("mixed: den ->UP-> num ->UP-> whole","SHIFT FRAC 2 DOWN 3 DOWN UP UP",'["root","whole"]',{caret:true});
t("mixed: whole ->UP-> out","SHIFT FRAC 2 UP",'["root"]',{caret:true});
t("power: exp ->UP-> base","2 POW 3 UP",'["root","base"]',{caret:true});
t("power: exp ->DOWN-> out","2 POW 3 DOWN",'["root"]',{caret:true});
t("sqrt:  body ->UP-> out","SQRT 4 UP",'["root"]',{caret:true});
t("root:  body ->UP-> index","SHIFT POW 8 RIGHT 9 UP",'["root","n"]',{caret:true});
t("log:   base ->UP-> out (base is slot 1)","LOG 5 UP",'["root"]',{caret:true});
t("log:   arg ->UP-> base","LOG 5 RIGHT 7 UP",'["root","base"]',{caret:true});
/* The integral's slots run body -> lower -> upper, so it is walked with
   LEFT/RIGHT (the vertical keys behave as usual: UP at the first slot leaves
   the template). Entering lands in the body, i.e. the integrand. */
t("intg:  body ->DOWN-> lower","INTG XKEY DOWN",'["root","lower"]',{caret:true});
t("intg:  lower ->DOWN-> upper","INTG XKEY DOWN DOWN",'["root","upper"]',{caret:true});
t("intg:  body ->UP-> out","INTG XKEY UP",'["root"]',{caret:true});
t("sum:   body ->UP-> upper","SHIFT XKEY 1 RIGHT 5 RIGHT XKEY UP",'["root","upper"]',{caret:true});
t("d/dx:  at ->UP-> body","SHIFT INTG XKEY RIGHT 2 UP",'["root","body"]',{caret:true});
t("abs:   body ->UP-> out","SHIFT LPAREN 4 UP",'["root"]',{caret:true});
t("paren: body ->UP-> out","LPAREN 4 UP",'["root"]',{caret:true});
console.log("\n--- the caret must never be stranded on an invisible slot ---");
t("frac numerator UP then type inserts before it","FRAC 7 UP 2",'["root"]',{caret:true});
{
  const {calc}=boot();
  ["FRAC","7","UP","2"].forEach(k=>calc.dispatch(k));
  const tree=calc.getExpr().map(n=>n.t==="num"?"N"+n.v:n.t).join(",");
  const ok=tree==="N2,frac";
  ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"the 2 lands BEFORE the fraction".padEnd(40)+" tree="+tree);
}
t("sqrt body UP then type lands at top level","SQRT 4 UP 5",'["root"]',{caret:true});
console.log("\n--- UP/DOWN inside a template must not touch history ---");
{
  const {calc,screen}=boot();
  calc.dispatch("FRAC"); calc.dispatch("5"); calc.dispatch("DOWN"); calc.dispatch("6");
  const before=JSON.stringify(calc.getCursor().path);
  calc.dispatch("UP");
  const path=JSON.stringify(calc.getCursor().path);
  const ok=before==='["root","den"]' && path==='["root","num"]' && exprLine(screen()).indexOf("|")>=0;
  ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"UP moves back inside the fraction".padEnd(40)+" path="+path);
}
console.log("\n--- history still wins outside a template ---");
{
  const {calc,screen}=boot();
  ["2","ADD","3","EQUALS","AC","4","ADD","5","EQUALS","UP"].forEach(k=>calc.dispatch(k));
  const ok=exprLine(screen())==="4+5|";   /* newest entry, caret at its end */
  ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+"UP outside a template recalls history");
}
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
