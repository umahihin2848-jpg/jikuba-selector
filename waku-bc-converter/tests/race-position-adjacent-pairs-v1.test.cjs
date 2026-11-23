'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../race-position-competition-v1.js'),'utf8');
const ctx={};vm.runInNewContext(code,ctx);
const core=ctx.RSARacePositionCompetitionCoreV1;
const rows=Array.from({length:16},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),expectedRank:1+i,validated:true}));
test('simulated adjacent-pair comparisons agree with Gumbel logistic ordering, without claiming empirical calibration',()=>{
 const simulated=core.simulate(rows,{seed:42,count:4096,dispersion:2.8}),adj=core.adjacentPairAudit(simulated);
 assert.equal(adj.length,15);
 for(const item of adj){
  assert.ok(item.hypotheticalReversalShare>=0&&item.hypotheticalReversalShare<=.5);
  assert.ok(Math.abs(item.hypotheticalAheadShare+item.hypotheticalReversalShare-1)<1e-10);
  assert.ok(Math.abs(item.hypotheticalReversalShare-1/(1+Math.exp(item.modelExpectedRankGap/2.8)))<1e-10);
  assert.match(item.dataStatus,/未較正/);
 }
 assert.equal(core.adjacentPairAudit({ready:false}).length,0);
});
test('near-equal expected positions appear as ambiguous comparisons and never alter ranking',()=>{
 const data=rows.map(x=>({...x}));data[0].expectedRank=4;data[1].expectedRank=4;
 const before=core.simulate(data,{seed:42,count:4096}),ahead=core.adjacentPairAudit(before);
 assert.equal(ahead[0].hypotheticalReversalShare,.5);
 assert.deepEqual(before.rows.map(x=>x.rankProbabilities),core.simulate(data,{seed:42,count:4096}).rows.map(x=>x.rankProbabilities));
});
test('P3-68 panel and JSON export are research-only and preserve production M3 and bets',()=>{
 assert.match(code,/前後が入れ替わりやすい組/);
 assert.match(code,/adjacentPairResearch:adjacentPairAudit\(result\)/);
 assert.match(code,/3角・4角の前後関係や実際の内外レーンも表しません/);
 assert.match(code,/productionImpact:false/);
 assert.doesNotMatch(code,/\.(?:score|predGap|finishRank|axisNo|buy|odds)\s*=/);
});
