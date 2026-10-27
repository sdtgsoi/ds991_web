// Embedded inside the application closure by sync.sh; shares its state/helpers.
/* ============================ EDITING ============================ */
/* The caret and everything that mutates the expression. Read the "cursor model"
   note at the top of the file first: a frame's `pos` is a digit offset, and the
   helpers in the first block convert between offsets and token indices.
     - measurement : digitsIn / arrDigits / slotDigits
     - conversion  : tokenAtPos / offsetInToken / tokenAt / insertIndex /
                     leftToken / tokenAtTrailingEdge / splitNumberAt
     - movement    : CURSOR NAVIGATOR - moveLeft / moveRight / moveUp /
                     moveDown (moveField is the shared UP/DOWN body) /
                     leaveField / descendAtCursor
     - deletion    : DELETE CONTROLLER - doDel() dispatches to delete* strategies
     - insertion   : ins and the input*() family, one per key
   The input*() helpers never splice directly; they build a token, insert it at
   the caret (ins) and then `enter()` the slot the user should type into next. */
/* ---- 1. measurement: how many caret positions does a token occupy? ---- */
function digitsIn(n){
  if(!n) return 0;
  if(n.t==="num") return Math.max(1,String(n.v).length);
  var tn=n.t;
  if(tn==="variable"||tn==="const"||tn==="post"||tn==="op") return 1;
  if(tn==="paren"||tn==="abs") return 2+(n.body?arrDigits(n.body):0);
  if(tn==="func") return 1+(n.arg?arrDigits(n.arg):0)+1;
  if(tn==="frac") return slotDigits(n.num)+slotDigits(n.den);
  if(tn==="mixed") return slotDigits(n.whole)+slotDigits(n.num)+slotDigits(n.den);
  if(tn==="logbase") return 4+(n.base?arrDigits(n.base):0)+(n.arg?arrDigits(n.arg):0)+2;
  /* A power needs its own caret positions or the caret lands ON the node
     instead of after it: the base digits, the "^", then the exponent. The "^"
     offset is the BASE side of the shared boundary and the exponent's offset 0
     is the exponent side, which is what gives every power boundary exactly two
     stops (see the Phase 4 helpers in the NAVIGATOR section). */
  if(tn==="pow") return slotDigits(n.base)+1+slotDigits(n.exp);
  if(tn==="sqrt") return 1+(n.body?arrDigits(n.body):0);
  if(tn==="root") return 1+(n.n?arrDigits(n.n):0)+1+(n.body?arrDigits(n.body):0);
  /* The integral's slots are laid out in NAVIGATION order so that a single
     digit offset maps to exactly one region: integrand, then lower limit, then
     upper limit. This is what makes RIGHT at the end of the integrand reach the
     lower bound. The printed "dx" is decoration and must not add caret
     positions, otherwise the caret escapes the template while the integrand is
     still being typed.

     The limits are then PRINTED as a stack beside the sign rather than in
     document order (see the intg renderer), so the visual result still reads
     "sign, bounds, integrand". */
  if(tn==="intg") return slotDigits(n.body)+slotDigits(n.lower)+slotDigits(n.upper);
  if(tn==="deriv") return 4+(n.at?arrDigits(n.at):0)+1+(n.body?arrDigits(n.body):0)+1+(n.at?arrDigits(n.at):0);
  if(tn==="sum"||tn==="prod") return 1+(n.upper?arrDigits(n.upper):0)+(n.lower?arrDigits(n.lower):0)+1+(n.body?arrDigits(n.body):0)+1;
  return 1;
}
function arrDigits(a){ var t=0; for(var k=0;k<a.length;k++) t+=digitsIn(a[k]); return t; }
/* A template slot always contributes at least one digit-width so that an empty
   numerator/denominator still has a cursor position and can be navigated into. */
function slotDigits(a){ return Math.max(1, arrDigits(a)); }
/* Does this power's exponent BEGIN with another power? Used by the NAVIGATOR to
   fold the inner power's leading base@0 into the enclosing exponent's start (the
   third state at one screen position). */
function powExpStartsWithPower(n){
  var e=n && n.exp;
  return !!(e && e.length && e[0] && e[0].t==="pow");
}
function tokenStart(arr,j){ var t=0; for(var k=0;k<j;k++) t+=digitsIn(arr[k]); return t; }
/* ---- 2. conversion between digit offsets and token indices ----
   A digit offset falls either INSIDE one token (tokenAt) or on the boundary
   between two of them (insertIndex gives the gap). Getting this distinction
   right is what makes "12" + "+" land after the number instead of before it. */
/* Digit-offset -> index of the token the caret is STRICTLY inside.
   It reports -1 whenever the offset falls on a token boundary. */
function tokenAtPos(arr,pos){
  if(pos<=0) return -1;
  var t=0;
  for(var k=0;k<arr.length;k++){
    var d=digitsIn(arr[k]);
    if(pos<t+d) return pos>t?k:-1;
    t+=d;
  }
  return -1;
}
function offsetInToken(arr,pos){
  var t=0;
  for(var k=0;k<arr.length;k++){
    var d=digitsIn(arr[k]);
    if(pos<=t+d) return pos-t;
    t+=d;
  }
  return arr.length?digitsIn(arr[arr.length-1]):0;
}
/* token whose digits the caret sits inside; null on a boundary or past the end */
function tokenAt(arr,pos){
  var i=tokenAtPos(arr,pos);
  return (i>=0&&i<arr.length)?arr[i]:null;
}
/* GAP index: how many tokens lie completely left of the caret. Inserting a
   token at "the caret" means splicing at this index. For "12" with the caret
   after it this is 1, which is exactly where a following "+" belongs. */
function insertIndex(arr,pos){
  if(pos<=0) return 0;
  var t=0;
  for(var k=0;k<arr.length;k++){
    var d=digitsIn(arr[k]);
    if(pos<t+d) return k;
    t+=d;
  }
  return arr.length;
}
/* token immediately left of the caret; when the caret is just inside the tail
   of a factor node it reports that node, never a token nested within it */
function leftToken(arr,pos){
  var i=insertIndex(arr,pos);
  return i>0?arr[i-1]:null;
}
/* token whose trailing edge is exactly at pos, regardless of whether it is
   the last token in the array. Used by DEL when the caret sits just right of
   a composite node so it can step inside and delete the last digit of the
   node's last slot instead of removing the whole node. */
function tokenAtTrailingEdge(arr,pos){
  if(pos<=0) return null;
  var t=0;
  for(var k=0;k<arr.length;k++){
    var d=digitsIn(arr[k]);
    if(pos===t+d) return arr[k];
    t+=d;
  }
  return null;
}
/* split "12" so a token can be inserted between its digits */
function splitNumberAt(arr,idx,at){
  var n=arr[idx];
  if(!n||n.t!=="num") return;
  var str=String(n.v);
  if(at<=0||at>=str.length) return;
  arr.splice(idx,1,node("num",{v:str.slice(0,at)}),node("num",{v:str.slice(at)}));
}
/* ---- 3. frame bookkeeping: entering/leaving template slots ---- */
function resetCursor(){ stack=[{arr:root,pos:0}]; }
function clearInput(){ root.length=0; resetCursor(); S.resultShown=false; S.resultComplexFormat=null; S.error=null; }
function startFreshIfResult(){
  if(S.resultShown){ root.length=0; resetCursor(); S.resultShown=false; S.resultComplexFormat=null; }
}
/* Leaving the answer view to EDIT: keep what is in the expression but bring the
   caret back and take the answer line down. Typing already did this through
   startFreshIfResult(); without this, DEL and the arrow keys edited the
   expression behind a frozen answer with no caret, which looks like the key did
   nothing at all. */
