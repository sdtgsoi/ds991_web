#!/usr/bin/env node
// Check stale-source detection and prevent invalid source from reaching index.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..'),fixture=fs.mkdtempSync(path.join(os.tmpdir(),'ds991-sync-'));
try{
  fs.mkdirSync(path.join(fixture,'tools'));
  fs.mkdirSync(path.join(fixture,'src'));
  for(const name of ['sync.sh','ds991.html','index.html','tools/embed_sources.js',...fs.readdirSync(path.join(root,'src')).map(p=>'src/'+p)])
    fs.copyFileSync(path.join(root,name),path.join(fixture,name));
  const run=flag=>spawnSync('/bin/bash',[path.join(fixture,'sync.sh'),...(flag?[flag]:[])],{encoding:'utf8'});
  const read=name=>fs.readFileSync(path.join(fixture,name),'utf8');
  assert.equal(run('--check').status,0);
  const original=read('ds991.html');
  for(const name of fs.readdirSync(path.join(fixture,'src'))){
    fs.appendFileSync(path.join(fixture,'src',name),'\n// Changed source for synchronization test.\n');
    const before=read('ds991.html');
    assert.equal(run('--check').status,1,name);
    assert.equal(read('ds991.html'),before,'--check must not write');
    assert.equal(run().status,0,name);
    assert.equal(run('--check').status,0,name);
    assert.equal(read('ds991.html'),read('index.html'));
  }
  const published=read('index.html');
  fs.appendFileSync(path.join(fixture,'src','math-core.js'),'\nfunction (\n');
  assert.equal(run().status,1);
  assert.equal(read('index.html'),published,'invalid JavaScript must not reach published copy');
  fs.writeFileSync(path.join(fixture,'ds991.html'),original.replace('/* BEGIN GENERATED MATH CORE */',''));
  assert.notEqual(run().status,0);
  assert.equal(read('index.html'),published,'missing marker must not reach published copy');
  console.log('Source drift, read-only checks and invalid publication guards passed');
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
