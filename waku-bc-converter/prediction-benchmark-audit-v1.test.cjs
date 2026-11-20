'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('./prediction-accuracy-core-v1.js');require('./prediction-benchmark-audit-v1.js');
const C=globalThis.PredictionAccuracyCoreV1,B=globalThis.PredictionBenchmarkAuditV1;
function receipt(options={}){
 const hs=Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),abilityRank:i+1,m3Rank:i+1,pop:i+1,odds:2+2*i,expectedCorner:i+1}));
 const horses=options.noMarket?hs.map(x=>({...x,pop:null,odds:null})):options.horses||hs;
 const x=C.freeze({meta:{date:'2026-11-22',venue:'東京',name:options.raceName||'検証',surface:'芝',distance:1600,grade:'G1',field:14},now:Date.parse('2026-11-21T10:00:00+09:00'),startTime:'15:40',confirmed:true,horses,axisNo:'3',axisKind:'pair_v1',partners:['1','2','4']});
 assert.equal(x.ok,true);x.record.outcome={top3:options.top3||['3','4','9'],corner:{}};return x.record;
}
test('nonfavorite axis compared to two close-odds peers in same race',()=>{
 const x=B.assess([receipt()]);assert.equal(x.completed,1);assert.equal(x.nonfavorite.hits,1);
 assert.equal(x.matched.n,1);assert.equal(x.matched.peerRate,0.5);assert.equal(x.matched.gap,0.5);
 assert.equal(x.popularity['2〜3人気'].n,1);assert.equal(x.odds['5〜9.9倍'].hits,1);
});
test('no odds retains axis outcome but excludes any market baseline',()=>{
 const x=B.assess([receipt({noMarket:true})]);assert.equal(x.all.n,1);
 assert.equal(x.marketMissing,1);assert.equal(x.matched.n,0);assert.equal(x.nonfavorite.n,0);
});
test('only one close-odds peer is not enough for a matched benchmark',()=>{
 const hs=Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),abilityRank:i+1,m3Rank:i+1,pop:i+1,odds:i===2?30:i===3?28:2+i}));
 const x=B.assess([receipt({horses:hs})]);assert.equal(x.marketComplete,1);
 assert.equal(x.matched.n,0);assert.equal(x.ignored.peerUnavailable,1);
});
test('one odds 1.0 is valid and a small sample has wide Wilson interval',()=>{
 const hs=Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),abilityRank:i+1,m3Rank:i+1,pop:i+1,odds:i===0?1:2+2*i}));
 const x=B.assess([receipt({horses:hs})]);assert.equal(x.marketComplete,1);
 const w=B.wilson(1,1);assert(w.lower>0&&w.lower<.25);assert.equal(w.upper,1);
});
test('duplicate receipts, pending results and different race keys are accounted for',()=>{
 const a=receipt(),b=receipt({raceName:'別レース'});
 b.outcome=null;const x=B.assess([a,a,b]);
 assert.equal(x.completed,1);assert.equal(x.ignored.duplicate,1);assert.equal(x.ignored.pending,1);
});
