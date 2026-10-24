(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const mobile=isiOS||matchMedia('(max-width:760px)').matches||Math.min(screen.width||9999,screen.height||9999)<=760||((navigator.maxTouchPoints||0)>0&&matchMedia('(pointer:coarse)').matches);
if(!mobile)return;
window.RSAMobileLean=true;
document.documentElement.classList.add('rsaMobileLean');
/* Prevent legacy mobile/auto-bet/research layers from starting. */
window.__MARKET_EDGE_BOOTSTRAP_V1=true;
window.__CANDIDATE_ODDS_COMPACT_V1=true;
window.__WIDE_AUTO_CANDIDATES_V1=true;
window.__WIDE_QUINELLA_PRICE_GATE_V1=true;
window.__SINGLE_AXIS_ABILITY2_SHADOW_V1=true;
window.__STRUCTURAL_TICKET_ENGINE_V3=true;
window.__LOGIC45_STRATEGIES_V1=true;
window.__RSA_READY_RECONCILE_V1=true;
window.__DECISION_SHELL_V2=true;
window.__BET_PLAN_MANUAL_V1=true;
window.__OPPONENT_CANDIDATE_POOL_V1=true;
window.__TICKET_SCOPE_WQW_V1=true;
window.__RSA_MOBILE_SIMPLE_UI_V1=true;
window.__MOBILE_STRUCTURE_SUMMARY_V1=true;
window.__M3_CLOSING_TRAIT_V1=true;
window.__M3_CLOSING_TRAIT_CONTEXT_V1=true;
window.__M3_TRAIT_RESCUE_WATCH_V1=true;
window.__STRUCTURAL_ALERTS_V1=true;
window.__LONGSHOT_SCOUT_V1=true;
window.__WIN_CANDIDATE_LAYER_V1=true;
window.__POSITION_RISK_CONFIDENCE_V1=true;
window.__RACE_FLOW_LAZY_LOADER_V1=true;
const s=document.createElement('style');s.id='rsaMobileLeanStyle';s.textContent=`
html.rsaMobileLean,html.rsaMobileLean body{scroll-behavior:auto!important;overscroll-behavior-y:auto!important}
html.rsaMobileLean *{animation:none!important;transition:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;will-change:auto!important}
html.rsaMobileLean .imsTabs{position:static!important;top:auto!important}
html.rsaMobileLean #prospectiveLedgerV2,html.rsaMobileLean #prospectiveLedger,html.rsaMobileLean [id*="prospectiveLedger"],html.rsaMobileLean [class*="prospectiveLedger"]{display:none!important}
html.rsaMobileLean #candidateOddsCompact,html.rsaMobileLean #logic45StrategiesV1,html.rsaMobileLean #structuralTicketEngineV3,html.rsaMobileLean #decisionShellV2,html.rsaMobileLean #decisionMobileV2{display:none!important}
html.rsaMobileLean .card,html.rsaMobileLean #iosMobileShellV2{box-shadow:none!important;filter:none!important}
html.rsaMobileLean body{background:#06111b!important}
`;
document.head.appendChild(s);
window.RSAMobileLeanState={ready:true,version:'mobile-lean-preempt-v1.2',legacyAutoBetPreempted:true,researchUiPreempted:true,marketEdgePreempted:true,at:Date.now()};
})();