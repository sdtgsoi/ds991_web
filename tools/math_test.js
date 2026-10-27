#!/usr/bin/env node
const assert=require('node:assert/strict');
const core=require('../src/math-core.js');
let passed=0;
function test(name,fn){try{fn();passed++;}catch(e){console.error('FAIL '+name);throw e;}}
function roots(coeff,expected){
  const actual=core.polynomialRoots(coeff);
  assert.equal(actual.length,expected.length);
  const remaining=actual.slice();
  for(const [re,im=0] of expected){
    const index=remaining.findIndex(z=>Math.hypot(z.re-re,z.im-im)<1e-6*Math.max(1,Math.abs(re),Math.abs(im)));
    assert.ok(index>=0,JSON.stringify({coeff,actual,missing:[re,im]}));remaining.splice(index,1);
  }
}
for(const scale of [1,2,-3,1e-20,1e20]){
  test('scaled quadratic '+scale,()=>roots([scale,0,-scale],[[-1],[1]]));
  test('scaled cubic '+scale,()=>roots([scale,-6*scale,11*scale,-6*scale],[[1],[2],[3]]));
  test('scaled quartic '+scale,()=>roots([scale,0,-5*scale,0,4*scale],[[-2],[-1],[1],[2]]));
}
test('complex quadratic',()=>roots([2,0,2],[[0,1],[0,-1]]));
test('complex quartic',()=>roots([1,0,0,0,1],[[Math.SQRT1_2,Math.SQRT1_2],[Math.SQRT1_2,-Math.SQRT1_2],[-Math.SQRT1_2,Math.SQRT1_2],[-Math.SQRT1_2,-Math.SQRT1_2]]));
test('repeated quadratic',()=>roots([2,-4,2],[[1],[1]]));
test('stable unbalanced quadratic',()=>roots([1,-1e8,1],[[1e8],[1e-8]]));
test('leading zeros',()=>roots([0,0,2,-4],[[2]]));
test('zero multiplicity',()=>roots([1,0,0,0,0],[[0],[0],[0],[0]]));
for(const coeff of [[],[0,0,0],[1],[NaN,1],[Infinity,0,1],[1,0,0,0,0,0]]) test('invalid polynomial '+coeff,()=>assert.throws(()=>core.polynomialRoots(coeff),/Math ERROR/));
for(const [value,degree,expected] of [[-8,3,-2],[-32,5,-2],[-8,-3,-0.5],[0,3,0],[16,4,2]]) test('real root '+value+'/'+degree,()=>assert.equal(core.realNthRoot(value,degree),expected));
for(const [value,degree] of [[-16,4],[-8,2.5],[8,0],[Infinity,3],[0,-3],[-1e-320,-1]]) test('invalid root '+value+'/'+degree,()=>assert.throws(()=>core.realNthRoot(value,degree),/Math ERROR/));
console.log(passed+' passed, 0 failed');
