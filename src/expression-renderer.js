// Embedded inside the application closure by sync.sh; shares its state/helpers.
/* ============================ DISPLAY HELPERS ============================ */
/* Expression tree -> LCD HTML.
   renderArr()/renderNode() walk the tree; renderNodeAt() is the variant that
   splices the caret into a token at a digit offset, which is what lets the
   caret appear in the middle of a number. slotOrBox() draws one template slot,
   showing the caret while the caret is in that slot and a placeholder box when
   the slot is still empty. opSym/fnSym/constSym map token values to glyphs.
   `hideCaret` is raised while an answer or an error is on screen. */
var LCD=document.getElementById("lcd");
var SCREEN=document.getElementById("screen");

function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function num2sup(n){
  var map={"0":"\u2070","1":"\u00b9","2":"\u00b2","3":"\u00b3","4":"\u2074","5":"\u2075","6":"\u2076","7":"\u2077","8":"\u2078","9":"\u2079","-":"\u207b","+":"\u207a"};
  return String(n).split("").map(function(c){return map[c]||c;}).join("");
}

var CARET='<span class="cursor"></span>';
/* while an answer (or an error screen) is on display the caret is suppressed;
   it comes back as soon as the user starts editing again */
var hideCaret=false;
function caretHTML(){ return hideCaret?"":CARET; }
/* draw one token, splicing the caret in at the requested digit offset */
function renderNodeAt(n,at,ctx){
  ctx=baseCtx(ctx);
  if(at===undefined||at===null) return renderNode(n,ctx);
  if(n.t==="num"){
    var s=String(n.v);
    return esc(s.slice(0,at))+caretHTML()+esc(s.slice(at));
  }
  if(at<=0) return caretHTML()+renderNode(n,ctx);
  if(at>=digitsIn(n)) return renderNode(n,ctx)+caretHTML();
  /* A power's digit span is [base][^][exp], so the offset right after the base
     is the "^" itself. The caret can legitimately stand there - that is where
     an exponent merge leaves it - and the markup has to break the node at that
     point, otherwise the caret is drawn past the exponent:
         123^45 with the caret at offset 3  ->  123|45                     */
  if(n.t==="pow"){
    var bd=arrDigits(n.base);          /* NOT slotDigits: its minimum of one
                                          would fire at the wrong offset */
    if(at===bd && arrDigits(n.exp)>0){
      return '<span class="math">'+slotOrBox(n.base)+caretHTML()+renderExponent(n.exp,ctx)+'</span>';
    }
  }
  if(n.t==="paren"||n.t==="abs"){
    if(at===1) return '<span class="math paren">'+caretHTML()+'('+renderArr(n.body,ctx)+')</span>';
    if(at>=2+(n.body?arrDigits(n.body):0)) return '<span class="math paren">('+renderArr(n.body,ctx)+')'+caretHTML()+'</span>';
  }
  if(n.t==="frac"){
    var nd=slotDigits(n.num), dd=slotDigits(n.den), total=nd+dd;
    if(at<=0) return caretHTML()+renderNode(n,ctx);
    if(at>=total) return renderNode(n,ctx)+caretHTML();
    if(at<nd) return '<span class="math frac"><span class="num">'+renderArrAt(n.num, at, ctx)+'</span><span class="den">'+renderArr(n.den,ctx)+'</span></span>';
    if(at===nd) return '<span class="math frac"><span class="num">'+renderArr(n.num,ctx)+'</span>'+caretHTML()+'<span class="den">'+renderArr(n.den,ctx)+'</span></span>';
    return '<span class="math frac"><span class="num">'+renderArr(n.num,ctx)+'</span><span class="den">'+renderArrAt(n.den, at-nd, ctx)+'</span></span>';
  }
  if(n.t==="mixed"){
    var wd=slotDigits(n.whole), nd=slotDigits(n.num), dd=slotDigits(n.den);
    var total=wd+nd+dd;
    if(at<=0) return caretHTML()+renderNode(n,ctx);
    if(at>=total) return renderNode(n,ctx)+caretHTML();
    if(at<wd) return '<span class="math mixed">'+renderArrAt(n.whole, at, ctx)+'<span class="math frac" style="font-size:.9em"><span class="num">'+renderArr(n.num,ctx)+'</span><span class="den">'+renderArr(n.den,ctx)+'</span></span></span>';
    if(at===wd) return '<span class="math mixed">'+renderArr(n.whole,ctx)+caretHTML()+'<span class="math frac" style="font-size:.9em"><span class="num">'+renderArr(n.num,ctx)+'</span><span class="den">'+renderArr(n.den,ctx)+'</span></span></span>';
    if(at<wd+nd) return '<span class="math mixed">'+renderArr(n.whole,ctx)+'<span class="math frac" style="font-size:.9em"><span class="num">'+renderArrAt(n.num, at-wd, ctx)+'</span><span class="den">'+renderArr(n.den,ctx)+'</span></span></span>';
    if(at===wd+nd) return '<span class="math mixed">'+renderArr(n.whole,ctx)+'<span class="math frac" style="font-size:.9em"><span class="num">'+renderArr(n.num,ctx)+'</span>'+caretHTML()+'<span class="den">'+renderArr(n.den,ctx)+'</span></span></span>';
    return '<span class="math mixed">'+renderArr(n.whole,ctx)+'<span class="math frac" style="font-size:.9em"><span class="num">'+renderArr(n.num,ctx)+'</span><span class="den">'+renderArrAt(n.den, at-wd-nd, ctx)+'</span></span></span>';
  }
  return renderNode(n,ctx)+caretHTML();
}
function renderArr(arr,ctx){
  ctx=baseCtx(ctx);
  var curArr=cur().arr, curPos=cur().pos;
  var isCur=(arr===curArr && !S.menu && !S.error);
  var out="", t=0;
  for(var i=0;i<arr.length;i++){
    var nd=digitsIn(arr[i]);
    if(isCur && curPos>=t && curPos<t+nd) out+=renderNodeAt(arr[i],curPos-t,ctx);
    else out+=renderNode(arr[i],ctx);
    t+=nd;
  }
  if(isCur && curPos>=t) out+=caretHTML();
  return out;
}
/* Render an array with the caret forced at digit offset `at`, ignoring the
   global cursor. Used when the parent view needs to show a caret inside a
   template slot (e.g. a fraction numerator) while the cursor is not actually
   inside that slot. */
