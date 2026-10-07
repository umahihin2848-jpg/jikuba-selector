(function(){'use strict';
function apply(){
  document.querySelectorAll('#finalProbabilityList .fpCi').forEach(el=>{
    const t=(el.textContent||'').replace(/\s+/g,' ').trim();
    if(t==='95% OOS帯 —'){el.textContent='2026同予測帯の実績 —';return}
    const m=t.match(/^95% OOS帯\s+(.+?)\s*\/\s*n=(\d+)$/);
    if(m)el.textContent=`2026同予測帯の実績 ${m[1]}（n=${m[2]}）`;
  });
  const note=document.getElementById('finalProbabilityNote');
  if(note&&/95% OOS帯/.test(note.textContent||'')){
    const txt=(note.textContent||'').replace(/\s+/g,' ').trim();
    const i=txt.indexOf('採用ルール：');
    const suffix=i>=0?txt.slice(i):'';
    note.textContent='2026同予測帯の実績＝2026完全ホールドアウトで、近い予測確率帯に入った馬の実測率のWilson 95%区間です。個々の馬の信頼区間ではありません。'+(suffix?'\n'+suffix:'');
    note.style.whiteSpace='pre-line';
  }
}
function schedule(){setTimeout(apply,120);setTimeout(apply,450);setTimeout(apply,950);setTimeout(apply,1800)}
window.addEventListener('calibrated-probability-ready',schedule);
window.addEventListener('ability-opponent-ready',schedule);
window.addEventListener('joint-pair-probability-ready',schedule);
window.addEventListener('rsa-addons-ready',schedule);
document.getElementById('analyzeBtn')?.addEventListener('click',schedule);
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();