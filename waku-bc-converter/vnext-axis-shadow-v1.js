(()=>{'use strict';
if(window.__VNEXT_AXIS_SHADOW_V1)return;window.__VNEXT_AXIS_SHADOW_V1=true;
const V='vnext-axis-shadow-v1.0',C=window.VNextAxisCoreV1,$=id=>document.getElementById(id);if(!C)return;
let MODELS=null,raf=0,last='';
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function schedule(ms=0){setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;publish()})},ms)}
function meta(){return{field:num($('fieldSize')?.value),distance:num($('distance')?.value),grade:String($('grade')?.value||'').toUpperCase(),surface:String($('surface')?.value||'')}}
function collect(){
 const A=window.M3PureAbilityState?.byNo||{},F=window.Finish600State?.rows||[],Exact=window.VNextAxisExactQueueState?.byNo||{};
 if(!F.length)return{ready:false,reason:'M3待ち'};
 const m=meta(),field=Number.isFinite(m.field)?m.field:F.length;
 if(!['G1','G2','G3'].includes(m.grade)||field<12)return{ready:false,applicable:false,reason:'検証対象外（G1–G3・12頭以上）'};
 if(!(m.distance>0))return{ready:false,reason:'距離待ち'};
 const odds=window.ShapeCore?.parseOdds?.($('oddsPaste')?.value||'')?.odds||{};
 const nos=F.map(x=>String(x.no)),market=C.marketShares(odds,nos);if(!market.ready)return{ready:false,reason:'全馬単勝オッズ待ち'};
 const rows=[];let exactN=0,currentQN=0;
 for(const f of F){
   const no=String(f.no),a=A[no]||{},ex=Exact[no]||{},q=window.ValidatedQueueState?.byNo?.[no]||{};
   if(Number.isFinite(num(q.posFrac)))currentQN++;
   const predExact=num(ex.pred_front);if(Number.isFinite(predExact))exactN++;
   const row={horse_no:no,horse:String(f.name||a.name||''),grade:m.grade,surface:m.surface,distance:m.distance,field,market_share:market.byNo[no]?.share,abp3_wf:num(a.top3),abRank_wf:num(a.abilityRank),m3Rank_wf:num(f.finishRank),m3score_wf:num(f.score),hist_n:num(f.x?.hist_n),pred_front:predExact};
   if(!Number.isFinite(row.hist_n))row.hist_n=num(a.histN);
   rows.push(row);
 }
 const baseMissing=rows.some(r=>![r.market_share,r.abp3_wf,r.abRank_wf,r.m3Rank_wf,r.m3score_wf,r.hist_n].every(x=>Number.isFinite(num(x))));
 if(baseMissing)return{ready:false,reason:'Ability/M3入力待ち'};
 return{ready:true,rows,field,exactQueueComplete:exactN===rows.length,currentQueueCoverage:rows.length?currentQN/rows.length:0,exactQueueCoverage:rows.length?exactN/rows.length:0};
}
function render(state){
 let root=$('vnextAxisShadowV1');
 if(!root){root=document.createElement('section');root.id='vnextAxisShadowV1';root.className='card';root.style.cssText='margin-top:10px;border:1px solid #38566b;background:#071b27;border-radius:14px;padding:10px';const anchor=$('mfs1')||$('imsTicket')||$('result');if(anchor)anchor.insertAdjacentElement('afterend',root);else document.body.appendChild(root)}
 const show=!window.RSAMobileLean||document.body.classList.contains('imsResearchOpen');root.style.display=show?'':'none';
 if(!state.ready){root.innerHTML=`<div style="font-size:10px;font-weight:900">vNext Axis Shadow</div><div style="font-size:8px;color:#88a3b1;margin-top:5px">${esc(state.reason||'計算待ち')}</div>`;return}
 const a=state.axis||{},s=state.simplified||{},fullNote=state.full?.ready?`Full ${state.full.axis.tier}`:'Full未接続';
 root.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:11px">vNext Axis Shadow</b><span style="font-size:7px;color:#8fa9b7">Production未変更</span></div><div style="margin-top:7px;font-size:20px;font-weight:950">${esc(a.tier||'—')} <span style="font-size:10px">${esc(a.no||'')}番 ${esc(a.name||'')}</span></div><div style="margin-top:5px;font-size:8px;color:#9ab2be">正本Shadow: ${esc(state.routeLabel)}｜内部score ${Number.isFinite(a.score)?a.score.toFixed(4):'—'}</div><div style="margin-top:5px;font-size:8px;color:#809daa">Simplified: ${esc(s.tier||'—')} ${esc(s.no||'')}番｜${esc(fullNote)}</div><div style="margin-top:5px;font-size:7px;color:#6f8b98">現行Queue coverage ${(state.currentQueueCoverage*100).toFixed(0)}%｜Exact queue ${(state.exactQueueCoverage*100).toFixed(0)}%｜Fullは研究時pred_front互換入力のみ使用</div>`;
}
function publish(){
 if(!MODELS){render({ready:false,reason:'vNextモデル読込中'});return}
 const c=collect();if(!c.ready){window.VNextAxisShadowV1State={...c,version:V,at:Date.now()};render(window.VNextAxisShadowV1State);return}
 const fallback=C.scoreRace(c.rows,MODELS.fallback_reference),simple=C.scoreRace(c.rows,MODELS.simplified_shadow);
 let full={ready:false,reason:'exact queue unavailable'};if(c.exactQueueComplete)full=C.scoreRace(c.rows,MODELS.full_reference);
 const chosen=full.ready?full:fallback,route=full.ready?'FULL_EXACT_QUEUE':'FALLBACK_RUNTIME_SAFE';
 const state={ready:Boolean(chosen.ready),applicable:true,version:V,modelVersion:MODELS.version,productionChanged:false,route,routeLabel:route==='FULL_EXACT_QUEUE'?'Full（Exact Queue）':'Fallback（安全経路）',axis:chosen.axis||null,fallback:fallback.ready?fallback:null,full:full.ready?full:null,simplified:simple.ready?simple.axis:null,currentQueueCoverage:c.currentQueueCoverage,exactQueueCoverage:c.exactQueueCoverage,rows:c.rows,at:Date.now()};
 const sig=JSON.stringify([state.route,state.axis?.no,state.axis?.tier,state.axis?.score,state.simplified?.no,state.simplified?.tier,state.currentQueueCoverage,state.exactQueueCoverage]);
 window.VNextAxisShadowV1State=state;if(sig!==last){last=sig;dispatchEvent(new CustomEvent('vnext-axis-shadow-ready',{detail:state}))}render(state);
}
fetch('data/vnext_axis_reference_models_20261028.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`vnext axis model ${r.status}`);return r.json()}).then(x=>{MODELS=x;schedule(20)}).catch(e=>{console.warn('vNext axis shadow',e);render({ready:false,reason:'モデル読込失敗'})});
['m3-pure-ability-ready','finish600-ready','m3-calibrated-shared-ready','validated-queue-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(50)));
document.addEventListener('input',e=>{if(['oddsPaste','fieldSize','distance','grade','surface'].includes(e.target?.id))schedule(80)},true);
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','mfsResearchToggle'].includes(e.target?.id))schedule(120)},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(250),{once:true});else schedule(250);
window.VNextAxisShadowV1={ready:true,version:V,schedule,collect};
})();
