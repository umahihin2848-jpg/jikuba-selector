/* P3-76: prospective forecast/purchase declaration and offline settlement.
 * Research-only. This is a USER-DECLARED log, never evidence of an actual ticket purchase.
 * Requires P3-75 settlement core; forecast JSON is retained unchanged. */
(function(root,factory){
 'use strict';const api=factory(root.RSASettlementCoreV1||(typeof module==='object'&&module.exports?require('./p3-75-settlement-core-v1.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.RSAForwardLedgerCoreV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Settlement){'use strict';
if(!Settlement)throw Error('P3-75 settlement core is required');
const SCHEMA='rsa-p376-forward-declaration-v1';
const keyOf=(d,venue,num)=>{
 const n=Number(num),dd=String(d||'').replace(/-/g,'');
 return /^\d{8}$/.test(dd)&&Settlement.VENUE[venue]&&Number.isInteger(n)&&n>=1&&n<=12?
 dd+Settlement.VENUE[venue]+String(n).padStart(2,'0'):null;
};
const pairKey=Settlement.ticketKey;
const isDatetime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)&&!Number.isNaN(Date.parse(s));
function dateInTokyo(s){const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(s));const m=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return m.year+m.month+m.day;}
function validateBet(b){
 if(!b||!['wide','quinella'].includes(b.ticket))return '馬券種別が不正';
 if(!pairKey(b.a,b.b))return '組番が不正';
 if(!Number.isInteger(b.stakeYen)||b.stakeYen<100||b.stakeYen>1000000||b.stakeYen%100!==0)return '投資額は100円単位で入力';
 if(!b.placedAt||!isDatetime(b.placedAt))return '購入申告日時が不正';
 if(typeof b.receiptRef!=='string'||b.receiptRef.length>250)return '購入記録の参照情報が不正';
 return null;
}
function rosterPairs(snapshot){
 const a=String(snapshot.input?.roster?.text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),ids=new Map();
 if(snapshot.input?.roster?.confirmed!==true)return null;
 for(const line of a){const m=line.normalize('NFKC').match(/^(\d{1,2})[\s,，、]+(.+)$/);if(!m)return null;
  const n=Number(m[1]);if(!Number.isInteger(n)||n<1||n>18||ids.has(n))return null;ids.set(n,m[2].replace(/[\s\u3000]/g,''));}
 return ids.size===Number(snapshot.input?.race?.field)?ids:null;
}
function build(snapshot,options){
 const check=Settlement.validateSnapshot(snapshot);if(!check.ok)throw Error(check.error);
 const o=options||{},key=keyOf(check.date,check.venue,o.raceNumber??check.number);
 if(!key)throw Error('確定したレース番号（1〜12）が必要です');
 if(check.number&&Number(check.number)!==Number(o.raceNumber??check.number))throw Error('予想JSON内のレース番号と入力R番号が一致しません');
 if(!['bought','skipped'].includes(o.declaration))throw Error('購入／見送りを選択してください');
 if(!o.attestedPreRace||typeof o.attestedPreRace!=='boolean')throw Error('発走前に記録したという申告が必要です');
 if(typeof o.predictionSha256!=='string'||!/^[a-f0-9]{64}$/.test(o.predictionSha256))throw Error('予想JSONのSHA-256が必要です');
 const bets=o.declaration==='bought'?(o.bets||[]):[];
 if(o.declaration==='bought'&&(!bets.length||bets.length>10))throw Error('購入馬券は1〜10件で指定してください');
 if(o.declaration==='skipped'&&(o.bets||[]).length)throw Error('見送り申告には馬券を含められません');
 const roster=rosterPairs(snapshot);
 if(o.declaration==='bought'&&!roster)throw Error('購入申告には全頭の確定馬番照合が必要です');
 for(const b of bets){const problem=validateBet(b);if(problem)throw Error(problem);
  if(!roster.has(Number(b.a))||!roster.has(Number(b.b)))throw Error('馬券の馬番が事前出走表にありません');}
 const now=(o.captureAtDevice||new Date().toISOString());if(!isDatetime(now))throw Error('記録日時が不正');
 if(dateInTokyo(now)>check.date)throw Error('結果後の申告を発走前台帳として扱うことはできません');
 if(bets.some(b=>b.placedAt.slice(0,10).replace(/-/g,'')>check.date))throw Error('レース日より後の購入申告は受け付けません');
 return{
  schema:SCHEMA,researchOnly:true,productionImpact:false,verification:'self_declared_only',
  captureAtDevice:now,claimedBeforeStart:true,forecastSha256:o.predictionSha256,
  raceKey:key,raceName:check.raceName,betDeclaration:o.declaration,
  skipReason:String(o.skipReason||'').slice(0,300),bets:bets.map(b=>({ticket:b.ticket,a:Number(b.a),b:Number(b.b),stakeYen:Number(b.stakeYen),placedAt:b.placedAt,receiptRef:b.receiptRef})),
  forecast:snapshot,
  warnings:['端末時刻と自己申告は発走前の独立した証拠ではありません','購入申告は実際の購入を証明しません。明細・領収記録と突き合わせてください']
 };
}
function validateManifest(m){
 if(!m||m.schema!==SCHEMA||m.researchOnly!==true||m.productionImpact!==false||m.verification!=='self_declared_only'||m.claimedBeforeStart!==true)
  return{ok:false,error:'P3-76の自己申告・研究専用データではありません'};
 const s=Settlement.validateSnapshot(m.forecast);if(!s.ok)return{ok:false,error:'予想JSON不正: '+s.error};
 if(keyOf(s.date,s.venue,m.raceKey?.slice(-2))!==m.raceKey||s.number&&Number(m.raceKey.slice(-2))!==s.number)
  return{ok:false,error:'予想と登録レースのキーが異なります'};
 if(!/^[a-f0-9]{64}$/.test(m.forecastSha256||'')||!isDatetime(m.captureAtDevice))return{ok:false,error:'ハッシュ／記録日時が不正'};
 if(dateInTokyo(m.captureAtDevice)>s.date)return{ok:false,error:'レース終了後の日付で発走前台帳を作成'};
 if(!['bought','skipped'].includes(m.betDeclaration))return{ok:false,error:'購入／見送り区分が不正'};
 if(!Array.isArray(m.bets)||m.bets.length>10||m.betDeclaration==='bought'&&!m.bets.length||m.betDeclaration==='skipped'&&m.bets.length)
  return{ok:false,error:'購入・見送りと馬券件数が不整合'};
 const roster=rosterPairs(m.forecast);
 for(const b of m.bets){const e=validateBet(b);if(e)return{ok:false,error:e};
  if(b.placedAt.slice(0,10).replace(/-/g,'')>s.date)return{ok:false,error:'レース日より後の購入申告'};
  if(!roster||!roster.has(Number(b.a))||!roster.has(Number(b.b)))return{ok:false,error:'買い目が事前出走表と一致しません'};}
 return{ok:true,key:m.raceKey,forecast:s};
}
function settleForward(manifests,results,pays,{baselineStake=100,integrity=[]}={}){
 const lines=manifests.map((m,i)=>({i,m,valid:validateManifest(m)}));
 const dup=new Map();for(const l of lines)if(l.valid.ok){dup.set(l.valid.key,(dup.get(l.valid.key)||0)+1)}
 // Reuse P3-75 for race, roster, grade, payout, duplicate prediction and outcomes.
 const predictions=manifests.map(m=>m?.forecast||{});
 const reconciled=Settlement.settleAll(predictions,results,pays,{stake:baselineStake});
 const rows=lines.map(({i,m,valid})=>{
  const pred=reconciled[i];const root={index:i,key:m?.raceKey||null,forecastName:m?.raceName||'',
   declared:m?.betDeclaration||null,captureAtDevice:m?.captureAtDevice||null,predictionState:pred.state,
   baseline:pred.state==='resolved'?pred.simulation:null,
   actual:{state:'unknown',reason:'未照合',bets:[],stakedYen:null,returnedYen:null}};
  const problem=!valid.ok?valid.error:dup.get(valid.key)>1?'同一レースの発走前申告が重複（都合のよい選択を防止）':
   integrity[i]!==true?'元予想JSONとSHA-256が一致しません':
   pred.state!=='resolved'?pred.reason:pred.raceKey!==m.raceKey?'結果とのレースキー相違':null;
  if(problem)return{...root,state:'unresolved',reason:problem};
  if(m.betDeclaration==='skipped')return{...root,state:'resolved',reason:'本人申告の見送り（独立証明なし）',actual:{state:'skipped',bets:[],stakedYen:0,returnedYen:0}};
  const hr=pays.get(m.raceKey),tickets=[];for(const b of m.bets){const x=Settlement.ticketSettlement(hr,b.ticket,b.a,b.b,b.stakeYen);
   if(x.state==='unknown')return{...root,state:'unresolved',reason:'購入申告馬券を清算できません: '+x.reason};
   tickets.push({...x,ticket:b.ticket,a:b.a,b:b.b,placedAt:b.placedAt,receiptRef:b.receiptRef});}
  return{...root,state:'resolved',reason:'本人申告の購入（レシート独立照合なし）',
   actual:{state:'bought',bets:tickets,stakedYen:tickets.reduce((a,x)=>a+x.stakeYen,0),returnedYen:tickets.reduce((a,x)=>a+x.returnYen,0)}};
 });
 const accepted=reconciled.filter((_,i)=>rows[i].state==='resolved');
 return{rows,baseline:{wide:Settlement.summarize(accepted,{stake:baselineStake,ticket:'wide'}),quinella:Settlement.summarize(accepted,{stake:baselineStake,ticket:'quinella'})}};
}
function summary(rows){const valid=rows.filter(x=>x.state==='resolved'),all=rows.length;
 const stats={manifestCount:all,completed:valid.length,held:all-valid.length,bought:0,skipped:0,tickets:0,hit:0,refund:0,stakedYen:0,returnedYen:0,winRate:null,roi:null,netYen:0};
 for(const r of valid){if(r.actual.state==='skipped'){stats.skipped++;continue;}if(r.actual.state==='bought'){
   stats.bought++;stats.stakedYen+=r.actual.stakedYen;stats.returnedYen+=r.actual.returnedYen;
   for(const b of r.actual.bets){stats.tickets++;stats.hit+=Number(b.state==='hit');stats.refund+=Number(b.state==='refund');}
  }}
 stats.netYen=stats.returnedYen-stats.stakedYen;stats.roi=stats.stakedYen>0?stats.returnedYen/stats.stakedYen:null;
 stats.winRate=stats.tickets>stats.refund?stats.hit/(stats.tickets-stats.refund):null;
 return stats;
}
return Object.freeze({version:'p3-76-forward-ledger-v1',SCHEMA,build,validateManifest,settleForward,summary,keyOf,
 productionImpact:false,automaticPurchase:false,verifiedActualPurchase:false});
});