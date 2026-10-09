(()=>{'use strict';
const BUILD='20261009q6',LABEL='Scenario v1 · Q6 · 安定版';
let timer=0;
function apply(){
  const result=document.getElementById('result');
  const decision=document.getElementById('finalDecisionCard');
  if(decision){
    decision.classList.remove('legacy','uiMovedTechnical');
    decision.style.display='';
    if(result&&result.firstElementChild!==decision)result.insertBefore(decision,result.firstElementChild);
  }
  const badge=document.querySelector('.brand .badge');
  if(badge&&badge.textContent!==LABEL)badge.textContent=LABEL;
  document.documentElement.dataset.rsaBuild=BUILD;
  document.documentElement.dataset.rsaAutoResume='off';
}
function schedule(){clearTimeout(timer);[0,80,240,650,1400].forEach(t=>setTimeout(apply,t))}
['final-decision-ready','turbulence-structure-ready','calibrated-probability-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(e.target?.id))schedule()});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();