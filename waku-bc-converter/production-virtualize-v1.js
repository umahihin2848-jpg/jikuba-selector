(()=>{'use strict';
let parked=[],timers=[],epoch=0;
const KEEP=new Set(['finalDecisionCard','scenarioView','xPostCard','turbulenceStructureBox']);
function result(){return document.getElementById('result')}
function clearTimers(){for(const t of timers)clearTimeout(t);timers=[]}
function restore(){epoch++;clearTimers();if(!parked.length){window.ProductionVirtualizeState={parked:0,restored:true,epoch,at:Date.now()};return}for(const item of parked){const {node,marker}=item;if(marker?.parentNode)marker.parentNode.insertBefore(node,marker);marker?.remove()}parked=[];window.ProductionVirtualizeState={parked:0,restored:true,epoch,at:Date.now()}}
function park(token){if(token!==epoch)return;const r=result();if(!r||r.classList.contains('showLegacy'))return;const transition=window.RSAAnalysisTransitionState;if(transition&&transition.status!=='ready')return;const nodes=[...r.children].filter(n=>!KEEP.has(n.id));if(!nodes.length){window.ProductionVirtualizeState={parked:parked.length,restored:parked.length===0,epoch,at:Date.now()};return}for(const node of nodes){if(parked.some(x=>x.node===node))continue;const marker=document.createComment('rsa-park');node.parentNode?.insertBefore(marker,node);parked.push({node,marker});node.remove()}window.ProductionVirtualizeState={parked:parked.length,restored:false,epoch,at:Date.now()}}
function schedulePark(){clearTimers();const token=epoch;timers=[setTimeout(()=>park(token),350),setTimeout(()=>park(token),900)]}
function shouldRestoreTarget(t){return ['analyzeBtn','parseCsvBtn','applyOddsBtn','scenarioToggle'].includes(t?.id)}
document.addEventListener('pointerdown',e=>{if(shouldRestoreTarget(e.target))restore()},true);
document.addEventListener('touchstart',e=>{if(shouldRestoreTarget(e.target))restore()},{capture:true,passive:true});
document.addEventListener('click',e=>{if(shouldRestoreTarget(e.target)&&parked.length)restore()},true);
['rsa-analysis-complete','final-decision-ready'].forEach(e=>addEventListener(e,schedulePark));
addEventListener('beforeunload',restore);
window.ProductionVirtualize={restore,park:()=>park(epoch)};
})();