function renderArrAt(arr, at, ctx){
  ctx=baseCtx(ctx);
  var out="", t=0;
  for(var i=0;i<arr.length;i++){
    var nd=digitsIn(arr[i]);
    if(at>=t && at<t+nd) out+=renderNodeAt(arr[i], at-t, ctx);
    else out+=renderNode(arr[i], ctx);
    t+=nd;
  }
  if(at>=t) out+=CARET;
  return out;
}
/* an empty template slot shows a placeholder box; the box disappears while
   the cursor is inside that slot so it does not overlap the caret */
function slotEditing(arr){
  return arr===cur().arr && !S.menu && !S.error;
}
function slotCursor(arr){
  return slotEditing(arr)?'<span class="cursor"></span>':"";
}
/* ============================ LAYOUT CONTEXT ============================ */
/* The renderer carries a small context down the tree instead of letting CSS
 * guess the nesting. It is what makes every exponent the same size and what
 * lets the exponent's lift grow with the depth:
 *
 *   { powerDepth: 0, fontMode: "NORMAL" | "EXPONENT", layoutMode: "DISPLAY" }
 *
 * fontMode decides the size and is deliberately NOT inherited through an
 * exponent: entering an exponent always sets EXPONENT, and a nested exponent
 * sets it again to the same value, so level 2, 3, 4 ... never shrink. Only
 * powerDepth increases, and that is what drives the vertical offset. */
/* How far each further level rises. It has to be small enough that a realistic
 * tower still fits the LCD (each step is a full line of the LCD), yet large
 * enough to read: 0.30 * 19px ~= 5.7px per level keeps four levels on screen. */
var EXP_STEP_EM = 0.80;
var EXP_FONT_RATIO = 0.70;
/* The size must be ABSOLUTE, not a percentage: `.70em` measured against the
 * parent exponent would compound (70%, 49%, 34% ...) and a tower of powers
 * would shrink into illegibility. `rootFont` is captured once, on the first
 * exponent, and every deeper level is that value times EXP_FONT_RATIO - the
 * same size at every depth, as the spec requires. */
