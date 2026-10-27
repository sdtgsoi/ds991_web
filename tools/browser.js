/* Shared Chrome/CDP lifecycle for browser probes. Node 22+, no dependencies. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const http=require('node:http');
const {spawn,spawnSync}=require('node:child_process');
function chromePath(){
  if(process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium']:process.platform==='win32'?[
    path.join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),
    path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')]:[];
  for(const p of candidates) if(fs.existsSync(p)) return p;
  for(const name of ['google-chrome','google-chrome-stable','chromium','chromium-browser']){
    const result=spawnSync(name,['--version'],{stdio:'ignore'});
    if(!result.error&&result.status===0) return name;
  }
  throw new Error('Chrome not found; set CHROME_PATH to a Chrome/Chromium executable');
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function withPage(keys,action,{width=520,height=940}={}){
  const chrome=chromePath();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ds991-browser-'));
  const root=path.join(__dirname,'..');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!['/ds991.html','/index.html','/favicon.ico'].includes(pathname)||pathname==='/favicon.ico'){
      res.writeHead(404);res.end();return;
    }
    res.setHeader('Content-Type','text/html; charset=utf-8');
    fs.createReadStream(path.join(root,pathname.slice(1))).on('error',()=>res.destroy()).pipe(res);
  });
  let child,socket,spawnError,stderr='',sequence=0;
  const pending=new Map(),errors=[];
  function send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method));},15000);
      pending.set(id,{resolve,reject,timer});
      socket.send(JSON.stringify({id,method,params}));
    });
  }
  async function evaluate(expression){
    const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
    return result.result.value;
  }
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const args=['--headless','--disable-gpu','--no-first-run','--disable-extensions','--hide-scrollbars',
      '--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'];
    if(process.env.CHROME_NO_SANDBOX==='1') args.unshift('--no-sandbox');
    child=spawn(chrome,args,{stdio:['ignore','ignore','pipe']});
    child.once('error',e=>{spawnError=e;});
    child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-4000);});
    let devtoolsPort;
    for(let i=0;i<100;i++){
      if(spawnError) throw spawnError;
      if(child.exitCode!==null) throw new Error('Chrome exited: '+stderr);
      try{devtoolsPort=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{}
      await delay(100);
    }
    if(!devtoolsPort) throw new Error('Chrome DevTools startup timed out: '+stderr);
    const targets=await (await fetch(`http://127.0.0.1:${devtoolsPort}/json`,{signal:AbortSignal.timeout(5000)})).json();
    const page=targets.find(t=>t.type==='page');
    if(!page) throw new Error('Chrome did not create a page');
    socket=new WebSocket(page.webSocketDebuggerUrl);
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      const job=pending.get(message.id);
      if(job){clearTimeout(job.timer);pending.delete(message.id);message.error?job.reject(new Error(message.error.message)):job.resolve(message.result);}
    });
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(new Error('Chrome WebSocket failed')),{once:true});});
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride',{width:Number(width),height:Number(height),deviceScaleFactor:1,mobile:false});
    const url=`http://127.0.0.1:${server.address().port}/ds991.html?keys=${encodeURIComponent(keys||'')}`;
    await send('Page.navigate',{url});
    let ready=false;
    for(let i=0;i<100;i++){
      ready=await evaluate('document.readyState === "complete" && !!window.__calc');
      if(ready) break;
      if(errors.length) throw new Error(errors.join('\n'));
      await delay(100);
    }
    if(!ready) throw new Error('Calculator page startup timed out');
    const result=await action({evaluate,send,errors});
    if(errors.length) throw new Error(errors.join('\n'));
    return result;
  }finally{
    for(const job of pending.values()) clearTimeout(job.timer);
    if(socket) socket.close();
    if(child&&child.exitCode===null&&child.pid){
      await new Promise(resolve=>{child.once('exit',resolve);child.kill();setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');resolve();},2000).unref();});
    }
    await new Promise(resolve=>server.close(resolve));
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
}
function parseArgs(){
  const args=process.argv.slice(2),parts=[];let keys='';
  for(let i=0;i<args.length;i++){
    if(args[i]==='--keys'){if(i+1===args.length)throw new Error('--keys requires a sequence');keys=args[++i];}
    else parts.push(args[i]);
  }
  return {keys,parts};
}
module.exports={withPage,parseArgs};
