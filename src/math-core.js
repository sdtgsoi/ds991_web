/* Pure numerical core. Embedded by sync.sh; require() works without a DOM. */
var DS991Math = (function(){
  "use strict";
  function fail(){ var e=new Error("Math ERROR"); e.msg="Math ERROR"; throw e; }
  function z(re,im){ return {re:re,im:im||0}; }
  function add(a,b){ return z(a.re+b.re,a.im+b.im); }
  function sub(a,b){ return z(a.re-b.re,a.im-b.im); }
  function mul(a,b){ return z(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re); }
  function div(a,b){ var d=b.re*b.re+b.im*b.im; if(!d||!isFinite(d)) fail(); return z((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d); }
  function abs(a){ return Math.hypot(a.re,a.im); }
  function evalPoly(c,x){ var v=z(c[0],0); for(var i=1;i<c.length;i++) v=add(mul(v,x),z(c[i],0)); return v; }
  function realNthRoot(value,degree){
    if(!Number.isFinite(value)||!Number.isFinite(degree)||degree===0) fail();
    if(value<0){
      if(!Number.isInteger(degree)||Math.abs(degree%2)!==1) fail();
      var negative=-Math.pow(-value,1/degree);
      if(!Number.isFinite(negative)) fail();
      return negative;
    }
    var result=Math.pow(value,1/degree);
    if(!Number.isFinite(result)) fail();
    return result;
  }
  function polynomialRoots(coeff){
    if(!Array.isArray(coeff)||!coeff.length||!coeff.every(Number.isFinite)) fail();
    var c=coeff.slice();
    while(c.length>1&&c[0]===0) c.shift();
    var n=c.length-1;
    if(n<1||n>4) fail();
    // Normalize the polynomial: Durand-Kerner assumes a monic polynomial.
    var lead=c[0]; c=c.map(function(v){return v/lead;});
    if(!c.every(Number.isFinite)) fail();
    if(n===1){ if(!Number.isFinite(-c[1])) fail(); return [z(-c[1],0)]; }
    // Quadratics use a stable closed form, including exactly repeated roots.
    if(n===2){
      var scale=Math.max(1,Math.abs(c[1]),Math.sqrt(Math.abs(c[2])));
      var b=c[1]/scale,d=c[2]/scale/scale,disc=b*b-4*d;
      if(disc<0) return [z(-b*scale/2,Math.sqrt(-disc)*scale/2),z(-b*scale/2,-Math.sqrt(-disc)*scale/2)];
      var q=-0.5*(b+(b>=0?1:-1)*Math.sqrt(disc));
      return q===0?[z(0,0),z(0,0)]:[z(q*scale,0),z(d/q*scale,0)];
    }
    // Exact zero roots are removed before iteration (avoids coincident seeds).
    if(c[n]===0) return polynomialRoots(c.slice(0,-1)).concat([z(0,0)]);
    // Scale x to keep the iterates near the unit circle.
    var radius=1;
    for(var k=1;k<=n;k++) radius=Math.max(radius,Math.pow(Math.abs(c[k]),1/k));
    var scaled=c.map(function(v,i){ for(var j=0;j<i;j++) v/=radius; return v; });
    for(var attempt=0;attempt<4;attempt++){
      var roots=[];
      for(var i=0;i<n;i++){
        var angle=2*Math.PI*(i+0.17+attempt*0.11)/n;
        roots.push(z(1.3*Math.cos(angle),1.3*Math.sin(angle)));
      }
      var valid=true;
      for(var iter=0;iter<1200;iter++){
        var delta=0,next=[];
        try{
          for(var i=0;i<n;i++){
            var den=z(1,0);
            for(var j=0;j<n;j++) if(i!==j) den=mul(den,sub(roots[i],roots[j]));
            var step=div(evalPoly(scaled,roots[i]),den);
            next.push(sub(roots[i],step)); delta=Math.max(delta,abs(step));
          }
        }catch(e){ valid=false; break; }
        roots=next;
        if(!roots.every(function(v){return Number.isFinite(v.re)&&Number.isFinite(v.im);})){valid=false;break;}
        if(delta<1e-12) break;
      }
      if(!valid) continue;
      // Check both residuals and reconstructed coefficients. Never publish an
      // unconverged root set just because the iteration budget was exhausted.
      var rebuilt=[z(1,0)];
      roots.forEach(function(root){
        var next=[rebuilt[0]];
        for(var i=1;i<=rebuilt.length;i++) next[i]=sub(i<rebuilt.length?rebuilt[i]:z(0,0),mul(root,rebuilt[i-1]));
        rebuilt=next;
      });
      var good=roots.every(function(v){return abs(evalPoly(scaled,v))<1e-9;})&&
        rebuilt.every(function(v,i){return abs(sub(v,z(scaled[i],0)))<1e-8;});
      if(good) return roots.map(function(v){
        var re=v.re*radius,im=v.im*radius;
        if(!Number.isFinite(re)||!Number.isFinite(im)) fail();
        return z(re,Math.abs(im)<1e-9*Math.max(1,Math.abs(re))?0:im);
      });
    }
    fail();
  }
  return {polynomialRoots:polynomialRoots,realNthRoot:realNthRoot};
})();
if(typeof module!=="undefined"&&module.exports) module.exports=DS991Math;
