(()=>{'use strict';
if(window.__RACE_SUMMARY_GENERATION_SYNC_V1)return;window.__RACE_SUMMARY_GENERATION_SYNC_V1=true;
let lastGeneration=0,lastNudged=0;
function generation(){return Number(window.RSAAnalysisTransitionState?.generation)||0}
function readyTransition(){const t=window.RSAAnalysisTransitionState;return !t||t.status==='ready'}
function sync(){
  if(!readyTransition())return false;
  if(window.RaceOverallSummaryState?.ready!==true)return false;
  if(window.M3PureAbilityV2State?.ready!==true||window.Finish600State?.ready!==true)return false;
  try{window.RaceIndependentLayerRefresh?.();const st=window.RaceIndependentLayerState;if(st?.ready===true&&!st?.stale&&st.generation===generation()){lastGeneration=generation();return true}return false}catch(e){console.warn('race summary generation sync',e);return false}
}
function nudgeParent(gen){
  if(generation()!==gen||!readyTransition()||window.RaceOverallSummaryState?.ready===true)return;
  if(lastNudged===gen)return;
  if(window.M3RaceLabState?.ready===true){lastNudged=gen;dispatchEvent(new CustomEvent('m3-race-lab-ready',{detail:window.M3RaceLabState}));return}
  if(window.FinalDecisionState?.ready===true){lastNudged=gen;dispatchEvent(new CustomEvent('final-decision-ready',{detail:window.FinalDecisionState}))}
}
addEventListener('race-overall-summary-ready',sync);
addEventListener('rsa-analysis-complete',()=>{
  const gen=generation();
  if(sync())return;
  [120,420,820].forEach(ms=>setTimeout(()=>{if(generation()!==gen)return;if(sync())return;nudgeParent(gen)},ms));
  [1050,1300].forEach(ms=>setTimeout(()=>{if(generation()!==gen)return;sync()},ms));
});
addEventListener('market-odds-top3-ready',sync);
addEventListener('four-axis-market-sync-ready',sync);
})();