/* Coming back from an answer the caret is placed on the spot the key asks for,
   because the position left over from before "=" is arbitrary:
     LEFT / DEL - the END, so the next edit acts on what was typed last
     RIGHT      - the START, so the next edit acts on what was typed first
/* Leaving the answer view places the caret explicitly, because the position it
   had before "=" is arbitrary while the caret is hidden: LEFT / DEL work from
   the end of the expression and RIGHT from the start. `afterAnswer` marks the one
   key press that does this, so it does not then move a second time. */
var afterAnswer=false;
function leaveResultView(){
  if(!S.resultShown) return;
  S.resultShown=false;              /* keep the expression, take the answer down */
  unwindCursor();
  stack[0].pos=0;                   /* RIGHT's landing spot; LEFT overrides it */
  afterAnswer=true;
}
/* any other key ends the answer-browsing state */
function clearAfterAnswer(){ afterAnswer=false; }
/* collapse the cursor path back to the top level (used when a screen change
   invalidates the template the caret was inside) */
function unwindCursor(){
  while(stack.length>1) stack.pop();
}
function ins(n){
  var c=cur(), i=insertIndex(c.arr,c.pos);
  if(i>0) splitNumberAt(c.arr,i-1,offsetInToken(c.arr,c.pos));
  i=insertIndex(c.arr,c.pos);            /* splitting adds a token */
  c.arr.splice(i,0,n);
  c.pos=tokenStart(c.arr,i)+digitsIn(n);
}
function enter(node_,slot){
  stack.push({arr:node_[slot],pos:0,node:node_,slot:slot});
}
function enterEnd(node_,slot){
  stack.push({arr:node_[slot],pos:arrDigits(node_[slot]),node:node_,slot:slot});
}
function slotKeys(n){
  if(!n) return null;
  switch(n.t){
    case "frac": return ["num","den"];
    case "mixed": return ["whole","num","den"];
    case "pow": return ["base","exp"];
    case "sqrt": return ["body"];
    case "root": return ["n","body"];
    case "paren": return ["body"];
    case "abs": return ["body"];
    case "func": return ["arg"];
    case "logbase": return ["base","arg"];
    /* the caret walks integrand -> lower -> upper even though the bounds are
       printed before the integrand */
    case "intg": return ["body","lower","upper"];
    case "deriv": return ["body","at"];
    case "sum": return ["lower","upper","body"];
    case "prod": return ["lower","upper","body"];
  }
  return null;
}
/* "pow" is entered through its exponent once a base has been captured,
   "root"/"logbase" through the body once the index/base has been entered */
function autoSlot(n){
  var ks=slotKeys(n);
  if(!ks) return null;
  if(n.t==="pow") return n.base.length?"exp":"base";
  if(n.t==="root") return n.n.length?"body":"n";
  if(n.t==="logbase") return n.base.length?"arg":"base";
  /* an integral is written sign, bounds, integrand - so the integrand is the
     leftmost slot and is where the caret starts */
  if(n.t==="intg") return "body";
  return ks[0];
}
function firstSlot(n){ return autoSlot(n); }
function lastSlot(n){
  var ks=slotKeys(n);
  return ks?ks[ks.length-1]:null;
}
function isFactor(n){
  return n && ["num","variable","const","func","frac","mixed","pow","sqrt","root","paren","abs","post","logbase","intg","deriv","sum","prod"].indexOf(n.t)>=0;
}
/* ============================ POWER KEYS ============================ */
/* PowerContext is the SINGLE arbiter of "where is the caret relative to a
 * power" (docs: temp-docs/DS991_km_指数编辑系统错误分析与重构开发方案_v3.md,
 * chapters 5.2/5.3). Input (insertPower), navigation, deletion and rendering
 * must all ask this one function rather than re-deriving the rule: the five
 * independent interpretations were the root cause of the boundary bugs.
 *
 * The five contexts:
 *
 *   OUTSIDE_POWER      the caret sits right after a finished power and is NOT
 *                      inside any exponent slot  -> every power key is ignored
 *   EXP_END            caret at the end of an exponent slot
 *                      x^2/x^3 wrap the whole exponent as a new base;
 *                      x^() appends an empty exponent and enters it
 *   BASE_EXP_BOUNDARY  caret in the base of a power that already has an
 *                      exponent, i.e. between base and exponent
 *                      x^2/x^3 are ignored; x^() inserts a power in front of
 *                      the exponent  ->  2|^4  + x^()  ->  2^(□^4)
 *   NUMBER_MIDDLE      caret inside a number - inside an exponent OR at the top
 *                      level. It used to be recognised only inside an exponent,
 *                      so a top-level "123|456 + x^()" fell through to NORMAL
 *                      where inputPow() could find no left operand and inserted
 *                      an empty-base power before the number (defect P1);
 *                      x^2/x^3 raise the LEFT part and keep the right part;
 *                      x^() makes the LEFT part the base and the RIGHT part the
 *                      exponent, with the caret entering that exponent
 *   NORMAL             ordinary editing - the value left of the caret becomes
 *                      the base of a new power
 *
 * A parenthesised power is NOT a power context: "(2^4)|" lives in the root
 * expression, so NORMAL applies and x^3 gives (2^4)^3.
 */
function expFrames(){
  for(var d=stack.length-1;d>0;d--){
    var f=stack[d];
    if(f.node && f.node.t==="pow" && f.slot==="exp") return d;
  }
  return -1;
}
function inExponent(){ return expFrames()>=0; }
/* the caret is outside a power, right at its trailing edge */
function afterPower(){
  var c=cur();
  var i=insertIndex(c.arr,c.pos);
  if(i<=0) return false;
  var n=c.arr[i-1];
  if(!n||n.t!=="pow") return false;
  return c.pos>=tokenStart(c.arr,i-1)+arrDigits(n);
}
/* the caret is at a power's BASE right edge (its exponent is non-empty). After
   Phase 4 the boundary's canonical state is the exponent at offset 0; this base
   frame form is still produced by UP/DOWN, so both are recognised. */
function atBaseExpBoundary(){
  for(var d=stack.length-1;d>0;d--){
    var f=stack[d];
    if(f.node && f.node.t==="pow" && f.slot==="base"){
      return f.node.exp.length>0 && f.pos>=arrDigits(f.node.base);
    }
  }
  return false;
}
/* the number token the caret sits STRICTLY inside (null on a token boundary) */
function numTokenAtCursor(){
  var c=cur(), n=tokenAt(c.arr,c.pos);
  return (n && n.t==="num") ? n : null;
}
function getPowerContext(){
  if(!inExponent()){
    if(atBaseExpBoundary()) return {type:"BASE_EXP_BOUNDARY"};
    if(stack.length<=1 && afterPower()) return {type:"OUTSIDE_POWER"};
    /* P1 fix: a top-level caret inside a number is NUMBER_MIDDLE exactly like
       one inside an exponent. Falling through to NORMAL here made inputPow()
       miss the left operand and insert an empty-base power in front of the
       number ("123|456" + x^() used to become "□^□123456"). */
    if(numTokenAtCursor()) return {type:"NUMBER_MIDDLE", frame:cur()};
    return {type:"NORMAL"};
  }
  var f=stack[expFrames()];
  var total=arrDigits(f.node.exp);
  /* Phase 4: base@end and exp@0 are one shared boundary and the canonical
     representative is exp@0. A non-empty base plus a non-empty exponent at
     offset 0 is therefore the BASE_EXP_BOUNDARY spot (x^2/x^3 ignored, x^()
     nests), NOT the exponent end - which is what opExpEnd used to treat it as. */
  if(f.pos<=0){
    if(arrDigits(f.node.base)>0 && total>0) return {type:"BASE_EXP_BOUNDARY", frame:f};
    return {type:"EXP_END", frame:f};
  }
  if(f.pos>=total) return {type:"EXP_END", frame:f};
  return {type:"NUMBER_MIDDLE", frame:f};
}
/* put the caret in `pw`'s base and return true */
function enterBase(pw){
  stack.push({arr:pw.base,pos:0,node:pw,slot:"base"});
  return true;
}
/* the base is already filled, so the caret goes to the exponent instead */
function enterExp(pw){
  if(pw.base.length===0 && pw.exp.length===0) return enterBase(pw);
  stack.push({arr:pw.exp,pos:0,node:pw,slot:"exp"});
  return true;
}
/* the value to the left of the caret in `arr`, removed */
function takeLeftOf(arr,pos){
  var i=insertIndex(arr,pos);
  if(i<=0) return null;
  return arr.splice(i-1,1)[0];
}

