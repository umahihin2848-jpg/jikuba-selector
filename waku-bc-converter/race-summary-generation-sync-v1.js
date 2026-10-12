(()=>{'use strict';
if(window.__RACE_SUMMARY_GENERATION_SYNC_V1)return;window.__RACE_SUMMARY_GENERATION_SYNC_V1=true;
let lastGeneration=0;
function generation(){return Number(window.RSAAnalysisTransitionState?.generation)||0}
function sync(){
  const t=window.RSAAnalysisTransitionState;
  if(t&&t.status!=='ready')return false;
  if(window.RaceOverallSummaryState?.ready!==true)return false;
  if(window.M3PureAbilityV2State?.ready!==true||window.Finish600State?.ready!==true)return false;
  try{window.RaceIndependentLayerRefresh?.();lastGeneration=generation();return true}catch(e){console.warn('race summary generation sync',e);return false}
}
addEventListener('race-overall-summary-ready',sync);
addEventListener('rsa-analysis-complete',()=>{
  if(sync())return;
  // Parent summary has its own short post-analysis render. These checks do not
  // reset one another, so event storms cannot postpone the completed generation.
  [80,220,520,1000].forEach(ms=>setTimeout(()=>{
    if(lastGeneration===generation()&&window.RaceIndependentLayerState?.ready===true&&!window.RaceIndependentLayerState?.stale)return;
    sync();
  },ms));
});
addEventListener('market-odds-top3-ready',sync);
addEventListener('four-axis-market-sync-ready',sync);
})();