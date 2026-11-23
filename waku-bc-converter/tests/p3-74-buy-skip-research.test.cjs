'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const c={},source=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/purchase-audit-core-v1.js'),'utf8');vm.runInNewContext(source,c);const engine=c.RSAPurchaseAuditCoreV1;
const order=q=>q.map((no,i)=>({no:String(no),name:'Synthetic'+no,finishRank:i+1}));
const ability=Array.from({length:12},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),abilityRank:i+1,abilityTieEnd:i+1,histN:5}));
const position=ability.map((x,i)=>({no:x.no,name:x.name,p10:i===2?.05:.2+i*.02}));
function mock(overlaps='single'){
 const r={race:{date:'2026-11-29',name:'SyntheticStudyOP',venue:'東京',grade:'OP',surface:'芝',field:12},ability:{ready:true,activeModel:'v1',rows:ability},
 m3:{ready:true,rows:order(overlaps==='single'?[1,4,5,2,3,6,7,8,9,10,11,12]:[1,2,5,3,4,6,7,8,9,10,11,12])},
 position:{ready:true,rows:position,byNo:Object.fromEntries(position.map(x=>[x.no,x]))},
 roster:{text:ability.map(x=>x.no+','+x.name).join('\n'),source:'JRA complete synthetic card',confirmed:true},
 quality:{type:'inner_front',preRaceDeclared:true,source:'synthetic previous-day turf data',evidence:'Inside front runners appear advantaged'},
 reviews:Object.fromEntries([1,2,3,4].map(n=>[n,{fit:n===1||n===3?'good':'neutral',reason:'Synthetic position forecast and surface judgment before race'}])),
 quote:{ticket:'wide',odds:'8.4',observedAt:'2026-11-29T15:10'},manualSkip:''};
 return r;
}
test('single ability/m3 axis and fixed three ability opponents with distinct P10 minimum, no price EV',()=>{
 const x=mock(),before=JSON.stringify(x),o=engine.audit(x);
 assert.equal(o.status,'research_complete');assert.equal(o.structure,'single');assert.equal(o.axis.no,'1');
 assert.deepEqual(Array.from(o.opponents,z=>z.no),['2','3','4']);
 assert.equal(o.preferredOpponent.no,'3');assert.equal(o.selectedOpponent.no,'3');
 assert.equal(o.productionImpact,false);assert.equal(o.calibratedEV,false);assert.equal(o.automaticPurchase,false);
 assert.match(o.reason,/較正/);assert.equal(JSON.stringify(x),before);
});
test('Pair unique fit only; both good, neither good or incomplete evidence must not pick an axis',()=>{
 const x=mock('pair');assert.equal(engine.audit(x).axis.no,'1');
 x.reviews['2'].fit='good';const both=engine.audit(x);assert.equal(both.status,'skip');assert.equal(both.code,'pair_not_unique');assert.equal(both.axis,null);
 x.reviews['1'].fit='neutral';x.reviews['2'].fit='neutral';assert.equal(engine.audit(x).code,'pair_not_unique');
 x.reviews['2'].fit='';assert.equal(engine.audit(x).code,'pair_reviews_missing');
});
test('same race human fit can override P10 minimum only with an explicit exploratory trace',()=>{
 const x=mock();x.reviews['3'].fit='neutral';x.reviews['2'].fit='good';
 const o=engine.audit(x);assert.equal(o.status,'research_complete');assert.equal(o.preferredOpponent.no,'3');
 assert.equal(o.selectedOpponent.no,'2');assert.match(o.trace.at(-1).message,/未実証/);
});
test('full field attestation and official gaps fail closed',()=>{
 const x=mock();x.roster.confirmed=false;assert.equal(engine.audit(x).code,'official_roster_not_attested');
 x.roster.confirmed=true;x.roster.text=x.roster.text.replace('12,Synthetic12','13,Synthetic12');
 assert.equal(engine.audit(x).code,'official_roster_not_attested');
 x.roster.text=x.roster.text.replace('13,Synthetic12','12,Synthetic12');
 x.ability.rows=[...x.ability.rows];x.ability.rows[0]={...x.ability.rows[0],name:'Wrong'};
 assert.equal(engine.audit(x).code,'models_roster_mismatch');
});
test('equal P10, missing price, or no unique fit never becomes purchase recommendation',()=>{
 const x=mock();x.position.rows=position.map(v=>({...v}));x.position.byNo=Object.fromEntries(x.position.rows.map(v=>[v.no,v]));
 x.position.rows[1].p10=.05;assert.equal(engine.audit(x).code,'p10_tied');
 x.position.rows[1].p10=.22;x.reviews['2'].fit='good';
 assert.equal(engine.audit(x).code,'partner_not_unique');
 x.reviews['2'].fit='neutral';x.quote.odds='';
 assert.equal(engine.audit(x).status,'price_pending');
 x.quote.odds='8.4';x.manualSkip='Intentional skip despite forecast';
 assert.equal(engine.audit(x).code,'manual_skip');
});
test('grade is kept separate; no model or outcome leakage into snapshot',()=>{
 const x=mock();x.race.grade='G1';assert.equal(engine.audit(x).status,'grade_reference');
 x.race.grade='OP';
 const z=engine.snapshot(x,engine.audit(x));
 assert.equal(z.researchOnly,true);assert.equal(z.productionImpact,false);
 assert.equal(z.schema,'rsa-p374-buy-skip-research-snapshot-v1');
 assert.doesNotMatch(source,/window\.(?:M3PureAbilityState|Finish600State|PositionRiskState|ProductionDecisionPipelineV1State)\s*=/);
});
