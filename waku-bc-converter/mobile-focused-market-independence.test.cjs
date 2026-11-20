'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('./mobile-focused-3tabs-v1.js');
const focus=globalThis.RSAFocusedThreeTabsCoreV1;
const roster=Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),finishRank:i+1}));
const ability={ready:true,activeModel:'C',byNo:Object.fromEntries(roster.map((h,i)=>[h.no,{abilityRank:i+1}]))};
test('axis candidate remains visible with no market permission or popularity gate',()=>{
 const axis=focus.axisCandidateFromStructure({kind:'pair_v1',axis:{no:'3',name:'馬3'}},roster);
 assert.equal(axis.no,'3');
 assert.equal(focus.axisCandidateFromStructure({kind:'double',axis:{no:'3'}},roster),null);
 assert.equal(focus.axisCandidateFromStructure({kind:'pair_v1',axis:{no:'99'}},roster),null);
});
test('optional market input never changes three Ability/M3 opponent candidates',()=>{
 const no=focus.partnerReference(roster,{complete:false,byNo:{}},ability,{ready:false});
 const withMarket=focus.partnerReference(roster,{complete:true,byNo:{}},ability,{ready:true,rows:roster.map((h,i)=>({no:h.no,p3:(14-i)/100}))});
 const a=focus.selectVisiblePartners(no,{no:'3'},3).map(x=>x.no);
 const b=focus.selectVisiblePartners(withMarket,{no:'3'},3).map(x=>x.no);
 assert.deepEqual(a,['1','2','4']);assert.deepEqual(b,a);
 assert.equal(withMarket.method,'ability_m3');assert.equal(withMarket.marketReferenceReady,true);
});
