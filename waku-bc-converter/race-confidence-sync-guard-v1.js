(()=>{'use strict';
if(window.__RACE_CONFIDENCE_SYNC_GUARD_V1)return;window.__RACE_CONFIDENCE_SYNC_GUARD_V1=true;
let expected=0,timer=0,until=0,lastOverallKick=0,lastIndependentKick=0,overallKickGen=-1;
const gen=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function analysisDone(){const tr=window.RSAAnalysisTransitionState;return !!tr&&tr.status==='ready'&&gen()>=expected}
function fresh(){const tr=window.RSAAnalysisTransitionState,ind=window.RaceIndependentLayerState;return !!ind?.ready&&!ind?.stale&&!!ind?.dataConfidence&&Number(ind.generation)===Number(tr?.generation)}
function kickOverall(){const g=gen(),now=Date.now();if(overallKickGen===g&&now-lastOverallKick<1800)return;overallKickGen=g;lastOverallKick=now;window.dispatchEvent(new CustomEvent('rsa-analysis-complete',{detail:{generation:g,confidenceSync:true}}))}
function kickIndependent(){const now=Date.now();if(now-lastIndependentKick<350)return;lastIndependentKick=now;window.dispatchEvent(new CustomEvent('race-overall-summary-ready',{detail:window.RaceOverallSummaryState||null}))}
function watch(ms=9000){until=Math.max(until,Date.now()+ms);if(timer)return;timer=setInterval(()=>{if(Date.now()>until){clearInterval(timer);timer=0;return}if(!analysisDone())return;if(fresh()){expected=0;clearInterval(timer);timer=0;return}const st=window.RaceOverallSummaryState;if(!st?.ready||!document.getElementById('raceOverallSummary'))kickOverall();else kickIndependent()},180)}
function expectNext(){expected=Math.max(expected,gen()+1);overallKickGen=-1;watch()}
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')expectNext()},true);
window.addEventListener('rsa-analysis-complete',e=>{if(!e.detail?.confidenceSync)expected=Math.max(expected,gen());watch(7000)});
window.addEventListener('race-overall-summary-ready',()=>{if(!fresh())watch(4500)});
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>watch(4500),{once:true});else watch(4500);
})();