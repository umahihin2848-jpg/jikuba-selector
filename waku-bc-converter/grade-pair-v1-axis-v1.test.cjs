'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
require('./grade-pair-v1-axis-v1.js');
const select=globalThis.GradePairV1AxisV1.select;
const pair={kind:'double',code:'double',level:'yellow',candidates:[{no:'3',name:'A',ar:1,m3:2},{no:'11',name:'B',ar:2,m3:1}],axis:{no:'3',name:'A'}};
const ability={ready:true,activeModel:'C',byNo:{'3':{name:'A',v1Logit:-0.88,v1Rank:6,histN:5},'11':{name:'B',v1Logit:-0.42,v1Rank:3,histN:5}}};
test('C Pair selects the higher v1 score among exactly two matched horses',()=>{
 const x=select(pair,ability,'G1');
 assert.equal(x.status,'selected');assert.equal(x.axis.no,'11');assert.equal(x.other.no,'3');
 assert.equal(x.researchOnly,true);assert.equal(x.productionApplied,false);assert.equal(x.betEligible,false);
 assert.equal(select({...pair,candidates:[...pair.candidates].reverse()},ability,'G2').axis.no,'11');
});
test('not applicable to A1/A2 or non-grade classes',()=>{
 assert.equal(select(pair,ability,'OP').status,'not_applicable');
 assert.equal(select({...pair,kind:'A1',code:'A1'},ability,'G1').status,'not_applicable');
 assert.equal(select({...pair,candidates:[{...pair.candidates[0],ar:2},{...pair.candidates[1],ar:3}]},ability,'G3').status,'hold');
});
test('holds on incomplete C, history, score or v1 tie',()=>{
 assert.equal(select(pair,{...ability,activeModel:'v1'},'G1').status,'hold');
 assert.equal(select(pair,{...ability,byNo:{...ability.byNo,'11':{...ability.byNo['11'],histN:2}}},'G1').status,'hold');
 assert.equal(select(pair,{...ability,byNo:{...ability.byNo,'11':{...ability.byNo['11'],v1Logit:null}}},'G1').status,'hold');
 assert.equal(select(pair,{...ability,byNo:{...ability.byNo,'11':{...ability.byNo['11'],v1Logit:-0.88}}},'G1').status,'hold');
});
function pipeline(grade,structure,model){
 const w={GradePairV1AxisV1:globalThis.GradePairV1AxisV1,
 M3PureAbilityState:model,
 DecisionShellV2State:{ready:true,structure,final:{level:structure.level==='neutral'?'neutral':'yellow',code:structure.code,reason:'fixture'},market:{complete:true,field:14,rows:[{no:'3',od:4.2},{no:'11',od:8.5}],byNo:{'3':{od:4.2,pop:1},'11':{od:8.5,pop:2}}},tickets:{win:{label:'win'},wide:{label:'wide'},quinella:{label:'quinella'}}}};
 const noop=()=>{},now=f=>{f();return 1;};
 const doc={getElementById:id=>id==='grade'?{value:grade}:null,addEventListener:noop,readyState:'loading'};
 const ctx={window:w,document:doc,addEventListener:noop,setTimeout:now,requestAnimationFrame:now,dispatchEvent:noop,CustomEvent:function(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'production-decision-pipeline-v1.js'),'utf8'),ctx);
 return w.ProductionDecisionPipelineV1State;
}
test('graded Pair has a v1 research axis but never unlocks win, quinella or wide',()=>{
 const x=pipeline('G1',pair,ability);
 assert.equal(x.stages.axis.pairV1.axis.no,'11');
 assert.equal(x.stages.axis.no,'');
 assert.equal(x.final.status,'neutral');
 for(const k of ['win','quinella','wide'])assert.equal(x.tickets[k].label,'Pair研究のみ');
});
test('ordinary A1 and OP Pair production axis stay unchanged',()=>{
 const x=pipeline('G1',{kind:'A1',code:'A1_condition',level:'yellow',axis:{no:'3',name:'A',abilityRank:1,m3Rank:2},candidates:[{no:'3'}]},ability);
 assert.equal(x.stages.axis.no,'3');assert.equal(x.final.status,'conditional');assert.equal(x.stages.axis.pairV1,null);
 const y=pipeline('OP',{...pair,code:'no_auto_axis',level:'neutral'},{...ability,activeModel:'v1'});
 assert.equal(y.final.status,'neutral');assert.equal(y.stages.axis.no,'');assert.equal(y.stages.axis.pairV1.status,'not_applicable');
});