function opExpEnd(ctx, kind){
  var f=ctx.frame;
  /* everything left of the caret inside this exponent becomes the basis */
  var left=f.arr.slice();
  if(!left.length) return false;
  var pw;
  if(kind===null){
    pw=T_pow(left, []);                 /* the whole left part is the base */
    f.arr.length=0; f.arr.push(pw);
    f.pos=tokenStart(f.arr,0)+digitsIn(pw);
    return enterExp(pw);                /* caret into the new (empty) exponent */
  }
  pw=T_pow(left, [T_num(String(kind))]);   /* (4^3) */
  f.arr.length=0; f.arr.push(pw);
  f.pos=tokenStart(f.arr,0)+digitsIn(pw);  /* stay in this exponent, after it */
  return true;
}
/* x^() at the shared base/exponent boundary: insert a fresh empty-base power in
   front of the exponent and move the caret into its base, so 2|^4 becomes
   2^(□^4). The boundary's canonical state is the exponent at offset 0
   (Phase 4); a base@end frame (an UP/DOWN arrival) is accepted too. */
function opBaseExpBoundary(ctx, kind){
  if(kind!==null) return true;                 /* x^2 / x^3 are ignored here */
  var f=(ctx && ctx.frame && ctx.frame.node && ctx.frame.node.t==="pow") ? ctx.frame : null;
  if(!f){
    for(var d=stack.length-1;d>0;d--){
      if(stack[d].node && stack[d].node.t==="pow" && stack[d].slot==="base"){ f=stack[d]; break; }
    }
  }
  if(!f) return false;
  var pw=T_pow([], f.node.exp.slice());    /* []^4 : keeps the old exponent */
  f.node.exp=[pw];
  if(f.slot==="exp") f.arr=f.node.exp;     /* keep the frame's array in sync */
  return enterBase(pw);                    /* caret goes into the square */
}
function opNumberMiddle(ctx, kind){
  var f=ctx.frame, n=tokenAt(f.arr,f.pos);
  if(!n || n.t!=="num") return false;
  var at=offsetInToken(f.arr,f.pos), str=String(n.v);
  if(at<=0 || at>=str.length) return false;
  var left=node("num",{v:str.slice(0,at)}), right=node("num",{v:str.slice(at)});
  var i=f.arr.indexOf(n);
  if(kind===null){
    /* 123|456 + x^() -> 123^(456) with the caret inside the new exponent */
    var pw=T_pow([left],[right]);
    f.arr.splice(i,1,pw);
    f.pos=tokenStart(f.arr,i);
    return enterExp(pw);
  }
  /* 123|456 + x^3 -> 123³456 : the left part is raised, the rest stays put */
  var pw2=T_pow([left],[T_num(String(kind))]);
  f.arr.splice(i,1,pw2,right);
  f.pos=tokenStart(f.arr,i)+digitsIn(pw2);
  return true;
}
/* PowerController entry point: ONE decision table for x^2, x^3 and x^().
   `kind` is 2 for x^2, 3 for x^3 and null for x^(). Returns true when the key
   was consumed by one of the power positions above; false means "NORMAL, fall
   back to ordinary insertion". Every power key goes through here so the three
   keys can never disagree about the same caret position. */
function insertPower(kind){
  var ctx=getPowerContext();
  switch(ctx.type){
    case "OUTSIDE_POWER":     return true;          /* ignored on purpose */
    case "EXP_END":           return opExpEnd(ctx, kind);
    case "BASE_EXP_BOUNDARY": return opBaseExpBoundary(ctx, kind);
    case "NUMBER_MIDDLE":     return opNumberMiddle(ctx, kind);
    default:                  return false;         /* NORMAL */
  }
}
function takeOperand(){
  var c=cur(), n=leftToken(c.arr,c.pos);
  if(!n || !isFactor(n)) return null;
  var j=c.arr.indexOf(n);
  c.arr.splice(j,1);
  c.pos=tokenStart(c.arr,j);       /* keep the caret on the spot it vacated */
  return n;
}
/* The number the user has just typed. On the real calculator the fraction key
   turns that number into the numerator, so "7" then the fraction key gives 7/□.
   The caret may sit before a trailing operator (12+34 with the caret after 34),
   so fall back to the second-to-last element, not only the last one. */
function takeTrailingNumber(){
  var c=cur();
  function numAt(i){ var n=c.arr[i]; return n && n.t==="num" && !n.base; }
  function digit(n){ return n.v.length===1 && n.v>="0" && n.v<="9"; }
  var j=insertIndex(c.arr,c.pos);
  var i=j-1;
  if(i<0 || !numAt(i)) return null;
  while(i>0 && numAt(i-1) && digit(c.arr[i-1])) i--;
  var num=c.arr.splice(i,1)[0];
  c.pos=tokenStart(c.arr,i);
  return num;
}
/* leave the template the cursor is inside, landing just before/after the
   template node in its parent frame. Unlike moveLeft()/moveRight() this always
   leaves, so an empty slot cannot swallow the caret. */
function leaveField(dir){
  var f=stack.pop(), p=cur(), idx=p.arr.indexOf(f.node);
  if(idx<0) idx=0;
  p.pos=tokenStart(p.arr,idx)+(dir<0?0:digitsIn(f.node));
}
/* When the cursor has just moved to a digit offset that lies inside a composite
   node, push frame(s) down to the innermost slot so editing happens in the right
   place. Boundaries between slots are left in the parent frame; the caller's
   next LEFT/RIGHT/UP/DOWN will cross them as needed. */
function descendAtCursor(){
  while(true){
    var c=cur();
    var n=tokenAt(c.arr, c.pos);
    if(!n) break;
    var ks=slotKeys(n);
    if(!ks) break;
    /* c.pos is an offset into the whole ARRAY, so measure it from the start of
       this node before comparing it against the slot widths */
    var off=c.pos-tokenStart(c.arr,c.arr.indexOf(n));
    var slot=null, rel=0;
    switch(n.t){
      case "frac":{
        var nd=slotDigits(n.num);
        if(off <= nd){ slot="num"; rel=off; }
        else { slot="den"; rel=off-nd; }
        break;
      }
      case "mixed":{
        var wd=slotDigits(n.whole), nd=slotDigits(n.num);
        if(off <= wd){ slot="whole"; rel=off; }
        else if(off <= wd+nd){ slot="num"; rel=off-wd; }
        else { slot="den"; rel=off-wd-nd; }
        break;
      }
      case "pow":{
        /* Offsets of a power: [base block][^][exponent block]. The "^" offset
           (bd) is the BASE side of the shared boundary; bd+1 is the exponent
           side. Keeping the offset means one screen position maps to one slot,
           so RIGHT walks base -> exponent and LEFT walks exponent -> base. */
        var bd=slotDigits(n.base);
        if(off<=bd){ slot="base"; rel=Math.min(off,arrDigits(n.base)); }
        else { slot="exp"; rel=off-bd-1; }
        break;
      }
      case "sqrt":{
        slot="body"; rel=off;
        break;
      }
      case "root":{
        var nd=slotDigits(n.n);
        if(off <= nd){ slot="n"; rel=off; }
        else { slot="body"; rel=off-nd; }
        break;
      }
      case "paren": case "abs":{
        slot="body"; rel=off;
        break;
      }
      case "func":{
        slot="arg"; rel=off;
        break;
      }
      case "logbase":{
        var bd=slotDigits(n.base);
        if(off <= bd){ slot="base"; rel=off; }
        else { slot="arg"; rel=off-bd; }
        break;
      }
      case "intg":{
        var bd=slotDigits(n.body), ld=slotDigits(n.lower);
        if(off <= bd){ slot="body"; rel=off; }
        else if(off <= bd+ld){ slot="lower"; rel=off-bd; }
        else { slot="upper"; rel=off-bd-ld; }
        break;
      }
      case "deriv":{
        var bd=slotDigits(n.body);
        if(off <= bd){ slot="body"; rel=off; }
        else { slot="at"; rel=off-bd; }
        break;
      }
      case "sum": case "prod":{
        var ld=slotDigits(n.lower), ud=slotDigits(n.upper);
        if(off <= ld){ slot="lower"; rel=off; }
        else if(off <= ld+ud){ slot="upper"; rel=off-ld; }
        else { slot="body"; rel=off-ld-ud; }
        break;
      }
    }
    if(!slot) break;
    var slotArr=n[slot];
    rel=Math.max(0, Math.min(rel, arrDigits(slotArr)));
    stack.push({arr:slotArr, pos:rel, node:n, slot:slot});
  }
}
/* ---- 4. movement: the Cursor Navigator ---------------------------------------
   LEFT / RIGHT / UP / DOWN are the only four entry points that move the caret;
   dispatch() calls moveLeft / moveRight / moveUp / moveDown and nothing else.
   The power cases below are the movement side of the boundary model described
   under POWER KEYS / PowerContext: a power's base end, the "^" offset and the
   exponent start are three coordinates of one screen position, and Phase 4 of
   the v3 plan is what unifies them. Until then those cases are load-bearing and
   stay as they are. moveField() is the shared UP/DOWN body. */
