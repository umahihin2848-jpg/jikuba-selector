(()=>{'use strict';
const BUILD='20261009q8',LABEL='Scenario v1 · Q8 · 安定版';
const css=document.createElement('style');css.textContent=`
#result:not(.rsaCalcPending) #finalDecisionCard{display:block!important;visibility:visible!important;opacity:1!important;content-visibility:visible!important}
#result:not(.rsaCalcPending) #turbulenceStructureBox{visibility:visible!important;opacity:1!important}
`;document.head.appendChild(css);
function apply(){const result=document.getElementById('result'),decision=document.getElementById('finalDecisionCard');if(decision){decision.classList.remove('legacy','uiMovedTechnical','hidden');decision.removeAttribute('hidden');if(result&&result.firstElementChild!==decision)result.insertBefore(decision,result.firstElementChild)}const badge=document.querySelector('.brand .badge');if(badge&&badge.textContent!==LABEL)badge.textContent=LABEL;document.documentElement.dataset.rsaBuild=BUILD;document.documentElement.dataset.rsaAutoResume='off'}
function schedule(){[0,80,220,520,1100].forEach(t=>setTimeout(apply,t))}
['final-decision-ready','turbulence-structure-ready','calibrated-probability-ready','rsa-addons-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,schedule));document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(e.target?.id))schedule()});if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();