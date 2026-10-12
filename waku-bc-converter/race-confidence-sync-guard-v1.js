(()=>{'use strict';
if(window.__RACE_CONFIDENCE_SYNC_GUARD_V1)return;window.__RACE_CONFIDENCE_SYNC_GUARD_V1=true;
let expected=0,timer=0,until=0,lastKick=0;
const gen=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function kick(){const now=Date.now();if(now-lastKick<70)return;lastKick=now;window.dispatchEvent(new CustomEvent('race-overall-summary-ready',{detail:window.RaceOverallSummaryState||null}))}
function settled(){const tr=window.RSAAnalysisTransitionState,st=window.RaceOverallSummaryState;return !!tr&&tr.status==='ready'&&gen()>=expected&&!!st?.ready&&!!document.getElementById('raceOverallSummary')}
function fresh(){const tr=window.RSAAnalysisTransitionState,ind=window.RaceIndependentLayerState;return !!ind?.ready&&!ind?.stale&&ind?.dataConfidence&&Number(ind.generation)===Number(tr?.generation)}
function watch(ms=8500){until=Math.max(until,Date.now()+ms);if(timer)return;timer=setInterval(()=>{if(Date.now()>until){clearInterval(timer);timer=0;return}if(settled()){if(fresh()){expected=0;clearInterval(timer);timer=0;return}kick()}},180)}
function expectNext(){expected=Math.max(expected,gen()+1);watch()}
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')expectNext()},true);
window.addEventListener('rsa-analysis-complete',()=>{expected=Math.max(expected,gen());watch(6500)});
window.addEventListener('race-overall-summary-ready',()=>{if(!fresh())watch(3500)});
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>watch(4000),{once:true});else watch(4000);
})();