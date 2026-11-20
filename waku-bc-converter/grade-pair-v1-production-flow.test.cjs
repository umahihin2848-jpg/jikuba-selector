'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const js=Object.fromEntries(['grade-pair-v1-axis-v1','mobile-decision-core-v1','axis-access-gate-v1','production-decision-pipeline-v1']
 .map(n=>[n,fs.readFileSync(path.join(__dirname,n+'.js'),'utf8')]));
function simulate({grade='G1',v1A=-0.9,v1B=-0.2,bHist=5,bP10=0.25,oddsB=4.8,cActive=true,complete=true}={}){
 const win={RSAMobileLean:true},callbacks=new Map();
 const add=(ev,cb)=>callbacks.set(ev,[...(callbacks.get(ev)||[]),cb]);
 const dispatch=ev=>{for(const cb of callbacks.get(ev.type)||[])cb(ev);};
 const tick=cb=>{cb();return 1;};
 win.addEventListener=add;win.dispatchEvent=dispatch;
 const fields={grade,fieldSize:'14',surface:'芝',raceName:'検証用重賞',
  oddsPaste:complete?Array.from({length:14},(_,i)=>`${i+1} ${i===1?oddsB:i===0?3.2:i===2?5.5:10+(i-3)*2}`).join('\\n'):''};
 const doc={readyState:'loading',getElementById:id=>id in fields?{value:fields[id]}:null,addEventListener(){}};
 win.Finish600State={ready:true,rows:Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),finishRank:i===0?1:i===1?2:i===4?3:i+4}))};
 win.M3PureAbilityState={ready:true,activeModel:cActive?'C':'v1',leaderAmbiguous:false,top3BoundaryAmbiguous:false,
 rows:Array.from({length:14},(_,i)=>({no:String(i+1),name:'馬'+(i+1),abilityRank:i+1,
  v1Logit:i===0?v1A:i===1?v1B:-1.5-i*0.1,v1Rank:i+1,histN:i===1?bHist:5,jraHistN:i===1?bHist:5}))};
 win.M3PureAbilityState.byNo=Object.fromEntries(win.M3PureAbilityState.rows.map(r=>[r.no,r]));
 win.PositionRiskState={byNo:{'1':{p10:.25},'2':{p10:bP10}}};
 win.ValidatedQueueState={byNo:{'1':{frontness5:.5},'2':{frontness5:.7}}};
 win.MobileAnalysisCoreState={meta:{grade}};
 const ctx={window:win,document:doc,addEventListener:add,dispatchEvent:dispatch,setTimeout:tick,requestAnimationFrame:tick,
   CustomEvent:function(type,o){this.type=type;this.detail=o?.detail;}};
 for(const name of ['grade-pair-v1-axis-v1','mobile-decision-core-v1','axis-access-gate-v1','production-decision-pipeline-v1'])
   vm.runInNewContext(js[name],ctx,{filename:name+'.js'});
 const d=win.DecisionShellV2State;
 const access=win.AxisAccessGateV1.classify({status:'ready'},d,{status:'open'});
 const p=win.ProductionDecisionPipelineV1State;
 return {d,access,p};
}
test('graded Pair with v1 winner enters the ordinary single-axis market and partner flow',()=>{
 const {d,access,p}=simulate();
 assert.equal(d.structure.kind,'pair_v1');
 assert.equal(d.structure.axis.no,'2');
 assert.equal(d.structure.sourcePairCandidates.length,2);
 assert.equal(access.status,'pass');
 assert.equal(access.betEligible,true);
 assert.equal(p.stages.axis.no,'2');
 assert.equal(p.final.status,'conditional');
 assert.equal(d.tickets.wide.level,'yellow');
});
test('P10 >= 50% stops win only; wide and quinella remain separately assessed',()=>{
 const {d,access}=simulate({bP10:.55});
 assert.equal(d.tickets.win.level,'red');
 assert.equal(d.tickets.wide.level,'yellow');
 assert.equal(d.tickets.quinella.level,'yellow');
 assert.equal(access.betEligible,true);
});
test('v1 ties or insufficient history do not choose the first horse as axis',()=>{
 for(const config of [{v1A:-.9,v1B:-.9},{bHist:2}]){
  const {d,access,p}=simulate(config);
  assert.equal(d.structure.code,'pair_v1_hold');
  assert.equal(access.status,'skip');
  assert.equal(p.stages.axis.no,'');
 }
});
test('missing Ability C retains the original grade safety hold',()=>{
 const {d,access}=simulate({cActive:false});
 assert.equal(d.structure.code,'ability_c_wait');
 assert.equal(access.status,'checking');
});
test('OP Pair stays excluded from this graded rule',()=>{
 const {d,p}=simulate({grade:'OP',cActive:false});
 assert.equal(d.structure.code,'no_auto_axis');
 assert.equal(p.final.status,'neutral');
});
test('missing odds and market outside first six places do not unlock betting',()=>{
 const incomplete=simulate({complete:false});
 assert.equal(incomplete.d.structure.kind,'pair_v1');
 assert.equal(incomplete.d.final.code,'market_wait');
 assert.equal(incomplete.access.betEligible,false);
 const outside=simulate({oddsB:100});
 assert.equal(outside.d.final.code,'market_range');
 assert.equal(outside.access.betEligible,false);
});
