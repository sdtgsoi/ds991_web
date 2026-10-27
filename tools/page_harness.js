// Minimal DOM harness for page interaction tests; this cannot validate layout.
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

module.exports={boot};
