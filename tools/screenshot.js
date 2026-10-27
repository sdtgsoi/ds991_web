#!/usr/bin/env node
const fs=require('node:fs');
const {withPage}=require('./browser.js');
(async()=>{
  const [out,keys='',width='520',height='940']=process.argv.slice(2);
  if(!out) throw new Error('usage: tools/shot.sh OUT.png [KEYS] [WIDTH] [HEIGHT]');
  await withPage(keys,async ({send})=>{
    const {data}=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(out,Buffer.from(data,'base64'));
  },{width:Number(width),height:Number(height)});
  console.log('wrote '+out);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
