'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('./prediction-accuracy-core-v1.js');
const c=globalThis.PredictionAccuracyCoreV1;
function fixture(){
const horses=Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),abilityRank:i+1,m3Rank:i+1,pop:i+1,odds:3+i,expectedCorner:i+1}));
const x=c.freeze({meta:{date:'2026-11-22',venue:'東京',name:'サンプル記念',surface:'芝',distance:1600,grade:'G1',field:14},horses,axisNo:'4',axisKind:'pair_v1',partners:['1','2','3'],now:Date.parse('2026-11-21T08:00:00+09:00'),startTime:'15:40',confirmed:true});
assert.equal(x.ok,true);return x.record;
}
test('axis miss with Ability top3 success is an axis-choice mismatch',()=>{
const r=fixture();r.outcome={top3:['1','2','3'],corner:{}};
const d=c.diagnose(r);
assert.equal(d.flags.axisMiss,true);assert.equal(d.flags.axisChoiceMiss,true);assert.equal(d.flags.abilityShortlistMiss,false);assert.equal(d.flags.axisMissWithGoodPartners,true);
});
test('Ability top3 entirely outside top3 and both selections miss',()=>{
const r=fixture();r.outcome={top3:['8','9','10'],corner:{}};
const d=c.diagnose(r);
assert.equal(d.flags.abilityShortlistMiss,true);assert.equal(d.flags.bothAxisAndOpponentMiss,true);
});
test('correct axis with no successful opponent points at opponent shortlist',()=>{
const r=fixture();r.outcome={top3:['4','8','9'],corner:{}};
const d=c.diagnose(r);
assert.equal(d.flags.opponentMissWithGoodAxis,true);assert.equal(d.flags.axisMiss,false);
});
test('first corner errors stay unavailable until actual corner ranks are entered',()=>{
const r=fixture();r.outcome={top3:['4','8','9'],corner:{}};
assert.equal(c.diagnose(r).positionEvaluable,false);
r.outcome.corner=Object.fromEntries(r.frozen.horses.map((h,i)=>[h.no,i+1]));r.outcome.corner['4']=10;
const d=c.diagnose(r);
assert.equal(d.flags.largeAxisPositionError,true);assert.equal(d.cornerComplete,true);
});
test('Spearman is correlation of ranks, not raw fractional position scores',()=>{
assert.equal(c.spearman([1,2,3],[1,2,3]),1);
assert.equal(c.spearman([1,2,3],[3,2,1]),-1);
assert.equal(Number.isFinite(c.spearman([1,1,2,3],[3,2,1,4])),true);
});
test('multiple copies of a frozen race count only once',()=>{
const r=fixture();r.outcome={top3:['1','2','3'],corner:{}};
const result=c.summarizeDiagnosis([r,r]);
assert.equal(result.n,1);assert.equal(result.counts.axisMiss,1);
});
