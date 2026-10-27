#!/usr/bin/env node
// Usage: node tools/rects.js [--keys "..."] <selector> [selector ...]
const {withPage,parseArgs}=require('./browser.js');
(async()=>{
  const {keys,parts:sels}=parseArgs();
  if(!sels.length) throw new Error('Provide at least one CSS selector');
  const result=await withPage(keys,async ({evaluate})=>{
  const expr=`(${JSON.stringify(sels)}).map(function(sel){
      var els=Array.prototype.slice.call(document.querySelectorAll(sel));
      if(!els.length) return {sel:sel,found:0};
      return {sel:sel,found:els.length,boxes:els.map(function(el){
        var r=el.getBoundingClientRect();
        return {cls:el.className,text:(el.textContent||"").trim().slice(0,12),
                top:+r.top.toFixed(1),bottom:+r.bottom.toFixed(1),h:+r.height.toFixed(1),
                left:+r.left.toFixed(1),w:+r.width.toFixed(1)};
      })};
    })`;
    return evaluate(expr);
  });
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
