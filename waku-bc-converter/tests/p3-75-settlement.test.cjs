'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('./p3-75-settlement-core-v1.js');
function record(key='202611290511',options={}){
 const a=Array(622).fill(' ');const put=(p,v)=>{for(let i=0;i<v.length;i++)a[p+i]=v[i]};
 put(0,'HR2');put(3,'20261130');put(11,key.slice(0,8));put(19,key.slice(8,10));put(21,'0402');put(25,key.slice(10,12));put(27,'1212');
 put(31,'000000000');put(40,'000000000');put(49,options.refundFlag||'000000000');put(58,options.refundMask||'0'.repeat(28));
 put(102,'0100000048001');put(245,'0102000012480034');put(293,'0102000002820031');put(309,'0103000002750029');put(325,'0203000005180050');
 if(options.deadHeat)put(261,'0103000011110045');
 if(options.special)put(40,'000010000');
 if(options.invalid)put(31,'000100000');
 if(options.registered)put(27,options.registered);
 if(options.starters)put(29,options.starters);
 return a.join('');
}
function resultText(race='合成ステークス',n=12,missing=[]){const rows=[['年','月','日','場所','レース番号','レース名','頭数','馬番','馬名','確定着順','コースコード','クラスコード','異常コード']];
 for(let i=1;i<=n;i++)if(!missing.includes(i))rows.push(['26','11','29','東京','11',race,String(n),String(i).padStart(2,'0'),'合成馬'+i,String(i),'0','131','0']);
 return rows.map(z=>z.join(',')).join('\r\n');}
