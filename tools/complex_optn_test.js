#!/usr/bin/env node
// CN X pp.34–35 / EX p.18, cross-checked with official EX QSG pp.11–12.
const assert=require('node:assert/strict');
const {boot}=require('./page_harness.js');
let passed=0;
function page(){const p=boot();p.press=s=>s.split(' ').filter(Boolean).forEach(k=>p.calc.dispatch(k));p.press('MENU 2');return p;}
function test(name,fn){try{fn();passed++;}catch(e){console.error('FAIL '+name);throw e;}}
function near(a,b,tolerance=1e-10){assert.equal(typeof a,'number');assert.ok(Math.abs(a-b)<tolerance*Math.max(1,Math.abs(b)),a+' != '+b);}
function complex(p,re,im){assert.equal(p.calc.S.error,null);near(p.calc.S.ans.re,re);near(p.calc.S.ans.im,im);}
function output(p){return p.calc.S.resultHTML.replace(/<[^>]*>/g,'');}
function labels(p){return Array.from(p.calc.S.menu.items,it=>it.label);}
const z='2 ADD 3 ALPHA ENG';
test('six items in manual order, no placeholders',()=>{const p=page();p.press('OPTN');assert.deepEqual(labels(p),['Argument','Conjugate','Real Part','Imaginary Part','▶r∠θ','▶a+bi']);assert.ok(p.calc.S.menu.items.every(it=>!it.unavailable));});
test('first page has exactly four functions',()=>{const p=page();p.press('OPTN');assert.equal(p.calc.S.menu.perPage,4);assert.match(p.screen(),/1\/2/);assert.doesNotMatch(p.screen(),/Abs|▶r∠θ|▶a\+bi/);});
test('second page restarts numbers at one',()=>{const p=page();p.press('OPTN DOWN');assert.equal(p.calc.S.menu.index,4);assert.match(p.screen(),/2\/2/);assert.match(p.screen(),/menu-shortcut">1<.*▶r∠θ.*menu-shortcut">2<.*▶a\+bi/);assert.doesNotMatch(p.screen(),/Argument|Conjugate/);});
test('Chinese labels match CN manual',()=>{const p=page();p.calc.S.language='zh';p.press('OPTN');assert.deepEqual(labels(p).slice(0,4),['辐角','共轭','实部提取','虚部提取']);});
test('page navigation clamps at ends',()=>{const p=page();p.press('OPTN UP');assert.equal(p.calc.S.menu.index,0);p.press('DOWN DOWN');assert.equal(p.calc.S.menu.index,4);p.press('UP');assert.equal(p.calc.S.menu.index,0);});
for(const [key,name] of [['1','arg'],['2','conj'],['3','re'],['4','im']])test('shortcut '+key+' opens '+name+' argument',()=>{const p=page();p.press('OPTN '+key);assert.equal(p.calc.S.menu,null);assert.equal(p.calc.getExpr()[0].name,name);assert.equal(p.calc.getCursor().slot,'arg');});
for(const [angle,expected] of [['DEG',45],['RAD',Math.PI/4],['GRA',50]])test('Arg(1+i) in '+angle,()=>{const p=page();p.calc.S.angle=angle;p.press('OPTN 1 1 ADD ALPHA ENG RPAREN EQUALS');assert.equal(p.calc.S.error,null);near(p.calc.S.ans,expected);assert.equal(p.calc.S.angle,angle);});
test('Conjg(2+3i) is 2−3i',()=>{const p=page();p.press('OPTN 2 '+z+' RPAREN EQUALS');complex(p,2,-3);assert.equal(output(p),'2−3i');});
test('ReP(2+3i) is 2',()=>{const p=page();p.press('OPTN 3 '+z+' RPAREN EQUALS');assert.equal(p.calc.S.ans,2);});
test('ImP(2+3i) is 3',()=>{const p=page();p.press('OPTN 4 '+z+' RPAREN EQUALS');assert.equal(p.calc.S.ans,3);});
test('function closing parenthesis leaves following addition outside',()=>{const p=page();p.press('OPTN 4 '+z+' RPAREN ADD 5 EQUALS');near(p.calc.S.ans,8);});
test('Abs remains available through its existing key',()=>{const p=page();p.press('SHIFT LPAREN 3 ADD 4 ALPHA ENG RIGHT EQUALS');near(p.calc.S.ans,5);});
for(const [angle,expected] of [['DEG',45],['RAD',Math.PI/4],['GRA',50]])test('polar command converts whole sum in '+angle,()=>{const p=page();p.calc.S.angle=angle;p.press('1 ADD ALPHA ENG OPTN DOWN 1 EQUALS');complex(p,1,1);const [r,t]=output(p).split('∠').map(Number);near(r,Math.sqrt(2),1e-9);near(t,expected,1e-9);assert.equal(p.calc.S.complexFormat,'rect');assert.equal(p.calc.S.angle,angle);});
test('rectangular command overrides global polar setting for this expression',()=>{const p=page();p.calc.S.complexFormat='polar';p.press(z+' OPTN DOWN 2 EQUALS');complex(p,2,3);assert.equal(output(p),'2+3i');assert.equal(p.calc.S.complexFormat,'polar');});
test('manual polar input 2∠45 to rectangular output',()=>{const p=page();p.press('2 SHIFT RPAREN 4 5 OPTN DOWN 2 EQUALS');complex(p,Math.sqrt(2),Math.sqrt(2));assert.doesNotMatch(output(p),/∠/);});
test('QSG polar input 2∠330 gives sqrt(3)−i',()=>{const p=page();p.press('2 SHIFT RPAREN 3 3 0 OPTN DOWN 2 EQUALS');complex(p,Math.sqrt(3),-1);});
test('suffix renders the manual glyph, not internal metadata',()=>{const p=page();p.press(z+' OPTN DOWN 1');assert.match(p.screen(),/▶r∠θ/);assert.doesNotMatch(p.screen(),/FORMAT:/);});
test('conversion from an answer starts with numeric Ans',()=>{const p=page();p.press(z+' EQUALS OPTN DOWN 1');assert.deepEqual(Array.from(p.calc.getExpr(),n=>n.name||n.v),['Ans','FORMAT:polar']);p.press('EQUALS');complex(p,2,3);assert.match(output(p),/∠/);});
test('Ans continues complex arithmetic after format conversion',()=>{const p=page();p.press(z+' OPTN DOWN 1 EQUALS ADD 1 EQUALS');complex(p,3,3);assert.equal(output(p),'3+3i');});
test('new expression does not inherit the override',()=>{const p=page();p.press(z+' OPTN DOWN 1 EQUALS 1 ADD ALPHA ENG EQUALS');complex(p,1,1);assert.equal(output(p),'1+i');});
test('new expression restores the global polar default',()=>{const p=page();p.calc.S.complexFormat='polar';p.press(z+' OPTN DOWN 2 EQUALS 1 ADD ALPHA ENG EQUALS');complex(p,1,1);assert.match(output(p),/∠45$/);});
test('S-D keeps the current expression output command',()=>{const p=page();p.press(z+' OPTN DOWN 1 EQUALS SD');assert.match(output(p),/∠/);assert.equal(p.calc.S.complexFormat,'rect');});
test('SETUP reformatting preserves the current expression command',()=>{const p=page();p.press(z+' OPTN DOWN 2 EQUALS SHIFT MENU DOWN 2 2');assert.equal(p.calc.S.complexFormat,'polar');assert.equal(output(p),'2+3i');});
test('history replay preserves command and numeric value',()=>{const p=page();p.press(z+' OPTN DOWN 1 EQUALS AC UP EQUALS');complex(p,2,3);assert.match(output(p),/∠/);assert.equal(p.calc.S.complexFormat,'rect');});
test('draft command replacement keeps a single suffix',()=>{const p=page();p.press(z+' OPTN DOWN 1 OPTN DOWN 2 EQUALS');complex(p,2,3);assert.equal(p.calc.getExpr().filter(n=>n.t==='post').length,1);assert.equal(output(p),'2+3i');});
test('command appends to whole expression from inside function slot',()=>{const p=page();p.press('OPTN 2 '+z+' OPTN DOWN 1 EQUALS');complex(p,2,-3);assert.equal(p.calc.getCursor().depth,1);assert.match(output(p),/∠/);});
test('command appends to whole number from a middle digit',()=>{const p=page();p.press('1 2 LEFT OPTN DOWN 1 EQUALS');near(p.calc.S.ans,12);assert.equal(output(p),'12∠0');});
test('empty expression with format is Syntax ERROR',()=>{const p=page();p.press('OPTN DOWN 1 EQUALS');assert.equal(p.calc.S.error,'Syntax ERROR');});
test('arithmetic after a format command is Syntax ERROR',()=>{const p=page();p.press(z+' OPTN DOWN 1 ADD 1 EQUALS');assert.equal(p.calc.S.error,'Syntax ERROR');});
test('nested format token is Syntax ERROR',()=>{const p=page();p.calc.setExpr([{t:'func',name:'conj',arg:[{t:'num',v:'2'},{t:'post',v:'FORMAT:polar'}]}]);p.press('EQUALS');assert.equal(p.calc.S.error,'Syntax ERROR');});
test('format command in Calculate mode is Syntax ERROR',()=>{const p=page();p.press('MENU 1');p.calc.setExpr([{t:'num',v:'2'},{t:'post',v:'FORMAT:polar'}]);p.press('EQUALS');assert.equal(p.calc.S.error,'Syntax ERROR');});
test('DEL removes the format command atomically',()=>{const p=page();p.press(z+' OPTN DOWN 1 DEL EQUALS');complex(p,2,3);assert.equal(output(p),'2+3i');});
for(const keys of ['OPTN','OPTN DOWN'])test('AC cancels '+keys+' without edits',()=>{const p=page();p.press(z);const before=JSON.stringify(p.calc.getExpr());p.press(keys+' AC');assert.equal(p.calc.S.menu,null);assert.equal(JSON.stringify(p.calc.getExpr()),before);});
test('invalid second-page shortcut leaves menu open',()=>{const p=page();p.press('OPTN DOWN 3');assert.equal(p.calc.S.menu.index,4);assert.equal(p.calc.getExpr().length,0);});
test('OK confirms second-page first command',()=>{const p=page();p.press(z+' OPTN DOWN OK EQUALS');complex(p,2,3);assert.match(output(p),/∠/);});
test('direct evaluator returns number, not formatted text',()=>{const p=page();p.press(z+' OPTN DOWN 1');const v=p.calc.evalExpr();near(v.re,2);near(v.im,3);});
test('CALC substitutes a variable before applying the output command',()=>{const p=page();p.press('ALPHA NEG ADD ALPHA ENG OPTN DOWN 1 CALC 2 EQUALS');complex(p,2,1);assert.match(output(p),/∠/);assert.equal(p.calc.S.complexFormat,'rect');});
test('CALC output conversion survives S-D reformatting',()=>{const p=page();p.press('ALPHA NEG ADD ALPHA ENG OPTN DOWN 1 CALC 2 EQUALS SD');assert.match(output(p),/∠/);assert.equal(p.calc.S.complexFormat,'rect');});
console.log(passed+' Complex OPTN checks passed, 0 failed');
