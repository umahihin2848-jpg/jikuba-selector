/* Locked, pre-race market-relative diagnostic. No buying signals or tuning. */
(function(root){'use strict';
const CORE=root.PredictionAccuracyCoreV1;
if(!CORE)return;
const VERSION='prediction-benchmark-audit-v1.0';
const n=v=>v===null||v===undefined||v===''?NaN:Number(v);
const z=1.96;
const pct=(hits,total)=>total?hits/total:null;
function wilson(hits,total){
 if(!total||hits<0||hits>total)return null;
 const p=hits/total,den=1+z*z/total,mid=(p+z*z/(2*total))/den,dist=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
 return{lower:Math.max(0,mid-dist),upper:Math.min(1,mid+dist)};
}
function bucket(key,v){
 if(!Number.isFinite(v))return null;
 if(key==='popularity')return v===1?'1人気':v<=3?'2〜3人気':v<=6?'4〜6人気':'7人気以下';
 if(key==='odds')return v<5?'5倍未満':v<10?'5〜9.9倍':v<20?'10〜19.9倍':'20倍以上';
 return null;
}
function stats(items){
 const hits=items.filter(x=>x.axisHit).length,n=items.length;
 return{n,hits,rate:pct(hits,n),ci95:wilson(hits,n)};
}
function peerStats(items){
 const n=items.length,hits=items.filter(x=>x.axisHit).length,expected=items.reduce((s,x)=>s+x.peerRate,0);
 const d=items.map(x=>(x.axisHit?1:0)-x.peerRate),mean=n?d.reduce((a,b)=>a+b,0)/n:null;
 const variance=n>1?d.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):null;
 const halfwidth=variance!==null?z*Math.sqrt(variance/n):null;
 return{n,hits,axisRate:pct(hits,n),peerRate:n?expected/n:null,gap:mean,gapCI95Approx:halfwidth===null?null:{lower:Math.max(-1,mean-halfwidth),upper:Math.min(1,mean+halfwidth)},minPeers:2,peerBand:'axis odds divided/multiplied by 1.5'};
}
function assess(records){
 const seen=new Set(),cases=[],ignored={duplicate:0,pending:0,invalid:0,marketIncomplete:0,peerUnavailable:0};
 for(const rec of records||[]){
  if(!rec?.key||seen.has(rec.key)){ignored.duplicate++;continue;}
  seen.add(rec.key);
  if(!rec.outcome){ignored.pending++;continue;}
  const e=CORE.evaluate(rec),h=rec.frozen?.horses||[],axis=e?.axisNo;
  if(!e||!axis||e.axisHit===null){ignored.invalid++;continue;}
  const a=h.find(x=>String(x.no)===String(axis));
  const base={key:rec.key,year:e.year,kind:e.axisKind,axisHit:e.axisHit,axisOdds:n(a?.odds),axisPop:n(a?.pop)};
  const validOdds=h.length===Number(rec.meta?.field)&&h.every(x=>Number.isFinite(n(x.odds))&&n(x.odds)>=1);
  const validPops=h.length===Number(rec.meta?.field)&&h.every(x=>Number.isInteger(n(x.pop))&&n(x.pop)>=1&&n(x.pop)<=h.length)&&new Set(h.map(x=>n(x.pop))).size===h.length;
  if(!validOdds||!validPops){ignored.marketIncomplete++;cases.push({...base,marketValid:false,peerRate:null});continue;}
  const peer=h.filter(x=>String(x.no)!==String(axis)&&n(x.odds)>=base.axisOdds/1.5&&n(x.odds)<=base.axisOdds*1.5);
  const top=new Set(rec.outcome.top3.map(String));
  const peerRate=peer.length>=2?peer.filter(x=>top.has(String(x.no))).length/peer.length:null;
  if(peerRate===null)ignored.peerUnavailable++;
  cases.push({...base,marketValid:true,peerN:peer.length,peerRate});
 }
 const completed=cases.length,available=cases.filter(x=>x.marketValid),matched=available.filter(x=>x.peerRate!==null);
 const nonfavorite=available.filter(x=>x.axisPop>1),nonfavoriteMatched=matched.filter(x=>x.axisPop>1);
 const by=(key)=>Object.fromEntries(
   (key==='popularity'?['1人気','2〜3人気','4〜6人気','7人気以下']:['5倍未満','5〜9.9倍','10〜19.9倍','20倍以上'])
    .map(label=>[label,stats(available.filter(x=>bucket(key,key==='popularity'?x.axisPop:x.axisOdds)===label))])
 );
 return{
  version:VERSION,completed,marketComplete:available.length,marketMissing:completed-available.length,all:stats(cases),
  nonfavorite:stats(nonfavorite),matched:peerStats(matched),nonfavoriteMatched:peerStats(nonfavoriteMatched),
  popularity:by('popularity'),odds:by('odds'),ignored,rows:cases,
  disclosure:'同一レースで発走前に保存した軸オッズの2/3〜1.5倍にいる他馬2頭以上との比較。選択レースのみの観察結果であり、因果・購入期待値・未知レースでの優位性は未証明。'
 };
}
root.PredictionBenchmarkAuditV1=Object.freeze({version:VERSION,wilson,assess});
})(typeof window!=='undefined'?window:globalThis);