(()=>{'use strict';
if(window.__RACE_CONFIDENCE_PARENT_REFRESH_V1)return;window.__RACE_CONFIDENCE_PARENT_REFRESH_V1=true;
let expected=0,timer=0,until=0,lastParent=0,lastChild=0,parentGen=-1;
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
const analysisReady=()=>window.RSAAnalysisTransitionState?.status==='ready'&&generation()>=expected;
const confidenceFresh=()=>{const ind=window.RaceIndependentLayerState;return !!ind?.ready&&!ind?.stale&&!!ind?.dataConfidence&&Number(ind.generation)===generation()};
function notifyParent(){const g=generation(),now=Date.now();if(parentGen===g&&now-lastParent<1800)return;parentGen=g;lastParent=now;window.dispatchEvent(new CustomEvent('m3-race-lab-ready',{detail:{confidenceRefresh:true,generation:g}}))}
function notifyChild(){const now=Date.now();if(now-lastChild<350)return;lastChild=now;window.dispatchEvent(new CustomEvent('race-overall-summary-ready',{detail:window.RaceOverallSummaryState||null}))}
function stop(){if(timer){clearInterval(timer);timer=0}expected=0}
function watch(ms=9000){until=Math.max(until,Date.now()+ms);if(timer)return;timer=setInterval(()=>{if(Date.now()>until){stop();return}if(!analysisReady())return;if(confidenceFresh()){stop();return}if(!window.RaceOverallSummaryState?.ready||!document.getElementById('raceOverallSummary'))notifyParent();else notifyChild()},160)}
function expectNext(){expected=Math.max(expected,generation()+1);parentGen=-1;watch()}
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')expectNext()},true);
window.addEventListener('rsa-analysis-complete',()=>{expected=Math.max(expected,generation());watch(7000)});
window.addEventListener('race-overall-summary-ready',()=>{if(!confidenceFresh())watch(4500)});
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>watch(4000),{once:true});else watch(4000);
})();