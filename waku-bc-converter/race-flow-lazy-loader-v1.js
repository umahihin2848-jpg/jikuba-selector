(()=>{'use strict';
if(window.__RACE_FLOW_LAZY_LOADER_V1)return;window.__RACE_FLOW_LAZY_LOADER_V1=true;
let loading=false;
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
const state=()=>window.RSAComponentGenerationState||(window.RSAComponentGenerationState={ready:true,version:'race-flow-generation-v1',generation:generation(),components:{},at:Date.now()});
const targets={queue:'ValidatedQueueState',shape:'RaceShapeBiasState',r600:'Remaining600ValidatedState',m3:'Finish600State',fourAxis:'FourAxisIntegrationState'};
function stamp(key){const s=state(),g=generation(),obj=window[targets[key]];if(obj?.ready){obj.generation=g;s.components[key]=g;s.generation=g;s.at=Date.now()}}
function resetCurrent(){const s=state(),g=generation();for(const k of Object.keys(s.components))if(Number(s.components[k])!==g)delete s.components[k];s.generation=g;s.at=Date.now()}
function softenShape(){const S=window.RaceShapeBiasState;if(!S?.ready)return;let text='中立',icon='⚪';if(S.band==='front'){text='前有利傾向（弱）';icon='🟢'}else if(S.band==='rear'){text='前有利は弱め';icon='🔵'}S.displayLabel=text;const n=document.querySelector('#raceShapeBias .rsbTitle');if(n)n.textContent=`${icon} ${text}`}
[['validated-queue-ready','queue'],['race-shape-bias-ready','shape'],['remaining600-validated-ready','r600'],['finish600-ready','m3'],['four-axis-integration-ready','fourAxis']].forEach(([ev,key])=>addEventListener(ev,()=>{stamp(key);if(key==='shape')softenShape();if(window.__RACE_FLOW_LITE_V1)dispatchEvent(new CustomEvent('race-flow-refresh'))}));
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')queueMicrotask(resetCurrent)});
function load(){if(window.__RACE_FLOW_LITE_V1){dispatchEvent(new CustomEvent('race-flow-refresh'));return}if(loading)return;loading=true;const s=document.createElement('script');s.src='race-flow-lite-v1.js?v=20261015f8';s.async=true;s.onload=()=>{loading=false};s.onerror=()=>{loading=false;console.warn('race flow load failed')};document.head.appendChild(s)}
function loadMarketPatch(){if(window.__RSA_MARKET_UI_PATCH_LOADING)return;window.__RSA_MARKET_UI_PATCH_LOADING=true;const s=document.createElement('script');s.src='market-mispricing-ui-patch-v1.js?v=20261017a3';s.async=false;s.onerror=()=>console.warn('market ui patch load failed');document.head.appendChild(s)}
loadMarketPatch();
addEventListener('rsa-analysis-complete',()=>{resetCurrent();softenShape();load()});
})();