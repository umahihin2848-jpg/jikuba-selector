(()=>{'use strict';
if(window.__RACE_SUMMARY_LIFECYCLE_REFRESH_V1)return;window.__RACE_SUMMARY_LIFECYCLE_REFRESH_V1=true;
let timer=0,until=0,expected=0;
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function stop(){if(timer){clearInterval(timer);timer=0}expected=0}
function tick(){if(Date.now()>until){stop();return}const t=window.RSAAnalysisTransitionState;if(!t||t.status!=='ready'||generation()<expected)return;const parent=window.RaceOverallSummaryState,ind=window.RaceIndependentLayerState;if(parent?.ready&&ind?.ready&&!ind?.stale&&Number(ind.generation)===generation()){stop();return}if(!parent?.ready)window.dispatchEvent(new CustomEvent('m3-race-lab-ready',{detail:{summaryLifecycleRefresh:true,generation:generation()}}));else if(!ind?.ready||ind?.stale||Number(ind.generation)!==generation())window.RaceIndependentLayerRefresh?.()}
function watch(ms=9000){until=Math.max(until,Date.now()+ms);if(timer)return;timer=setInterval(tick,280)}
function next(){expected=Math.max(expected,generation()+1);watch()}
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')next()},true);
window.addEventListener('rsa-analysis-complete',()=>{expected=Math.max(expected,generation());watch(8000)});
window.addEventListener('final-decision-ready',()=>watch(5000));
window.addEventListener('m3-pure-ability-v2-ready',()=>watch(5000));
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>watch(4000),{once:true});else watch(4000);
})();