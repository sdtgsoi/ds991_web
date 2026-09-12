#!/usr/bin/env node
/*
 * Print getBoundingClientRect() (document coordinates, so margins and overflow
 * are included) for the elements matched by the given selectors, plus the LCD
 * pane they live in. Use it to check things visually overlap or overflow.
 *
 * Usage:
 *   node tools/rects.js ".lcd" ".bigop" ".bigop>.sym" ".bigop>.lim.tall"
 *   node tools/rects.js --keys "INTG 0 RIGHT 1 RIGHT XKEY" ".bigop" ".lim"
 *
 * --keys replays a key sequence first (same ids as the on-screen keys).
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
if(!sels.length){
  console.error('usage: node tools/rects.js [--keys "INTG 0 ..."] <selector> ...');
  process.exit(2);
}

const PORT=8942;
const ROOT=path.join(__dirname,"..");
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE=fs.mkdtempSync("/tmp/ds991_rect.");

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
  const port=9335;
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
  const r=await send("Runtime.evaluate",{expression:expr,returnByValue:true});
  console.log(JSON.stringify(r.result&&r.result.result?r.result.result.value:r.result,null,1));
  sock.close(); child.kill(); server.close(); fs.rmSync(PROFILE,{recursive:true,force:true});
  process.exit(0);
})().catch(e=>{ console.error(e.message); process.exit(1); });