/* ---- Phase 4: boundary unification helpers (doc 5.6 / 10.3) ----------------
   A power boundary (between base and exponent) keeps TWO stops, which is the
   "one extra press to step into the base" every calculator user expects:
       base@end   the base side  ("2|3")   - also where UP lands
       exp@0      the exponent side ("2|3")
   What is removed is only the THIRD state: when the exponent BEGINS with another
   power, that inner power's base@0 renders at the enclosing exponent's start, so
   it is folded into the enclosing exp@0 (canonLeadingBaseIntoExp). Without this
   folding a tower showed "2|34" three times in a row.
   Two more normalisations keep the tower ends sane:
     - a trailing exponent end becomes the DEEPEST one (LEFT, arriving from the
       right), so the invisible intermediate ends are not separate stops;
     - leaving a nested exponent end climbs straight out of the power (RIGHT), so
       exit is a single press.                                          */
function canonLeadingBaseIntoExp(){
  var c=cur();
  if(!(c.node && c.node.t==="pow" && c.slot==="base" && c.pos<=0)) return;
  if(stack.length<2) return;
  var f=stack[stack.length-2];
  if(f.slot==="exp" && f.arr.length && f.arr[0]===c.node){
    stack.pop();
    cur().pos=0;
  }
}
function canonDeepestExpEnd(){
  var guard=0;
  while(guard++<32){
    var c=cur();
    if(!(c.node && c.node.t==="pow" && c.slot==="exp" && c.pos>=arrDigits(c.arr))) return;
    var last=c.arr[c.arr.length-1];
    if(!last || last.t!=="pow") return;
    enterEnd(last,"exp");
  }
}
function climbOutOfNestedEnds(){
  var guard=0;
  while(guard++<32){
    var c=cur();
    if(!(c.node && c.node.t==="pow" && c.slot==="exp" && c.pos>=arrDigits(c.arr))) return;
    if(stack.length<2) return;
    var p=stack[stack.length-2];
    if(p.arr[p.arr.length-1]!==c.node) return;
    leaveField(1);
  }
}
/* The parent gap immediately in FRONT of a power renders at the same spot as
   that power's base@0 (before its first digit). Merge the two so navigation has
   one stop there: coming from the left, RIGHT steps into the base instead of
   resting on the gap; leaving the base, LEFT skips the gap in the same press
   (see moveLeftRaw). */
function canonGapBeforePower(){
  var c=cur();
  if(!c || !c.arr) return;
  var i=insertIndex(c.arr,c.pos);
  if(i<0 || i>=c.arr.length) return;
  var n=c.arr[i];
  if(!n || n.t!=="pow" || arrDigits(n.base)<=0) return;
  if(c.pos!==tokenStart(c.arr,i)) return;
  stack.push({arr:n.base,pos:0,node:n,slot:"base"});
}
function canonAfterLeft(){ canonGapBeforePower(); canonLeadingBaseIntoExp(); canonDeepestExpEnd(); }
function canonAfterRight(){ canonGapBeforePower(); canonLeadingBaseIntoExp(); }
function moveLeft(){ moveLeftRaw(); canonAfterLeft(); }
function moveRight(){ moveRightRaw(); canonAfterRight(); }
function moveLeftRaw(){
  var c=cur();
  if(afterAnswer){
    /* first LEFT after an answer: land on the far right */
    unwindCursor();
    stack[0].pos=arrDigits(root);
    afterAnswer=false;
    return;
  }
  /* The two ends of the expression are joined: stepping left past the very
     start lands on the very end. Only the top level wraps - inside a template
     slot the caret must stay in that slot. */
  if(stack.length<=1 && c.pos<=0 && arrDigits(c.arr)>0){
    stack[0].pos=arrDigits(c.arr);
    return;
  }
  /* sitting in an EMPTY exponent: that box has nothing to walk through, so
     LEFT leaves the power and lands just before it (it does not then wrap) */
  if(c.pos<=0 && emptyExpRect() && stack.length>1){
    leaveField(-1);
    return;
  }
  if(c.pos>0){
    /* Stepping onto a template must land in its LAST slot, not somewhere in the
       middle of its digit span: moving the offset back by one and then
       descending would stop inside whatever slot happens to contain that
       offset, which is why LEFT from "∫ … |" used to reach the lower limit
       instead of the upper one. */
    var host=tokenAt(c.arr,c.pos);
    var j=insertIndex(c.arr,c.pos)-1;
    if(host===null && j>=0) host=c.arr[j];        /* caret at a token's edge */
    if(host && host.t!=="num" && slotKeys(host)){
      c.pos=tokenStart(c.arr,j);
      enterEnd(host,lastSlot(host));
      return;
    }
    if(host && host.t==="num" && offsetInToken(c.arr,c.pos)>0){
      c.pos--;                                    /* one digit back in a number */
      return;
    }
    if(j>=0){
      var pv=c.arr[j], sk=lastSlot(pv);
      if(sk){ enterEnd(pv,sk); return; }
      c.pos=tokenStart(c.arr,j);
      return;
    }
    c.pos=0;
    return;
  }
  if(stack.length>1){
    var f=stack[stack.length-1];
    /* The start of an exponent that BEGINS with a power is not a place of its
       own: it is the end of that inner power's base. Walking into it directly
       keeps one spot on screen from having two caret states (exp@0 of the outer
       exponent versus base@0 of the inner one), which is what made a nested
       tower need an extra press at every level. */
    /* leaving an inner base: its left neighbour is the outer exponent's entry
       point, which normalisation pushes straight back in, so aim at the outer
       base instead */
    if(f.slot==="base" && c.pos<=0){
      if(stack.length>2){ leaveField(-1); return; }   /* nested: into the enclosing exponent */
      /* OUTERMOST base start: leaveField() lands on the parent gap in front of
         the power, which renders at the same spot and is merged into base@0 by
         canonGapBeforePower(). Step once more so LEFT really leaves the power -
         "1+|12^34" then goes straight to "1|+12^34" instead of stopping twice. */
      leaveField(-1);
      moveLeftRaw();
      return;
    }
    var keys=slotKeys(f.node);
    if(keys){
      var ki=keys.indexOf(f.slot);
      if(ki>0){
        /* A power's regions do not sit side by side: LEFT from the base must
           EXIT the power, not step into the exponent (that bounced the caret
           back into the very box it had just left). Other templates keep the
           region walk, which is what makes the fraction numerator/denominator
           behave. */
        if(f.node.t==="pow" && f.slot==="exp" && keys[ki-1]==="base"){
          /* enter the base at the base side of the boundary (base@end); that
             stop is the "step into the base" press the user expects, and a
             leading inner base@0 is folded into the enclosing exponent by
             canonLeadingBaseIntoExp() */
          stack.pop();
          enterEnd(f.node,"base");
          return;
        }
        if(f.node.t==="pow" && f.slot==="base"){ leaveField(-1); return; }
        stack.pop(); enterEnd(f.node,keys[ki-1]); return;  /* previous slot */
      }
    }
    leaveField(-1);
  }
}
function moveRightRaw(){
  var c=cur();
  var total=arrDigits(c.arr);
  /* an EMPTY exponent box is crossed, not stopped in (see emptyExpRect); the
     caret still has to be able to step INTO it, so only leave when the caret
     already sits at the box's own offset 0 */
  if(c.pos<=0 && emptyExpRect() && stack.length>1){
    leaveField(1);
    return;
  }
  /* At the end of a power's BASE the next position is the exponent, not the
     token after the power: this is the "base | exponent" boundary the power
     keys need (2|^4), and it makes RIGHT walk the power in reading order. */
  if(c.node && c.node.t==="pow" && c.slot==="base" && c.node.exp.length>0 && c.pos>=total){
    stack.pop();
    enter(c.node,"exp");
    return;
  }
  if(afterAnswer){
    /* first RIGHT after an answer: land on the far left */
    unwindCursor();
    stack[0].pos=0;
    afterAnswer=false;
    return;
  }
  /* stepping right past the very end lands on the very start (see moveLeft) */
  if(stack.length<=1 && total>0 && c.pos>=total){
    stack[0].pos=0;
    return;
  }
  /* Phase 4: at the very left of the expression RIGHT first steps INTO the
     first power's base at offset 0 - the same screen spot, i.e. the standard
     "enter the template" press. Without it RIGHT jumped straight to base@end,
     so LEFT/RIGHT were not reversible at the start. */
  if(stack.length<=1 && c.pos<=0){
    var first=c.arr[0];
    if(first && first.t==="pow" && arrDigits(first.base)>0){
      stack.push({arr:first.base,pos:0,node:first,slot:"base"});
      return;
    }
  }
  if(c.pos<total){
    c.pos++;
    descendAtCursor();
    return;
  }
  if(stack.length>1){
    var f=stack[stack.length-1];
    var keys=slotKeys(f.node);
    if(keys){
      var ki=keys.indexOf(f.slot);
      if(ki>=0 && ki<keys.length-1){ stack.pop(); enter(f.node,keys[ki+1]); return; }
    }
    leaveField(1);
    climbOutOfNestedEnds();   /* Phase 4: skip the invisible intermediate ends */
  }
}
/* DEL removes the single digit immediately left of the caret, which is also
   what "the caret is just past the fraction" should do: the right-hand slot is
   re-entered and its last digit removed. */
