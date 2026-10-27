// Embedded inside the application closure by sync.sh; shares its state/helpers.
/* ============================ RENDER ============================ */
/* One entry point, render(), which dispatches on the current mode, and one
   draw function per screen: calculation, menus, matrix, vector, statistics,
   table, equation, inequality and ratio. renderStatus() paints the status bar
   indicators above them. These read state and write HTML only. */
function render(){
  var calcEl=document.getElementById("calc");
  if(calcEl){
    calcEl.classList.toggle("shift-on",!!S.shift);
    calcEl.classList.toggle("alpha-on",!!S.alpha);
  }
  if(!S.power){ LCD.classList.add("power-off"); SCREEN.innerHTML=""; renderStatus(); return; }
  LCD.classList.remove("power-off");
  renderStatus();
  if(S.menu){ renderMenu(); return; }
  if(S.error){ renderError(); return; }
  if(S.message && (S.mode==="CALC"||S.mode==="CMPLX"||S.mode==="BASE")){ renderError(); return; }
  switch(S.mode){
    case "CALC": case "CMPLX": case "BASE": renderExprScreen(); break;
    case "MATRIX": renderMatrix(); break;
    case "VECTOR": renderVector(); break;
    case "STAT": renderStat(); break;
    case "TABLE": renderTable(); break;
    case "EQUATION": renderEquation(); break;
    case "INEQ": renderIneq(); break;
    case "RATIO": renderRatio(); break;
  }
}
function renderStatus(){
  LCD.style.filter="contrast("+S.contrast.toFixed(1)+")";
  function sd(el,on){ document.getElementById(el).classList.toggle("on",!!on); }
  sd("st-shift",S.shift); sd("st-alpha",S.alpha); sd("st-m",Math.abs(S.M)>1e-15);
  document.getElementById("st-deg").classList.toggle("on",S.angle==="DEG");
  document.getElementById("st-rad").classList.toggle("on",S.angle==="RAD");
  document.getElementById("st-gra").classList.toggle("on",S.angle==="GRA");
  var mod=document.getElementById("st-mod");
  mod.className="mod-banner"+((S.shift||S.alpha)?" on":"");
  mod.textContent=S.shift?"SHIFT":(S.alpha?"ALPHA":"");
  document.getElementById("st-mode").textContent=S.mode==="CALC"?"CALC":(S.mode==="CMPLX"?"CMPLX":(S.mode==="BASE"?("BASE "+baseSub(S.base)):MODE_META[S.mode].name.slice(0,4).toUpperCase()));
  document.getElementById("st-fmt").textContent=S.fmt.mode!=="NORM"?S.fmt.mode:S.base!==10?"":S.io;
}
function renderMenu(){
  var m=S.menu,start=menuPageStart(m),pages=Math.max(1,Math.ceil(m.items.length/m.perPage));
  var title=m.type==="MAIN"?m.items[m.index].label:m.title;
  var html='<div class="menu-panel"><div class="menu-header"><span>'+esc(title)+'</span>'+
    (m.parent?'<span class="menu-back">◀</span>':'')+'</div>';
  if(m.type==="MAIN"){
    html+='<div class="menu-grid">';
    m.items.forEach(function(it,i){html+='<button class="menu-item '+(i===m.index?'sel':'')+'" data-mi="'+i+'">'+
      '<span class="ico">'+esc(it.ico)+'</span><span>'+esc(it.label)+'</span></button>';});
    html+='</div>';
  }else if(m.type==="DIGITS"){
    html+='<div class="menu-prompt">'+menuText('Press a digit: 0–9','请按数字键：0–9')+'</div>';
  }else if(m.type==="CONTRAST"){
    html+='<div class="menu-prompt">◀ '+Math.round((S.contrast-0.5)*10)+' ▶</div>';
  }else{
    html+='<div class="menu-list '+(m.symbols?'menu-symbols':'')+'"'+
      (m.symbols?' style="grid-template-columns:repeat('+m.cols+',minmax(0,1fr))"':'')+'>';
    for(var i=start;i<Math.min(start+m.perPage,m.items.length);i++){
      var it=m.items[i],key=m.symbols?MENU_SHORTCUTS[i-start]:String(i-start+1);
      html+='<button class="menu-row '+(i===m.index?'sel':'')+(it.unavailable?' unavailable':'')+'" data-mi="'+i+'"'+
        (it.unavailable?' aria-disabled="true"':'')+'><span class="menu-shortcut">'+esc(key)+'</span><span>'+esc(it.label)+(it.unavailable?' *':'')+'</span></button>';
    }
    html+='</div>';
  }
  if(m.notice)html+='<div class="menu-notice">'+esc(m.notice)+'</div>';
  html+='<div class="menu-footer"><span>'+menuText('AC: close','AC：关闭')+'</span>'+
    (pages>1?'<span>'+((start>0?'▲ ':'')+(start+m.perPage<m.items.length?'▼ ':'')+(Math.floor(start/m.perPage)+1)+'/'+pages)+'</span>':'')+'</div></div>';
  SCREEN.innerHTML=html;
  Array.prototype.forEach.call(SCREEN.querySelectorAll('[data-mi]'),function(el){
    el.addEventListener('pointerdown',function(e){e.preventDefault();S.menu.index=Number(el.getAttribute('data-mi'));selectMenuItem();});
    el.addEventListener('click',function(e){if(e.detail===0){S.menu.index=Number(el.getAttribute('data-mi'));selectMenuItem();}});
  });
}
function renderError(){
  SCREEN.innerHTML='<div class="exprwrap"><div class="prompt" style="font-size:15px;text-align:center;padding-top:30px">'+esc(S.error)+'</div>'+
    '<div class="prompt" style="text-align:center;font-size:10px;margin-top:12px">[AC] : Cancel</div></div>';
}
function renderExprScreen(){
  hideCaret=!!(S.resultShown||S.error||S.menu);
  var html='<div class="exprwrap">';
  if(S.stoPending){ html+='<div class="prompt">STO \u2192 ?</div>'; }
  if(S.calcPending){ html+='<div class="prompt">'+esc(S.calcPending.prompt)+'</div>'; }
  html+='<div class="exprline" id="exprline">'+renderArr(root,rootCtx())+'</div>';
  html+='<div class="resultline" id="resultline">'+(S.resultShown?S.resultHTML:"")+'</div>';
  html+='</div>';
  SCREEN.innerHTML=html;
  var el=document.getElementById("exprline");
  if(el){
    ensureCursorVisible(el);
  }
}
/* The real bounding box of the rendered expression, measured from the DOM.
 * Nested exponents use a relative offset, so the browser's idea of the line
 * height is smaller than what is actually drawn; this is what tells us how far
 * the drawing sticks out above the line box. */
