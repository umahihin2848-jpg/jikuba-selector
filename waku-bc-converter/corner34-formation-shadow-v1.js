(function corner34Shadow(){
'use strict';
if(window.RaceCorner34V1)return;
const VERSION='race-corner34-shadow-v1.0', STORE='race_corner34_pre_race_v1',$=id=>document.getElementById(id),N=v=>v===null||v===undefined||v===''?NaN:Number(v);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mean=a=>{const z=a.filter(Number.isFinite);return z.length?z.reduce((s,n)=>s+n,0)/z.length:NaN};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const MODEL_URL='data/corner34_position_ridge_v1.json?v=20261108c34v1';
let model=null,modelError='',raceKey='',last='',timer=0,latest=null,note='';
function race(){const f=$('csvFile')?.files?.[0];return{date:$('raceDate')?.value||'',name:$('raceName')?.value||'',venue:$('venue')?.value||'',grade:$('grade')?.value||'',surface:$('surface')?.value||'',distance:Number($('distance')?.value)||0,field:Number($('fieldSize')?.value)||0,csv:f?.name||'',csvModified:f?.lastModified||0}}
function keyOf(x){return JSON.stringify([x.date,x.name,x.venue,x.grade,x.surface,x.distance,x.field,x.csv,x.csvModified])}
function predict(q,meta,mod,conditions={}){
 const n=meta?.field||0;
 if(!mod||!Array.isArray(mod.feature_order)||mod.feature_order.length!==20||mod.c4.length!==21||mod.c3.length!==21)return{ready:false,reason:'3〜4角モデルの読み込み待ち'};
 if(!q?.ready||!Array.isArray(q.rows)||q.rows.length!==n||Number(q.fieldSize)!==n||n<12)return{ready:false,reason:'隊列データ待ち／頭数未一致'};
 const provided=conditions?.inputs||{},lateral=provided.lateral||'unknown',longitudinal=provided.longitudinal||'unknown';
 const rows=q.rows,horseKeys=new Set(rows.map(r=>String(Number(r.no))));if(horseKeys.size!==n)return{ready:false,reason:'馬番と頭数に不整合'};
 const bias=(Number(meta.distance)||0)/1000;
 const running=rows.filter(r=>Number.isFinite(N(r.frontness5)));
 const frontshare=running.length?running.filter(r=>N(r.frontness5)>=.66).length/running.length:NaN;
 const rivalTop2=(conditions?.marketTop2||[]).map(String),shadowTop2=(conditions?.shadowTop2||[]).map(String);
 const validRows=rows.filter(r=>r.validated&&N(r.hist_n)>=2&&N(r.corner3N5)>=2&&N(r.corner4N5)>=2&&Number.isFinite(N(r.corner3Mean5))&&Number.isFinite(N(r.corner4Mean5)));
 const preds=rows.map(r=>{
  const no=String(Number(r.no)),ok=validRows.includes(r);
  const start=N(r.expectedRank),lane=N(r.laneIdx);
  const obj={no,name:String(r.name||''),valid:ok,history:N(r.hist_n),initial:Number.isFinite(start)?start:null,
    lane:Number.isInteger(lane)&&lane>=0&&lane<=3?lane:null};
  if(!ok)return {...obj,reason:'3・4角の過去走が2件未満',three:null,four:null,range:null,risk:'データ不足',riskReason:'順位予測は保留'};
  const early=1-N(r.frontness5),h3=N(r.corner3Mean5),h4=N(r.corner4Mean5),last4=N(r.corner4Last5),last3=N(r.corner3Last5);
  const rivals=running.filter(y=>String(Number(y.no))!==no);
  const pressure=mean(rivals.map(x=>N(x.frontness5)));
  const gate=(Number(no)-1)/(n-1),hist=clamp(N(r.hist_n)/5,0,1);
  const features={
   h_early:early,h_c3:h3,h_c4:h4,h4_last:last4,h3_last:last3,
   h_delta34:N(r.corner34DeltaMean5),h_lead:N(r.leadRate5),
   h4_std:N(r.corner4Std5),h_early_std:N(r.earlyPosStd5),
   hist_n_norm:hist,gate,distance1000:bias,dirt:String(meta.surface||'').startsWith('ダ')?1:0,
   pressure_loo:pressure,frontshare,
   recent_momentum:h4-last4,pos_shift:h4-early,
   gate_early:gate*early,gate_outer:gate*(1-early),gate_pressure:gate*pressure
  };
  const inputs=mod.feature_order.map((k,i)=>Number.isFinite(features[k])?features[k]:mod.imputer[i]);
  const reg=coeff=>clamp(coeff.slice(1).reduce((s,c,i)=>s+c*inputs[i],coeff[0]),0,1);
  const c3=reg(mod.c3),c4=reg(mod.c4);
  const three=1+(n-1)*c3,four=1+(n-1)*c4;
  const width=Number(mod.validation?.pos80_error_frac)||.326;
  return {...obj,three,four,range:[Math.max(1,Math.floor(four-width*(n-1))),Math.min(n,Math.ceil(four+width*(n-1)))],norm3:c3,norm4:c4,
    isMarket:rivalTop2.includes(no),isShadow:shadowTop2.includes(no),h4,early,features:inputs};
 });
 const eligible=preds.filter(r=>r.valid);
 const other=eligible.filter(r=>r.lane!==null);
 for(const r of preds){
  if(!r.valid)continue;
  const near=other.filter(x=>x.no!==r.no&&x.lane>r.lane&&Math.abs(x.four-r.four)<=2.25);
  r.externalPeers=r.lane===null?null:near.length;
  const front=r.four<=Math.max(5,n*.37),rear=r.four>=n*.54,inner=r.lane!==null&&r.lane<=1,outer=r.lane!==null&&r.lane>=2;
  const flags=[];
  if(lateral==='inner_slow'&&inner){
    flags.push(near.length>=2?'内が伸びず外への移動も窮屈か':'内が伸びない想定。外へ出せるか確認');
  }
  if(lateral==='outer_loss'&&outer)flags.push('外回しの距離ロスに注意');
  if(longitudinal==='front_holds'&&rear)flags.push('前後差が埋まりにくく差し届かない懸念');
  if(longitudinal==='front_fades'&&front)flags.push('先行馬の終盤失速を警戒');
  if(longitudinal==='natural_close'&&rear)flags.push('直線で後方との差が縮む仮説');
  if(r.lane===null)flags.push('左右の推定レーンなし');
  r.risk=(flags.length?flags.join('／'):'特定の複合注意なし');
  r.riskReason=`4角推定 ${r.four.toFixed(1)}位・初角推定レーン ${r.lane===null?'不明':['内ラチ','内','中','外'][r.lane]}。${r.externalPeers===null?'横方向未判定':`外側で同順位帯の候補${near.length}頭`}（実測の進路ではない）`;
 }
 const focus=eligible.map(r=>r.four).sort((a,b)=>a-b);
 const highPressure=frontshare>=.38,lowPressure=frontshare<=.24;
 let formation='判定保留',formationReason='位置順位だけでは馬群の前後距離を測定できない';
 if(longitudinal==='front_holds'&&lowPressure){formation='縦長になりやすい仮説';formationReason='先行勢が少なめで前後差が埋まらない想定'}
 else if(longitudinal==='front_fades'&&highPressure){formation='凝縮しやすい仮説';formationReason='先行候補が多く、前が止まる想定'}
 else if(longitudinal==='natural_close'&&highPressure){formation='凝縮する可能性';formationReason='後続が接近する想定。ただし車間距離は不明'}
 else if(longitudinal==='even'||lateral==='flat'){formation='コース・能力重視';formationReason='馬場だけでは隊列形状を決めない'}
 return{ready:true,version:VERSION,field:n,axisNo:String(conditions.axisNo||''),inputs:{lateral,longitudinal},rows:preds,formation,formationReason,validCount:eligible.length,
  marketTop2:rivalTop2,shadowTop2,modelValidation:mod.validation,
  limit:'前後の順位だけを検証。横方向の実走経路・差の距離は未観測。複合警告は未検証',calibratedLane:false,
  productionImpact:false,betsChanged:false,at:Date.now()};
}
function style(){
 if($('c34-css'))return;
 const el=document.createElement('style');el.id='c34-css';
 el.textContent=`
 #c34-root{padding:13px;margin:12px 0;border:1px solid #456f81;border-radius:14px;background:#0a202d;color:#e4f1f7}
 #c34-root h3{font-size:15px;margin:0 0 7px;color:#edf8fb}
 #c34-root p{font-size:11px;line-height:1.55;margin:7px 0;color:#a7c1ca}
 #c34-root .c34-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}
 #c34-root .c34-stat{background:#0e3040;border:1px solid #3d6374;border-radius:9px;padding:9px}
 #c34-root .c34-stat small{display:block;color:#98b3c2;font-size:10px}
 #c34-root .c34-stat strong{display:block;font-size:13px;margin-top:4px}
 #c34-root .c34-chart{border-radius:10px;overflow-x:auto;background:#061b26;padding:5px;margin:9px 0}
 #c34-root .c34-chart svg{display:block;width:100%;height:auto}
 #c34-root .c34-row{padding:9px;border:1px solid #38586b;background:#0d2c3b;border-radius:9px;margin:6px 0}
 #c34-root .c34-row strong{font-size:12px;color:#eef8fb}
 #c34-root .c34-row small{font-size:11px;display:block;margin-top:4px;line-height:1.5;color:#adc5ce}
 #c34-root .c34-row.warn{border-color:#a68155}
 #c34-root button{border:1px solid #578697;background:#185068;border-radius:8px;color:#eaf8fb;padding:9px 11px;margin-right:6px;margin-top:7px;font-size:12px}
 #c34-root details>summary{font-size:12px;cursor:pointer;color:#cee1e8}
 html[data-race-gate]:not([data-race-gate="open"]) #c34-root{display:none!important}
 `;document.head.appendChild(el);
}
function root(){
 let node=$('c34-root');
 const near=$('rq2-root')||$('rqfr-root');
 const parent=near?.parentElement||$('imsTicket')||$('result');
 if(!parent)return null;
 if(!node){node=document.createElement('section');node.id='c34-root';node.setAttribute('aria-label','3角4角の予測と進路研究');if(near?.parentElement===parent&&near.insertAdjacentElement)near.insertAdjacentElement('afterend',node);else parent.appendChild(node)}
 else if(node.parentElement!==parent)parent.appendChild(node);
 return node;
}
function raceMap(state){
 const n=state.field,arr=state.rows.filter(r=>r.valid),market=new Set(state.marketTop2),isAxis=no=>String(no)===state.axisNo;
 const stages=[['初角推定','initial'],['3角予測','three'],['4角予測','four']];
 const X=(stage,lane)=>stage*118+11+(lane===null?1.5:lane)*21;
 const Y=rank=>47+Math.max(0,Math.min(n-1,rank-1))*320/Math.max(1,n-1);
 const labels=['内','外'];
 let html=`<svg viewBox="0 0 360 396" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="初角・3角・4角の前後予測。左右は初角レーンを仮置きした参考配置">`;
 for(let i=0;i<3;i++){
  const bx=i*118;
  html+=`<rect x="${bx+2}" y="5" width="114" height="386" rx="9" fill="${i===2?'#103446':'#0b2938'}" stroke="#345766"/>`;
  html+=`<text x="${bx+59}" y="21" fill="#e0edf2" font-size="12" text-anchor="middle" font-weight="700">${stages[i][0]}</text>`;
  html+=`<text x="${bx+59}" y="35" fill="#91b0bd" font-size="9" text-anchor="middle">${labels[0]} ← 仮レーン → ${labels[1]}</text>`;
 }
 for(const r of arr){
  const lane=r.lane;
  const color=isAxis(r.no)?'#4dd7a5':market.has(r.no)?'#edc56b':'#a9c6d1';
  for(let i=0;i<3;i++){
   const rank=r[stages[i][1]];
   if(!Number.isFinite(rank))continue;
   const cx=X(i,lane),cy=Y(rank);
   html+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8.2" fill="${color}" stroke="#0b2330" stroke-width="1.2"/>`;
   html+=`<text x="${cx.toFixed(1)}" y="${(cy+3).toFixed(1)}" font-size="8.7" text-anchor="middle" font-weight="700" fill="#10202a">${E(r.no)}</text>`;
  }
 }
 return html+`</svg>`;
}
function logs(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
function render(){
 style();const info=race(),key=keyOf(info);if(raceKey!==key){raceKey=key;last='';note=''}
 const host=root();if(!host)return;
 if(document.documentElement.dataset.raceGate!=='open'||window.RSAAnalysisTransitionState?.status!=='ready'){
  host.hidden=true;latest=null;window.RaceCorner34V1State={ready:false,blocked:true};return;
 }
 host.hidden=false;
 const two=window.RaceQualityTwoAxisV1State||{},q=window.ValidatedQueueState,d=window.DecisionShellV2State||{};
 const data=predict(q,{...info},model,{inputs:two.inputs||{},axisNo:d.structure?.axis?.no||'',marketTop2:two.marketTop2||window.OpponentCandidatePoolState?.rows?.map(x=>String(x.no))||[],shadowTop2:two.shadowTop2||[]});
 latest={key,race:info,result:data,inputs:two.inputs||{}};
 const hasLog=logs().some(z=>z.key===key);
 const signature=JSON.stringify([key,data.ready,modelError,q?.rows?.map(r=>[r.no,r.corner3Mean5,r.corner4Mean5,r.corner4N5,r.expectedRank]),two.inputs,data.axisNo,note,hasLog]);
 if(signature===last)return;last=signature;
 if(!data.ready){host.innerHTML=`<h3>3角・4角の隊列予測</h3><p>${E(modelError||data.reason)}。馬ごとの3角・4角の過去走履歴が必要です。</p>`;return}
 const colorOf=r=>r.no===data.axisNo?'◎軸':data.marketTop2.includes(r.no)?'現行相手':data.shadowTop2.includes(r.no)?'比較相手':'';
 const listed=[...data.rows].sort((a,b)=>(a.four??999)-(b.four??999));
 const rows=listed.map(r=>{
  if(!r.valid)return `<div class="c34-row"><strong>${E(r.no)}番 ${E(r.name)}</strong><small>過去の3・4角履歴不足のため予測保留</small></div>`;
  const role=colorOf(r);
  const warn=r.risk!=='特定の複合注意なし';
  return `<div class="c34-row ${warn?'warn':''}"><strong>${E(r.no)}番 ${E(r.name)} ${role?'｜'+E(role):''}</strong>
   <small>初角 ${r.initial===null?'—':r.initial.toFixed(1)}位 → 3角 ${r.three.toFixed(1)}位 → 4角 ${r.four.toFixed(1)}位</small>
   <small>4角参考幅 ${r.range[0]}〜${r.range[1]}番手（過去の誤差幅）｜${E(r.risk)}</small>
   <small>${E(r.riskReason)}</small></div>`;
 }).join('');
 host.innerHTML=`<h3>🏇 3〜4角の予測隊列｜研究版</h3>
 <p>過去走から4角の前後位置を予測。図の左右は「初角の推定レーン」を仮置きしたもので、3〜4角の実際の進路を予言するものではありません。</p>
 <div class="c34-stats"><div class="c34-stat"><small>隊列形状の仮説</small><strong>${E(data.formation)}</strong></div>
 <div class="c34-stat"><small>モデルが予測できる馬</small><strong>${data.validCount} / ${data.field}頭</strong></div></div>
 <p>${E(data.formationReason)}。馬場2軸は進路注意にのみ反映し、4角順位の予測値には未検証の補正を加えません。</p>
 <div class="c34-chart">${raceMap(data)}</div>
 <p>緑：軸候補／黄：現行相手／水色：その他。図の縦軸は前後順位であり、実距離ではありません。</p>
 <details><summary>全頭の3角・4角予測と進路注意を表示</summary>${rows}</details>
 <button type="button" data-c34-action="save" ${hasLog?'disabled':''}>${hasLog?'記録済み':'予測を記録'}</button>
 <button type="button" data-c34-action="export">JSON出力</button>
 ${note?`<p>${E(note)}</p>`:''}
 <p>2025〜26年の検証で4角の平均絶対誤差は正規化順位で約${(data.modelValidation?.mae4||0).toFixed(3)}（16頭立て換算で約${((data.modelValidation?.mae4||0)*15).toFixed(1)}順位分）。参考幅は過去誤差の80%点に基づくもので、馬ごとの保証区間ではありません。実際の壁や馬群の距離は未観測。軸・相手・買い目は変更しません。</p>`;
 window.RaceCorner34V1State={...data,displayOnly:true,updatedAt:Date.now()};
 window.dispatchEvent(new CustomEvent('race-corner34-ready'));
}
function save(){
 if(!latest?.result.ready||document.documentElement.dataset.raceGate!=='open')return;
 const a=logs();if(a.some(z=>z.key===latest.key)){note='既に記録済み。上書きしません';last='';render();return}
 const r=latest.result;
 const obj={version:VERSION,key:latest.key,recordedAt:new Date().toISOString(),race:latest.race,inputs:latest.inputs,preRaceVerified:false,
  modelVersion:r.version,axisNo:r.axisNo,formation:r.formation,rows:r.rows.map(x=>({no:x.no,name:x.name,valid:x.valid,initial:x.initial,three:x.three,four:x.four,range:x.range,lane:x.lane,risk:x.risk}))};
 try{a.push(obj);localStorage.setItem(STORE,JSON.stringify(a));note=`保存しました（${a.length}レース）。時刻と当日の情報を後日照合してください。`}
 catch(e){note='保存に失敗しました';}last='';render();
}
function exportData(){
 const t=JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),records:logs()},null,2);
 const url=URL.createObjectURL(new Blob([t],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='corner34_prediction_snapshots.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function schedule(ms=150){clearTimeout(timer);timer=setTimeout(render,ms)}
document.addEventListener('change',e=>{if(e.target?.id==='csvFile'||e.target?.dataset?.rq2)schedule(150)},true);
document.addEventListener('click',e=>{const cmd=e.target?.closest?.('[data-c34-action]')?.dataset?.c34Action;if(cmd==='save')save();else if(cmd==='export')exportData();else if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id))schedule(300)},true);
document.addEventListener('input',e=>{if(['raceName','raceDate','venue','grade','surface','distance','fieldSize','oddsPaste'].includes(e.target?.id))schedule(150)},true);
['rsa-analysis-start','rsa-analysis-complete','validated-queue-ready','decision-shell-v2-ready','production-decision-pipeline-ready','rsa-addons-ready'].forEach(x=>addEventListener(x,()=>schedule(160)));
window.RaceCorner34V1={version:VERSION,predict,render,exportData};
fetch(MODEL_URL,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('corner34 model '+r.status);return r.json()}).then(m=>{model=m;schedule(100)}).catch(e=>{modelError='予測モデルを読み込めません：'+e.message;schedule(100)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(220),{once:true});else schedule(170);
})();