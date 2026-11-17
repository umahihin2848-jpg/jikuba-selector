/* P3-30: V3 Dynamic+Peak 730d from an as-of JRA network snapshot.
   Automatically used with a standard TARGET history CSV; no separate V3 CSV needed.
   Refuses historical/post-cutoff leakage, unsupported years and stale uploaded histories.
   Snapshot is a complete 2016-2026-10-04 race-universe run, not per-horse CSV proxy. */
(function(root){'use strict';
const VERSION='p3-30-v3-auto-20261117';
const DAY=86400000;
const N=s=>String(s??'').normalize('NFKC').trim();
const dateKey=s=>{const t=N(s);const m=t.match(/^(\d{4})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})/);if(m)return Number(m[1])*10000+Number(m[2])*100+Number(m[3]);const q=t.replace(/[^0-9]/g,'');if(q.length===8)return Number(q);if(q.length===6)return Number('20'+q);return 0;};
const dateMs=v=>{const n=typeof v==='number'?v:dateKey(v);const y=Math.floor(n/10000),m=Math.floor(n/100)%100,d=n%100;if(y<2000||y>2100||m<1||m>12||d<1||d>31)return NaN;const u=Date.UTC(y,m-1,d);return new Date(u).getUTCDate()===d?u:NaN;};
const days=(a,b)=>(dateMs(a)-dateMs(b))/DAY;
const normSurf=v=>N(v).includes('ダ')?'ダ':'芝';
const makeIndex=snapshot=>{if(!snapshot||snapshot.version!=='P3-30-v1'||!Array.isArray(snapshot.rows))throw Error('能力ネットワークDBの形式が不正です');return new Map(snapshot.rows.map(x=>[N(x[0])+'|'+N(x[1]),x]));};
function featureVec(birth,lastMs,nowMs){
  const t0=(lastMs-Date.UTC(birth,0,1))/(DAY*365.25),t1=(nowMs-Date.UTC(birth,0,1))/(DAY*365.25);
  const brackets=[[0,3],[3,4],[4,5],[5,6],[6,30]];
  const a=brackets.map(([lo,hi])=>Math.max(0,Math.min(t1,hi)-Math.max(t0,lo)));
  a.push(Math.min(Math.max((nowMs-lastMs)/DAY-90,0),365)/365);return a;
}
function buildCard(snapshot,meta,roster,uploaded,externalIndex){
  if(!snapshot||!Array.isArray(snapshot.rows))return{ok:false,reason:'能力ネットワークDBがありません'};
  const date=dateKey(meta.date),nowMs=dateMs(date),cut=dateKey(snapshot.cutoff_date);
  if(!Number.isFinite(nowMs)||!meta.venue||!meta.surface||!meta.distance)return{ok:false,reason:'レース日・場所・芝ダート・距離を設定してください'};
  if(date<=cut)return{ok:false,reason:'過去レースは保存済み時点別データで照合します。最新スナップショットを過去のレースに流用できません'};
  const year=Math.floor(date/10000);
  if(year!==2026)return{ok:false,reason:'現在のV3確率モデルは2026年用です。翌年以降は再学習してから使用します'};
  if(!(roster?.length>=12&&roster.length<=18))return{ok:false,reason:'出走頭数12〜18頭の解析が必要です'};
  const index=externalIndex||makeIndex(snapshot),cutMs=dateMs(cut),rr=[],stale=[];
  for(const runner of roster){
    const name=N(runner.name),surf=normSurf(meta.surface),key=name+'|'+surf,history=uploaded?.lastByKey?.[key]||0;
    if(history>cut)stale.push(name+'（'+String(history)+'）');
    const r=index.get(key);if(r&&r[2]>=date)return{ok:false,reason:'ネットワークDBの更新日が対象レースより後です'};
    if(!r){rr.push({no:Number(runner.no),name,h730:0,peak:null,n:0,gap:0,peakN:0});continue;}
    const [,,last,m,,n,obs,birth]=r,elapsed=days(date,last),rho=Math.pow(2,-elapsed/730);
    if(!Number.isFinite(elapsed)||elapsed<0||!Number.isInteger(birth))return{ok:false,reason:'過去能力データの日付・馬齢情報が不正です'};
    const f=featureVec(birth,dateMs(last),nowMs),coef=snapshot.coef;
    if(!Array.isArray(coef)||coef.length!==f.length)return{ok:false,reason:'能力ネットワーク係数が不正です'};
    const pred=m*rho+f.reduce((sum,x,i)=>sum+x*coef[i],0);
    const observations=(obs||[]).filter(o=>days(date,o[0])>=0&&days(date,o[0])<=730&&Math.abs(Number(o[1])-Number(meta.distance))<=400).map(o=>Number(o[2]));
    let peak=null;if(observations.length){const best=[...observations].sort((a,b)=>b-a).slice(0,2),top=best.reduce((a,b)=>a+b,0)/best.length,avg=observations.reduce((a,b)=>a+b,0)/observations.length;peak=avg+(top-avg)*observations.length/(observations.length+3);}
    rr.push({no:Number(runner.no),name,h730:pred,peak,n:Number(n),gap:Math.round(elapsed),peakN:observations.length});
  }
  if(stale.length)return{ok:false,reason:'通常CSVにはDB更新日（'+snapshot.cutoff_date+'）より新しい出走履歴があります：'+stale.join('、')+'。能力データ更新までV3を計算しません'};
  if(new Set(rr.map(x=>x.no)).size!==rr.length)return{ok:false,reason:'馬番が重複しています'};
  return{ok:true,source:'通常TARGET CSV＋JRA能力DB（'+snapshot.cutoff_date+'更新）',card:{date:meta.date,venue:meta.venue,surface:normSurf(meta.surface),distance:Number(meta.distance),rid:'',field:rr.length,horses:rr},coverage:rr.filter(x=>x.n>0).length};
}
root.AbilityV3AutoCoreV1=Object.freeze({version:VERSION,dateKey,days,makeIndex,buildCard,featureVec});
})(typeof window!=='undefined'?window:globalThis);