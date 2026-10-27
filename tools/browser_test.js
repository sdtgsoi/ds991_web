#!/usr/bin/env node
// Real browser smoke tests, separate from the dependency-free DOM-shim suites.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const artifactDir=process.argv[2]==='--screenshots'?process.argv[3]:null;
if(artifactDir)fs.mkdirSync(artifactDir,{recursive:true});
const {withPage}=require('./browser.js');
(async()=>{
  for(const width of [390,1280]){
    await withPage('',async ({evaluate,send})=>{
      if(width===390) console.log('Browser: '+(await send('Browser.getVersion')).product);
      assert.equal(await evaluate('document.querySelectorAll("button[data-key]").length > 40'),true);
      const result=await evaluate(`(()=>{
        const calc=window.__calc;
        const press=s=>s.split(' ').forEach(k=>calc.dispatch(k));
        press('SHIFT SQRT NEG 8 EQUALS');
        const cube=calc.S.ans;
        press('MENU 8 OPTN 2 2 2 EQUALS 0 EQUALS NEG 2 EQUALS EQUALS');
        const polynomial=calc.S.eq.result;
        press('MENU 9 OPTN 1 2 EQUALS 0 EQUALS NEG 2 EQUALS EQUALS');
        const inequality=document.getElementById('screen').textContent;
        press('MENU 1 AC');
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'2',bubbles:true}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'+',bubbles:true}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'3',bubbles:true}));
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        const keyboard=calc.S.ans;
        const bounds=document.querySelector('.calculator').getBoundingClientRect();
        return {cube,polynomial,inequality,keyboard,fits:bounds.left>=0&&bounds.right<=innerWidth};
      })()`);
      assert.equal(result.cube,-2);
      assert.match(result.polynomial,/x1 = [−-]1\s+x2 = 1/);
      assert.match(result.inequality,/x < [−-]1\s+or\s+x > 1/);
      assert.equal(result.keyboard,5);
      assert.equal(result.fits,true);
      for(const [name,keys] of [
        ['calc-optn','OPTN'],['calc-hyperbolic','OPTN 1'],['calc-angle','5 0 OPTN 2'],['calc-engineering','5 0 0 OPTN 3'],
        ['complex-optn','MENU 2 OPTN'],['complex-formats','MENU 2 OPTN DOWN'],
        ['main','MENU'],['setup','SHIFT MENU'],['setup-last','SHIFT MENU DOWN DOWN DOWN'],
        ['constants','SHIFT 7 3'],['conversion','SHIFT 8 1'],
        ['statistics','MENU 6'],['inequality','MENU 9 1'],['ratio','MENU 0'],
        ['chinese','SHIFT MENU DOWN DOWN DOWN 1 2 SHIFT MENU'],
        ['calc-optn-zh','OPTN'],['calc-hyperbolic-zh','OPTN 1'],
        ['complex-optn-zh','MENU 2 OPTN'],['complex-formats-zh','MENU 2 OPTN DOWN']
      ]){
        const probe=await evaluate(`(()=>{
          const press=s=>s.split(' ').forEach(k=>window.__calc.dispatch(k));
          press('MENU 1 AC');press(${JSON.stringify(keys)});
          const screen=document.getElementById('screen').getBoundingClientRect();
          const items=[...document.querySelectorAll('#screen [data-mi]')];
          return {type:window.__calc.S.menu?.type,count:items.length,
            clipped:items.filter(el=>{const r=el.getBoundingClientRect();return r.left<screen.left-0.5||r.right>screen.right+0.5||r.top<screen.top-0.5||r.bottom>screen.bottom+0.5;}).map(el=>el.textContent),
            columns:document.querySelector('.menu-symbols')?getComputedStyle(document.querySelector('.menu-symbols')).gridTemplateColumns.split(' ').length:null,
            rows:items.map(el=>el.getBoundingClientRect().top),
            text:document.getElementById('screen').textContent};
        })()`);
        assert.ok(probe.type,name+' opens a menu');
        assert.ok(probe.count>0,name+' has buttons');
        assert.deepEqual(probe.clipped,[],name+' menu bounds at '+width);
        if(name==='chinese')assert.match(probe.text,/输入\/输出/);
        if(name==='calc-optn'){assert.equal(probe.count,3);assert.match(probe.text,/Hyperbolic Func/);assert.doesNotMatch(probe.text,/Abs|FACT/);}
        if(name==='calc-hyperbolic'){
          assert.equal(probe.count,6);assert.equal(probe.columns,2);
          assert.equal(probe.rows[0],probe.rows[1]);assert.ok(probe.rows[2]>probe.rows[0]);
        }
        if(name==='calc-angle')assert.equal(probe.count,3);
        if(name==='calc-engineering')assert.equal(probe.count,11);
        if(name==='calc-optn-zh')assert.match(probe.text,/双曲函数.*角度单位.*工程符号/);
        if(name==='complex-optn'){assert.equal(probe.count,4);assert.match(probe.text,/Argument.*Conjugate.*Real Part.*Imaginary Part/);assert.doesNotMatch(probe.text,/Abs|▶/);}
        if(name==='complex-optn-zh'){assert.equal(probe.count,4);assert.match(probe.text,/辐角.*共轭.*实部提取.*虚部提取/);}
        if(name.startsWith('complex-formats')){assert.equal(probe.count,2);assert.match(probe.text,/1▶r∠θ2▶a\+bi/);assert.match(probe.text,/2\/2/);}
        if(artifactDir){
          const {data}=await send('Page.captureScreenshot',{format:'png'});
          fs.writeFileSync(path.join(artifactDir,name+'-'+width+'.png'),Buffer.from(data,'base64'));
        }
      }
      const touch=await evaluate(`(()=>{
        const press=s=>s.split(' ').forEach(k=>window.__calc.dispatch(k));
        press('MENU 1 AC SHIFT MENU');
        document.querySelector('#screen [data-mi="1"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
        const child=window.__calc.S.menu.setting;
        document.querySelector('#screen [data-mi="1"]').click();
        return {child,angle:window.__calc.S.angle,closed:window.__calc.S.menu===null};
      })()`);
      assert.deepEqual(touch,{child:'angle',angle:'RAD',closed:true});
      const focused=await evaluate(`(()=>{
        const press=s=>s.split(' ').forEach(k=>window.__calc.dispatch(k));
        press('SHIFT MENU');
        const target=document.querySelector('#screen [data-mi="1"]');target.focus();
        target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        return window.__calc.S.menu.setting;
      })()`);
      assert.equal(focused,'angle');
      const calculateClick=await evaluate(`(()=>{
        const press=s=>s.split(' ').forEach(k=>window.__calc.dispatch(k));
        press('MENU 1 AC OPTN');
        document.querySelector('#screen [data-mi="0"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
        document.querySelector('#screen [data-mi="4"]').click();
        const inverse=document.getElementById('screen').textContent;
        press('1 RPAREN EQUALS');const inverseResult=window.__calc.S.ans;
        press('AC 2 OPTN 3');document.querySelector('#screen [data-mi="10"]').click();press('EQUALS');
        const engineering=window.__calc.S.ans;
        press('AC 5 0 OPTN 2');document.querySelector('#screen [data-mi="2"]').click();press('EQUALS');
        return {inverse,inverseResult,engineering,angleValue:window.__calc.S.ans,angleSetting:window.__calc.S.angle,error:window.__calc.S.error};
      })()`);
      assert.match(calculateClick.inverse,/cosh⁻¹/);assert.equal(calculateClick.inverseResult,0);
      assert.equal(calculateClick.engineering,2e18);assert.equal(calculateClick.error,null);
      assert.equal(calculateClick.angleSetting,'RAD');assert.ok(Math.abs(calculateClick.angleValue-Math.PI/4)<1e-12);
      const complexClick=await evaluate(`(()=>{
        const calc=window.__calc,press=s=>s.split(' ').forEach(k=>calc.dispatch(k));
        press('MENU 2 AC');calc.S.angle='DEG';calc.S.complexFormat='rect';press('OPTN');
        document.querySelector('#screen [data-mi="1"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
        press('2 ADD 3 ALPHA ENG RPAREN EQUALS');const conjugate=calc.S.ans;
        press('AC 1 ADD ALPHA ENG OPTN DOWN');
        const target=document.querySelector('#screen [data-mi="4"]');target.focus();
        target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
        press('EQUALS');const polar=document.getElementById('resultline').textContent;
        const ans=calc.S.ans;press('OPTN DOWN');document.querySelector('#screen [data-mi="5"]').click();press('EQUALS');
        const rect=document.getElementById('resultline').textContent;
        return {conjugate,polar,ans,rect,format:calc.S.complexFormat,error:calc.S.error};
      })()`);
      assert.deepEqual(complexClick.conjugate,{re:2,im:-3});assert.deepEqual(complexClick.ans,{re:1,im:1});
      assert.equal(complexClick.polar,'1.414213562∠45');assert.equal(complexClick.rect,'1+i');
      assert.equal(complexClick.format,'rect');assert.equal(complexClick.error,null);
    },{width,height:940});
    console.log('PASS browser width '+width);
  }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
