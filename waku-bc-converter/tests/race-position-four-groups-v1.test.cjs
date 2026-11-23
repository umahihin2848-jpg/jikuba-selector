'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../race-position-competition-v1.js'),'utf8');
const ctx={};vm.runInNewContext(source,ctx);
const model=ctx.RSARacePositionCompetitionCoreV1;
const input=n=>Array.from({length:n},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),expectedRank:1+i*(n-1)/(n+2),validated:true}));
function assertGroup(n){
 const pre=model.simulate(input(n),{seed:651,count:4096,dispersion:2.8});
 const baseline=JSON.stringify(pre.rows.map(x=>x.rankProbabilities));
 const z=model.groupPositionAudit(pre);
 assert.equal(z.ready,true);
 assert.equal(z.groups.length,4);
 assert.equal(z.groups.reduce((v,x)=>v+x.seats,0),n);
 assert.equal(z.rows.length,n);
 assert.equal(z.calibrated,false);
 assert.equal(z.stage,'start_first_recorded_position');
 for(const g of z.groups){
  assert.equal(g.members.length,g.seats);
  assert.ok(Math.abs(g.expectedSeats-g.seats)<1e-9,'Expected seats need to match simulated rank seats');
 }
 for(const h of z.rows){
  const p=Object.values(h.probabilities);
  assert.ok(p.every(x=>x>=0&&x<=1));
  assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-10);
 }
 assert.equal(JSON.stringify(pre.rows.map(x=>x.rankProbabilities)),baseline,'Grouping must not mutate rank distribution');
 return z;
}
test('all fields 12-18 runners have four coherent group quotas and probability mass',()=>{
 for(let n=12;n<=18;n++)assertGroup(n);
});
test('representative assignment is fixed-seat and ambiguous horses carry uncertainty',()=>{
 const a=assertGroup(16);
 assert.deepEqual(Array.from(a.groups,x=>x.seats),[4,4,5,3]);
 assert.ok(a.rows.some(r=>r.representativeGroupShare<.6),'Ambiguous membership should be visible');
 const again=model.groupPositionAudit(model.simulate(input(16),{seed:651,count:4096,dispersion:2.8}));
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(again)));
});
test('incomplete rank distributions fail closed, and production model is untouched',()=>{
 assert.equal(model.groupPositionAudit({ready:false}),null);
 const x=model.simulate(input(12),{seed:11,count:4096});
 x.rows[0].rankProbabilities=[.5];
 assert.equal(model.groupPositionAudit(x),null);
 assert.match(source,/fourGroupPositionResearch:groupPositionAudit\(result\)/);
 assert.match(source,/既存の初位置仮想抽選を4グループに集計/);
 assert.match(source,/2023学習の新4分類器は使用していない/);
 assert.match(source,/productionImpact:false/);
 assert.doesNotMatch(source,/\.(?:score|predGap|finishRank|axisNo|buy|odds)\s*=/);
});