/* Delete the single digit left of the caret. Returns the caret offset to use,
   or -1 when there was nothing to delete. */
/* ---- 5. deletion ---- */
function delDigitIn(arr,pos){
  var at=offsetInToken(arr,pos);
  var j=insertIndex(arr,pos)-1;
  var host=tokenAt(arr,pos);
  if(host===null && j>=0) host=arr[j];        /* caret at that token's edge */
  /* (a) still digits left inside this number: drop just the one character */
  if(host && host.t==="num" && at>0){
    var str=String(host.v);
    host.v=str.slice(0,at-1)+str.slice(at);
    if(host.v===""){ var hi=arr.indexOf(host); arr.splice(hi,1); return tokenStart(arr,hi); }
    return pos-1;
  }
  /* (b) otherwise drop the whole token to the left of the caret */
  if(j>=0){
    arr.splice(j,1);
    return tokenStart(arr,j);
  }
  return -1;
}
/* true when the caret sits in the integrand (the integral's first slot in
   navigation order), reported together with the node so callers can act on it */
function caretInIntegrand(){
  var c=cur();
  return (c.node && c.node.t==="intg" && c.slot==="body") ? c.node : null;
}
/* Remove the integral wrapper around `n` and leave its contents in the parent
   array, i.e. pull the integrand out. Returns the frame the caret should move
   to, or null when `n` is not an integral. */
function detachIntegral(n){
  for(var d=stack.length-1;d>0;d--){
    if(stack[d].node===n){
      var parent=stack[d-1];
      stack.length=d;
      var idx=parent.arr.indexOf(n);
      if(idx<0) return null;
      var body=n.body.slice();
      parent.arr.splice.apply(parent.arr,[idx,1].concat(body));
      parent.pos=tokenStart(parent.arr,idx)+arrDigits(body);
      return parent;
    }
  }
  return null;
}
/* Walk backwards through the regions of `node` from `fromSlot`, deleting the
   last digit of the first non-empty region found. Returns true when a digit was
   removed, false when everything to its left is empty (i.e. the caret is at the
   template's left edge and there is nothing left to erase).

   The regions are taken in slotKeys() order, i.e. the order the caret walks
   them, so "the previous region" means "the one LEFT/RIGHT would have come
   from". The stack is rewound by one frame before entering the target slot, so
   a template nested inside the caller is left correctly. */
/* DEL at the very left edge of a template's first region: there is nothing to
   the left INSIDE the template, so take the template away and leave its
   contents (for a power, the base) in the parent expression. The caret lands
   just after those contents, so the boxed slot is gone with the wrapper. */
/* DEL at the start of an exponent box: drop that level of nesting and append
   the exponent's contents to the base, so the bracket disappears while nothing
   the user typed is lost:
       123^(|456)   -> 123456
       123^(|)      -> 123
       123^(|45^67) -> 12345^67      (the exponent held the power 45^67)
       123^(|^45)   -> 123^45   (the exponent is lifted one level down)
   The caret lands at the end of the base, i.e. exactly where the merged content
   ends, so repeated DEL keeps walking left as usual. */
/* A base such as "123" is one token, but the caret has to be able to stand at
   its END with the exponent contents following, so the number is cut there and
   its digits become single-digit tokens. Nothing changes mathematically - only
   the positions the caret can occupy. */
function splitBaseTokens(base){
  if(!base || !base.length) return;
  var last=base[base.length-1];
  if(!last || last.t!=="num") return;
  var str=String(last.v);
  if(str.length<2) return;
  var parts=[];
  for(var i=0;i<str.length;i++) parts.push(node("num",{v:str.charAt(i)}));
  base.splice.apply(base,[base.length-1,1].concat(parts));
}
/* DEL at the START of an exponent box: drop that bracket and let everything it
   held move one level out, so nothing typed is lost.
 *
 * The exponent is usually a power of its own ("345^67"), and its content is
 * what sits LEFTMOST. That content becomes editable again by taking over the
 * bracket's old base slot, while the higher exponent stays an exponent:
 *
 *     12^(|345^67)   ->  12 345 ^67     i.e. 12345^67
 *     123^(|45^67)   ->  123 45 ^67     i.e. 12345^67
 *     123^(|45)      ->  123 45         i.e. 12345
 *     123^(|)        ->  123
 *     123^(|^45)     ->  123 ^45        i.e. 123^45   (nothing content-side)
 *
 * Only when there is NO content to move out (an empty or "bare exponent" box)
 * is the whole exponent truly discarded: "123^(|)" -> "123".
 * The caret ends up right of the base, i.e. exactly where the bracket was. */
