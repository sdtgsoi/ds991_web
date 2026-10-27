#!/usr/bin/env node
// CN X Calculate OPTN: manual pp.22/27 and the six-function menu layout.
const assert=require('node:assert/strict');
const {boot}=require('./page_harness.js');
let passed=0;
function page(){const p=boot();p.press=s=>s.split(' ').filter(Boolean).forEach(k=>p.calc.dispatch(k));return p;}
function test(name,fn){try{fn();passed++;}catch(e){console.error('FAIL '+name);throw e;}}
function near(actual,expected){assert.equal(typeof actual,'number');assert.ok(Number.isFinite(actual));assert.ok(Math.abs(actual-expected)<=(expected===0?1e-12:Math.abs(expected)*1e-11),actual+' != '+expected);}
function labels(p){return Array.from(p.calc.S.menu.items,it=>it.label);}
test('Calculate OPTN contains exactly the three real categories',()=>{
 const p=page();p.press('OPTN');assert.deepEqual(labels(p),['Hyperbolic Func','Angle Unit','Engineer Symbol']);
});
test('Chinese root menu labels',()=>{const p=page();p.calc.S.language='zh';p.press('OPTN');assert.deepEqual(labels(p),['双曲函数','角度单位','工程符号']);});
test('hyperbolic menu has six choices on one two-column page',()=>{const p=page();p.press('OPTN 1');assert.deepEqual(labels(p),['sinh','cosh','tanh','sinh⁻¹','cosh⁻¹','tanh⁻¹']);assert.equal(p.calc.S.menu.cols,2);assert.equal(p.calc.S.menu.perPage,6);});
test('angle menu is not the global angle setting',()=>{const p=page();p.press('5 0 OPTN 2');assert.deepEqual(labels(p),['°','r','g']);assert.equal(p.calc.S.angle,'DEG');p.press('AC');assert.equal(p.calc.evalExpr(),50);});
const prefixes=['m','μ','n','p','f','k','M','G','T','P','E'];
const exponents=[-3,-6,-9,-12,-15,3,6,9,12,15,18];
test('engineering menu contains all eleven prefixes in reference order',()=>{const p=page();p.press('OPTN 3');assert.deepEqual(labels(p),prefixes);assert.equal(p.calc.S.menu.perPage,11);});
const functions=[
 ['sinh','1',1.1752011936438014],['cosh','0',1],['tanh','1',0.7615941559557649],
 ['sinh⁻¹','0',0],['cosh⁻¹','1',0],['tanh⁻¹','DOT 5',0.5493061443340548]
];
for(const angle of ['DEG','RAD','GRA'])for(let i=0;i<functions.length;i++)test(functions[i][0]+' independent of '+angle,()=>{
 const p=page();p.calc.S.angle=angle;p.press('OPTN 1 '+(i+1)+' '+functions[i][1]+' RPAREN EQUALS');
 assert.equal(p.calc.S.menu,null);assert.equal(p.calc.S.error,null);near(p.calc.S.ans,functions[i][2]);
});
for(const [mode,inputs,expected] of [
 ['DEG',['180','3.141592653589793','200'],180],
 ['RAD',['180','3.141592653589793','200'],Math.PI],
 ['GRA',['180','3.141592653589793','200'],200]
])for(let unit=0;unit<3;unit++)test('explicit angle '+unit+' into '+mode,()=>{
 const p=page();p.calc.S.angle=mode;
 p.press(inputs[unit].split('').map(ch=>ch==='.'?'DOT':ch).join(' ')+' OPTN 2 '+(unit+1)+' EQUALS');
 assert.equal(p.calc.S.error,null);assert.equal(p.calc.S.angle,mode);near(p.calc.S.ans,expected);
});
test('manual example pi/2 radians into degrees',()=>{const p=page();p.press('LPAREN SHIFT EXP DIV 2 RPAREN OPTN 2 2 EQUALS');near(p.calc.S.ans,90);assert.match(p.screen(),/r/);});
test('manual example 50 gradians into degrees',()=>{const p=page();p.press('5 0 OPTN 2 3 EQUALS');near(p.calc.S.ans,45);});
test('explicit degree inside sine when global angle is RAD',()=>{const p=page();p.calc.S.angle='RAD';p.press('SIN 3 0 OPTN 2 1 RPAREN EQUALS');near(p.calc.S.ans,0.5);assert.equal(p.calc.S.angle,'RAD');});
for(let i=0;i<prefixes.length;i++)test('engineering prefix '+prefixes[i],()=>{
 const p=page();p.press('2 OPTN 3 '+(i<9?String(i+1):'ALPHA '+(i===9?'NEG':'DMS'))+' EQUALS');
 assert.equal(p.calc.S.error,null);near(p.calc.S.ans,2*Math.pow(10,exponents[i]));
 assert.ok(p.calc.getExpr().some(n=>n.t==='post'&&n.v==='ENG:'+prefixes[i]));
});
test('manual 500k entry equals 500000',()=>{const p=page();p.press('5 0 0 OPTN 3 6 EQUALS');near(p.calc.S.ans,500000);assert.match(p.screen(),/500k/);});
test('manual 999k plus 25k',()=>{const p=page();p.press('9 9 9 OPTN 3 6 ADD 2 5 OPTN 3 6 EQUALS');near(p.calc.S.ans,1024000);});
test('manual 3.75M divided by 25k',()=>{const p=page();p.press('3 DOT 7 5 OPTN 3 7 DIV 2 5 OPTN 3 6 EQUALS');near(p.calc.S.ans,150);});
test('engineering suffix has postfix precedence',()=>{const p=page();p.press('1 ADD 2 OPTN 3 6 EQUALS');near(p.calc.S.ans,2001);});
test('engineering suffix after answer applies to Ans',()=>{const p=page();p.press('2 ADD 3 EQUALS OPTN 3 6 EQUALS');near(p.calc.S.ans,5000);});
test('angle suffix after answer applies to Ans',()=>{const p=page();p.press('2 5 ADD 2 5 EQUALS OPTN 2 3 EQUALS');near(p.calc.S.ans,45);});
test('LEFT restores the parent selection',()=>{const p=page();p.press('OPTN 3 LEFT');assert.equal(p.calc.S.menu.type,'OPTN');assert.equal(p.calc.S.menu.index,2);assert.equal(labels(p)[2],'Engineer Symbol');});
for(const root of ['1','2','3'])test('AC cancels child '+root+' without editing',()=>{const p=page();p.press('1 ADD 2');const before=JSON.stringify(p.calc.getExpr());p.press('OPTN '+root+' AC');assert.equal(p.calc.S.menu,null);assert.equal(JSON.stringify(p.calc.getExpr()),before);});
test('invalid root number does not activate an unrelated function',()=>{const p=page();p.press('OPTN 4');assert.equal(p.calc.S.menu.type,'OPTN');assert.equal(p.calc.getExpr().length,0);});
test('inverse hyperbolic function renders the inverse label',()=>{const p=page();p.press('OPTN 1 5');assert.match(p.screen(),/cosh⁻¹/);assert.equal(p.calc.getCursor().slot,'arg');});
test('atanh(1) gives a calculator error',()=>{const p=page();p.press('OPTN 1 6 1 EQUALS');assert.equal(p.calc.S.error,'Math ERROR');});
test('acosh(0) gives a calculator error',()=>{const p=page();p.press('OPTN 1 5 0 EQUALS');assert.equal(p.calc.S.error,'Math ERROR');});
test('a suffix without an operand is a syntax error',()=>{const p=page();p.press('OPTN 3 6 EQUALS');assert.equal(p.calc.S.error,'Syntax ERROR');});
test('DEL removes an engineering suffix as one token',()=>{const p=page();p.press('5 OPTN 3 6 DEL EQUALS');near(p.calc.S.ans,5);});
test('a degree suffix renders without internal token metadata',()=>{const p=page();p.press('5 0 OPTN 2 1');assert.doesNotMatch(p.screen(),/ANGLE:/);assert.match(p.screen(),/°/);});
test('mode-specific OPTN menus stay independent',()=>{const p=page();p.press('MENU 2 OPTN');assert.equal(labels(p)[0],'Argument');assert.equal(p.calc.S.menu.items.length,6);p.press('AC MENU 3 OPTN');assert.equal(labels(p)[0],'DEC');});
test('right parenthesis closes hyperbolic argument before addition',()=>{const p=page();p.press('OPTN 1 1 0 RPAREN ADD 1 EQUALS');near(p.calc.S.ans,1);});
test('nested function right parentheses close one frame at a time',()=>{const p=page();p.press('OPTN 1 1 OPTN 1 2 0 RPAREN RPAREN ADD 1 EQUALS');near(p.calc.S.ans,2.1752011936438014);});
test('engineering suffix is inserted at a digit offset',()=>{const p=page();p.press('1 2 LEFT OPTN 3 6');assert.deepEqual(Array.from(p.calc.getExpr(),n=>n.v),['1','ENG:k','2']);p.press('EQUALS');near(p.calc.S.ans,2000);});
test('angle suffix is inserted at a digit offset',()=>{const p=page();p.press('5 0 LEFT OPTN 2 3');assert.deepEqual(Array.from(p.calc.getExpr(),n=>n.v),['5','ANGLE:GRA','0']);});
test('engineering prefix inside a fraction numerator',()=>{const p=page();p.press('FRAC 2 OPTN 3 6 DOWN 1 EQUALS');near(p.calc.S.ans,2000);});
console.log(passed+' Calculate OPTN checks passed, 0 failed');