function calculateExpressionBounds(el){
  var wrap=el.parentElement;
  if(!wrap) return null;
  var wr=wrap.getBoundingClientRect();
  var box={top:Infinity,bottom:-Infinity,left:Infinity,right:-Infinity};
  var parts=el.querySelectorAll(".sup,.math,.num,.cursor");
  if(!parts || !parts.length) parts=[el];
  for(var i=0;i<parts.length;i++){
    var r=parts[i].getBoundingClientRect();
    if(!r.width && !r.height) continue;
    if(r.top    <box.top)    box.top   =r.top;
    if(r.bottom >box.bottom) box.bottom=r.bottom;
    if(r.left   <box.left)   box.left  =r.left;
    if(r.right  >box.right)  box.right =r.right;
  }
  if(box.top===Infinity) return null;
  box.top-=wr.top; box.bottom-=wr.top; box.left-=wr.left; box.right-=wr.left;
  box.wrapHeight=wr.height; box.wrapWidth=wr.width;
  return box;
}
/* Keep the CARET inside the LCD. The expression is offset only as far as the
 * caret needs, and only when it would otherwise leave the visible area; the
 * offset is clamped so a very tall tower of exponents can never push the line
 * completely off screen. The caret wins over the rest of the expression. */
var MAX_VERTICAL_SHIFT=60;
function ensureCursorVisible(el){
  if(!el) return;
  var c=el.querySelector(".cursor");
  if(c && c.scrollIntoView) try{ c.scrollIntoView({block:"nearest",inline:"nearest"}); }catch(e){}
  if(!c){ el.style.transform=""; return; }
  var bounds=calculateExpressionBounds(el);
  if(!bounds) return;
  var cr=c.getBoundingClientRect();
  var wrap=el.parentElement.getBoundingClientRect();
  var pad=4;
  var caretTop=cr.top-wrap.top, caretBottom=cr.bottom-wrap.top;
  var shift=0;
  if(caretTop<pad) shift=pad-caretTop;
  else if(caretBottom>bounds.wrapHeight-pad) shift=bounds.wrapHeight-pad-caretBottom;
  if(shift>MAX_VERTICAL_SHIFT) shift=MAX_VERTICAL_SHIFT;
  if(shift<-MAX_VERTICAL_SHIFT) shift=-MAX_VERTICAL_SHIFT;
  if(shift) el.style.transform="translateY("+shift.toFixed(1)+"px)";
  else el.style.transform="";
}

