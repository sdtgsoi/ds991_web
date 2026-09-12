/*
 * Broad regression over every calculation mode + core editing, for ds991.html.
 * The DOM shim below is duplicated per file on purpose: each suite is a
 * standalone script with no dependencies.
 *
 * Usage: node tools/regression_test.js
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
function flat(h){let prev;h=String(h).replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/\u2212/g,"-");
 do{prev=h;h=h.replace(/<span class="math frac" style="font-size:[\d.]+em"><span class="num">([\s\S]*?)<\/span><span class="den">([\s\S]*?)<\/span><\/span>/g,(m,n,d)=>flat(n)+"/"+flat(d));}while(h!==prev);
 return h.replace(/<span class="box[^"]*"><\/span>/g,"\u2610").replace(/<span class="cursor"><\/span>/g,"|").replace(/<[^>]+>/g,"");}
function screenText(h){return flat(h).replace(/\s+/g," ").trim();}
let fail=0,pass=0;
function expect(label,keys,want){
  const {calc,screen}=boot();
  let threw=null;
  try{ for(const k of keys.split(" ").filter(Boolean)) calc.dispatch(k); }catch(e){ threw=e.message; }
  const text=screenText(screen());
  const ok=!threw && text.includes(want);
  ok?pass++:fail++;
  console.log((ok?"ok   ":"FAIL ")+label.padEnd(44)+(ok?"":" screen="+JSON.stringify(text.slice(0,70))+(threw?" THREW "+threw:"")));
}
console.log("--- arithmetic / functions ---");
expect("2+3","2 ADD 3 EQUALS","5");
expect("sin30","SIN 3 0 EQUALS","1/2");
expect("5!","5 SHIFT INV EQUALS","120");
expect("2^10","2 POW 1 0 EQUALS","1024");
expect("sqrt2","SQRT 2 EQUALS","1.414213562");
expect("21C5","2 1 SHIFT DIV 5 EQUALS","20349");
expect("log100","SHIFT NEG 1 0 0 EQUALS","2");
expect("1/3 exact","1 DIV 3 EQUALS","1/3");
expect("0.5 -> 1/2","DOT 5 EQUALS","1/2");
console.log("--- x^2 / x^3 / x^-1 act on the operand before the caret ---");
expect("2 SQR","2 SQR EQUALS","4");
expect("2+3 SQR","2 ADD 3 SQR EQUALS","11");
expect("8 INV","8 INV EQUALS","1/8");
expect("SQRT9 SQR","SQRT 9 SQR EQUALS","9");
console.log("--- fraction key absorbs the preceding number ---");
expect("7 FRAC 3","7 FRAC 3 EQUALS","7/3");
expect("1+2 FRAC 3","1 ADD 2 FRAC 3 EQUALS","5/3");
expect("2 SHIFT FRAC 3 RIGHT 4","2 SHIFT FRAC 3 DOWN 4 RIGHT EQUALS","11/4");
expect("FRAC 7 RIGHT 3","FRAC 7 RIGHT 3 EQUALS","7/3");
console.log("--- modes still work ---");
expect("CMPLX i","MENU 2 ALPHA ENG EQUALS","i");
expect("BASE hex A+F","MENU 3 OPTN 2 ALPHA NEG ADD ALPHA TAN EQUALS","19");
expect("MATRIX det","MENU 4 OPTN 1 2 1 EQUALS 2 EQUALS 3 EQUALS 4 EQUALS OPTN 2","det(A) = -2");
expect("VECTOR dot","MENU 5 OPTN 1 3 3 EQUALS 4 EQUALS 0 EQUALS OPTN 1 3 3 EQUALS 4 EQUALS 0 EQUALS OPTN 2","25");
expect("STAT regression","MENU 6 2 1 EQUALS 2 EQUALS 2 EQUALS 4 EQUALS 3 EQUALS 6 EQUALS OPTN 1","a = 2");
expect("TABLE f(x)=x^2","MENU 7 XKEY SQR EQUALS EQUALS 1 EQUALS 5 EQUALS 1 EQUALS","25");
expect("EQUATION sim","MENU 8 OPTN 1 2 2 EQUALS 1 EQUALS 5 EQUALS 1 EQUALS NEG 1 EQUALS 1 EQUALS EQUALS","x1 = 2");
expect("INEQ","MENU 9 OPTN 1 1 EQUALS NEG 3 EQUALS 2 EQUALS EQUALS","x ");
expect("RATIO","MENU 0 1 EQUALS 2 EQUALS 3 EQUALS EQUALS","x = 6");
console.log("--- editing / memory / history ---");
expect("DEL mid-expression","1 2 3 LEFT LEFT DEL","23");
expect("Ans recall","4 ADD 5 EQUALS AC 2 MUL ANS EQUALS","18");
expect("STO/ALPHA","1 0 0 STO ALPHA NEG EQUALS AC ALPHA NEG EQUALS","100");
expect("M+","5 MPLUS AC ALPHA MPLUS EQUALS","5");
expect("history UP","2 ADD 3 EQUALS AC 4 ADD 5 EQUALS UP","4+5");
console.log("--- templates and their placeholders ---");
expect("empty frac shows a box","FRAC","\u2610");
expect("empty sqrt body","SQRT","\u221a");
expect("empty power exponent","2 POW","2");
console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
