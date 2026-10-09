(()=>{'use strict';
let parked=[],fragment=document.createDocumentFragment(),timer=0;
function result(){return document.getElementById('result')}
function restore(){const r=result();if(!r||!parked.length)return;const anchor=document.getElementById('scenarioView');for(const n of parked){n.classList.add('legacy');anchor&&anchor.parentNode===r?r.insertBefore(n,anchor):r.appendChild(n)}parked=[];window.ProductionVirtualizeState={parked:0,restored:true,at:Date.now()}}
function park(){const r=result();if(!r)return;const nodes=[...r.querySelectorAll(':scope > .legacy')].filter(n=>n.id!=='finalDecisionCard'&&n.id!=='scenarioView'&&n.id!=='xPostCard');if(!nodes.length){window.ProductionVirtualizeState={parked:parked.length,at:Date.now()};return}for(const n of nodes){parked.push(n);fragment.appendChild(n)}window.ProductionVirtualizeState={parked:parked.length,restored:false,at:Date.now()}}
function schedulePark(){clearTimeout(timer);timer=setTimeout(park,240);setTimeout(park,650)}
function shouldRestoreTarget(t){return ['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(t?.id)}
document.addEventListener('click',e=>{if(shouldRestoreTarget(e.target))restore()},true);
['rsa-analysis-complete','final-decision-ready'].forEach(e=>addEventListener(e,schedulePark));
addEventListener('beforeunload',restore);
window.ProductionVirtualize={restore,park};
})();