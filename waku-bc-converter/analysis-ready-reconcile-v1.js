(()=>{'use strict';
if(window.__RSA_READY_RECONCILE_V1)return;window.__RSA_READY_RECONCILE_V1=true;
let raf=0,lastKey='',structureLabelObserver=null;
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
const pairs=[
 ['finish600-ready','Finish600State'],
 ['four-axis-integration-ready','FourAxisIntegrationState'],
 ['m3-calibrated-probability-ready','M3CalibratedProbabilityState'],
 ['m3-history-amount-ready','M3HistoryAmountState'],
 ['m3-front-position-ready','M3FrontPositionState'],
 ['m3-prev-run-reproducibility-ready','M3PrevRunReproducibilityState'],
 ['m3-analysis-narrative-ready','M3NarrativeAnalysisState'],
 ['m3-race-lab-ready','M3RaceLabState'],
 ['race-shape-bias-ready','RaceShapeBiasState']
];
const MARKET_LABEL='⑥ 市場構造 — 最後に照合';
function marketHeading(){return document.querySelector('#marketSection h2')}
function fixStructureLabels(){const h=marketHeading();if(h&&h.textContent!==MARKET_LABEL)h.textContent=MARKET_LABEL}
function watchStructureLabel(){
 const h=marketHeading();if(!h)return;
 fixStructureLabels();
 if(structureLabelObserver&&structureLabelObserver.__target===h)return;
 if(structureLabelObserver)structureLabelObserver.disconnect();
 structureLabelObserver=new MutationObserver(()=>fixStructureLabels());
 structureLabelObserver.__target=h;
 structureLabelObserver.observe(h,{childList:true,subtree:true,characterData:true});
}
function settleStructureLabels(){watchStructureLabel();fixStructureLabels();queueMicrotask(fixStructureLabels);setTimeout(()=>{watchStructureLabel();fixStructureLabels()},0)}
function currentKey(){return `${generation()}|${pairs.map(([,k])=>window[k]?.ready?'1':'0').join('')}`}
function run(){raf=0;watchStructureLabel();fixStructureLabels();const key=currentKey();if(key===lastKey)return;lastKey=key;for(const [ev,k] of pairs){const s=window[k];if(!s?.ready)continue;queueMicrotask(()=>dispatchEvent(new CustomEvent(ev,{detail:s})))}window.RSAReadyReconcileState={ready:true,version:'analysis-ready-reconcile-v1',generation:generation(),key,marketLabelGuard:true,at:Date.now()}}
function schedule(force=false){if(force)lastKey='';if(!raf)raf=requestAnimationFrame(run)}
addEventListener('rsa-analysis-complete',()=>{settleStructureLabels();schedule(true)});addEventListener('rsa-addons-ready',()=>{settleStructureLabels();schedule(true)});document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id))lastKey=''},true);settleStructureLabels();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settleStructureLabels();schedule(true)},{once:true});else schedule(true);
})();
