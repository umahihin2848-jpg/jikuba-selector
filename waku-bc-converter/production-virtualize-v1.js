(()=>{'use strict';
let parked=[],timers=[],epoch=0,minGeneration=0,lastBeginAt=0,lastRestoreAt=0;
const KEEP=new Set(['finalDecisionCard','scenarioView','xPostCard','turbulenceStructureBox']);
const INPUT_IDS=new Set(['raceDate','venue','raceName','fieldSize','surface','distance','grade','going','oddsPaste','csvFile']);
function result(){return document.getElementById('result')}
function clearTimers(){for(const t of timers)clearTimeout(t);timers=[]}
function later(fn,ms){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);fn()},ms);timers.push(id);return id}
function restore(){epoch++;clearTimers();if(parked.length){for(const {node,marker} of parked){if(marker?.parentNode)marker.parentNode.insertBefore(node,marker);marker?.remove()}parked=[]}window.ProductionVirtualizeState={parked:0,restored:true,epoch,minGeneration,at:Date.now()}}
function park(token,attempt=0){if(token!==epoch)return;const r=result();if(!r||r.classList.contains('showLegacy'))return;const transition=window.RSAAnalysisTransitionState;if(!transition||transition.status!=='ready'||Number(transition.generation||0)<minGeneration){if(attempt<30)later(()=>park(token,attempt+1),120);return}const nodes=[...r.children].filter(n=>!KEEP.has(n.id));for(const node of nodes){if(parked.some(x=>x.node===node))continue;const marker=document.createComment('rsa-park');node.parentNode?.insertBefore(marker,node);parked.push({node,marker});node.remove()}window.ProductionVirtualizeState={parked:parked.length,restored:parked.length===0,epoch,minGeneration,generation:transition.generation,at:Date.now()}}
function schedulePark(){const token=epoch;later(()=>park(token),120);later(()=>park(token),420);later(()=>park(token),900);later(()=>park(token),1700);later(()=>park(token),2800)}
function beginAnalyze(){lastBeginAt=Date.now();const g=Number(window.RSAAnalysisTransitionState?.generation||0);restore();minGeneration=g+1;schedulePark()}
function restoreOnly(){lastRestoreAt=Date.now();restore();minGeneration=0}
function auxiliaryTarget(id){return ['parseCsvBtn','applyOddsBtn','scenarioToggle'].includes(id)}
function restoreForInput(e){if(INPUT_IDS.has(e.target?.id)&&parked.length)restoreOnly()}
document.addEventListener('change',restoreForInput,true);
document.addEventListener('input',restoreForInput,true);
document.addEventListener('pointerdown',e=>{const id=e.target?.id;if(id==='analyzeBtn')beginAnalyze();else if(auxiliaryTarget(id))restoreOnly()},true);
document.addEventListener('click',e=>{const id=e.target?.id,now=Date.now();if(id==='analyzeBtn'){if(now-lastBeginAt>700)beginAnalyze();else schedulePark()}else if(auxiliaryTarget(id)&&now-lastRestoreAt>700)restoreOnly()},true);
['rsa-analysis-complete','final-decision-ready','calibrated-probability-ready'].forEach(e=>addEventListener(e,schedulePark));
addEventListener('beforeunload',restore);
window.ProductionVirtualize={restore,park:()=>park(epoch),state:()=>({epoch,minGeneration,parked:parked.length})};
})();