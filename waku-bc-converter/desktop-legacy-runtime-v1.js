(()=>{'use strict';
if(window.RSAMobileLean)return;
if(window.__DESKTOP_LEGACY_RUNTIME_V1)return;window.__DESKTOP_LEGACY_RUNTIME_V1=true;
const V='desktop-legacy-runtime-v1.0';
const files=[
 'market-edge-bootstrap-v1.js?v=20261022mb2',
 'position-risk-confidence-v1.js?v=20261016prc3',
 'm3-closing-trait-v1.js?v=20261016t1',
 'm3-closing-trait-context-v1.js?v=20261016t4',
 'm3-trait-rescue-watch-v1.js?v=20261016t5',
 'structural-alerts-v1.js?v=20261017a11',
 'longshot-scout-v1.js?v=20261019ls13',
 'win-candidate-layer-v1.js?v=20261017a11',
 'wide-quinella-price-gate-v1.js?v=20261018a12',
 'wide-auto-candidates-v1.js?v=20261019w2',
 'candidate-odds-compact-v1.js?v=20261024ux2',
 'single-axis-ability2-shadow-v1.js?v=20261022sa22',
 'structural-ticket-engine-v3.js?v=20261022ste4',
 'logic45-strategies-v1.js?v=20261024ux1',
 'analysis-ready-reconcile-v1.js?v=20261024fix15b',
 'bet-plan-manual-v1.js?v=20261024ds2',
 'opponent-candidate-pool-v1.js?v=20261024cp1',
 'ticket-scope-wqw-v1.js?v=20261024wqw2',
 'race-flow-lazy-loader-v1.js?v=20261017a11'
];
function add(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=()=>ok(src);s.onerror=()=>fail(new Error(src));document.body.appendChild(s)})}
async function boot(){const loaded=[],failures=[];for(const f of files){try{await add(f);loaded.push(f)}catch(e){failures.push(f);console.warn('desktop legacy',f,e)}}window.DesktopLegacyRuntimeState={ready:true,version:V,loaded,failures,at:Date.now()};dispatchEvent(new CustomEvent('desktop-legacy-runtime-ready',{detail:window.DesktopLegacyRuntimeState}))}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();