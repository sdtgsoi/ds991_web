#!/usr/bin/env node
// Embed maintained sources in the directly runnable page without a bundler.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const file=path.join(root,'ds991.html');
const sources=[
  ['MATH CORE','math-core.js'],
  ['EXPRESSION EDITOR','expression-editor.js'],
  ['EXPRESSION RENDERER','expression-renderer.js'],
  ['SCREEN RENDERER','screen-renderer.js'],
  ['MENUS','menus.js']
];
const page=fs.readFileSync(file,'utf8');
let updated=page;
for(const [label,name] of sources){
  const begin='/* BEGIN GENERATED '+label+' */',end='/* END GENERATED '+label+' */';
  const source=fs.readFileSync(path.join(root,'src',name),'utf8').trimEnd();
  const start=updated.indexOf(begin),finish=updated.indexOf(end);
  if(start<0||finish<start||updated.indexOf(begin,start+1)>=0||updated.indexOf(end,finish+1)>=0)
    throw new Error('Missing or duplicate embedding markers: '+name);
  updated=updated.slice(0,start)+begin+'\n'+source+'\n'+end+updated.slice(finish+end.length);
}
if(process.argv[2]==='--check'){
  if(updated!==page){console.error('embedded sources out of sync: run ./sync.sh');process.exit(1);}
}else if(process.argv[2]==='--write'){
  if(updated!==page) fs.writeFileSync(file,updated);
}else{console.error('usage: node tools/embed_sources.js --check|--write');process.exit(2);}
