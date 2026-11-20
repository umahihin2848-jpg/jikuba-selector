/* Frozen pre-start axis / three partners / first-corner forecast evaluation. No betting signals. */
(function(root){'use strict';
const VERSION='prediction-accuracy-core-v1.0';
const n=x=>x===null||x===undefined||x===''?NaN:Number(x);
const id=x=>String(Number(x));
const uniq=x=>new Set(x).size===x.length;
const validDay=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return false;const y=+m[1],mo=+m[2],d=+m[3],v=new Date(Date.UTC(y,mo-1,d));return y>=2000&&y<=2100&&v.getUTCFullYear()===y&&v.getUTCMonth()===mo-1&&v.getUTCDate()===d};
function raceKey(m){return[m.date,m.venue,m.name,m.surface,m.distance,m.field,m.grade].map(String).join('|')}
function parsePositions(raw,field){
 const s=String(raw||'').normalize('NFKC').trim();if(!s)return{};
 const parts=s.split(/[,、;\s]+/).filter(Boolean),out={};
 for(const part of parts){const m=part.match(/^(\d+)[=:：](\d+(?:\.\d+)?)$/);if(!m)return null;const no=+m[1],pos=+m[2];if(!Number.isInteger(no)||no<1||no>field||!Number.isFinite(pos)||pos<1||pos>field||Object.hasOwn(out,String(no)))return null;out[no]=pos}
 return out;
}
function pickTop(rows,axisNo,key,k=3){const src=rows.filter(x=>x.no!==axisNo&&Number.isFinite(n(x[key])));src.sort((a,b)=>n(a[key])-n(b[key])||Number(a.no)-Number(b.no));if(src.length<k)return[];if(src[k]&&Math.abs(n(src[k-1][key])-n(src[k][key]))<1e-12)return[];return src.slice(0,k).map(x=>x.no)}
function freeze(input){
 const m=input?.meta||{},field=n(m.field),time=String(input?.startTime||''),now=n(input?.now),scope=['G1','G2','G3','OP','L','3勝'].includes(m.grade);
 if(!validDay(m.date)||!m.venue||!m.name||!['芝','ダート','ダ'].includes(m.surface)||!(n(m.distance)>0)||!Number.isInteger(field)||field<12||field>18||!scope)return{ok:false,reason:'レース条件・日付・頭数を確認してください'};
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||input?.confirmed!==true)return{ok:false,reason:'公式発走時刻を確認し、時刻と確認チェックを入力してください'};
 const start=Date.parse(m.date+'T'+time+':00+09:00');if(!Number.isFinite(start)||!Number.isFinite(now)||now>=start)return{ok:false,reason:'発走予定時刻を過ぎたため事前予想として保存できません'};
 const horses=(input.horses||[]).map(h=>({no:id(h.no),name:String(h.name||''),abilityRank:n(h.abilityRank),m3Rank:n(h.m3Rank),pop:n(h.pop),odds:n(h.odds),expectedCorner:n(h.expectedCorner),lane:String(h.lane||''),p10:n(h.p10),v1Rank:n(h.v1Rank)}));
 if(horses.length!==field||!uniq(horses.map(h=>h.no))||horses.some(h=>h.no==='NaN'||!h.name||!Number.isFinite(h.abilityRank)||!Number.isFinite(h.m3Rank)))return{ok:false,reason:'全頭の馬番・Ability・M3順位が揃っていません'};
 const axisNo=input.axisNo?String(input.axisNo):null,partners=(input.partners||[]).map(String);
 if(axisNo&&!horses.some(h=>h.no===axisNo))return{ok:false,reason:'軸馬番が全頭リストにありません'};
 if(partners.length&&(!axisNo||partners.length!==3||!uniq(partners)||partners.includes(axisNo)||partners.some(no=>!horses.some(h=>h.no===no))))return{ok:false,reason:'相手候補3頭と軸馬番が一致しません'};
 const topM3=axisNo?pickTop(horses,axisNo,'m3Rank'):[],topAbility=axisNo?pickTop(horses,axisNo,'abilityRank'):[],topMarket=axisNo&&horses.every(h=>Number.isFinite(h.pop))?pickTop(horses,axisNo,'pop'):[];
 const record={version:VERSION,key:raceKey(m),meta:{...m,field},capturedAt:new Date(now).toISOString(),startAt:new Date(start).toISOString(),timeSource:'user_confirmed_JST_not_server_attested',
  frozen:{axisNo,axisKind:String(input.axisKind||''),axisCode:String(input.axisCode||''),pairNos:(input.pairNos||[]).map(String),partnerNos:partners,partnerMethod:String(input.partnerMethod||''),topM3,topAbility,topMarket,pace:Array.isArray(input.pace)?input.pace.slice(0,4):[],horses,sourceVersions:input.sourceVersions||{}},outcome:null};
 return{ok:true,record};
}
function pearson(a,b){const len=a.length;if(len<3)return NaN;const ma=a.reduce((s,x)=>s+x,0)/len,mb=b.reduce((s,x)=>s+x,0)/len;let cross=0,sa=0,sb=0;for(let i=0;i<len;i++){const x=a[i]-ma,y=b[i]-mb;cross+=x*y;sa+=x*x;sb+=y*y;}return sa>0&&sb>0?cross/Math.sqrt(sa*sb):NaN}
function evaluate(rec){const f=rec?.frozen||{},horses=f.horses||[],top=rec?.outcome?.top3||[],winners=new Set(top.map(String)),axis=f.axisNo||null,partners=f.partnerNos||[];
 if(top.length!==3||!uniq(top.map(String))||top.some(no=>!horses.some(h=>h.no===String(no))))return null;
 const a=horses.find(h=>h.no===axis),hits=xs=>xs.filter(no=>winners.has(String(no))).length;
 const peers=a&&Number.isFinite(a.odds)&&a.odds>0?horses.filter(h=>h.no!==axis&&Number.isFinite(h.odds)&&h.odds>=a.odds/1.5&&h.odds<=a.odds*1.5):[];
 const positions=rec.outcome?.corner||{},joined=horses.filter(h=>Number.isFinite(h.expectedCorner)&&Number.isFinite(n(positions[h.no]))),enough=joined.length>=Math.max(8,Math.ceil(horses.length/2)),actual=joined.map(h=>n(positions[h.no])),forecast=joined.map(h=>h.expectedCorner);
 const corner= enough?{n:joined.length,mae:joined.reduce((sum,h)=>sum+Math.abs(h.expectedCorner-n(positions[h.no])),0)/joined.length,spearman:pearson(forecast,actual)}:null;
 const marketTop=horses.find(h=>h.pop===1);
 return{key:rec.key,year:String(rec.meta?.date||'').slice(0,4),axisKind:String(f.axisKind||'unknown'),partnerMethod:String(f.partnerMethod||'unknown'),axisNo:axis,axisHit:a?winners.has(axis):null,axisPop:a?.pop,axisOdds:a?.odds,axisNonfavorite:Boolean(a&&a.pop>1),favoriteHit:marketTop?winners.has(marketTop.no):null,
  peerExpected:peers.length?hits(peers.map(h=>h.no))/peers.length:null,peerN:peers.length,partnerHitCount:partners.length===3?hits(partners):null,partnerHitAtLeastOne:partners.length===3?hits(partners)>0:null,
  m3HitCount:f.topM3?.length===3?hits(f.topM3):null,abilityHitCount:f.topAbility?.length===3?hits(f.topAbility):null,marketHitCount:f.topMarket?.length===3?hits(f.topMarket):null,corner};
}
function summarize(records){
 const seen=new Set(),rows=[];let pending=0,invalid=0;for(const rec of records||[]){if(!rec?.key||seen.has(rec.key)){invalid++;continue;}seen.add(rec.key);if(!rec.outcome){pending++;continue;}const r=evaluate(rec);if(r)rows.push(r);else invalid++;}
 const avg=(items,k)=>{const values=items.map(x=>x[k]).filter(Number.isFinite);return values.length?values.reduce((s,x)=>s+x,0)/values.length:null};
 const axes=rows.filter(r=>r.axisHit!==null),market=axes.filter(r=>r.favoriteHit!==null),nonfav=axes.filter(r=>r.axisNonfavorite),peer=axes.filter(r=>r.peerExpected!==null),partners=rows.filter(r=>r.partnerHitCount!==null),corner=rows.filter(r=>r.corner);
 const total=(list,k)=>list.reduce((s,x)=>s+n(x[k]||0),0);
 return{completed:rows.length,pending,invalid,axes:{n:axes.length,hits:axes.filter(x=>x.axisHit).length,favoriteN:market.length,favoriteHits:market.filter(x=>x.favoriteHit).length,nonfavoriteN:nonfav.length,nonfavoriteHits:nonfav.filter(x=>x.axisHit).length,meanOdds:avg(axes,'axisOdds'),peerN:peer.length,peerHits:peer.filter(x=>x.axisHit).length,peerExpected:peer.reduce((s,x)=>s+x.peerExpected,0)},
  partners:{n:partners.length,hitsAtLeastOne:partners.filter(x=>x.partnerHitAtLeastOne).length,horsesHit:total(partners,'partnerHitCount'),m3Hits:total(partners.filter(x=>x.m3HitCount!==null),'m3HitCount'),m3N:partners.filter(x=>x.m3HitCount!==null).length,abilityHits:total(partners.filter(x=>x.abilityHitCount!==null),'abilityHitCount'),abilityN:partners.filter(x=>x.abilityHitCount!==null).length,marketHits:total(partners.filter(x=>x.marketHitCount!==null),'marketHitCount'),marketN:partners.filter(x=>x.marketHitCount!==null).length},
  corner:{races:corner.length,horses:corner.reduce((s,x)=>s+x.corner.n,0),mae:corner.length?corner.reduce((s,x)=>s+x.corner.mae*x.corner.n,0)/corner.reduce((s,x)=>s+x.corner.n,0):null,meanSpearman:corner.length?corner.reduce((s,x)=>s+x.corner.spearman,0)/corner.length:null},rows};
}
root.PredictionAccuracyCoreV1=Object.freeze({version:VERSION,validDay,raceKey,parsePositions,pickTop,freeze,evaluate,summarize});
})(typeof window!=='undefined'?window:globalThis);