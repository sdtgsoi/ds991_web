#!/usr/bin/env node
// Usage: node tools/computed.js [--keys "..."] <selector> [selector ...]
const {withPage,parseArgs}=require('./browser.js');
(async()=>{
  const {keys,parts:sels}=parseArgs();
  if(!sels.length) throw new Error('Provide at least one CSS selector');
  const result=await withPage(keys,async ({evaluate})=>{
  const expr=`(${JSON.stringify(sels)}).map(function(sel){
      var el=document.querySelector(sel);
      if(!el) return {sel:sel,found:false};
      var cs=getComputedStyle(el);
      return {sel:sel,found:true,text:(el.textContent||"").trim(),color:cs.color,
              fontSize:cs.fontSize,verticalAlign:cs.verticalAlign,
              display:cs.display,position:cs.position,
              matches:el.matches(".key.roundk .sl.right")};
    })`;
    return evaluate(expr);
  });
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
