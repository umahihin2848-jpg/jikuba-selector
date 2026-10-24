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
function rewriteTiming(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){if(n.nodeValue&&n.nodeValue.includes('5分前'))n.nodeValue=n.nodeValue.replace(/5分前/g,'15分前')}}
function logicStatusText(x){const s=x?.status,reason=String(x?.reason||'');if(s==='candidate')return'BUY';if(s==='pass')return'見送り';if(s==='waiting_market')return'オッズ入力待ち';if(s==='hold'){if(/境界/.test(reason))return'15分前確認待ち';if(/価格入力待ち|単勝オッズ待ち/.test(reason))return'オッズ入力待ち';return'確認待ち'}return'判定中'}
function fixCandidateOddsStatus(){const root=document.getElementById('candidateOddsCompact'),p=window.StructuralTicketEngineV3State;if(!root||!p)return;const chips=[...root.querySelectorAll('.coLogicChip')];if(chips[0])chips[0].textContent=`Logic1 ワイド｜${logicStatusText(p.wide)}`;if(chips[1])chips[1].textContent=`Logic2 馬連｜${logicStatusText(p.quinella)}`}
function fixFinalConfirmationUi(){rewriteTiming(document.getElementById('structuralTicketEngineV3'));rewriteTiming(document.getElementById('candidateOddsCompact'));rewriteTiming(document.getElementById('logic45StrategiesV1'));rewriteTiming(document.getElementById('decisionReasonCard'));fixCandidateOddsStatus()}
function settleFinalConfirmationUi(){for(const ms of [0,40,120,260,520])setTimeout(()=>requestAnimationFrame(fixFinalConfirmationUi),ms)}
function settleStructureLabels(){labelTimers.forEach(clearTimeout);labelTimers=[];fixStructureLabels();fixFinalConfirmationUi();queueMicrotask(()=>{fixStructureLabels();fixFinalConfirmationUi()});for(const ms of [0,180,520,980,1700])labelTimers.push(setTimeout(()=>{fixStructureLabels();fixFinalConfirmationUi()},ms))}
function currentKey(){return `${generation()}|${pairs.map(([,k])=>window[k]?.ready?'1':'0').join('')}`}
function run(){raf=0;fixStructureLabels();fixFinalConfirmationUi();const key=currentKey();if(key===lastKey)return;lastKey=key;for(const [ev,k] of pairs){const s=window[k];if(!s?.ready)continue;queueMicrotask(()=>dispatchEvent(new CustomEvent(ev,{detail:s})))}window.RSAReadyReconcileState={ready:true,version:'analysis-ready-reconcile-v1.4',generation:generation(),key,marketLabelSettler:true,productionTicketEngine:'structural-ticket-engine-v3',legacyTicketLoader:false,finalConfirmationMinutes:15,at:Date.now()}}
function schedule(force=false){if(force)lastKey='';if(!raf)raf=requestAnimationFrame(run)}
addEventListener('structural-ticket-engine-v3-ready',settleFinalConfirmationUi);addEventListener('candidate-odds-compact-ready',settleFinalConfirmationUi);addEventListener('logic45-strategies-ready',settleFinalConfirmationUi);
addEventListener('rsa-analysis-complete',()=>{settleStructureLabels();schedule(true)});addEventListener('rsa-addons-ready',()=>{settleStructureLabels();schedule(true)});document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','steFinal5'].includes(e.target?.id)){lastKey='';settleStructureLabels();settleFinalConfirmationUi()}},true);settleStructureLabels();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{settleStructureLabels();schedule(true)},{once:true});else schedule(true);
})();