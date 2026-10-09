(()=>{'use strict';
let parked=[],fragment=document.createDocumentFragment(),timers=[],epoch=0;
function result(){return document.getElementById('result')}
function clearTimers(){for(const t of timers)clearTimeout(t);timers=[]}
function restore(){epoch++;clearTimers();const r=result();if(!r)return;const anchor=document.getElementById('scenarioView');if(parked.length){for(const n of parked){n.classList.add('legacy');anchor&&anchor.parentNode===r?r.insertBefore(n,anchor):r.appendChild(n)}parked=[]}window.ProductionVirtualizeState={parked:0,restored:true,epoch,at:Date.now()}}
function park(token){if(token!==epoch)return;const r=result();if(!r)return;const transition=window.RSAAnalysisTransitionState;if(transition&&transition.status!=='ready')return;const nodes=[...r.querySelectorAll(':scope > .legacy')].filter(n=>n.id!=='finalDecisionCard'&&n.id!=='scenarioView'&&n.id!=='xPostCard'&&n.id!=='turbulenceStructureBox');if(!nodes.length){window.ProductionVirtualizeState={parked:parked.length,restored:parked.length===0,epoch,at:Date.now()};return}for(const n of nodes){if(!parked.includes(n))parked.push(n);fragment.appendChild(n)}window.ProductionVirtualizeState={parked:parked.length,restored:false,epoch,at:Date.now()}}
function schedulePark(){clearTimers();const token=epoch;timers=[setTimeout(()=>park(token),300),setTimeout(()=>park(token),800)]}
function shouldRestoreTarget(t){return ['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(t?.id)}
document.addEventListener('pointerdown',e=>{if(shouldRestoreTarget(e.target))restore()},true);
document.addEventListener('touchstart',e=>{if(shouldRestoreTarget(e.target))restore()},{capture:true,passive:true});
document.addEventListener('click',e=>{if(shouldRestoreTarget(e.target)&&parked.length)restore()},true);
['rsa-analysis-complete','final-decision-ready'].forEach(e=>addEventListener(e,schedulePark));
addEventListener('beforeunload',restore);
window.ProductionVirtualize={restore,park:()=>park(epoch)};
})();