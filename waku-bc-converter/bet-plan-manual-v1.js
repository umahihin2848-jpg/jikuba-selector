(()=>{'use strict';
// Deprecated legacy panel. The current v3 UI separates Production, next Shadow,
// and legacy diagnostics in the maintained opponent displays.
if(window.__BET_PLAN_MANUAL_V1_RETIRED)return;
window.__BET_PLAN_MANUAL_V1_RETIRED=true;
window.BetPlanManualLegacyState={
  ready:true,
  version:'bet-plan-manual-v1.retired',
  deprecated:true,
  displayOnly:true,
  productionImpact:false,
  reason:'Superseded by current Production / Shadow / diagnostic opponent UI.'
};
})();
