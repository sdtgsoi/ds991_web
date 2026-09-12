#!/usr/bin/env node
/*
 * Print the browser's COMPUTED style for page elements, so cascade problems
 * (a rule losing on specificity) are visible as real rgb() values instead of
 * source text.
 *
 * Usage: node tools/computed.js [--keys "INTG 0 ..."] <selector> [selector ...]
 * Example: node tools/computed.js '.key[data-key="MENU"] .sl.right'
 *
 * --keys replays a key sequence first, so styles can be inspected for elements
 * that only exist once something has been typed (e.g. an integral template).
 */
const {spawn}=require("child_process");
const http=require("http");
const path=require("path");
const fs=require("fs");

const argv=process.argv.slice(2);
let keys="";
const sels=[];
for(let i=0;i<argv.length;i++){
  if(argv[i]==="--keys"){ keys=argv[++i]||""; }
  else sels.push(argv[i]);
}
if(!sels.length){ console.error('usage: node tools/computed.js [--keys "..."] <selector> [...]'); process.exit(2); }
const PORT=8940;
const ROOT=path.join(__dirname,"..");
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE=fs.mkdtempSync("/tmp/ds991_css.");

const server=http.createServer((req,res)=>{
  const p=path.join(ROOT,decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p,(e,buf)=>{
    if(e){ res.writeHead(404); res.end("nope"); return; }
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
    res.end(buf);
  });
});

function get(url){
  return new Promise((ok,bad)=>{
    http.get(url,r=>{ let d=""; r.on("data",c=>d+=c); r.on("end",()=>ok(JSON.parse(d))); })
      .on("error",bad);
  });
}

(async()=>{
  await new Promise(r=>server.listen(PORT,"127.0.0.1",r));
  const port=9333;
  const child=spawn(CHROME,[
    "--headless=old","--disable-gpu","--no-sandbox","--no-first-run","--disable-extensions",
    `--user-data-dir=${PROFILE}`,`--remote-debugging-port=${port}`,
    `http://127.0.0.1:${PORT}/ds991.html`+(keys?`?keys=${encodeURIComponent(keys)}`:"")
  ],{stdio:"ignore"});

  // wait for the devtools endpoint
  let targets=null;
  for(let i=0;i<60;i++){
    try{ targets=await get(`http://127.0.0.1:${port}/json`); if(targets&&targets.length) break; }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!targets||!targets.length){ console.error("chrome devtools not reachable"); child.kill(); server.close(); process.exit(1); }
  const ws=targets.find(t=>t.type==="page")||targets[0];

  const WebSocket=globalThis.WebSocket;
  const sock=new WebSocket(ws.webSocketDebuggerUrl);
  let id=0; const pending=new Map();
  const send=(method,params)=>new Promise(res=>{ const i=++id; pending.set(i,res); sock.send(JSON.stringify({id:i,method,params})); });
  sock.addEventListener("message",ev=>{
    const m=JSON.parse(ev.data);
    if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id); }
  });
  await new Promise(r=>sock.addEventListener("open",r));

  await new Promise(r=>setTimeout(r,1200));   // let the page finish rendering
  const expr=`(${JSON.stringify(sels)}).map(function(sel){
      var el=document.querySelector(sel);
      if(!el) return {sel:sel,found:false};
      var cs=getComputedStyle(el);
      return {sel:sel,found:true,text:(el.textContent||"").trim(),color:cs.color,
              fontSize:cs.fontSize,verticalAlign:cs.verticalAlign,
              display:cs.display,position:cs.position,
              matches:el.matches(".key.roundk .sl.right")};
    })`;
  const r=await send("Runtime.evaluate",{expression:expr,returnByValue:true});
  const val=r.result&&r.result.result?r.result.result.value:r.result;
  console.log(JSON.stringify(val,null,1));

  sock.close(); child.kill(); server.close(); fs.rmSync(PROFILE,{recursive:true,force:true});
  process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