function measureRootFont(){
  try{
    if(!window.getComputedStyle) return null;
    var el=document.getElementById("exprline")||document.body;
    return parseFloat(window.getComputedStyle(el).fontSize)||null;
  }catch(e){ return null; }
}
function baseCtx(ctx){ return ctx || {powerDepth:0, fontMode:"NORMAL", layoutMode:"DISPLAY", rootFont:null}; }
/* the context a top-level render starts from, carrying the real font size */
var _rootFontCache=undefined;
function rootCtx(){
  if(_rootFontCache===undefined) _rootFontCache=measureRootFont();
  return {powerDepth:0, fontMode:"NORMAL", layoutMode:"DISPLAY", rootFont:_rootFontCache||null};
}
function expCtx(ctx){
  var c=baseCtx(ctx);
  return {powerDepth:c.powerDepth+1, fontMode:"EXPONENT",
          layoutMode:c.layoutMode, rootFont:c.rootFont||null};
}
/* the inline style that gives an exponent its size and lift */
function expStyle(ctx){
  /* An absolute size is what keeps every level equal. When it cannot be
     measured (no layout engine, e.g. the Node harness) fall back to 1em: the
     surrounding .sup already scaled us, so 1em keeps the SAME size instead of
     compounding down to 70/49/34%. */
  var size = ctx.rootFont ? (ctx.rootFont*EXP_FONT_RATIO).toFixed(2)+"px" : "1em";
  /* One CONSTANT step per level, not depth * step: a .sup is positioned
     relative to its parent .sup, so the offsets already accumulate down the
     nesting chain. Multiplying by the depth here made the gaps grow
     (13.6, 18.3, 22.8 px) instead of staying even. */
  var lift = ctx.rootFont ? (ctx.rootFont*EXP_STEP_EM).toFixed(2)+"px"
                          : (EXP_STEP_EM).toFixed(2)+"em";
  return 'font-size:'+size+';top:-'+lift+';';
}
function slotOrBox(arr,boxCls,extra,ctx){
  if(arr.length) return renderArr(arr,ctx);  /* renderArr also emits the caret */
  if(slotEditing(arr)) return caretHTML();   /* empty slot being edited */
  return '<span class="box'+(boxCls?" "+boxCls:"")+'"'+(extra||"")+'></span>';
}
/* renderExponent(node, ctx): the exponent of a power. It always enters
   EXPONENT font mode and one level deeper, then lays the two boxes out with
   layoutPower(). */
function renderExponent(arr,ctx){
  return '<span class="sup" style="'+expStyle(expCtx(ctx))+'">'+slotOrBox(arr,null,null,expCtx(ctx))+'</span>';
}
/* layoutPower(baseHTML, expHTML): what is left is the horizontal placement -
   the exponent follows the base immediately, which is also what the caret
   offset model assumes. */