function renderMatrix(){
  var m=S.matrix;
  var html='<div class="exprwrap">';
  if(S.message){ html+='<div class="prompt" style="color:#1a3f1a">'+esc(S.message)+'</div>'; }
  if(m.edit && m.edit.dimStage){
    html+='<div class="panel-title">Matrix '+m.edit.name+'</div>';
    html+='<div class="prompt" style="font-size:14px;margin-top:8px">Select size (1-4)<br>[1] 1\u00d71  [2] 2\u00d7\u00d72  [3] 3\u00d73  [4] 4\u00d74</div>';
  } else if(m.edit){
    var e=m.edit;
    html+='<div class="panel-title">Matrix '+e.name+'  ('+e.rows+'\u00d7'+e.cols+')</div>';
    html+='<table class="cells"><tbody>';
    for(var i=0;i<e.rows;i++){
      html+='<tr>';
      for(var j=0;j<e.cols;j++){
        var sel=(i===e.r && j===e.c);
        var txt=(i===e.r&&j===e.c&&S.matrix.buf!==null&&S.matrix.buf!==undefined)?S.matrix.buf:(e.data[i][j]===null?"":String(e.data[i][j]));
        html+='<td class="'+(sel?("sel "+(S.matrix.buf!==null?"curnum":"")):"")+'">'+esc(txt)+'</td>';
      }
      html+='</tr>';
    }
    html+='</tbody></table><div class="prompt" style="font-size:9px;margin-top:4px">Arrow: move  \u00b7  = : confirm  \u00b7  AC : exit edit</div>';
  } else {
    html+='<div class="panel-title">MATRIX</div>';
    ["A","B","C","D"].forEach(function(k){
      var mm=m[k];
      html+='<div class="kv"><b>Mat'+k+'</b>'+(mm?(mm.length+"\u00d7"+mm[0].length+"  "+matPreview(mm)):"(undefined)")+'</div>';
    });
    html+='<div class="prompt" style="font-size:9px;margin-top:6px">Press OPTN to define / operate</div>';
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function matPreview(a){ return "["+a.map(function(r){return r.join(" ");}).join("; ")+"]"; }
function renderVector(){
  var m=S.vector;
  var html='<div class="exprwrap">';
  if(S.message){ html+='<div class="prompt" style="color:#1a3f1a">'+esc(S.message)+'</div>'; }
  if(m.edit && m.edit.dimStage){
    html+='<div class="panel-title">Vector '+m.edit.name+'</div>';
    html+='<div class="prompt" style="font-size:14px;margin-top:8px">Select dimension<br>[2] 2D   [3] 3D</div>';
  } else if(m.edit){
    var e=m.edit;
    html+='<div class="panel-title">Vector '+e.name+'  ('+e.len+'D)</div>';
    html+='<table class="cells"><tbody><tr>';
    for(var j=0;j<e.len;j++){
      var sel=(j===e.c);
      var txt=(sel&&S.vector.buf!==null&&S.vector.buf!==undefined)?S.vector.buf:(e.data[j]===null?"":String(e.data[j]));
      html+='<td class="'+(sel?("sel "+(S.vector.buf!==null?"curnum":"")):"")+'">'+esc(txt)+'</td>';
    }
    html+='</tr></tbody></table><div class="prompt" style="font-size:9px;margin-top:4px">Arrow: move  \u00b7  = : confirm  \u00b7  AC : exit edit</div>';
  } else {
    html+='<div class="panel-title">VECTOR</div>';
    ["A","B","C","D"].forEach(function(k){
      var vv=m[k];
      html+='<div class="kv"><b>Vct'+k+'</b>'+(vv?("[ "+vv.join("  ")+" ]"):"(undefined)")+'</div>';
    });
    html+='<div class="prompt" style="font-size:9px;margin-top:6px">Press OPTN to define / operate</div>';
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function renderStat(){
  var st=S.stat;
  var html='<div class="exprwrap">';
  if(!st.type){
    html+='<div class="prompt" style="font-size:14px">Select Type</div>'+
      '<div class="prompt" style="margin-top:6px">[1] 1-Variable<br>[2] 2-Variable</div>';
  } else {
    html+='<div class="panel-title">STAT '+st.type+'</div>';
    html+='<table class="cells"><thead><tr><td class="head"></td>';
    html+='<td class="head">X</td>'+(st.type==="2var"?'<td class="head">Y</td>':"")+'</tr></thead><tbody>';
    for(var i=0;i<st.rows.length;i++){
      html+='<tr><td class="head" style="font-size:9px">'+(i+1)+'</td>';
      for(var j=0;j<(st.type==="2var"?2:1);j++){
        var sel=(st.r===i && st.c===j);
        var txt=(sel && st.buf!==null)?st.buf:st.rows[i][j];
        html+='<td class="'+(sel?("sel "+(st.buf!==null?"curnum":"")):"")+'">'+esc(txt)+'</td>';
      }
      html+='</tr>';
    }
    html+='</tbody></table>';
    if(st.results){
      var r=st.results;
      html+='<div class="stat-res" style="margin-top:5px">';
      html+='<span>n = '+r.n+'</span><span>\u03a3x = '+fmtReal(r.sumx)+'</span><span>\u0305x = '+fmtReal(r.mx)+'</span>';
      html+='<span>\u03c3x = '+fmtReal(r.px)+'</span><span>sx = '+fmtReal(r.sx)+'</span>';
      if(r.my!==undefined){ html+='<span>\u0305y = '+fmtReal(r.my)+'</span><span>\u03c3y = '+fmtReal(r.py)+'</span><span>sy = '+fmtReal(r.sy)+'</span>'; }
      if(r.a!==undefined){ html+='<span>a = '+fmtReal(r.a)+'</span><span>b = '+fmtReal(r.b)+'</span><span>r = '+fmtReal(r.r)+'</span>'; }
      html+='</div>';
    }
    html+='<div class="prompt" style="font-size:9px;margin-top:4px">Arrows: cell  \u00b7  = : confirm  \u00b7  OPTN: calc</div>';
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function renderTable(){
  var t=S.table;
  var html='<div class="exprwrap">';
  if(t.data){
    html+='<div class="panel-title">TABLE  f(x)'+(t.gOn?" / g(x)":"")+'</div>';
    html+='<div class="screen-scroll"><table class="tbl"><thead><tr><th>x</th><th>f(x)</th>'+(t.gOn?"<th>g(x)</th>":"")+'</tr></thead><tbody>';
    var from=Math.max(0,t.scroll), to=Math.min(t.data.length,t.scroll+6);
    for(var i=from;i<to;i++){
      html+='<tr><td>'+esc(t.data[i][0])+'</td><td>'+t.data[i][1]+'</td>'+(t.gOn?'<td>'+t.data[i][2]+'</td>':"")+'</tr>';
    }
    html+='</tbody></table></div><div class="prompt" style="font-size:9px">\u25b2\u25bc scroll \u00b7 AC exit</div>';
  } else {
    var steps=["f(x) =","g(x) =","Start:","End:","Step:"];
    html+='<div class="panel-title">TABLE</div>';
    html+='<div class="prompt">'+esc(steps[t.step])+'</div>';
    var showArr = (t.step===0)?t.f:((t.step===1)?t.g:root);
    html+='<div class="exprline" id="exprline">'+renderArr(showArr===root?root:showArr,rootCtx())+'</div>';
    if(t.step>=2){ html+='<div class="prompt">'+esc((t.step===2?t.start:(t.step===3?t.end:t.stepv)))+'</div>'; }
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function renderEquation(){
  var e=S.eq;
  var html='<div class="exprwrap">';
  if(!e.kind && S.mode==="EQUATION"){
    html+='<div class="prompt" style="font-size:14px">Equation</div><div class="prompt">[1] Simultaneous<br>[2] Polynomial</div>';
  } else if(!e.coeff.length){
    html+='<div class="panel-title">'+(e.kind==="sim"?"SIMULTANEOUS":"POLYNOMIAL")+'</div>';
    html+='<div class="prompt">[1] 2 unknowns/deg<br>[2] 3 unknowns/deg<br>[3] 4 unknowns/deg</div>';
  } else {
    var n=e.n;
    html+='<div class="panel-title">'+(e.kind==="sim"?"SIMUL EQUATION":"POLYNOMIAL")+'</div>';
    if(e.kind==="sim"){
      html+='<table class="cells"><tbody>';
      for(var i=0;i<n;i++){
        html+='<tr>';
        for(var j=0;j<n+1;j++){
          var idx=i*(n+1)+j; var sel=idx===e.sel;
          var txt=(sel&&e.buf!==null)?e.buf:String(e.coeff[idx]);
          html+='<td class="'+(sel?("sel "+(e.buf!==null?"curnum":"")):"")+'">'+esc(txt)+'</td>';
        }
        html+='</tr>';
      }
      html+='</tbody></table>';
    } else {
      html+='<div style="font-size:12px">';
      for(var k=0;k<=n;k++){
        var sel2=k===e.sel;
        var pw=n-k;
        html+='<span class="'+(sel2?"":"")+'" style="display:inline-block;min-width:36px;border:1px solid rgba(32,38,26,.4);margin:2px;text-align:center;'+(sel2?"box-shadow:inset 0 0 0 2px var(--lcd-ink);":"")+'">'+(sel2&&e.buf!==null?esc(e.buf):esc(String(e.coeff[k])))+'</span>'+(pw===0?"":("x"+(pw>1?'<sup>'+pw+'</sup>':"")))+(k<=n-1?' + ':'');
      }
      html+='</div>';
    }
    if(e.result) html+='<div class="stat-res" style="margin-top:5px">'+e.result+'</div>';
    html+='<div class="prompt" style="font-size:9px;margin-top:4px">Arrows: move \u00b7 = : confirm / solve</div>';
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function renderIneq(){
  var e=S.eq;
  var html='<div class="exprwrap">';
  if(!e.coeff.length){
    html+='<div class="panel-title">INEQUALITY</div>';
    html+='<div class="prompt">Degree & sign: OPTN<br>Current: degree '+e.n+', '+e.sign+'</div>';
  } else {
    html+='<div class="panel-title">INeq  degree '+e.n+'  '+e.sign+'</div>';
    html+='<div style="font-size:12px">';
    for(var k=0;k<=e.n;k++){
      var sel2=k===e.sel;
      var pw2=e.n-k;
      html+='<span style="display:inline-block;min-width:36px;border:1px solid rgba(32,38,26,.4);margin:2px;text-align:center;'+(sel2?"box-shadow:inset 0 0 0 2px var(--lcd-ink);":"")+'">'+(sel2&&e.buf!==null?esc(e.buf):esc(String(e.coeff[k])))+'</span>'+(pw2===0?"":("x"+(pw2>1?'<sup>'+pw2+'</sup>':"")))+(k<=e.n-1?' + ':'');
    }
    html+=' '+'<b>'+esc(e.sign)+'</b> 0</div>';
    if(e.result) html+='<div class="stat-res" style="margin-top:6px">'+esc(e.result)+'</div>';
    html+='<div class="prompt" style="font-size:9px;margin-top:4px">Arrows: move \u00b7 = : confirm</div>';
  }
  html+='</div>';
  SCREEN.innerHTML=html;
}
function renderRatio(){
  var r=S.ratio;
  var html='<div class="exprwrap">';
  html+='<div class="panel-title">RATIO  A : B = C : D</div>';
  html+='<div style="font-size:14px;display:flex;align-items:center;gap:6px;margin-top:6px">';
  for(var i=0;i<4;i++){
    if(i===1||i===3) html+='<span style="font-size:16px">'+(i===1?"=":":")+'</span>';
    var sel=i===r.sel;
    var val=(r.cells[i]===null)?"?":((sel&&r.buf!==null)?r.buf:r.cells[i]);
    html+='<span style="display:inline-block;min-width:44px;border:1px solid rgba(32,38,26,.5);text-align:center;padding:2px 4px;'+(sel?"box-shadow:inset 0 0 0 2px var(--lcd-ink);":"")+'">'+esc(val)+'</span>';
  }
  html+='</div>';
  if(r.result) html+='<div class="stat-res" style="margin-top:6px">'+r.result+'</div>';
  html+='<div class="prompt" style="font-size:9px;margin-top:4px">Arrows: move \u00b7 = : confirm  (leave one blank)</div>';
  html+='</div>';
  SCREEN.innerHTML=html;
}
