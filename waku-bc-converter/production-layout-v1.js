(()=>{'use strict';
const BUILD='20261009q13',LABEL='Scenario v1 · Q13 · iPhone安定版';
const css=document.createElement('style');css.textContent=`
#result:not(.rsaCalcPending) #finalDecisionCard{display:block!important;visibility:visible!important;opacity:1!important;content-visibility:visible!important}
#result:not(.rsaCalcPending) #turbulenceStructureBox{visibility:visible!important;opacity:1!important}
#result:not(.rsaCalcPending) #scenarioView{display:grid!important;visibility:visible!important;opacity:1!important;content-visibility:visible!important}
#result:not(.rsaCalcPending) #scenarioView>.sv{display:block!important;visibility:visible!important;opacity:1!important;content-visibility:visible!important}
`;document.head.appendChild(css);
function syncScenarioWave(){
 const s=document.getElementById('s1');if(!s)return;
 const natural=[...s.querySelectorAll('.bx span')].some(el=>el.closest('#productionWaveBox')?false:(el.textContent||'').includes('波乱構造'));
 let box=document.getElementById('productionWaveBox');
 if(natural){box?.remove();document.getElementById('productionWaveDetail')?.remove();return}
 const grid=s.querySelector('.g3');
 if(!grid)return;
 if(!box){box=document.createElement('div');box.id='productionWaveBox';box.className='bx';box.innerHTML='<span>🌪 波乱構造</span><b class="warn">解析中</b>';grid.appendChild(box)}
 let detail=document.getElementById('productionWaveDetail');if(!detail){detail=document.createElement('div');detail.id='productionWaveDetail';detail.className='validatedNote';detail.style.marginTop='6px';s.appendChild(detail)}
 const b=box.querySelector('b'),w=window.TurbulenceStructureState?.wave;
 if(!w){b.className='warn';b.textContent='解析中';detail.textContent='検証済み波乱構造を計算中';return}
 if(!w.supported){b.className='warn';b.textContent='未検証';detail.textContent=w.reason||'G1〜G3のみ検証済み';return}
 b.className=w.level==='high'?'bad':w.level==='low'?'good':'warn';b.textContent=w.label||'—';detail.textContent=`構造スコア ${Number.isFinite(w.score)?Math.round(w.score*100)+'/100':'—'}${w.action?'｜'+w.action:''}｜波乱構造は検証済み補助レイヤー。個別馬の勝率・M3順位は変更しません。`;
}
function apply(){const result=document.getElementById('result'),decision=document.getElementById('finalDecisionCard');if(decision){decision.classList.remove('legacy','uiMovedTechnical','hidden');decision.removeAttribute('hidden');if(result&&result.firstElementChild!==decision)result.insertBefore(decision,result.firstElementChild)}const badge=document.querySelector('.brand .badge');if(badge&&badge.textContent!==LABEL)badge.textContent=LABEL;document.documentElement.dataset.rsaBuild=BUILD;document.documentElement.dataset.rsaAutoResume='off';syncScenarioWave()}
function schedule(){[0,80,220,520,1100].forEach(t=>setTimeout(apply,t))}
['final-decision-ready','turbulence-structure-ready','calibrated-probability-ready','rsa-addons-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,schedule));document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(e.target?.id))schedule()});if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();