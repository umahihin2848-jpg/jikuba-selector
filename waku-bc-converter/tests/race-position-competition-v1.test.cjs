'use strict';
/* Run: node --test waku-bc-converter/tests/race-position-competition-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(dir,'race-position-competition-v1.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'v3.html'),'utf8');
const context={};vm.runInNewContext(code,context,{timeout:1500});
const core=context.RSARacePositionCompetitionCoreV1;
function lineup(n=16){return Array.from({length:n},(_,i)=>({no:String(i+1),name:'H'+(i+1),expectedRank:i+1,validated:true}));}
test('simulation ranks are jointly exclusive and exactly k horses occupy front seats per trial',()=>{
 const x=core.simulate(lineup(),{count:4096,seed:10});
 assert.equal(x.ready,true);
 assert.equal(x.k,4);
 assert.equal(x.totalFrontCount,x.k*x.count);
 assert.ok(Math.abs(x.rows.reduce((s,r)=>s+r.frontShare,0)-x.k)<1e-10);
 for(const r of x.rows){assert.ok(r.frontShare>=0&&r.frontShare<=1);assert.ok(r.rank10<=r.rank90);assert.ok(r.rank10>=1&&r.rank90<=16);}
 assert.ok(x.rows[0].frontShare>x.rows[15].frontShare);
});
test('race size changes exact seat count and duplicate horse numbers are rejected',()=>{
 const x=core.simulate(lineup(12),{count:256,seed:3});assert.equal(x.ready,true);assert.equal(x.k,3);assert.equal(x.totalFrontCount,3*256);
 const y=core.simulate(lineup(18),{count:256,seed:3});assert.equal(y.k,5);assert.equal(y.totalFrontCount,5*256);
 const broken=lineup();broken[3].no='2';assert.equal(core.simulate(broken).ready,false);
});
test('missing or invalid queue prediction fails closed',()=>{
 const x=lineup();x[0].validated=false;assert.equal(core.check(x).ok,false);
 x[0].validated=true;x[0].expectedRank=NaN;assert.equal(core.simulate(x).ready,false);
});
test('results deterministic for same race, seed and input',()=>{
 const x=core.simulate(lineup(),{count:512,seed:99});
 const y=core.simulate(lineup(),{count:512,seed:99});
 assert.deepEqual(x.rows.map(r=>r.frontCount),y.rows.map(r=>r.frontCount));
});
test('actual horse numbers can be nonconsecutive after scratches',()=>{
 const rows=lineup(15);rows[14].no='16';
 const v=core.simulate(rows,{count:256,seed:2});
 assert.equal(v.ready,true);assert.equal(v.n,15);assert.equal(v.rows[14].no,'16');
});
test('rank 10-90% range comes from cumulative probabilities, not final rank fallback',()=>{
 const x=core.simulate(lineup(),{count:4096,seed:10});
 assert.ok(x.rows[0].rank90<16,'front-running horse cannot always have upper quantile at final rank');
 assert.ok(x.rows[15].rank10>1,'last-ranked horse should not have a first-position lower quantile');
 assert.ok(x.rows[0].rank10<=x.rows[0].rank90);
});
test('conditional missed-front scenario contains only ranks outside top k',()=>{
 const x=core.simulate(lineup(),{count:4096,seed:10});
 for(const r of x.rows){
  assert.equal(r.fallbackCount+r.frontCount,x.count);
  assert.ok(Math.abs(r.fallbackShare+r.frontShare-1)<1e-9);
  if(r.fallbackCount){
   assert.ok(r.fallbackMeanRank>=x.k+1&&r.fallbackMeanRank<=x.n);
   assert.ok(r.fallbackRank10>=x.k+1&&r.fallbackRank10<=r.fallbackRank90&&r.fallbackRank90<=x.n);
  }
 }
});
test('front-middle-rear shares and every rank column are jointly coherent',()=>{
 const z=core.simulate(lineup(),{count:4096,seed:17});
 assert.equal(z.k,4);assert.equal(z.kMiddle,10);
 assert.ok(Math.abs(z.totalFrontShare-4)<1e-10);
 assert.ok(Math.abs(z.totalMiddleShare-6)<1e-10);
 assert.ok(Math.abs(z.totalRearShare-6)<1e-10);
 for(const r of z.rows){
  assert.equal(r.rankProbabilities.length,16);
  assert.ok(Math.abs(r.rankProbabilities.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Math.abs(r.frontShare+r.middleShare+r.rearShare-1)<1e-12);
 }
 for(let rank=0;rank<z.n;rank++)
  assert.ok(Math.abs(z.rows.reduce((sum,h)=>sum+h.rankProbabilities[rank],0)-1)<1e-12);
});
test('research panel includes explicit uncalibrated JSON export without production writes',()=>{
 assert.match(code,/rsarpcExport/);
 assert.match(code,/calibrated:false/);
 assert.match(code,/rankProbabilities:/);
 assert.doesNotMatch(code,/\.(finishRank|score|predGap|axisNo|partnerNos|betEligible|odds)\s*=/);
});
test('historical 600m gap SD is display metadata, never a simulated ranking input',()=>{
 const baseline=lineup();const withHistory=baseline.map((r,i)=>({...r,histGapSd:i*.08,histGapN:5}));
 const a=core.simulate(baseline,{seed:123,count:512}),b=core.simulate(withHistory,{seed:123,count:512});
 assert.deepEqual(a.rows.map(r=>r.rankProbabilities),b.rows.map(r=>r.rankProbabilities));
 assert.deepEqual(b.rows.map(r=>r.histGapSd),Array.from({length:16},(_,i)=>i*.08));
 assert.deepEqual(b.rows.map(r=>r.histGapN),Array(16).fill(5));
 assert.match(code,/historyGapSdSeconds/);assert.match(code,/historyGapRaceCount/);
});
test('research code does not overwrite official M3, betting state, odds or selection',()=>{
 assert.doesNotMatch(code,/\.(finishRank|score|predGap|axisNo|partnerNos|betEligible|odds)\s*=/);
 assert.match(code,/productionImpact:false/);
 assert.equal(html.split('race-position-competition-v1.js?').length-1,1);
 assert.ok(html.indexOf('course-position-study-v1.js')<html.indexOf('race-position-competition-v1.js'));
});