function snapshot(status='research_complete'){
 const input={race:{date:'2026-11-29',name:'合成ステークス',venue:'東京',grade:'OP',surface:'芝',field:12},
  roster:{confirmed:true,source:'JRA synthetic card',text:Array.from({length:12},(_,i)=>`${i+1},合成馬${i+1}`).join('\n')}};
 const axis={no:'1',name:'合成馬1'},preferredOpponent={no:'3',name:'合成馬3'},selectedOpponent={no:'2',name:'合成馬2'};
 const decision={productionImpact:false,automaticPurchase:false,calibratedEV:false,status,structure:'single',axis,preferredOpponent,selectedOpponent,
  quote:{ticket:'wide',odds:12,observedAt:'2026-11-29T15:11'},reason:'synthetic'};
 return{schema:'rsa-p374-buy-skip-research-snapshot-v1',researchOnly:true,productionImpact:false,deviceCapturedAt:'2026-11-29T05:10:00Z',input,decision};
}
function inputs(hr=record(),csv=resultText()){return{r:E.parseResultsCsv(csv).races,p:E.parseHr2Text(hr).pays};}
function run(x=snapshot(),hr=record(),csv=resultText()){const {r,p}=inputs(hr,csv);return E.settleAll([x],r,p)[0];}
test('HR2 parses yen per 100, win/place/dead heat slots; order independent',()=>{
 const r=E.parseHr2Text(record(undefined,{deadHeat:true}));assert.equal(r.issues.length,0);const a=[...r.pays.values()][0];
 assert.equal(a.singles[0].amount,480);assert.equal(a.quinellas.length,2);assert.equal(a.quinellas[0].amount,12480);
 assert.equal(a.wides[0].amount,2820);assert.equal(a.wides[1].pair,'0103');
 assert.equal(E.ticketSettlement(a,'wide',2,1,100).returnYen,2820);
 assert.equal(E.ticketSettlement(a,'quinella',3,1,500).returnYen,55550);
});
test('join P3-74 snapshot/CSV/HR and compare three strategies and ticket types',()=>{
 const z=run();assert.equal(z.state,'resolved');assert.equal(z.raceKey,'202611290511');
 assert.equal(z.simulation.wide.p10.returnYen,2750);
 assert.equal(z.simulation.wide.quality.returnYen,2820);
 assert.equal(z.simulation.wide.flow.returnYen,2820);
 assert.equal(z.simulation.quinella.p10.state,'miss');
 assert.equal(z.simulation.quinella.quality.returnYen,12480);
 assert.equal(z.simulation.quinella.flow.state,'skip');
 const sums=E.summarize([z]);assert.equal(sums.raceCount,1);
 assert.equal(sums.series[0].netYen,2650);assert.equal(sums.series[1].netYen,2720);
 assert.equal(sums.series[0].roi,27.5);assert.equal(sums.allocatedBudgetYen,100);
 assert.equal(sums.series[0].returnPerBudget,26.5);
});
test('record price and explicit skip are not actual purchases; manual skip preserved in baseline',()=>{
 const x=snapshot('skip');x.decision.code='manual_skip';
 const z=run(x);assert.equal(z.state,'resolved');assert.equal(z.simulation.wide.flow.state,'skip');
 assert.equal(z.simulation.wide.p10.state,'hit');
 assert.equal(z.simulation.wide.quality.state,'hit');
 const s=E.summarize([z]);assert.equal(s.series[2].bets,0);assert.equal(s.series[2].netYen,0);
});
test('hold is not silently counted as an explicit skip',()=>{
 const x=snapshot('hold');const z=run(x);assert.equal(z.state,'resolved');assert.equal(z.simulation.wide.flow.state,'no_decision');
 const sum=E.summarize([z]);assert.equal(sum.series[2].unknowns,1);
});
test('requires exact race identity, manual match allowed with original snapshot unchanged',()=>{
 const x=snapshot();x.input.race.name='差異ステークス';const before=JSON.stringify(x),{r,p}=inputs();
 let z=E.settleAll([x],r,p)[0];assert.equal(z.state,'unresolved');assert.equal(z.candidates.length,1);
 z=E.settleAll([x],r,p,{overrides:{0:{key:'202611290511',confirmed:true}}})[0];
 assert.equal(z.state,'resolved');assert.equal(z.method,'explicit_manual_override');assert.equal(JSON.stringify(x),before);
});
test('different date / class / horse name / field cannot produce a payout',()=>{
 const x=snapshot();x.input.race.date='2026-11-28';assert.equal(run(x).state,'unresolved');
 const y=snapshot();y.input.race.grade='G2';assert.match(run(y).reason,/クラス/);
 const v=snapshot();v.input.roster.text=v.input.roster.text.replace('合成馬2','誤った馬名');assert.match(run(v).reason,/不一致/);
 const w=snapshot();w.input.race.field=14;assert.match(run(w).reason,/頭数/);
});
test('duplicate pre-race JSON for one race never doubles denominator',()=>{
 const {r,p}=inputs();const rows=E.settleAll([snapshot(),snapshot()],r,p);
 assert.ok(rows.every(x=>x.state==='unresolved'));
 assert.equal(E.summarize(rows).raceCount,0);
});
test('cancel/refund with matching JV flags is returned; unconfirmed scratches hold',()=>{
 const refundMask='01'+'0'.repeat(26),ref=record(undefined,{refundMask,refundFlag:'111110111',starters:'11'});
 const z=run(snapshot(),ref,resultText('合成ステークス',12,[2]));
 assert.equal(z.state,'resolved',z.reason);
 assert.equal(z.simulation.wide.p10.state,'hit');
 assert.equal(z.simulation.wide.quality.state,'refund');
 assert.equal(z.simulation.wide.quality.returnYen,100);
 assert.equal(z.simulation.quinella.quality.state,'refund');
 const fail=run(snapshot(),record(undefined,{refundMask,refundFlag:'000000000',starters:'11'}),resultText('合成ステークス',12,[2]));
 assert.equal(fail.state,'unresolved');
});
test('special pay or invalid pool is never marked as a normal loss',()=>{
 let z=run(snapshot(),record(undefined,{special:true}));assert.equal(z.state,'unresolved');assert.match(z.reason,/不成立または特払/);
 z=run(snapshot(),record(undefined,{invalid:true}));assert.equal(z.state,'unresolved');
});
test('CSV quotes/newlines, duplicate HR, CSV export, forecast original remains intact',()=>{
 const txt='年,月,日,場所,レース番号,レース名,頭数,馬番,馬名,確定着順,コースコード,クラスコード\r\n26,11,29,東京,11,"合成,試験",12,01,"馬,テスト",1,0,131\r\n';
 assert.equal(E.parseResultsCsv(txt).races.size,1);
 const hr=E.parseHr2Text(record()+'\n'+record());assert.ok([...hr.pays.values()][0].errors.length);
 assert.match(E.rowsToCsv([run()]),/20261129/);
});