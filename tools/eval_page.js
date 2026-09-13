#!/usr/bin/env node
/*
 * Evaluate an arbitrary expression inside the real page (headless Chrome) and
 * print the result. rects.js/computed.js answer "where is it" and "what style
 * does it have"; this answers everything else - DOM text, why an element is
 * invisible, what a function returns - by running code in the page itself.
 *
 * Usage:
 *   node tools/eval_page.js --keys "2 POW 3" "document.getElementById('exprline').innerHTML"
 *   node tools/eval_page.js "JSON.stringify([].slice.call(document.querySelectorAll('.sup')).map(e=>[e.textContent,getComputedStyle(e).fontSize,e.getBoundingClientRect().top]))"
 *
 * --keys replays a key sequence first (same ids as the on-screen keys).
 */
const {spawn}=require("child_process");
const http=require("http");
const path=require("path");
const fs=require("fs");

const argv=process.argv.slice(2);
let keys="";
const parts=[];
for(let i=0;i<argv.length;i++){
  if(argv[i]==="--keys"){ keys=argv[++i]||""; }
  else parts.push(argv[i]);
}
if(!parts.length){
  console.error('usage: node tools/eval_page.js [--keys "..."] "<js expression>"');
  process.exit(2);
}
const expression=parts.join(" ");

const PORT=8946;
const ROOT=path.join(__dirname,"..");
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE=fs.mkdtempSync("/tmp/ds991_eval.");

const server=http.createServer((req,res)=>{
  const p=path.join(ROOT,decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p,(e,buf)=>{
    if(e){ res.writeHead(404); res.end("nope"); return; }
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    res.end(buf);
  });
});
const get=(url)=>new Promise((ok,bad)=>{
  http.get(url,r=>{ let d=""; r.on("data",c=>d+=c); r.on("end",()=>ok(JSON.parse(d))); }).on("error",bad);
});

(async()=>{
  await new Promise(r=>server.listen(PORT,"127.0.0.1",r));
  const port=9339;
  const url=`http://127.0.0.1:${PORT}/ds991.html`+(keys?`?keys=${encodeURIComponent(keys)}`:"");
  const child=spawn(CHROME,["--headless=old","--disable-gpu","--no-sandbox","--no-first-run",
    "--disable-extensions",`--user-data-dir=${PROFILE}`,`--remote-debugging-port=${port}`,url],{stdio:"ignore"});

  let targets=null;
  for(let i=0;i<80;i++){
    try{ targets=await get(`http://127.0.0.1:${port}/json`); if(targets&&targets.length) break; }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!targets||!targets.length){ console.error("devtools not reachable"); child.kill(); server.close(); process.exit(1); }
  const page=targets.find(t=>t.type==="page")||targets[0];
  const sock=new WebSocket(page.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  const send=(method,params)=>new Promise(res=>{ const i=++id; pending.set(i,res); sock.send(JSON.stringify({id:i,method,params})); });
  sock.addEventListener("message",ev=>{ const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); } });
  await new Promise(r=>sock.addEventListener("open",r));
  await new Promise(r=>setTimeout(r,1000));

  const r=await send("Runtime.evaluate",{expression:expression,returnByValue:true,awaitPromise:true});
  const res=r.result||{};
  if(res.exceptionDetails) console.error("EXCEPTION:", JSON.stringify(res.exceptionDetails.exception&&res.exceptionDetails.exception.description||res.exceptionDetails));
  console.log(JSON.stringify(res.result?res.result.value:res,null,1));
  sock.close(); child.kill(); server.close(); fs.rmSync(PROFILE,{recursive:true,force:true});
  process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
