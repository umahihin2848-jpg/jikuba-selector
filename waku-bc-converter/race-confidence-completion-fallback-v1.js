(()=>{'use strict';
if(window.__RACE_CONFIDENCE_COMPLETION_FALLBACK_V1)return;window.__RACE_CONFIDENCE_COMPLETION_FALLBACK_V1=true;
let startedGeneration=null,lastRecovered=-1,timer=0,until=0;
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function stop(){if(timer){clearInterval(timer);timer=0}}
function tick(){if(Date.now()>until){stop();return}if(startedGeneration===null)return;const tr=window.RSAAnalysisTransitionState,ind=window.RaceIndependentLayerState,g=generation();if(tr?.status!=='ready'||g<=startedGeneration)return;if(ind?.ready&&!ind?.stale&&Number(ind.generation)===g){startedGeneration=null;stop();return}if(lastRecovered===g)return;lastRecovered=g;window.dispatchEvent(new CustomEvent('rsa-analysis-complete',{detail:{confidenceCompletionFallback:true,generation:g}}))}
function watch(ms=9000){until=Math.max(until,Date.now()+ms);if(timer)return;timer=setInterval(tick,140)}
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn'){startedGeneration=generation();lastRecovered=-1;watch()}},true);
window.addEventListener('rsa-analysis-complete',e=>{if(!e.detail?.confidenceCompletionFallback){const g=generation();if(startedGeneration!==null&&g>startedGeneration)startedGeneration=null}watch(5000)});
})();