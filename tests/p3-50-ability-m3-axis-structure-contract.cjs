'use strict';
// P3-50: freeze today's production axis topology while the historical stages
// are audited separately. Synthetic tests contain no racing outcomes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/mobile-decision-core-v1.js'),'utf8');
const a=src.indexOf('function context(x){'),b=src.indexOf('function tickets(s,f,m){',a);
assert(a>=0&&b>a,'axis decision source not found');
const win={
  Finish600State:{ready:true,rows:[]},
  M3PureAbilityState:{ready:true,rows:[]},
  ValidatedQueueState:{byNo:{}},
  PositionRiskState:{byNo:{}}
};
const mapByNo=s=>s?.byNo||Object.fromEntries((s?.rows||[]).map(r=>[String(r.no),r]));
const num=v=>v===null||v===undefined||v===''?NaN:Number(v);
const {structure,final}=new Function('window','scope','mapByNo','num',src.slice(a,b)+'return {structure,final};')(
 win,()=>({eligible:true,field:12,grade:'G3'}),mapByNo,num);
function setup(overlaps,{p10=.12,front=.82,tie=null}={}){
  // no. 1-3 are Ability ranks 1-3; M3 top3 are the supplied horse numbers.
  const all=Array.from({length:12},(_,i)=>i+1);
  const order=[...overlaps,...all.filter(n=>!overlaps.includes(n))];
  win.Finish600State.rows=all.map(n=>({no:String(n),name:'H'+n,finishRank:order.indexOf(n)+1}));
  win.M3PureAbilityState.rows=all.map(n=>({no:String(n),name:'H'+n,abilityRank:n}));
  win.M3PureAbilityState.leaderAmbiguous=tie==='leader';
  win.M3PureAbilityState.top3BoundaryAmbiguous=tie==='boundary';
  win.PositionRiskState.byNo=Object.fromEntries(all.map(n=>[String(n),{p10}]));
  win.ValidatedQueueState.byNo=Object.fromEntries(all.map(n=>[String(n),{frontness5:front}]));
}
function expect(overlaps,config,code){
 setup(overlaps,config);
 const s=structure();
 assert.equal(s.code,code,JSON.stringify({overlaps,config,observed:s.code}));
 return s;
}
const high=expect([1,4,5],{},'A1_high');
assert.equal(high.axis.no,'1');
assert.equal(high.ar,1);
expect([1,4,5],{front:.4},'A1_conditional');
expect([1,4,5],{p10:.55,front:.85},'A1_p10_win_stop');
const a2=expect([2,4,5],{},'A2_shadow');
assert.equal(a2.axis.no,'2');
const pair=expect([1,2,4],{},'double');
assert.equal(pair.kind,'double');
assert.equal(pair.candidates.length,2);
expect([3,4,5],{},'validated_stop');
expect([2,3,4],{},'no_auto_axis');
expect([1,2,3],{},'no_auto_axis');
expect([4,5,6],{},'no_auto_axis');
expect([1,4,5],{tie:'leader'},'ability_rank_tie');
expect([1,4,5],{tie:'boundary'},'ability_rank_tie');
setup([1,4,5]);
const mk=(p,near=false)=>({
 complete:true,field:12,byNo:{'1':{pop:p,od:p===6?10:8}},
 rows:Array.from({length:12},(_,i)=>({no:String(i+1),pop:i+1,od:near&&i===6?10.7:10+i*2}))
});
assert.equal(final(structure(),mk(7)).code,'market_range','top7 must not be auto eligible');
assert.equal(final(structure(),mk(6,true)).code,'market_boundary','6/7 boundary must caution');
assert.equal(final(structure(),mk(3)).code,'A1_high','normal market retains structure');
setup([2,4,5]);assert.equal(final(structure(),mk(3)).code,'A2_shadow','Ability2 must remain conditional');
setup([1,2,4]);assert.equal(final(structure(),mk(10)).code,'double','Pair is never promoted to a single axis');
console.log('PASS P3-50: production A1/A2/Pair/A3/P10/top3 tie and final market guard contracts');
