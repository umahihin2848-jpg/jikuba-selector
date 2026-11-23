/* Whole-field position contest: uncalibrated scenarios, research only.
   Uses existing ValidatedQueue expectedRank; does not feed predictions to production. */
(function(root){'use strict';
const VERSION='race-position-competition-v1-20261123';
const N=v=>v===null||v===undefined||v===''?NaN:Number(v);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(s){let x=2166136261;for(let i=0;i<s.length;i++)x=Math.imul(x^s.charCodeAt(i),16777619);return x>>>0;}
function random(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
function check(rows){if(!Array.isArray(rows)||rows.length<12||rows.length>18)return{ok:false,reason:'12〜18頭の全頭データが必要です'};
 const seen=new Set();
 for(const r of rows){const no=N(r.no),p=N(r.expectedRank);
  if(!Number.isInteger(no)||no<1||no>18||seen.has(no)||!r.validated||!Number.isFinite(p)||p<1||p>rows.length)return{ok:false,reason:'馬番未確認・位置予測が未成立の馬があります'};
  seen.add(no);
 }return{ok:true};
}
function simulate(input,options={}){
 const status=check(input);if(!status.ok)return{ready:false,reason:status.reason};
 const rows=input.map(r=>({no:String(r.no),name:String(r.name||''),expectedRank:N(r.expectedRank),histGapSd:Number.isFinite(N(r.histGapSd))?N(r.histGapSd):null,histGapN:Number.isInteger(N(r.histGapN))?N(r.histGapN):0,histUnique5:Number.isInteger(N(r.histUnique5))?N(r.histUnique5):null,histDupRows5:Number.isInteger(N(r.histDupRows5))?N(r.histDupRows5):null})).sort((a,b)=>Number(a.no)-Number(b.no));
 const n=rows.length,k=Math.floor(.25*(n-1))+1,kMiddle=Math.floor(.65*(n-1))+1,count=Number.isInteger(options.count)?clamp(options.count,128,16384):4096;
 const dispersion=Number.isFinite(N(options.dispersion))?clamp(N(options.dispersion),.5,12):2.8;
 const rng=random((Number.isInteger(options.seed)?options.seed:hash(rows.map(x=>x.no+':'+x.expectedRank.toFixed(4)).join('|'))));
 const hist=Array.from({length:n},()=>Array(n).fill(0));let totalRankTop=0;
 for(let s=0;s<count;s++){
  const order=rows.map((r,i)=>{
   const u=clamp(rng(),1e-12,1-1e-12),g=-Math.log(-Math.log(u));
   return{i,z:-(r.expectedRank-1)/dispersion+g};
  }).sort((a,b)=>b.z-a.z||a.i-b.i);
  for(let rank=0;rank<n;rank++){hist[order[rank].i][rank]++;}
 }
 const out=rows.map((r,i)=>{
  let total=0;const cdf=hist[i].map(v=>(total+=v)),front=hist[i].slice(0,k).reduce((a,b)=>a+b,0);
  const percentile=t=>hist[i].reduce((z,x,j)=>z===null&&cdf[j]>=Math.ceil(count*t)?j+1:z,null)||n;
  // Conditional on missing a top-k place *inside this hypothetical contest*.
  // This is NOT learned from the 2025-26 fallback outcome model, which did not improve errors.
  const fallbackCount=count-front;
  const middleCount=hist[i].slice(k,kMiddle).reduce((a,b)=>a+b,0);
  const rearCount=hist[i].slice(kMiddle).reduce((a,b)=>a+b,0);
  const fallbackMeanRank=fallbackCount?hist[i].reduce((a,v,j)=>j>=k?a+v*(j+1):a,0)/fallbackCount:null;
  const fallbackPercentile=t=>{
   if(!fallbackCount)return null;
   let seen=0;const target=Math.ceil(t*fallbackCount);
   for(let j=k;j<n;j++){seen+=hist[i][j];if(seen>=target)return j+1;}
   return n;
  };
  return{...r,rank10:percentile(.1),rank90:percentile(.9),meanRank:hist[i].reduce((a,v,j)=>a+v*(j+1),0)/count,
   frontCount:front,frontShare:front/count,fallbackCount,
   middleShare:middleCount/count,rearShare:rearCount/count,rankProbabilities:hist[i].map(v=>v/count),
   fallbackShare:fallbackCount/count,fallbackMeanRank,
   fallbackRank10:fallbackPercentile(.1),fallbackRank90:fallbackPercentile(.9)};
 });
 totalRankTop=out.reduce((a,r)=>a+r.frontCount,0);
 return{ready:true,version:VERSION,n,k,kMiddle,count,dispersion,rows:out,totalFrontCount:totalRankTop,totalFrontShare:totalRankTop/count,
   totalMiddleShare:out.reduce((a,r)=>a+r.middleShare,0),totalRearShare:out.reduce((a,r)=>a+r.rearShare,0),
  notice:'過去の初通過位置予測から全頭の仮順位を同時抽選した研究上の割合。実測に較正した確率ではありません。'};
}
root.RSARacePositionCompetitionCoreV1=Object.freeze({version:VERSION,simulate,check,hash});
const doc=root.document;if(!doc?.createElement||!root.addEventListener)return;
if(root.RSARacePositionCompetitionV1)return;
const $=id=>doc.getElementById(id);
let timer=0,expanded=false,last='',analysisVersion=0,lastSnapshot=null;
function css(){if($('rsarpcStyle'))return;const st=doc.createElement('style');st.id='rsarpcStyle';st.textContent=
 '#rsarpcPanel{border:1px solid #315c72;border-radius:14px;background:#081e2d;margin:12px 0;overflow:hidden;color:#dceaf3}'+
 '#rsarpcPanel>summary{cursor:pointer;list-style:none;padding:13px;font-weight:900;font-size:13px}'+
 '#rsarpcPanel>summary::-webkit-details-marker{display:none}'+
 '.rsarpcBody{padding:0 11px 12px;font-size:11px;line-height:1.6}'+
 '.rsarpcHint{font-size:11px;color:#a7bdc9;margin:8px 0}'+
 '.rsarpcMini{border:1px solid #3b5766;background:#122a38;padding:8px;border-radius:9px;font-size:10px;color:#c3d6e1;margin:8px 0}'+
 '.rsarpcTable{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px}'+
 '.rsarpcTable th,.rsarpcTable td{padding:8px 4px;border-bottom:1px solid #274657;text-align:right;overflow-wrap:anywhere}'+
 '.rsarpcTable th:first-child,.rsarpcTable td:first-child{text-align:left;width:39%}'+
 '.rsarpcTable th{font-size:10px;color:#aac2d0}.rsarpcBar{height:6px;border-radius:8px;background:#254459;margin-top:3px;overflow:hidden}'+
 '.rsarpcBar>i{display:block;height:100%;background:#5ab59e;border-radius:8px}'+
 '.rsarpcQuiet{font-size:10px;color:#91aabb}'+
 '.rsarpcExport{margin:10px 0;padding:9px 12px;border:1px solid #5aa8a5;border-radius:9px;background:#0e3b48;color:#e1fffc;font-size:12px;font-weight:750;cursor:pointer;width:100%}';doc.head.appendChild(st);}
function context(){const s=root.RSAFocusedThreeTabsState||{},q=root.ValidatedQueueState||{},f=root.Finish600State||{};
 if(s.active!=='formation'||!s.analysisReady||!q.ready||!f.ready||root.RSAFocusedThreeTabsV1?.dirty)return null;
 if(!/^(3勝|L|OP|G1|G2|G3)$/.test(String($('grade')?.value||'')))return null;
 const host=$('rsafFormation'),fr=f.rows||[];if(!host||fr.length<12||fr.length>18)return null;
 const rows=fr.map(r=>{const x=q.byNo?.[String(r.no)]||{};return{no:r.no,name:r.name,expectedRank:x.expectedRank,validated:Boolean(x.validated),histGapSd:r.x?.hist_gap_sd,histGapN:r.x?.hist_gap_n,histUnique5:r.x?.hist_unique_races5,histDupRows5:r.x?.hist_duplicate_rows5};});
 const raceInfo=[$('raceDate')?.value,$('venue')?.value,$('raceName')?.value,$('surface')?.value,$('distance')?.value,$('grade')?.value];
 const seedSig=[...raceInfo,rows.map(r=>r.no+':'+r.name+':'+r.expectedRank+':'+r.validated).join('|')].join('~');
 const sig=seedSig+'|history:'+rows.map(r=>r.histGapSd+':'+r.histGapN+':'+r.histUnique5+':'+r.histDupRows5).join('|');
 return{host,rows,sig,seedSig};
}
function render(){const c=context();if(!c)return;css();const signature=c.sig+'|'+analysisVersion;let el=$('rsarpcPanel');if(el&&el.parentElement===c.host&&signature===last)return;last=signature;
 const result=simulate(c.rows,{seed:hash(c.seedSig),count:4096,dispersion:2.8});
 lastSnapshot=result.ready?{sig:c.sig,result}:null;
 if(!el||el.parentElement!==c.host){el=doc.createElement('details');el.id='rsarpcPanel';el.addEventListener('toggle',()=>{expanded=el.open;});c.host.appendChild(el);}
 el.open=expanded;
 let body='<div class="rsarpcBody"><p class="rsarpcHint">全頭が同時に前方の位置を取り合う仮想シミュレーション。既存の初位置予測を入力に使用。今回の騎手判断・競り合い・外を回る消耗はまだ学習していません。</p><p class="rsarpcHint">過去位置SDは直近最大5走の残600m先頭差の標準偏差（秒、芝ダ混合）。小さいほど履歴が安定。ただしCSVで同じ過去レースが重複すると過小評価されます。直近履歴の重複数を併記し、仮想順位抽選への補正には使っていません。</p>';
 if(!result.ready){body+='<p class="rsarpcMini">'+esc(result.reason)+'。不完全な出走馬では全頭の順位を計算しません。</p>';}
 else{
  const dup=result.rows.filter(r=>Number.isInteger(r.histDupRows5)&&r.histDupRows5>0);
  const unknown=result.rows.filter(r=>r.histDupRows5===null);
  if(dup.length)body+='<p class="rsarpcMini">⚠ 履歴の重複検出：'+dup.length+' / '+result.n+'頭が直近5行に同一レースを含みます。M3と初位置予測の過去走の重みが偏る可能性があります。計算結果は変更せず、入力確認を促す研究用の注意表示です。</p>';
  if(unknown.length)body+='<p class="rsarpcHint">'+unknown.length+'頭はレースID不足により過去履歴の重複判定ができません。</p>';
  body+='<p class="rsarpcMini">'+result.n+'頭で前方'+result.k+'枠を同時抽選（'+result.count.toLocaleString('ja-JP')+'回）。各試行は1〜'+result.n+'位が重複しない仮順位。横並びの実際の通過順位とは異なります。</p>';
  body+='<table class="rsarpcTable"><thead><tr><th>馬</th><th>既存の初位置</th><th>前方枠の抽選割合</th><th>順位の10–90%範囲</th></tr></thead><tbody>';
  for(const r of [...result.rows].sort((a,b)=>b.frontShare-a.frontShare))body+='<tr><td>'+esc(r.no)+'番 '+esc(r.name)+(Number.isFinite(r.histGapSd)&&r.histGapN>=2?'<div class="rsarpcQuiet">過去位置SD '+r.histGapSd.toFixed(2)+'秒／'+r.histGapN+'行</div>':'<div class="rsarpcQuiet">過去位置SD —</div>')+(Number.isInteger(r.histUnique5)?'<div class="rsarpcQuiet">直近履歴：'+r.histUnique5+'レース／'+r.histGapN+'行'+(r.histDupRows5>0?'（重複あり）':'')+'</div>':'')+'</td>'+
   '<td>'+r.expectedRank.toFixed(1)+'番手</td><td>'+(100*r.frontShare).toFixed(0)+'%<div class="rsarpcBar"><i style="width:'+(100*r.frontShare).toFixed(1)+'%"></i></div><div class="rsarpcQuiet">中団 '+(100*r.middleShare).toFixed(0)+'%・後方 '+(100*r.rearShare).toFixed(0)+'%</div></td>'+
   '<td>'+r.rank10+'〜'+r.rank90+'位'+(r.fallbackCount?'<div class="rsarpcQuiet">前方に入れない試行：平均'+r.fallbackMeanRank.toFixed(1)+'番手／'+r.fallbackRank10+'〜'+r.fallbackRank90+'位</div>':'')+'</td></tr>';
  body+='</tbody></table><p class="rsarpcQuiet">全馬で前方'+result.totalFrontShare.toFixed(0)+'枠／中団'+result.totalMiddleShare.toFixed(0)+'枠／後方'+result.totalRearShare.toFixed(0)+'枠（整合性チェック）。これは実測で較正した確率ではありません。</p>'+
   '<button id="rsarpcExport" type="button" class="rsarpcExport">この全頭順位分布をJSONで保存（研究用）</button>'+
   '<p class="rsarpcQuiet">発走前に保存すると、次走の実際の通過順位との事後比較に使えます。作成時刻は端末上の時刻で、発走前であることを公式に保証する記録ではありません。</p>';
 }
 body+='<p class="rsarpcMini">研究のみ：Ability、M3、P10、公式軸・相手、オッズ、BUY/PASSを変更しません。枠の確定馬番とTARGET仮番号の照合が必要です。</p></div>';
 el.innerHTML='<summary>全頭の位置争奪シミュレーション｜研究用・未較正</summary>'+body;
}
function exportSnapshot(){
 const c=context();
 if(!c||!lastSnapshot?.result?.ready||lastSnapshot.sig!==c.sig){root.alert?.('解析条件が変わりました。レースを再解析してください。');return;}
 const result=lastSnapshot.result;
 const meta={date:$('raceDate')?.value||'',raceName:$('raceName')?.value||'',venue:$('venue')?.value||'',surface:$('surface')?.value||'',distance:Number($('distance')?.value),grade:$('grade')?.value||'',field:result.n};
 const snapshot={schema:'rsa-rank-distribution-snapshot-v1',capturedAt:new Date().toISOString(),modelVersion:VERSION,
  modelInput:'ValidatedQueueState.expectedRank',calibrated:false,usage:'研究用仮想分布。馬券期待値・本番M3へ転用不可',
  metadata:meta,simulation:{method:'Gumbel whole-field rank permutation',iterations:result.count,dispersion:result.dispersion,
   frontSeats:result.k,middleEnd:result.kMiddle,seed:hash(c.seedSig)},
  runners:result.rows.map(r=>({no:r.no,name:r.name,inputExpectedRank:r.expectedRank,simulatedExpectedRank:r.meanRank,historyGapSdSeconds:r.histGapSd,historyGapRaceCount:r.histGapN,historyDistinctRacesLast5:r.histUnique5,historyDuplicateRowsLast5:r.histDupRows5,
   rankProbabilities:r.rankProbabilities,frontShare:r.frontShare,middleShare:r.middleShare,rearShare:r.rearShare,
   interval10to90:[r.rank10,r.rank90],ifNotFront:{meanRank:r.fallbackMeanRank,interval10to90:[r.fallbackRank10,r.fallbackRank90]}}))};
 const data=JSON.stringify(snapshot,null,2), blob=new root.Blob([data],{type:'application/json'});
 const url=root.URL.createObjectURL(blob),link=doc.createElement('a');
 const label=String(meta.date||'race').replace(/[^0-9]/g,'')+'_'+String(meta.venue).replace(/[\\/:*?"<>|\s]/g,'');
 link.href=url;link.download='position_rank_'+label+'.json';link.hidden=true;doc.body.appendChild(link);link.click();link.remove();
 root.setTimeout(()=>root.URL.revokeObjectURL(url),30000);
}
function schedule(){root.clearTimeout(timer);timer=root.setTimeout(render,130);}
root.RSARacePositionCompetitionV1=Object.freeze({version:VERSION,productionImpact:false,refresh:schedule});
['rsa-focused-partner-ready','validated-queue-ready','finish600-ready','course-geometry-ready','rsa-analysis-complete'].forEach(event=>root.addEventListener(event,schedule));
doc.addEventListener('click',e=>{if(e.target?.id==='rsarpcExport'){exportSnapshot();return;}if(e.target?.id==='analyzeBtn'){analysisVersion++;root.setTimeout(schedule,650);}});
if(doc.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
