/* Chrome shutdown and temporary-profile cleanup, shared by browser probes. */
const fs=require('node:fs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitForClose(closed,ms){
  let timer;
  try{return await Promise.race([closed.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),ms);})]);}
  finally{clearTimeout(timer);}
}

async function stopChrome(child,closed,{requestClose,graceMs=2000,termMs=2000,killMs=5000}={}){
  if(!child||!child.pid) return;
  // Browser.close lets Chrome shut down its own helper processes and profile.
  // The CDP socket can disappear before a response arrives, so do not await one.
  if(requestClose){try{requestClose();}catch{/* Fall back to signals. */}}
  if(await waitForClose(closed,requestClose?graceMs:0)) return;
  if(child.exitCode===null&&child.signalCode===null) child.kill('SIGTERM');
  if(await waitForClose(closed,termMs)) return;
  if(child.exitCode===null&&child.signalCode===null) child.kill('SIGKILL');
  if(await waitForClose(closed,killMs)) return;
  throw new Error('Chrome did not close after forced termination');
}

async function removeProfile(profile,{remove=fs.promises.rm,retries=20,retryDelay=250}={}){
  for(let attempt=0;;attempt++){
    try{await remove(profile,{recursive:true,force:true});return;}
    catch(error){
      // Chrome helpers can briefly leave files behind while they finish exiting.
      if(!['ENOTEMPTY','EBUSY','EPERM','EMFILE','ENFILE'].includes(error.code)||attempt>=retries) throw error;
      await delay(retryDelay);
    }
  }
}
module.exports={stopChrome,removeProfile};
