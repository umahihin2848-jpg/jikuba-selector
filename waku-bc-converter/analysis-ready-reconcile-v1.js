(()=>{'use strict';
if(window.__RSA_READY_RECONCILE_V1)return;window.__RSA_READY_RECONCILE_V1=true;
let raf=0,lastKey='',labelTimers=[];
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
function fixStructureLabels(){const h=document.querySelector('#marketSection h2');if(h&&h.textContent!==MARKET_LABEL)h.textContent=MARKET_LABEL}
function settleStructureLabels(){labelTimers.forEach(clearTimeout);labelTimers=[];fixStructureLabels();queueMicrotask(fixStructureLabels);for(const ms of [0,180,520,980,1700])labelTimers.push(setTimeout(fixStructureLabels,ms))}
function currentKey(){return `${generation()}|${pairs.map(([,k])=>window[k]?.ready?'1':'0').join('')}`}
function run(){raf=0;fixStructureLabels();const key=currentKey();if(key===lastKey)return;lastKey=key;for(const [ev,k] of pairs){const s=window[k];if(!s?.ready)continue;queueMicrotask(()=>dispatchEvent(new CustomEvent(ev,{detail:s})))}window.RSAReadyReconcileState={ready:true,version:'analysis-ready-reconcile-v1.3',generation:generation(),key,marketLabelSettler:true,productionTicketEngine:'structural-ticket-engine-v3',legacyTicketLoader:false,at:Date.now()}}
function schedule(force=false){if(force)lastKey='';if(!raf)raf=requestAnimationFrame(run)}
addEventListener('rsa-analysis-complete',()=>{settleStructureLabels();schedule(true)});addEventListener('rsa-addons-ready',()=>{settleStructureLabels();schedule(true)});document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id)){lastKey='';settleStructureLabels()}},true);settleStructureLabels();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settleStructureLabels();schedule(true)},{once:true});else schedule(true);
})();