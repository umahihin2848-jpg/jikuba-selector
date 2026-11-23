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
test('research code does not overwrite official M3, betting state, odds or selection',()=>{
 assert.doesNotMatch(code,/\.(finishRank|score|predGap|axisNo|partnerNos|betEligible|odds)\s*=/);
 assert.match(code,/productionImpact:false/);
 assert.equal(html.split('race-position-competition-v1.js?').length-1,1);
 assert.ok(html.indexOf('course-position-study-v1.js')<html.indexOf('race-position-competition-v1.js'));
});
