(function raceQualityShadow(){
'use strict';
if(window.__RACE_QUALITY_FRONT_RISK_SHADOW_V1)return;
window.__RACE_QUALITY_FRONT_RISK_SHADOW_V1=true;
const VERSION='race-quality-front-risk-shadow-v1.0', STORE='rsa_front_risk_pre_race_v1', $=id=>document.getElementById(id);
const N=v=>v===null||v===undefined||v===''?NaN:Number(v);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const input={leader:'auto',track:'unknown',certainty:'medium'};
let previousKey='',lastSig='',timer=0,latest=null,message='';
function raceInfo(){return{date:$('raceDate')?.value||'',name:$('raceName')?.value||'',venue:$('venue')?.value||'',surface:$('surface')?.value||'',distance:Number($('distance')?.value)||0,field:Number($('fieldSize')?.value)||0,grade:$('grade')?.value||'',csv:$('csvFile')?.files?.[0]?.name||'',csvModified:$('csvFile')?.files?.[0]?.lastModified||0}}
function keyOf(x){return JSON.stringify([x.date,x.name,x.venue,x.surface,x.distance,x.field,x.grade,x.csv,x.csvModified])}
function score(r){const a=N(r.frontness5),b=N(r.leadRate5);return Number.isFinite(a)?(.78*a+.22*(Number.isFinite(b)?b:a)):NaN}
function evaluate(opts){
 const {queue,market,axisNo,field,leader='auto',track='unknown',certainty='medium'}=opts||{};
 if(!queue?.ready||!Array.isArray(queue.rows)||Number(queue.fieldSize)!==Number(field)||field<12)return{ready:false,reason:'隊列の再計算待ち'};
 if(!market?.complete||!Array.isArray(market.rows)||market.rows.length!==field)return{ready:false,reason:'全頭単勝オッズの入力待ち'};
 const runners=queue.rows.map(r=>({...r,no:Number(r.no),speed:score(r),rank:N(r.expectedRank),hist:N(r.hist_n),valid:Boolean(r.validated)&&N(r.hist_n)>=2&&Number.isFinite(N(r.expectedRank))&&Number.isFinite(score(r))}));
 const front=runners.filter(r=>r.valid&&r.speed>=.48&&r.rank<=Math.max(5,field*.45)).sort((a,b)=>b.speed-a.speed||a.rank-b.rank);
 const top=front.slice(0,3),outerN=top.filter(r=>r.no>field/2).length;
 const autoLeader=top.length<2?'unknown':outerN>=2?'outer':outerN===0?'inner':'mixed';
 const leading=leader==='auto'?autoLeader:leader;
 const byNo=Object.fromEntries(runners.map(r=>[r.no,r]));
 const firstTurn=N(queue.rows[0]?.firstTurnDistance),noTurn=Number(queue.rows[0]?.noTurn)===1;
 const shortTurn=!noTurn&&Number.isFinite(firstTurn)&&firstTurn>0&&firstTurn<=420;
 const line=(market.rows||[]).filter(m=>String(m.no)!==String(axisNo)).sort((a,b)=>N(a.pop)-N(b.pop)||N(a.od)-N(b.od)).slice(0,6);
 const ranked=line.map(m=>{
  const no=Number(m.no),r=byNo[no],name=String(r?.name||m.name||''),pop=N(m.pop),odds=N(m.od);
  if(!r?.valid)return{no,name,pop,odds,level:'unknown',label:'データ不足',reasons:['過去の有効通過順位が2走未満'],threats:[],front:false};
  const isInner=no<=field/2,isFront=r.speed>=.53&&r.rank<=Math.max(5,field*.43),frontOpponents=runners.filter(o=>o.valid&&o.no>field/2&&o.no>no&&o.no!==no&&o.speed>=r.speed-.05&&o.rank<=r.rank+1.5&&o.speed>=.50);
  let level='neutral',reason='現時点で明確な外からの先行競合は検出されていない';
  if(isInner&&isFront&&frontOpponents.length>=1){
   level=(leading==='outer'&&shortTurn&&frontOpponents.length>=2&&certainty!=='low')?'high':(leading!=='inner'&&shortTurn)?'watch':'conditional';
   reason=frontOpponents.length>=2?`外の先行候補${frontOpponents.length}頭が同等以上の先行力。初角までの距離も確認が必要`:`外の先行候補が競合。内の好位を維持できるか確認`;
  } else if(isInner&&isFront&&leading==='outer'){
   level='conditional';reason='外主導の想定だが、モデル上の明確な被せ候補は未検出';
  } else if(!isFront)reason='先行馬としての自動判定対象外';
  else if(!isInner)reason='外側の先行候補。内先行馬への被せリスク判定対象外';
  const labels={high:'強い注意',watch:'注意',conditional:'要確認',neutral:'通常',unknown:'データ不足'};
  const notes=[reason];
  if(!Number.isFinite(firstTurn))notes.push('初角距離は未取得');
  if(leading==='unknown'||leading==='mixed')notes.push('主導権は未確定');
  if(track==='outer'||track==='innerworn')notes.push('馬場は外優勢として手入力（補正点は未較正）');
  if(certainty==='low')notes.push('人間の確信度が低い');
  return{no,name,pop,odds,level,label:labels[level],reasons:notes,threats:frontOpponents.map(o=>o.no),front:isFront,inner:isInner,expectedRank:r.rank,frontness5:N(r.frontness5),leadRate5:N(r.leadRate5),history:r.hist};
 });
 return{ready:true,mode:'shadow',axisNo:String(axisNo||''),autoLeader,leader:leading,track,certainty,firstTurn:Number.isFinite(firstTurn)?firstTurn:null,shortTurn,rows:ranked,productionImpact:false,betsChanged:false,calibrated:false,at:Date.now()};
}
function style(){
 if($('rqfr-style'))return;const s=document.createElement('style');s.id='rqfr-style';s.textContent=`
#rqfr-root{margin:12px 0;padding:13px;border-radius:14px;border:1px solid #365666;background:#0a1f2b;color:#dfeaf0;font-family:inherit}
#rqfr-root h3{font-size:16px;margin:0 0 6px;color:#eaf3f8}
#rqfr-root .rqfr-micro{font-size:11px;line-height:1.6;color:#9db8c4;margin:6px 0}
#rqfr-root .rqfr-inputs{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:11px 0}
#rqfr-root label{font-size:11px;color:#c5d8e0;display:block}
#rqfr-root select{width:100%;min-height:40px;margin-top:3px;border:1px solid #55707e;border-radius:8px;padding:7px;background:#102b37;color:#f3f7f9;font-size:14px}
#rqfr-root .rqfr-row{padding:9px;margin-top:6px;border:1px solid #2e5261;border-radius:9px;background:#0c2835}
#rqfr-root .rqfr-row strong{font-size:13px}.rqfr-status{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;border-radius:6px;border:1px solid #4e6672;padding:2px 5px}
#rqfr-root .rqfr-row.high{border-color:#ac6d56}#rqfr-root .rqfr-row.watch{border-color:#a38b51}
#rqfr-root .rqfr-row small{display:block;color:#93b1c0;font-size:11px;line-height:1.55;margin-top:4px}
#rqfr-root .rqfr-actions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 4px}
#rqfr-root button{border-radius:8px;border:1px solid #5e8291;background:#174053;color:#e5f6fb;padding:9px 12px;font-size:12px;font-weight:700}
html[data-race-gate]:not([data-race-gate="open"]) #rqfr-root{display:none!important}
`;document.head.appendChild(s);
}
function host(){if(window.RSAMobileLean||$('iosMobileShellV2'))return $('imsTicket');return $('result')}
function panel(){const p=host();if(!p)return null;let el=$('rqfr-root');if(!el){el=document.createElement('section');el.id='rqfr-root';el.setAttribute('aria-label','先行位置喪失リスクの検証');p.appendChild(el)}else if(el.parentElement!==p)p.appendChild(el);return el}
function select(name,options,current){return `<label>${name}<select data-rqfr="${name}">${options.map(([v,t])=>`<option value="${v}"${v===current?' selected':''}>${E(t)}</option>`).join('')}</select></label>`}
function logs(){try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}}
function render(){
 style();const info=raceInfo(),key=keyOf(info);
 if(previousKey!==key){previousKey=key;input.leader='auto';input.track='unknown';input.certainty='medium';message='';lastSig=''}
 const node=panel();if(!node)return;
 const gate=document.documentElement.dataset.raceGate;
 const ready=gate==='open'&&window.RSAAnalysisTransitionState?.status==='ready';
 if(!ready){node.hidden=true;latest=null;window.RaceQualityFrontRiskShadowV1State={ready:false,blocked:true,at:Date.now()};return}
 node.hidden=false;
 const shell=window.DecisionShellV2State,axis=String(shell?.structure?.axis?.no||'');
 const result=evaluate({queue:window.ValidatedQueueState,market:shell?.market,axisNo:axis,field:info.field,...input});
 latest={info,key,result,axis};
 const sig=JSON.stringify([key,input,result.ready,result.reason,result.rows?.map(r=>[r.no,r.level,r.pop,r.odds,r.threats]),axis,window.ValidatedQueueState?.version,window.RSAAnalysisTransitionState?.generation,message,logs().some(x=>x.key===key)]);
 if(sig===lastSig)return;lastSig=sig;
 const selections=`<div class="rqfr-inputs">
 ${select('主導',['auto','inner','outer','mixed'].map((v,i)=>[v,['自動推定','内主導','外主導','競合・不明'][i]]),input.leader)}
 ${select('馬場',[['unknown','不明'],['inner','内優勢'],['outer','外優勢'],['flat','フラット'],['innerworn','内荒れ']],input.track)}
 ${select('確信度',[['high','高'],['medium','中'],['low','低']],input.certainty)}
 </div>`;
 const body=!result.ready?`<p class="rqfr-micro">${E(result.reason)}。オッズ・過去走の入力を確認してください。</p>`:`<p class="rqfr-micro">軸 ${E(result.axisNo)}番を除外｜自動主導 ${E({outer:'外',inner:'内',mixed:'競合',unknown:'不明'}[result.autoLeader])}｜初角 ${result.firstTurn===null?'距離不明':Math.round(result.firstTurn)+'m'}。${result.rows.length}頭を市場順で診断。</p>${result.rows.map(r=>`<div class="rqfr-row ${r.level}"><strong>${E(r.no)}番 ${E(r.name)}（${Number.isFinite(r.pop)?r.pop+'人気':'人気不明'}）</strong><span class="rqfr-status">${E(r.label)}</span><small>${E(r.reasons.join('／'))}${r.threats.length?'｜外の競合候補：'+E(r.threats.join('・'))+'番':''}</small></div>`).join('')}`;
 const already=logs().some(x=>x.key===key);
 node.innerHTML=`<h3>レース質｜先行位置喪失リスク</h3><p class="rqfr-micro">相手選びの研究用。強い注意でも消し確定ではありません。軸・本番相手Top2・馬券判定は変更しません。</p>${selections}${body}<div class="rqfr-actions"><button type="button" data-rqfr-action="save" ${!result.ready||already?'disabled':''}>${already?'このレースは記録済み':'この予測を記録'}</button><button type="button" data-rqfr-action="export">記録をJSON出力</button></div>${message?`<p class="rqfr-micro">${E(message)}</p>`:''}<p class="rqfr-micro">判定基準は仮説。データ不足を無理に補完しません。発走前時点の記録で検証し、有効性確認後に初めて馬券ロジックへの採用を検討します。</p>`;
 window.RaceQualityFrontRiskShadowV1State={...result,ready:result.ready,displayOnly:true,studyMode:true,at:Date.now()};
}
function save(){
 if(!latest?.result.ready||document.documentElement.dataset.raceGate!=='open')return;
 const a=logs();if(a.some(x=>x.key===latest.key)){message='既に記録済みのため上書きしません';lastSig='';render();return}
 const record={key:latest.key,race:latest.info,axisNo:latest.axis,recordedAt:new Date().toISOString(),preRaceVerified:false,source:'user_input_plus_model_snapshot',inputs:{...input},prediction:{...latest.result,at:undefined}};
 a.push(record);try{localStorage.setItem(STORE,JSON.stringify(a));message=`記録しました（合計${a.length}レース）。発走前入力かどうかは時刻で別途確認してください。`;}catch(e){message='保存できませんでした。ブラウザの保存設定を確認してください。'}
 lastSig='';render();
}
function exportData(){
 const txt=JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),records:logs()},null,2);
 const b=new Blob([txt],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='race_front_risk_predictions.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function schedule(ms=60){clearTimeout(timer);timer=setTimeout(render,ms)}
document.addEventListener('change',e=>{const el=e.target;if(el?.dataset?.rqfr){const mapping={'主導':'leader','馬場':'track','確信度':'certainty'},k=mapping[el.dataset.rqfr];if(k){input[k]=el.value;lastSig='';schedule(0)}}},true);
document.addEventListener('click',e=>{const a=e.target?.closest?.('[data-rqfr-action]')?.dataset?.rqfrAction;if(a==='save')save();else if(a==='export')exportData();else if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))schedule(250)},true);
document.addEventListener('input',e=>{if(['raceName','raceDate','venue','surface','distance','fieldSize','grade','oddsPaste'].includes(e.target?.id))schedule(150)},true);
document.addEventListener('change',e=>{if(e.target?.id==='csvFile')schedule(150)},true);
['rsa-analysis-start','rsa-analysis-complete','rsa-analysis-error','validated-queue-ready','decision-shell-v2-ready','opponent-candidate-pool-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(70)));
window.RaceQualityFrontRiskShadowV1={version:VERSION,evaluate,render,exportData};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(180),{once:true});else schedule(160);
})();