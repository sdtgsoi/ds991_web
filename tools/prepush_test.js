#!/usr/bin/env node
// Exercise the actual publishing guard in an isolated fixture with fake Git.
const assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ds991-prepush-'));
try{
  fs.mkdirSync(path.join(dir,'tools'));
  fs.mkdirSync(path.join(dir,'bin'));
  fs.copyFileSync(path.join(__dirname,'prepush.sh'),path.join(dir,'tools','prepush.sh'));
  function executable(name,content){fs.writeFileSync(path.join(dir,name),content,{mode:0o755});}
  executable('sync.sh','#!/bin/bash\nexit 0\n');
  executable('bin/git',`#!/bin/bash
case "$1" in
  rev-parse)
    case "$2" in
      --git-dir) echo .git ;;
      --abbrev-ref)
        if [ "$3" = "--symbolic-full-name" ]; then
          [ "\${CASE:-}" != no-upstream ] || exit 1
          echo origin/main
        else echo main; fi ;;
    esac ;;
  config) echo origin ;;
  fetch) [ "\${CASE:-}" != offline ] ;;
  rev-list)
    if [ "\${CASE:-}" = bad-count ]; then exit 1
    elif [ "\${CASE:-}" = behind ]; then printf '1\\t0\\n'
    else printf '0\\t1\\n'; fi ;;
  status) [ "\${CASE:-}" != status-failed ] || exit 1; if [ "\${CASE:-}" = dirty ]; then echo ' M ds991.html'; fi ;;
esac
`);
  executable('bin/node',`#!/bin/bash
if [ "\${CASE:-}" = missing-node ]; then exit 127; fi
exit 0
`);
  // Deliberately failing node verifies that a failed test runner fails the guard.
  const scenarios=['clean','offline','no-upstream','dirty','behind','bad-count','missing-node','status-failed'];
  for(const scenario of scenarios){
    const result=spawnSync('/bin/bash',[path.join(dir,'tools','prepush.sh')],{
      encoding:'utf8',env:{...process.env,PATH:path.join(dir,'bin')+path.delimiter+process.env.PATH,CASE:scenario}});
    assert.equal(result.status,scenario==='clean'?0:1,scenario+'\n'+result.stdout+'\n'+result.stderr);
  }
  const skipped=spawnSync('/bin/bash',[path.join(dir,'tools','prepush.sh'),'--no-test'],{
    encoding:'utf8',env:{...process.env,PATH:path.join(dir,'bin')+path.delimiter+process.env.PATH,CASE:'clean'}});
  assert.equal(skipped.status,0);assert.match(skipped.stdout,/explicitly skipped/);
  fs.renameSync(path.join(dir,'bin','node'),path.join(dir,'bin','node-hidden'));
  const dirname=spawnSync('which',['dirname'],{encoding:'utf8'}).stdout.trim();
  fs.symlinkSync(dirname,path.join(dir,'bin','dirname'));
  const missing=spawnSync('/bin/bash',[path.join(dir,'tools','prepush.sh')],{
    encoding:'utf8',env:{...process.env,PATH:path.join(dir,'bin'),CASE:'clean'}});
  assert.equal(missing.status,1);assert.match(missing.stdout,/node not found/);
  console.log('10 publishing guard scenarios passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
