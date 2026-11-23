'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const C=require('../p3-76-forward-core-v1.js'),S=require('../p3-75-settlement-core-v1.js');
function hash(s){return crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex')}
function forecast(){
 const f={schema:'rsa-p374-buy-skip-research-snapshot-v1',researchOnly:true,productionImpact:false,
 deviceCapturedAt:'2026-11-28T01:00:00.000Z',input:{race:{date:'2026-11-29',venue:'東京',name:'合成検証OP',field:12,grade:'OP',surface:'芝',raceNumber:'11'},
 roster:{confirmed:true,source:'synthetic full field',text:Array.from({length:12},(_,i)=>`${i+1},TEST${i+1}`).join('\n')}},
 decision:{status:'research_complete',structure:'single',productionImpact:false,automaticPurchase:false,calibratedEV:false,
 axis:{no:'1',name:'TEST1'},preferredOpponent:{no:'2',name:'TEST2'},selectedOpponent:{no:'3',name:'TEST3'},
 quote:{ticket:'wide',odds:8,observedAt:'2026-11-29T14:10'},reason:'synthetic only'}};
 return f;
}
function manifest(decl='bought'){const f=forecast();return C.build(f,{raceNumber:11,predictionSha256:hash(f),
 declaration:decl,attestedPreRace:true,captureAtDevice:'2026-11-28T01:00:00Z',
 bets:decl==='bought'?[{ticket:'wide',a:1,b:3,stakeYen:200,placedAt:'2026-11-29T14:15',receiptRef:'SYNTHETIC'}]:[]});}
function hr(){const a=Array(650).fill(' '),put=(i,s)=>{for(let j=0;j<s.length;j++)a[i+j]=s[j]};
 put(0,'HR2');put(3,'20261130');put(11,'20261129');put(19,'05');put(21,'0402');put(25,'11');put(27,'1212');
 put(31,'000000000');put(40,'000000000');put(49,'000000000');put(58,'0'.repeat(28));
 put(245,'0103000012340001');put(293,'0103000004500001');return a.join('');}
function csv(){const h='年,月,日,場所,レース番号,レース名,頭数,馬番,馬名,確定着順,コースコード,クラスコード,異常コード';
 return[h,...Array.from({length:12},(_,i)=>['26','11','29','東京','11','合成検証OP','12',String(i+1).padStart(2,'0'),'TEST'+(i+1),String(i+1),'0','131','0'].join(','))].join('\n');}
function settled(ms,integrity=ms.map(()=>true)){const r=S.parseResultsCsv(csv()).races,p=S.parseHr2Text(hr()).pays;return C.settleForward(ms,r,p,{integrity,baselineStake:100});}
test('pre-race manifest preserves unchanged prediction and guards identity/declared purchase',()=>{
 const f=forecast(),original=JSON.stringify(f),m=manifest();assert.equal(C.validateManifest(m).ok,true);
 assert.equal(m.raceKey,'202611290511');assert.equal(m.forecastSha256,hash(f));assert.equal(JSON.stringify(f),original);
 assert.equal(m.verification,'self_declared_only');assert.equal(m.bets[0].stakeYen,200);
 assert.throws(()=>C.build(f,{raceNumber:10,predictionSha256:hash(f),declaration:'skipped',attestedPreRace:true}),/一致/);
 assert.throws(()=>C.build(f,{raceNumber:11,predictionSha256:hash(f),declaration:'skipped',attestedPreRace:false}),/発走前/);
 assert.throws(()=>C.build(f,{raceNumber:11,predictionSha256:hash(f),declaration:'bought',attestedPreRace:true,bets:[{ticket:'wide',a:1,b:19,stakeYen:100,placedAt:'2026-11-29T13:30',receiptRef:''}]}),/確定馬番|出走表/);
});
test('settled declared 200 yen wide separately from 100 yen each research strategy',()=>{
 const m=manifest(),before=JSON.stringify(m),r=settled([m]),x=r.rows[0];
 assert.equal(x.state,'resolved');assert.equal(x.actual.state,'bought');assert.equal(x.actual.stakedYen,200);
 assert.equal(x.actual.returnedYen,9000);assert.equal(C.summary(r.rows).netYen,8800);
 assert.equal(r.baseline.wide.raceCount,1);assert.equal(r.baseline.wide.series[0].bets,1);
 assert.equal(r.baseline.wide.series[0].stakedYen,100);assert.equal(r.baseline.wide.series[0].hits,0);
 assert.equal(r.baseline.wide.series[1].returnedYen,4500);assert.equal(JSON.stringify(m),before);
});
test('explicit skip stays in common denominator, not treated as missing actual purchase',()=>{
 const x=settled([manifest('skipped')]);assert.equal(x.rows[0].state,'resolved');const s=C.summary(x.rows);
 assert.equal(s.manifestCount,1);assert.equal(s.skipped,1);assert.equal(s.stakedYen,0);assert.equal(s.roi,null);
 assert.equal(x.baseline.wide.series[1].hits,1);
});
test('wrong digest, duplicate race, and missing HR never silently produce profits',()=>{
 const r=settled([manifest()],[false]);assert.equal(r.rows[0].state,'unresolved');assert.equal(r.baseline.wide.raceCount,0);
 const d=settled([manifest(),manifest('skipped')]);assert.equal(d.rows.filter(x=>x.state==='unresolved').length,2);
 const m=manifest(),a=C.settleForward([m],S.parseResultsCsv(csv()).races,new Map(),{integrity:[true]});
 assert.equal(a.rows[0].state,'unresolved');assert.equal(C.summary(a.rows).completed,0);
});
test('invalid malformed purchase and no full roster are rejected',()=>{
 const x=manifest();x.bets[0].stakeYen=105;assert.equal(C.validateManifest(x).ok,false);
 const f=forecast();f.input.roster.confirmed=false;
 assert.throws(()=>C.build(f,{raceNumber:11,declaration:'bought',attestedPreRace:true,predictionSha256:hash(f),
 bets:[{ticket:'wide',a:1,b:3,stakeYen:100,placedAt:'2026-11-29T15:00',receiptRef:''}]}),/確定馬番|出走表/);
});