/* DEL at the START of an exponent box: drop that bracket and let its contents
   move one level out, so nothing typed is lost.
 *
 * The exponent is usually a power of its own ("45^67"): then its CONTENT is
 * that power's base and the HIGHER EXPONENT is that power's exponent. The base
 * absorbs the content and the higher exponent stays an exponent attached to the
 * last content token:
 *
 *     12^(|345^67)  ->  12345^67
 *     123^(|45^67)  ->  12345^67
 *     123^(|45)     ->  12345
 *     123^(|^45)    ->  123^45     (no content, only the higher exponent)
 *     123^(|)       ->  123
 *
 * The caret ends up just right of the base, i.e. where the bracket used to be. */
function mergeExponentIntoBase(node){
  for(var d=stack.length-1;d>0;d--){
    if(stack[d].node===node){
      var parent=stack[d-1];
      stack.length=d;
      var idx=parent.arr.indexOf(node);
      if(idx<0) return;

      var outerBase=node.base, e=node.exp;
      var p=(e.length===1 && e[0] && e[0].t==="pow") ? e[0] : null;
      var content=(p ? p.base : e).slice();     /* what moves out next to the base */
      var higher =(p ? p.exp  : []).slice();    /* what stays an exponent        */

      /* the new base = outer base + content, with `higher` attached to whatever
         ends up last (a fresh power node, never a mutated number) */
      var newBase=outerBase.concat(content);
      if(!newBase.length) newBase=[T_num("0")];  /* never an empty base */
      if(higher.length){
        var last=newBase.pop();
        newBase.push(T_pow([last], higher));
      }
      /* Split the base so that the ORIGINAL base stays its own token(s). The
         caret must sit at the end of the original base, i.e. exactly where the
         deleted bracket began, even when the content ran on into a number:
             123^(|45)    -> 123|45
             123^(|456)   -> 123|456
             123^(|^45)   -> 123|^45
             123^(|45^67) -> 123|45^67      (not 12345|^67)
         "123" and "456" must therefore stay separate tokens - merging them into
         one number would leave the caret no place to stand. */
      splitBaseTokens(outerBase);
      parent.arr.splice.apply(parent.arr,[idx,1].concat(newBase));
      parent.pos=tokenStart(parent.arr,idx)+arrDigits(outerBase);
      return;
    }
  }
}
/* Remove a power's exponent box and keep its base where the power stood.
   Used by DEL at the base's right edge when the box is empty. */
function detachExponent(node){
  for(var d=stack.length-1;d>0;d--){
    if(stack[d].node===node){
      var parent=stack[d-1];
      stack.length=d;
      var idx=parent.arr.indexOf(node);
      if(idx<0) return;
      parent.arr.splice.apply(parent.arr,[idx,1].concat(node.base));
      parent.pos=tokenStart(parent.arr,idx)+arrDigits(node.base);
      return;
    }
  }
}
function unwrapTemplate(node){
  for(var d=stack.length-1;d>0;d--){
    if(stack[d].node===node){
      var parent=stack[d-1];
      stack.length=d;
      var idx=parent.arr.indexOf(node);
      if(idx<0) return;
      /* splice in every slot's contents so nothing typed is lost */
      var ins=[];
      var order=slotKeys(node)||[];
      for(var j=0;j<order.length;j++){
        var part=node[order[j]];
        if(part && part.length) ins=ins.concat(part);
      }
      parent.arr.splice.apply(parent.arr,[idx,1].concat(ins));
      parent.pos=tokenStart(parent.arr,idx)+arrDigits(ins);
      return;
    }
  }
}
function delIntoPreviousSlot(node,fromSlot,order){
  var keys=order||slotKeys(node);
  var i=keys?keys.indexOf(fromSlot):-1;
  for(var k=i-1;k>=0;k--){
    var arr=node[keys[k]];
    if(!arr) continue;
    if(arrDigits(arr)>0){
      stack.pop(); enterEnd(node,keys[k]);
      var f=cur(), np=delDigitIn(f.arr,f.pos);
      if(np>=0) f.pos=np;
      return true;
    }
  }
  return false;
}
/* ============================ DELETE CONTROLLER ============================ */
/* doDel() used to inline every deletion strategy, which is why the power rules
 * had to be re-derived here on top of the input and navigation copies. It is
 * now only a dispatcher; each strategy keeps its original body (moved verbatim,
 * with no "while we are here" edits) and the longest comment block moved with
 * it.
 *
 *   deletePower()          a power: D1-D8 of the v3 matrix
 *   deleteIntegral()       an integral: cross-slot backtrack + unwrap
 *   deleteNumber()         one digit left of the caret
 *   deleteTemplateEdge()   caret just right of a template: step back inside
 *   deleteIntoPrevSlot()   caret at a slot head: eat the previous slot's tail
 *   deleteEnclosingNode()  otherwise: drop the node/template the caret is in
 *   delDigitIn()           the shared primitive: one digit left of the caret
 */
function doDel(){
  var c=cur();
  var pt=powerDeleteTarget(c);
  if(pt){ deletePower(c,pt); return; }
  var bs=powerBaseStart(c);
  if(bs){ if(bs.merge) mergeExponentIntoBase(bs.merge); return; }
  var it=integralDeleteTarget(c);
  if(it){ deleteIntegral(it); return; }
  if(c.pos>0){
    if(deleteTemplateEdge(c)) return;
    deleteNumber(c);
    return;
  }
  if(stack.length<=1) return;
  if(deleteIntoPrevSlot()) return;
  deleteEnclosingNode();
}
/* DEL at the very START of a power's base (offset 0). The same screen spot is
 * reachable as "inside an exponent, at its left edge" when the power is the
 * leading content of an enclosing exponent, and the two used to disagree: the
 * base frame ate the outer base's last digit while the exponent frame collapsed
 * a level. Both now collapse one level, which is what "drop this nesting" means
 * visually:
 *      2|3^4   DEL  ->  2 3^4      (i.e. 23^4)
 * and at the very start of the whole expression DEL is a no-op instead of
 * throwing the power away:
 *      |2^3^4  DEL  ->  |2^3^4
 * Returns {merge:<outer pow>} to collapse, {} to do nothing, or null to let the
 * ordinary delete path run. */
function powerBaseStart(c){
  if(!(c.node && c.node.t==="pow" && c.slot==="base" && c.pos<=0)) return null;
  for(var d=stack.length-1;d>0;d--){
    var f=stack[d];
    if(f.slot==="exp" && f.arr.length && f.arr[0]===c.node) return {merge:f.node};
  }
  if(stack.length===2 && stack[0].arr.indexOf(c.node)===0) return {};
  return null;
}
/* The power whose delete rules apply at the caret, or null. `inExp` records
   whether the caret is in that power's exponent slot. Two ways in: the caret is
   inside the exponent, or it sits at the right edge of the base - including an
   EMPTY exponent box, the case that used to fall through and eat the base's
   last digit. */
function powerDeleteTarget(c){
  if(c.node && c.node.t==="pow" && c.slot==="exp") return {node:c.node,inExp:true};
  if(c.node && c.node.t==="pow" && c.slot==="base" && c.pos>=arrDigits(c.node.base)) return {node:c.node,inExp:false};
  return null;
}
/* --- power rules ------------------------------------------------------------
   The exponent box is walked in reading order (base, then exponent) and DEL
   never reaches from the exponent into the base as if the "^" were not there.

     * caret at the START of the exponent box: the whole bracket is removed and
       its contents are appended to the base, which is what "drop this level"
       means visually:
           123^(|456)   -> 123456
           123^(|)      -> 123
           123^(|45^67) -> 12345^67
           123^(|^45)   -> 123^45
     * elsewhere inside the exponent: erase one digit of the exponent;
     * at the base's right edge: act on the exponent box (remove it when empty,
       otherwise erase its last digit). */
/* DEL at the visual END of a nested structure must remove ONE digit of the
 * DEEPEST trailing token, not the whole inner subtree: at the end of "2^3^4"
 * the last token of the outer exponent is the power "3^4", and deleting that
 * token dropped a whole level (2^3^4| -> 2^□ instead of 2^(3^(□))).
 * This walks down the trailing last-slot chain and returns the innermost frame
 * that still holds something to delete, or null when there is nothing to
 * descend into (the top frame's last token is then a plain token).
 *
 * Integrals are skipped: their last NAVIGATION slot (upper) is not the printed
 * last element, so their trailing edge keeps its own rule. */