function layoutPower(baseHTML,expHTML){
  return '<span class="math">'+baseHTML+expHTML+'</span>';
}
function renderPow(n,ctx){
  var c=baseCtx(ctx);
  /* The two stops of a base/exponent boundary render DIFFERENTLY on purpose, so
     the user can tell which slot the caret is in even though the x position is
     the same: the base side (a base frame at base@end) draws the caret after
     the base at the base's height, the exponent side (an exp frame at offset 0)
     draws it inside the raised exponent span. Editing follows the frame, so the
     distinction is what makes "type here" unambiguous. */
  var base=slotOrBox(n.base,null,null,{powerDepth:c.powerDepth,fontMode:"NORMAL",layoutMode:c.layoutMode});
  var exp =renderExponent(n.exp,c);
  return layoutPower(base,exp);
}
function renderNode(n,ctx){
  ctx=baseCtx(ctx);
  if(!n) return "";
  switch(n.t){
    case "num": return esc(n.v);
    case "op": return opSym(n.v);
    case "variable": return '<span class="math">'+esc(n.name)+'</span>';
    case "const": return constSym(n.name);
    case "post":
      if(n.v==="FORMAT:polar")return "▶r∠θ";
      if(n.v==="FORMAT:rect")return "▶a+bi";
      if(n.v.indexOf("ANGLE:")===0)return '<sup>'+esc({DEG:"°",RAD:"r",GRA:"g"}[n.v.slice(6)])+'</sup>';
      if(n.v.indexOf("ENG:")===0)return esc(n.v.slice(4));
      return esc(n.v.indexOf("CONV:")===0?n.v.slice(5):n.v);
    case "func": return '<span class="math">'+fnSym(n.name)+'('+slotOrBox(n.arg,null,null,ctx)+')</span>';
    case "paren": return '<span class="math paren">('+slotOrBox(n.body,null,null,ctx)+')</span>';
    case "abs": return '<span class="math">|'+slotOrBox(n.body,null,null,ctx)+'|</span>';
    case "frac": return '<span class="math frac"><span class="num">'+slotOrBox(n.num,null,null,ctx)+'</span><span class="den">'+slotOrBox(n.den,null,null,ctx)+'</span></span>';
    case "mixed": return '<span class="math mixed">'+slotOrBox(n.whole)+'<span class="math frac" style="font-size:.9em"><span class="num">'+slotOrBox(n.num)+'</span><span class="den">'+slotOrBox(n.den)+'</span></span></span>';
    case "pow": return renderPow(n,ctx);
    case "sqrt": return '<span class="math sqrt"><span class="rad">\u221a</span><span class="body">'+slotOrBox(n.body,null,null,ctx)+'</span></span>';
    case "root": return '<span class="math sqrt"><span class="sup">'+slotOrBox(n.n,null,null,ctx)+'</span><span class="rad">\u221a</span><span class="body">'+slotOrBox(n.body,null,null,ctx)+'</span></span>';
    case "logbase": return '<span class="logbase">log<span class="sub">'+slotOrBox(n.base,null,null,ctx)+'</span><span class="lbp">('+slotOrBox(n.arg,null,null,ctx)+')</span></span>';
    /* Printed as sign + bounds stack, then the integrand to their right. The
       bounds are absolutely positioned beside the sign so that the document
       order stays in navigation order (integrand first) without the integrand
       appearing between the sign and its limits. */
    case "intg": return '<span class="math bigop intgb"><span class="sym">\u222b</span><span class="lim tall"><span>'+slotOrBox(n.upper)+'</span><span>'+slotOrBox(n.lower)+'</span></span>'+slotOrBox(n.body)+'</span><span class="math"> d'+esc((n.var||"X").toLowerCase())+'</span>';
    case "deriv": return '<span class="math bigop"><span class="dydx"><span>d</span><span class="bar"></span><span>d'+esc((n.var||"X").toLowerCase())+'</span></span>('+slotOrBox(n.body)+')</span><span class="math" style="font-size:.8em">&nbsp;|' + slotOrBox(n.at) + '</span>';
    case "sum": return '<span class="math bigop"><span class="lim"><span>'+slotOrBox(n.upper)+'</span><span>'+slotOrBox(n.lower)+'</span></span><span class="sym">\u03a3</span></span>('+slotOrBox(n.body)+')';
    case "prod": return '<span class="math bigop"><span class="lim"><span>'+slotOrBox(n.upper)+'</span><span>'+slotOrBox(n.lower)+'</span></span><span class="sym">\u03a0</span></span>('+slotOrBox(n.body)+')';
  }
  return "";
}
function opSym(v){
  var m={"+":"+","-":"\u2212","*":"\u00d7","/":"\u00f7","^":"^","P":"P","C":"C","%":"%","!":"!","\u2220":"\u2220",",":",","\\":"\\","&":"&","|":"|","xor":" xor ","xnor":" xnor "};
  return '<span class="math">'+esc(m[v]!==undefined?m[v]:v)+'</span>';
}
function fnSym(name){
  var m={asin:"sin\u207b\u00b9",acos:"cos\u207b\u00b9",atan:"tan\u207b\u00b9",asinh:"sinh\u207b\u00b9",acosh:"cosh\u207b\u00b9",atanh:"tanh\u207b\u00b9",log:"log",ln:"ln",sqrt:"\u221a",cbrt:"\u00b3\u221a",abs:"Abs",arg:"Arg",conj:"Conjg",re:"ReP",im:"ImP",rnd:"Rnd",ranint:"RanInt",not:"Not",and:"And",or:"Or",xor:"Xor",xnor:"Xnor",fact:"FACT",pol:"Pol",rec:"Rec",min:"Min",max:"Max"};
  return m[name]||name;
}
function constSym(name){
  if(SCIENTIFIC_BY_ID[name])return '<span class="math">'+esc(SCIENTIFIC_BY_ID[name].label)+'</span>';
  var m={PI:"\u03c0",e:"e",i:"i",Ans:"Ans",M:"M",euler:"e",alpha:"\u03b1"};
  return '<span class="math">'+esc(m[name]!==undefined?m[name]:name)+'</span>';
}
