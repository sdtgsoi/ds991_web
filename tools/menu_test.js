#!/usr/bin/env node
const assert=require('node:assert/strict');
const {boot}=require('./page_harness.js');
let passed=0;
function test(name,fn){try{fn();passed++;}catch(e){console.error('FAIL '+name);throw e;}}
function page(){const p=boot();p.press=s=>s.split(' ').filter(Boolean).forEach(k=>p.calc.dispatch(k));return p;}
function close(a,b){assert.ok(Math.abs(a-b)<=Math.max(1e-300,Math.abs(b)*1e-11),a+' != '+b);}
function category(p,index){if(index>=4)p.press('DOWN');if(index>=8)p.press('DOWN');p.press(String(index%4+1));}
const alpha=['NEG','DMS','INV','SIN','COS','TAN','MPLUS'];
function symbol(p,index){if(index<9)p.press(String(index+1));else if(index<16)p.press('ALPHA '+alpha[index-9]);else p.press('SHIFT EQUALS');}
test('CN X has ten modes and selected title',()=>{const p=page();p.press('MENU');assert.equal(p.calc.S.menu.items.length,10);p.press('RIGHT');assert.match(p.screen(),/Complex/);p.press('OK');assert.equal(p.calc.S.mode,'CMPLX');});
test('setup has fourteen items and page-local numbering',()=>{const p=page();p.press('SHIFT MENU');assert.equal(p.calc.S.menu.items.length,14);assert.match(p.screen(),/Input\/Output/);p.press('DOWN 1');assert.equal(p.calc.S.menu.setting,'frac');assert.match(p.screen(),/ab\/c/);});
test('LEFT restores parent page and selection',()=>{const p=page();p.press('SHIFT MENU DOWN 2 LEFT');assert.equal(p.calc.S.menu.type,'SETUP');assert.equal(p.calc.S.menu.index,5);});
test('AC closes all menus without changing expression',()=>{const p=page();p.press('1 ADD 2 SHIFT MENU 2 AC');assert.equal(p.calc.S.menu,null);assert.equal(p.calc.evalExpr(),3);});
test('SHIFT does not move selection',()=>{const p=page();p.press('SHIFT MENU SHIFT');assert.equal(p.calc.S.menu.index,0);});
for(const [key,angle]of [['1','DEG'],['2','RAD'],['3','GRA']])test('angle choice '+angle,()=>{const p=page();p.press('SHIFT MENU 2 '+key);assert.equal(p.calc.S.angle,angle);assert.equal(p.calc.S.menu,null);});
test('Fix digits and decimal output',()=>{const p=page();p.press('SHIFT MENU 1 2 SHIFT MENU 3 1 3 1 DIV 7 EQUALS');assert.equal(p.calc.S.fmt.digits,3);assert.match(p.calc.S.resultHTML,/0\.143/);});
test('Sci zero means ten significant digits',()=>{const p=page();p.press('SHIFT MENU 3 2 0');assert.equal(p.calc.S.fmt.mode,'SCI');assert.equal(p.calc.S.fmt.digits,10);assert.match(p.calc.fmt(1),/1\.000000000/);});
test('Norm 1 small-number threshold',()=>{const p=page();p.press('SHIFT MENU 1 2 SHIFT MENU 3 3 1');assert.match(p.calc.fmt(0.005),/10/);});
test('Norm 2 small-number threshold',()=>{const p=page();p.press('SHIFT MENU 1 2 SHIFT MENU 3 3 2');assert.equal(p.calc.fmt(0.005),'0.005');});
test('mixed fraction setting',()=>{const p=page();p.press('SHIFT MENU DOWN 1 1 7 DIV 3 EQUALS');assert.equal(p.calc.S.fracForm,'mixed');assert.match(p.calc.S.resultHTML,/2<\/span>/);});
test('unsupported LINE choice leaves setting unchanged',()=>{const p=page();p.press('SHIFT MENU 1 3');assert.equal(p.calc.S.io,'MATH');assert.equal(p.calc.S.menu.type,'CHOICE');assert.match(p.screen(),/Not implemented/);});
test('unsupported setting is explicit',()=>{const p=page();p.press('SHIFT MENU 4');assert.equal(p.calc.S.menu.type,'SETUP');assert.match(p.screen(),/Not implemented/);});
test('menu language can be switched in both directions',()=>{const p=page();p.press('SHIFT MENU DOWN DOWN DOWN 1 2 SHIFT MENU');assert.match(p.screen(),/输入\/输出/);p.press('DOWN DOWN DOWN 1 1');assert.equal(p.calc.S.language,'en');});
test('contrast change survives settings reset',()=>{const p=page();p.press('SHIFT MENU DOWN DOWN DOWN 2 RIGHT AC');const contrast=p.calc.S.contrast;p.press('SHIFT 9 1 EQUALS');assert.equal(p.calc.S.contrast,contrast);});
test('reset must be confirmed and AC cancels',()=>{const p=page();p.calc.S.vars.A=42;p.press('SHIFT 9 2');assert.equal(p.calc.S.vars.A,42);assert.equal(p.calc.S.menu.type,'RESET_CONFIRM');p.press('AC');assert.equal(p.calc.S.vars.A,42);});
test('memory reset executes after confirmation',()=>{const p=page();p.calc.S.vars.A=42;p.press('SHIFT 9 2 EQUALS');assert.equal(p.calc.S.vars.A,0);});
test('all reset restores mode but preserves language',()=>{const p=page();p.calc.S.language='zh';p.calc.S.vars.A=42;p.press('MENU 2 SHIFT 9 3 EQUALS');assert.equal(p.calc.S.mode,'CALC');assert.equal(p.calc.S.vars.A,0);assert.equal(p.calc.S.language,'zh');});
test('settings reset restores fraction/exact defaults',()=>{const p=page();p.calc.S.fracForm='mixed';p.calc.S.exact=false;p.calc.S.angle='RAD';p.press('SHIFT 9 1 EQUALS');assert.equal(p.calc.S.fracForm,'improper');assert.equal(p.calc.S.exact,true);assert.equal(p.calc.S.angle,'DEG');});
test('polar output setting changes result',()=>{const p=page();p.press('SHIFT MENU DOWN 2 2 MENU 2 ALPHA ENG EQUALS');assert.match(p.calc.S.resultHTML,/1∠90/);});
test('complex roots may be disabled',()=>{const p=page();p.press('SHIFT MENU DOWN 4 2 MENU 8 OPTN 2 2 1 EQUALS 0 EQUALS 1 EQUALS EQUALS');assert.equal(p.calc.S.eq.result,'No Real Roots');});
test('table f-only skips g prompt',()=>{const p=page();p.press('SHIFT MENU DOWN DOWN 1 1 MENU 7 XKEY SQR EQUALS');assert.equal(p.calc.S.table.step,2);});
test('Base-N blocks constants and conversion',()=>{const p=page();p.press('MENU 3 SHIFT 7');assert.equal(p.calc.S.menu,null);p.press('SHIFT 8');assert.equal(p.calc.S.menu,null);});
test('constant speed-of-light path from manual',()=>{const p=page();p.press('SHIFT 7 1 3 EQUALS');assert.equal(p.calc.S.ans,299792458);assert.match(p.screen(),/c₀/);});
test('elementary charge is not Euler e',()=>{const p=page();p.press('SHIFT 7 2 3 EQUALS');close(p.calc.S.ans,1.602176565e-19);});
let constants=0;
for(let g=0;g<6;g++){
 const p=page();p.press('SHIFT 7');category(p,g);const items=JSON.parse(JSON.stringify(p.calc.S.menu.items));
 for(let i=0;i<items.length;i++)test('constant '+g+':'+items[i].label,()=>{const q=page();q.press('SHIFT 7');category(q,g);symbol(q,i);q.press('EQUALS');assert.equal(q.calc.S.error,null);close(q.calc.S.ans,items[i].val);constants++;});
}
assert.equal(constants,47);
test('CODATA 2010 Planck constant',()=>{const p=page();p.press('SHIFT 7 1 1 EQUALS');close(p.calc.S.ans,6.62606957e-34);});
test('conversion example from manual',()=>{const p=page();p.press('5 SHIFT 8 1 2 EQUALS');close(p.calc.S.ans,5/2.54);});
test('temperature is postfix and obeys expression precedence',()=>{const p=page();p.press('1 ADD 3 2 SHIFT 8 DOWN DOWN 1 1 EQUALS');close(p.calc.S.ans,1);});
test('conversion after answer keeps operand',()=>{const p=page();p.press('3 2 EQUALS SHIFT 8 DOWN DOWN 1 1 EQUALS');close(p.calc.S.ans,0);});
let conversions=0;
for(let g=0;g<9;g++){
 const p=page();p.press('SHIFT 8');category(p,g);const items=JSON.parse(JSON.stringify(p.calc.S.menu.items));
 for(let i=0;i<items.length;i++)test('conversion '+items[i].label,()=>{const q=page();q.press('1 SHIFT 8');category(q,g);symbol(q,i);q.press('EQUALS');assert.equal(q.calc.S.error,null);close(q.calc.S.ans,items[i].factor+(items[i].offset||0));conversions++;});
}
assert.equal(conversions,40);
test('Celsius to Fahrenheit absolute temperature',()=>{const p=page();p.press('1 0 0 SHIFT 8 DOWN DOWN 1 2 EQUALS');close(p.calc.S.ans,212);});
test('calorie is 15 degree calorie',()=>{const p=page();p.press('1 SHIFT 8 DOWN 3 4 EQUALS');close(p.calc.S.ans,4.1858);});
test('constant menu closes sticky modifiers',()=>{const p=page();p.press('SHIFT 7 1 SHIFT AC');assert.equal(p.calc.S.shift,false);});
test('decimal output applies to each calculation after S-D',()=>{const p=page();p.press('SHIFT MENU 1 2 1 DIV 2 EQUALS SD AC 1 DIV 3 EQUALS');assert.equal(p.calc.S.exact,false);assert.doesNotMatch(p.calc.S.resultHTML,/class="math frac"/);});
test('SHIFT equals calculates a fresh decimal result',()=>{const p=page();p.press('1 DIV 3 SHIFT EQUALS');close(p.calc.S.ans,1/3);assert.equal(p.calc.S.exact,false);});
test('cell editor does not consume reset shortcut',()=>{const p=page();p.press('MENU 6 1 SHIFT 9');assert.equal(p.calc.S.menu.type,'RESET');assert.equal(p.calc.S.stat.buf,null);});
test('constant inserts into a statistics cell',()=>{const p=page();p.press('MENU 6 1 SHIFT 7 1 3');assert.equal(p.calc.S.stat.buf,'299792458');p.press('EQUALS');assert.equal(p.calc.S.stat.rows[0][0],'299792458');});
test('conversion applies to a statistics cell',()=>{const p=page();p.press('MENU 6 1 5 SHIFT 8 1 2');close(Number(p.calc.S.stat.buf),5/2.54);});
test('constant inserts into an equation coefficient',()=>{const p=page();p.press('MENU 8 OPTN 2 2 SHIFT 7 DOWN 1 2');assert.equal(p.calc.S.eq.buf,'101325');});
test('equation mode opens type selector directly',()=>{const p=page();p.press('MENU 8');assert.equal(p.calc.S.menu.type,'EQTYPE');p.press('2 2');assert.equal(p.calc.S.eq.coeff.length,3);});
test('degree one is rejected for equation mode',()=>{const p=page();p.press('MENU 8 2 1');assert.equal(p.calc.S.eq.coeff.length,0);});
test('inequality entry selects degree then comparator',()=>{const p=page();p.press('MENU 9 1');assert.equal(p.calc.S.menu.type,'INEQ_SIGN');p.press('4');assert.equal(p.calc.S.eq.sign,'≤');assert.equal(p.calc.S.eq.coeff.length,3);});
test('ratio offers both unknown positions',()=>{const p=page();p.press('MENU 0 1 1 EQUALS 2 EQUALS 1 0 EQUALS EQUALS');assert.match(p.calc.S.ratio.result,/5/);assert.equal(p.calc.S.ratio.unknown,2);});
test('unsupported regression is explicit',()=>{const p=page();p.press('MENU 6 3');assert.equal(p.calc.S.menu.type,'STAT_TYPE');assert.match(p.screen(),/Not implemented/);assert.equal(p.calc.S.stat.type,null);});
test('table exit option returns to Calculate',()=>{const p=page();p.press('MENU 7 OPTN 1');assert.equal(p.calc.S.mode,'CALC');});
test('clear statistics resets cell cursor and buffer',()=>{const p=page();p.press('MENU 6 1 1 EQUALS 2 EQUALS 3 EQUALS 4 EQUALS 5 EQUALS OPTN 2 7 EQUALS');assert.equal(p.calc.S.stat.r,1);assert.equal(p.calc.S.stat.rows[0][0],'7');});
console.log(passed+' menu checks passed, 0 failed');