function enterDeepestTrailing(arr){
  var guard=0, deepest=null;
  while(guard++<64){
    if(!arr || !arr.length) break;
    var lastTok=arr[arr.length-1];
    if(!lastTok || lastTok.t==="intg" || !slotKeys(lastTok)) break;
    var ls=lastSlot(lastTok), sub=ls?lastTok[ls]:null;
    if(!sub || !sub.length) break;   /* empty trailing slot: caller handles it */
    enterEnd(lastTok,ls);
    deepest=cur();
    arr=sub;
  }
  return deepest;
}
/* remove one digit at the visual end of `frame`, descending through trailing
   templates first. Returns true when something was removed. */
function deleteAtTrailingEnd(frame){
  var f=enterDeepestTrailing(frame.arr)||frame;
  var np=delDigitIn(f.arr,f.pos);
  if(np<0) return false;
  f.pos=np;
  return true;
}
function deletePower(c,tgt){
  var powCtx=tgt.node, powInExp=tgt.inExp;
  if(powInExp && c.pos<=0){ mergeExponentIntoBase(powCtx); return; }
  if(powInExp){
    /* at the END of a nested exponent, delete one digit of the deepest trailing
       template rather than the whole inner power (2^3^4| -> 2^(3^(□))) */
    if(c.pos>=arrDigits(c.arr) && deleteAtTrailingEnd(c)) return;
    var npw=delDigitIn(c.arr,c.pos);
    if(npw>=0) c.pos=npw;
    return;
  }
  var hasExp=arrDigits(powCtx.exp)>0;
  if(!hasExp){ detachExponent(powCtx); return; }
  /* BASE side of the boundary (base@end): the character immediately left of the
     caret is the base's LAST DIGIT, so DEL erases that. It must not reach into
     the exponent - the reported bug was that DEL here jumped to the exponent's
     end and erased a digit there ("12|34" DEL used to give "12^3"; it now gives
     "1^34"). An EMPTY base has nothing to erase, so only then do we keep acting
     on the exponent (the old rule). */
  if(arrDigits(powCtx.base)>0){
    var nb=delDigitIn(c.arr,c.pos);
    if(nb>=0) c.pos=nb;
    return;
  }
  /* empty base: act at the END of the exponent, next to the "^"; the exponent
     frame may already exist parked at offset 0 */
  var ef=null;
  for(var pd=stack.length-1;pd>0;pd--){
    if(stack[pd].node===powCtx && stack[pd].slot==="exp"){ ef=stack[pd]; break; }
  }
  if(!ef){ ef={arr:powCtx.exp,pos:0,node:powCtx,slot:"exp"}; stack.push(ef); }
  ef.pos=arrDigits(powCtx.exp);
  if(deleteAtTrailingEnd(ef)) return;
  var enp=delDigitIn(ef.arr,ef.pos);
  if(enp>=0) ef.pos=enp;
}
/* The integral whose rules apply at the caret, together with the frame to act
   on, or null. At offset 0 the caret sits BEFORE the node's first character, so
   tokenAt() cannot see it; the enclosing template is still known from the
   frame. */
function integralDeleteTarget(c){
  if(c.node && c.node.t==="intg" && (c.slot==="body"||c.slot==="lower"||c.slot==="upper")) return {node:c.node,frame:c};
  for(var d=stack.length-1;d>0;d--){
    var fr=stack[d];
    if(fr.pos<=0 && fr.node && fr.node.t==="intg") return {node:fr.node,frame:fr};
  }
  return null;
}
/* --- integral rules ---------------------------------------------------------
   The caret walks the integral as integrand -> lower -> upper. DEL follows that
   walk:

     * in the middle of a region it just erases one digit to the left;
     * at the left edge of a later region it erases the last digit of the
       previous region instead (so DEL at the start of the lower bound eats the
       end of the integrand);
     * at the left edge of the FIRST region, i.e. the left edge of the whole
       template, the integral itself is removed - and, because the integrand may
       still hold something, its contents are left behind in the parent
       expression rather than being thrown away.

   "Empty" uses arrDigits(), not slotDigits(): slotDigits() forces a minimum of
   one so empty slots stay reachable by the caret, which would make every slot
   look non-empty here. */
function deleteIntegral(tgt){
  var intNode=tgt.node, c=tgt.frame;
  if(c.pos>0){
    var np0=delDigitIn(c.arr,c.pos);
    if(np0>=0) c.pos=np0;
    return;
  }
  /* at the left edge of this region: walk backwards through the PRINTED order,
     or drop the template when nothing is left of it. The caret path is always
     [node, slot] at this point (tokenAt found the node, or the frame loop did),
     so popping one frame rewinds into the node's parent. */
  if(delIntoPreviousSlot(intNode,c.slot)) return;
  detachIntegral(intNode);
}
/* one digit immediately left of the caret */
function deleteNumber(c){
  var np=delDigitIn(c.arr,c.pos);
  if(np>=0) c.pos=np;
}
/* caret sitting just right of a template: step back inside it and delete its
   last digit, so "⌐12/34 |" + DEL leaves 12/3 instead of dropping the whole
   fraction. Returns false when the token at the trailing edge is not a
   template. */
function deleteTemplateEdge(c){
  var edge=tokenAtTrailingEdge(c.arr,c.pos);
  var ek=edge?lastSlot(edge):null;
  if(!ek) return false;
  enterEnd(edge,ek);
  /* descend through trailing templates so a nested tower loses ONE digit of
     its deepest level instead of the whole inner subtree */
  if(!deleteAtTrailingEnd(cur())) leaveField(1);
  return true;
}
/* at the head of a template slot: step back into the previous slot and delete
   its last digit, instead of dropping the whole template. Returns false when
   there is no such slot. */
function deleteIntoPrevSlot(){
  for(var i=stack.length-1;i>0;i--){
    var keys=slotKeys(stack[i].node);
    var ki=keys?keys.indexOf(stack[i].slot):-1;
    if(ki<=0) continue;                       /* not a slot, or the first one */
    var tnode=stack[i].node;
    stack.length=i;                           /* drop the frames inside the template */
    enterEnd(tnode,keys[ki-1]);
    var f=cur();
    if(f.pos>0){ var np2=delDigitIn(f.arr,f.pos); if(np2>=0) f.pos=np2; }
    return true;
  }
  return false;
}
/* otherwise drop the node/template the caret is inside */
function deleteEnclosingNode(){
  var ff=stack.pop(), p=cur();
  var idx=p.arr.indexOf(ff.node);
  if(idx>=0){ p.arr.splice(idx,1); p.pos=tokenStart(p.arr,idx); }
  else p.pos=0;
}
/* UP / DOWN keep the digit offset when they move between the slots of the
   template the cursor is inside, so ⌐12 with the caret after the "1" lands
   after the first digit of the denominator too. At either end of the slot list
   they step out of the template; false means "no enclosing template" so the
   caller can fall back to history recall. */
