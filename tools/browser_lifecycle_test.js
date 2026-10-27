#!/usr/bin/env node
/* Verify real child shutdown and bounded profile cleanup failure paths. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn}=require('node:child_process');
const {stopChrome,removeProfile}=require('./browser_lifecycle.js');

function startChild(script){
  const child=spawn(process.execPath,['-e',script],{stdio:['ignore','pipe','pipe']});
  const closed=new Promise(resolve=>child.once('close',resolve));
  const ready=new Promise((resolve,reject)=>{
    child.stdout.once('data',resolve);
    child.once('error',reject);
    child.once('close',()=>reject(new Error('child exited before ready')));
  });
  return {child,closed,ready};
}
(async()=>{
  let proc=startChild("process.on('SIGTERM',()=>process.exit(0));console.log('ready');setInterval(()=>{},1000)");
  await proc.ready;
  let requested=false;
  await stopChrome(proc.child,proc.closed,{requestClose:()=>{requested=true;proc.child.kill('SIGTERM');},graceMs:1000});
  assert.equal(requested,true);
  assert.equal(proc.child.exitCode,0);

  if(process.platform!=='win32'){
    proc=startChild("process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)");
    await proc.ready;
    await stopChrome(proc.child,proc.closed,{termMs:50,killMs:2000});
    assert.equal(proc.child.signalCode,'SIGKILL');
  }

  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ds991-lifecycle-test-'));
  try{
    fs.mkdirSync(path.join(profile,'Default'));
    fs.writeFileSync(path.join(profile,'Default','data'),'test');
    let attempts=0;
    await removeProfile(profile,{retryDelay:1,remove:async(...args)=>{
      if(++attempts<=2) throw Object.assign(new Error('busy'),{code:'ENOTEMPTY'});
      return fs.promises.rm(...args);
    }});
    assert.equal(attempts,3);
    assert.equal(fs.existsSync(profile),false);
    let failures=0;
    await assert.rejects(removeProfile(profile,{retries:2,retryDelay:1,remove:async()=>{
      failures++;throw Object.assign(new Error('still busy'),{code:'ENOTEMPTY'});
    }}),{code:'ENOTEMPTY'});
    assert.equal(failures,3);
    await assert.rejects(removeProfile(profile,{retryDelay:1,remove:async()=>{
      throw Object.assign(new Error('permission denied'),{code:'EACCES'});
    }}),{code:'EACCES'});
  }finally{await fs.promises.rm(profile,{recursive:true,force:true});}
  console.log('Browser lifecycle: graceful close, forced termination and profile cleanup checks passed');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
