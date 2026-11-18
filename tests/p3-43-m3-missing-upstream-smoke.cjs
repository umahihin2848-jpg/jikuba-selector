'use strict';
// P3-43: missing upstream quantities must not turn into numeric zero.
// Run original production functions extracted without changing their bodies.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../waku-bc-converter');
const remaining=fs.readFileSync(path.join(root,'remaining600-validated-v1.js'),'utf8');
const finish=fs.readFileSync(path.join(root,'finish600-simulator-v2.js'),'utf8');
const rModel=require(path.join(root,'data/scenario_component_validation_v2.json'));
const fModel=require(path.join(root,'data/finish600_model_v1.json'));
function isolate(src,start,end,args,ret) {
  const i=src.indexOf(start),j=src.indexOf(end,i+start.length);
  assert(i>=0&&j>i,'missing production source '+start);
  return new Function(...args,src.slice(i,j)+'\nreturn '+ret+';');
}
const predict=isolate(remaining,'function predict(h,field){','function signature(rows,field){',
  ['MODEL','window','clamp'], 'predict')(rModel,{ValidatedQueueState:{byNo:{}}},(x,a,b)=>Math.max(a,Math.min(b,x)));
const fgap=isolate(finish,'function fallbackGap(h,meta){','function scenarioMark(rank,n){',
 ['MODEL','window','clamp'],'fallbackGap')(fModel,{ValidatedQueueState:{byNo:{}}},(x,a,b)=>Math.max(a,Math.min(b,x)));
const field=16,base={no:'1',gap3f:.7},meta={fieldSize:16};
const assertNear=(actual,expected,which)=>assert(Math.abs(actual-expected)<1e-12,which+': '+actual+' !== '+expected);
const expected=predict(base,field).pred;
for(const missing of [null,undefined,'']) {
  assertNear(predict({no:'1',gap3f:missing},field).pred,expected,'remaining600 missing gap '+String(missing));
  assertNear(fgap({no:'1',gap3f:missing},meta),fgap(base,meta),'M3 fallback missing gap '+String(missing));
}
const q={ValidatedQueueState:{byNo:{'1':{frontness5:.5528647823}}}};
const withFront=isolate(remaining,'function predict(h,field){','function signature(rows,field){',
 ['MODEL','window','clamp'],'predict')(rModel,q,(x,a,b)=>Math.max(a,Math.min(b,x)));
const missingFront=isolate(remaining,'function predict(h,field){','function signature(rows,field){',
 ['MODEL','window','clamp'],'predict')(rModel,{ValidatedQueueState:{byNo:{'1':{frontness5:null}}}},(x,a,b)=>Math.max(a,Math.min(b,x)));
assertNear(missingFront(base,field).pred,withFront(base,field).pred,'null frontness should use fallback');
console.log('PASS P3-43 null/empty M3 upstream values use trained fallback, not zero');