function moveField(dir){
  var c=cur(), keys=slotKeys(c.node);
  var i=keys?keys.indexOf(c.slot):-1;
  if(i>=0){
    /* N6 (doc 10.1): inside a power's EXPONENT, DOWN first advances within the
       exponent exactly like RIGHT (advance + descend). Without this, DOWN from
       the start of an exponent that holds a nested power left the whole tower
       and skipped the inner base/exponent, so UP and DOWN were not reversible.
       The guard `c.pos<total` keeps "2^3 DOWN" stepping out as before: there
       the exponent has nothing left to the right. */
    if(dir>0 && c.node && c.node.t==="pow" && c.slot==="exp" && c.pos<arrDigits(c.arr)){
      c.pos++;
      descendAtCursor();
      return true;
    }
    var j=i+dir;
    if(j<0 || j>=keys.length){
      if(stack.length>1){ leaveField(dir); return true; }
      return false;
    }
    var want=c.pos;                        /* digit offset to keep across slots */
    stack.pop(); enter(c.node,keys[j]);
    var t=cur();
    t.pos=Math.max(0,Math.min(want,arrDigits(t.arr)));   /* real offset inside the slot */
    return true;
  }
  /* Not inside a template: DOWN moves forward like RIGHT and descends into the
     composite node the caret lands in, so "⌐12/34 ⇥ |" re-enters the fraction
     rather than doing nothing. */
  if(dir>0){
    var tot=arrDigits(c.arr);
    if(c.pos<tot){
      c.pos++;
      descendAtCursor();
      return true;
    }
    if(stack.length>1){
      var f2=stack[stack.length-1];
      var k2=slotKeys(f2.node);
      if(k2){
        var ki2=k2.indexOf(f2.slot);
        if(ki2>=0 && ki2<k2.length-1){ stack.pop(); enter(f2.node,k2[ki2+1]); return true; }
      }
      leaveField(1);
      return true;
    }
  }
  return false;
}
/* the two vertical entry points of the Cursor Navigator interface */
function moveUp(){ return moveField(-1); }
function moveDown(){ return moveField(1); }
function doAC(){
  clearInput();
}

/* input tokens */
/* the caret is at the end of the array AND just after a number token: that
   number is the one further digits should extend */
function caretAtEnd(c){ return c.pos>=arrDigits(c.arr); }
/* the number token whose trailing edge the caret is at, if it is the last one */
function numToExtend(c){
  if(!caretAtEnd(c)) return null;
  var t=tokenAtTrailingEdge(c.arr,c.pos);
  return (t && t.t==="num")?t:null;
}
/* ---- 6. insertion: one helper per key ---- */
function inputDigit(d){
  startFreshIfResult();
  var c=cur();
  var pv=numToExtend(c);
  if(pv){
    pv.v=(pv.v==="0")?d:(pv.v+d);
    c.pos++;
  } else {
    ins(T_num(d));
  }
  maybeAutoAdvanceFraction(c);
}
/* After the numerator of a fraction has been filled by a number that was
   already typed ("7 ⌐"), move the caret down into the denominator the way the
   real calculator does. A fresh "⌐" keeps the caret in the numerator so a
   multi-digit numerator can still be typed, and a mixed fraction keeps it in
   the integer slot so UP/DOWN can visit every slot. */
function maybeAutoAdvanceFraction(c){
  if(!c.node || !caretAtEnd(c)) return;
  var n=c.node;
  if(n.t==="frac" && c.slot==="num" && n._absorbed && !n.den.length){ stack.pop(); enter(n,"den"); }
}
function inputBaseDigit(g){
  startFreshIfResult();
  var c=cur();
  var pv=numToExtend(c);
  if(pv && pv.base===S.base){
    pv.v+=g; c.pos++;
  } else {
    ins({t:"num",v:g,base:S.base});
  }
}
function inputDot(){
  startFreshIfResult();
  var c=cur();
  var pv=numToExtend(c);
  if(pv && pv.v.indexOf(".")<0){ pv.v+="."; c.pos++; }
  else ins(T_num("0."));
}
function inputOp(o){
  if(S.resultShown){ root=[T_var("Ans")]; stack=[{arr:root,pos:1}]; S.resultShown=false; }   /* pos 1 == just after Ans */
  var c=cur();
  if(caretAtEnd(c)){
    var pv=tokenAtTrailingEdge(c.arr,c.pos);
    if(pv && pv.t==="op" && pv.v!=="\u2220"){ pv.v=o; return; }
  }
  ins(T_op(o));
}
function inputVar(name){
  if(S.stoPending){ doStore(name); return; }
  startFreshIfResult();
  ins(T_var(name));
}
function inputConst(name){ startFreshIfResult(); ins(T_const(name)); }
function inputFunc(name){
  startFreshIfResult();
  var f=T_func(name);
  ins(f);
  enter(f,"arg");
}
/* a fraction is filled in whichever order the user prefers: "FRAC 7 3",
   "7 FRAC 3" (the 7 becomes the numerator) and "FRAC 7 → 3" all work */
function inputFrac(){
  startFreshIfResult();
  var num=takeTrailingNumber();
  var f=T_frac();
  if(num){ f.num.push(num); f._absorbed=true; }
  ins(f);
  enter(f,num?"den":"num");
}
function inputMixedFrac(){
  startFreshIfResult();
  var whole=takeTrailingNumber();
  var m=T_mixed();
  if(whole){ m.whole.push(whole); m._absorbed=true; }
  ins(m);
  enter(m,whole?"num":"whole");
}
function inputSqrt(){ startFreshIfResult(); var f=T_sqrt(); ins(f); enter(f,"body"); }
function inputCbrt(){ startFreshIfResult(); var f=T_root(); f.n.push(T_num("3")); ins(f); enter(f,"body"); }
function inputNthRoot(){ startFreshIfResult(); var f=T_root(); ins(f); enter(f,"n"); }
function inputPow(){
  if(insertPower(null)) return;
  startFreshIfResult();
  var base=takeOperand();
  var f=T_pow(base?[base]:[],[]);
  ins(f); enter(f,"exp");
}
function inputSquare(){ raisePower(2); }
function inputCube(){ raisePower(3); }
/* x^2 / x^3 in NORMAL position: the value left of the caret becomes the base of
   a new power. A caret inside a number is NUMBER_MIDDLE and already consumed by
   insertPower() -> opNumberMiddle(), which cuts the number so only its left part
   is raised ("12" with the caret after the 1 -> (1^2)2). That rule used to be
   duplicated here as well as in getPowerContext - exactly the drift the
   PowerContext refactor removes. */
function raisePower(k){
  if(insertPower(k)) return;
  startFreshIfResult();
  var c=cur();
  var b=takeLeftOf(c.arr,c.pos);
  ins(T_pow(b?[b]:[],[T_num(String(k))]));
}
function inputRecip(){ startFreshIfResult(); var b=takeOperand(); var f=T_frac(); f.num.push(T_num("1")); if(b) f.den.push(b); ins(f); if(!b) enter(f,"den"); }
function inputExp10(){ startFreshIfResult(); var f=T_pow([T_num("10")],[]); ins(f); enter(f,"exp"); }
function inputExpe(){ startFreshIfResult(); var f=T_pow([T_const("e")],[]); ins(f); enter(f,"exp"); }
function inputAbs(){ startFreshIfResult(); var f=T_abs(); ins(f); enter(f,"body"); }
function inputParen(){ startFreshIfResult(); var f=T_paren(); ins(f); enter(f,"body"); }
function inputCloseParen(){
  for(var i=stack.length-1;i>0;i--){
    if(stack[i].node && (stack[i].node.t==="paren"||stack[i].node.t==="abs"||stack[i].node.t==="func")){
      var pn=stack[i].node;
      stack.length=i;
      var p=cur();
      var idx=p.arr.indexOf(pn);
      p.pos=(idx<0?arrDigits(p.arr):tokenStart(p.arr,idx)+digitsIn(pn));
      return;
    }
  }
  ins(T_op(")"));
}
function inputPost(v){ startFreshIfResult(); ins(T_post(v)); }
/* Navigation order is integrand -> lower -> upper, so the caret starts in the
   integrand even though it is printed after the bounds. */
function inputIntg(){ startFreshIfResult(); var f=T_intg(); ins(f); enter(f,"body"); }
function inputDeriv(){ startFreshIfResult(); var f=T_deriv(); ins(f); enter(f,"body"); }
function inputSum(){ startFreshIfResult(); var f=T_sum(); ins(f); enter(f,"lower"); }
function inputProd(){ startFreshIfResult(); var f=T_prod(); ins(f); enter(f,"lower"); }
function inputLogBase(){ startFreshIfResult(); var f=T_logbase(); ins(f); enter(f,"base"); }
