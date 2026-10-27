#!/usr/bin/env node
// Usage: node tools/eval_page.js [--keys "2 POW 3"] "<JavaScript expression>"
const {withPage,parseArgs}=require('./browser.js');
(async()=>{
  const {keys,parts}=parseArgs();
  if(!parts.length) throw new Error('Provide a JavaScript expression');
  console.log(JSON.stringify(await withPage(keys,({evaluate})=>evaluate(parts.join(' '))),null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
