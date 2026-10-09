(()=>{'use strict';
let timers=[],epoch=0,minGeneration=0,lastBeginAt=0,lastRestoreAt=0;
const INPUT_IDS=new Set(['raceDate','venue','raceName','fieldSize','surface','distance','grade','going','oddsPaste','csvFile']);
function clearTimers(){for(const t of timers)clearTimeout(t);timers=[]}
function restore(){epoch++;clearTimers();window.ProductionVirtualizeState={parked:0,restored:true,epoch,minGeneration,at:Date.now()}}
function park(token,attempt=0){if(token!==epoch)return;const transition=window.RSAAnalysisTransitionState;if(!transition||transition.status!=='ready'||Number(transition.generation||0)<minGeneration){if(attempt<30){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);park(token,attempt+1)},120);timers.push(id)}return}window.ProductionVirtualizeState={parked:0,restored:true,epoch,minGeneration,generation:transition.generation,at:Date.now()}}
function schedulePark(){park(epoch)}
function beginAnalyze(){lastBeginAt=Date.now();const g=Number(window.RSAAnalysisTransitionState?.generation||0);restore();minGeneration=g+1}
function restoreOnly(){lastRestoreAt=Date.now();restore();minGeneration=0}
function auxiliaryTarget(id){return ['parseCsvBtn','applyOddsBtn','scenarioToggle'].includes(id)}
function restoreForInput(e){if(INPUT_IDS.has(e.target?.id))restoreOnly()}
document.addEventListener('change',restoreForInput,true);
document.addEventListener('input',restoreForInput,true);
document.addEventListener('pointerdown',e=>{const id=e.target?.id;if(id==='analyzeBtn')beginAnalyze();else if(auxiliaryTarget(id))restoreOnly()},true);
document.addEventListener('click',e=>{const id=e.target?.id,now=Date.now();if(id==='analyzeBtn'){if(now-lastBeginAt>700)beginAnalyze();else schedulePark()}else if(auxiliaryTarget(id)&&now-lastRestoreAt>700)restoreOnly()},true);
['rsa-analysis-complete','final-decision-ready','calibrated-probability-ready'].forEach(e=>addEventListener(e,schedulePark));
addEventListener('beforeunload',restore);
window.ProductionVirtualize={restore,park:()=>park(epoch),state:()=>({epoch,minGeneration,parked:0})};
})();