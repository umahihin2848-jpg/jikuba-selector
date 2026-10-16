(()=>{'use strict';
const C=window.ShapeCore,$=id=>document.getElementById(id);if(!C)return;
let MODEL=null,rawByHorse=new Map(),parsed=false,lastCtx=null,busy=false;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const n=v=>{if(v===null||v===undefined||v==='')return NaN;const z=Number(String(v).normalize('NFKC').replace(/[,秒\s]/g,''));return Number.isFinite(z)?z:NaN};
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN};
const median=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const sd0=a=>{a=a.filter(Number.isFinite);if(!a.length)return NaN;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length)};
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function col(headers,names){const nn=names.map(C.normHead);return headers.find(h=>nn.includes(C.normHead(h)))||headers.find(h=>nn.some(x=>C.normHead(h).includes(x)))||''}
function dateVal(v){return C.dateVal(String(v||'').normalize('NFKC'))}
function surf(v){const s=String(v||'').normalize('NFKC').trim();return s.startsWith('ダ')?'ダ':s.startsWith('芝')?'芝':''}
function firstPositive(r,keys){for(const k of keys){if(!k)continue;const x=n(r[k]);if(Number.isFinite(x)&&x>0)return x}return NaN}
async function parseFile(file){
  parsed=false;rawByHorse=new Map();if(!file)return;
  try{
    const grid=C.parseCSV(C.decode(await file.arrayBuffer()));if(grid.length<2)return;
    const z=C.rowsToObjects(grid),h=z.headers,m={
      name:col(h,['馬名']),date:col(h,['日付','年月日','レース日']),field:col(h,['頭数','出走頭数']),
      c1:col(h,['1角','１角','通過1']),c2:col(h,['2角','２角','通過2']),c3:col(h,['3角','３角','通過3']),c4:col(h,['4角','４角','通過4']),
      surface:col(h,['芝・ダート','芝・ダ','芝ダ'])
    };
    if(!m.name||!m.date||!m.field||(!m.c1&&!m.c2&&!m.c3&&!m.c4))return;
    for(const r of z.rows){
      const name=String(r[m.name]||'').trim();if(!name)continue;
      const field=n(r[m.field]),pos=firstPositive(r,[m.c1,m.c2,m.c3,m.c4]),dv=dateVal(r[m.date]);
      if(!Number.isFinite(field)||field<=1||!Number.isFinite(pos)||!dv)continue;
      const norm=clamp((pos-1)/(field-1),0,1),front=1-norm,p10=pos>=10?1:0,lead=pos===1?1:0,top3=pos<=3?1:0,surface=m.surface?surf(r[m.surface]):'';
      if(!rawByHorse.has(name))rawByHorse.set(name,[]);
      rawByHorse.get(name).push({date:dv,field,pos,norm,front,p10,lead,top3,surface});
    }
    for(const a of rawByHorse.values())a.sort((x,y)=>y.date-x.date);
    parsed=true;setTimeout(recalc,20);
  }catch(e){console.warn('position risk csv',e)}
}
function history(name,raceDate,targetSurface){
  const a=(rawByHorse.get(name)||[]).filter(x=>x.date<raceDate),a3=a.slice(0,3),a5=a.slice(0,5),same=a.filter(x=>x.surface===targetSurface).slice(0,3),last=a[0];
  return{
    hist_pos_med3:median(a3.map(x=>x.pos)),hist_pos_mean3:mean(a3.map(x=>x.pos)),hist_pos_sd3:sd0(a3.map(x=>x.pos)),hist_p10_rate3:mean(a3.map(x=>x.p10)),
    hist_norm_med3:median(a3.map(x=>x.norm)),hist_norm_mean3:mean(a3.map(x=>x.norm)),last_pos:last?.pos,last_norm:last?.norm,last_p10:last?.p10,
    frontness5:mean(a5.map(x=>x.front)),frontness_sd5:sd0(a5.map(x=>x.front)),lead_rate5:mean(a5.map(x=>x.lead)),top3_rate5:mean(a5.map(x=>x.top3)),
    same_norm_mean3:mean(same.map(x=>x.norm)),same_p10_rate3:mean(same.map(x=>x.p10)),avg_field3:mean(a3.map(x=>x.field)),hist_n:a.length
  };
}
function predict(x){
  if(!MODEL)return NaN;let z=Number(MODEL.intercept)||0;
  MODEL.feature_order.forEach((k,i)=>{let v=Number(x[k]);if(!Number.isFinite(v))v=Number(MODEL.imputer_median[i]);const scale=Number(MODEL.scaler_scale[i])||1,mu=Number(MODEL.scaler_mean[i])||0,b=Number(MODEL.coefficients[i])||0;z+=b*((v-mu)/scale)});
  if(z>=0){const e=Math.exp(-z);return 1/(1+e)}const e=Math.exp(z);return e/(1+e)
}
function pressureLabel(v){if(!Number.isFinite(v))return'—';const t=MODEL?.pressure_thresholds||{};if(v<=Number(t.low_max))return'低';if(v>=Number(t.high_min))return'高';return'中'}
function riskClass(p){return p>=.65?'prHigh':p>=.50?'prWarn':p>=.20?'prMid':'prLow'}
function recalc(){
  if(!MODEL||!lastCtx?.analysis)return;
  const {meta,analysis}=lastCtx,hs=(analysis.hs||[]).filter(x=>x?.name),field=Number(meta.fieldSize)||hs.length,raceDate=dateVal(meta.date),targetSurface=surf(meta.surface);
  if(!raceDate||hs.length<2){window.PositionRiskPressureState={ready:false,reason:'race-date-or-field-missing',rows:[]};return}
  const base=hs.map(h=>({h,feat:history(h.name,raceDate,targetSurface)}));
  const rows=base.map((r,i)=>{
    const others=base.filter((_,j)=>j!==i),pf=mean(others.map(x=>x.feat.frontness5)),pl=mean(others.map(x=>x.feat.lead_rate5)),pt=mean(others.map(x=>x.feat.top3_rate5)),ph=mean(others.map(x=>Number.isFinite(x.feat.frontness5)?(x.feat.frontness5>=.70?1:0):NaN));
    const x={...r.feat,field,pressure_front:pf,pressure_lead:pl,pressure_top3:pt,pressure_highshare:ph},p=predict(x),neutralX={...x,...MODEL.neutral_pressure},pn=predict(neutralX),q=window.ValidatedQueueState?.byNo?.[String(r.h.no)],histN=Number(r.feat.hist_n)||0;
    return{no:String(r.h.no||''),name:r.h.name,histN,p10:histN?p:NaN,neutralP10:histN?pn:NaN,impact:histN&&Number.isFinite(p)&&Number.isFinite(pn)?p-pn:NaN,pressureFront:pf,pressure:pressureLabel(pf),position:q?.position||'—',expectedRank:q?.expectedRank??null,modelReady:histN>0};
  });
  const valid=rows.filter(r=>Number.isFinite(r.pressureFront)),racePressure=mean(valid.map(r=>r.pressureFront));
  window.PositionRiskPressureState={ready:true,version:MODEL.version,role:'display_only',parsed,fieldSize:field,racePressure,racePressureLabel:pressureLabel(racePressure),rows,byNo:Object.fromEntries(rows.map(x=>[String(x.no),x])),validation:MODEL.validation};
  window.dispatchEvent(new CustomEvent('position-risk-pressure-ready',{detail:window.PositionRiskPressureState}));scheduleRender();
}
function scheduleRender(){[0,80,260,700].forEach(t=>setTimeout(render,t))}
function render(){
  if(busy)return;const st=window.PositionRiskPressureState,root=$('qRealTrack');if(!st?.ready||!root)return;busy=true;
  try{
    let summary=root.querySelector('.prRaceSummary');if(!summary){summary=document.createElement('div');summary.className='prRaceSummary';const head=root.querySelector('.rtHead');head?.insertAdjacentElement('afterend',summary)}
    if(summary)summary.innerHTML=`<b>先行圧：${E(st.racePressureLabel)}</b><span>${Number.isFinite(st.racePressure)?st.racePressure.toFixed(3):'—'}｜P10は隊列説明専用・M3/馬券判定には未反映</span>`;
    root.querySelectorAll('.rtHorse[data-no]').forEach(card=>{
      const r=st.byNo?.[String(card.dataset.no||'')];card.querySelector('.prMini')?.remove();if(!r)return;
      const box=document.createElement('span');box.className='prMini';
      if(!Number.isFinite(r.p10)){box.innerHTML=`<span class="prPred">予測：${E(r.position)}</span><span class="prUnknown">P10 —（履歴不足）</span>`;card.appendChild(box);return}
      const pct=Math.round(r.p10*100),neu=Math.round(r.neutralP10*100),pt=Math.round(r.impact*100),sgn=pt>0?'+':'',warn=r.p10>=.65?' ⚠':'';
      box.innerHTML=`<span class="prPred">予測：${E(r.position)}</span><span class="prP10 ${riskClass(r.p10)}">P10 ${pct}%${warn}</span><span class="prImpact">先行圧 ${E(r.pressure)} · ${sgn}${pt}pt</span>`;
      box.title=`POSITION RISK / P10 ${pct}%｜先行圧 ${r.pressure}｜中立時 ${neu}% → 今回 ${pct}% (${sgn}${pt}pt)`;card.appendChild(box)
    })
  }finally{busy=false}
}
const css=document.createElement('style');css.textContent=`
.prRaceSummary{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:-1px 0 8px;padding:7px 9px;border:1px solid #284a5d;border-radius:10px;background:#091d2a;font-size:9px}.prRaceSummary b{font-size:10px;color:#d8edf6}.prRaceSummary span{color:#83a6b8;text-align:right}.prMini{display:block;margin-top:4px;padding-top:3px;border-top:1px solid rgba(150,190,208,.16);line-height:1.2}.prMini>span{display:block}.prPred{color:#a9c7d6;font-size:7px}.prP10{font-size:9px;font-weight:950;margin-top:1px}.prImpact{color:#8fb3c4;font-size:7px;margin-top:1px}.prUnknown{color:#7895a4;font-size:7px;margin-top:1px}.prLow{color:#7dd7b0}.prMid{color:#d8e7ee}.prWarn{color:#ffd280}.prHigh{color:#ff9e8f}@media(max-width:560px){.prRaceSummary{display:block}.prRaceSummary span{display:block;text-align:left;margin-top:2px}.prPred,.prImpact,.prUnknown{font-size:6.5px}.prP10{font-size:8px}}
`;document.head.appendChild(css);
const old=C.analyze;C.analyze=function(meta,odds,horses,M){const a=old(meta,odds,horses,M);lastCtx={meta,analysis:a};setTimeout(recalc,0);return a};
function bind(){const f=$('csvFile');if(f){f.addEventListener('change',e=>parseFile(e.target.files?.[0]));if(f.files?.[0])parseFile(f.files[0])}$('parseCsvBtn')?.addEventListener('click',()=>setTimeout(recalc,80));$('analyzeBtn')?.addEventListener('click',()=>setTimeout(recalc,140))}
['validated-queue-ready','rsa-addons-ready'].forEach(e=>addEventListener(e,()=>{setTimeout(recalc,20);scheduleRender()}));
fetch('data/position_risk_pressure_v1.json?v=20261016pr1',{cache:'no-store'}).then(r=>r.json()).then(x=>{MODEL=x;recalc()}).catch(e=>console.warn('position risk model',e));
if(document.readyState==='loading')addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
