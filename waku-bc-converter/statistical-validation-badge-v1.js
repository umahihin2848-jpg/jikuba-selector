(()=>{'use strict';
let V=null;
const $=id=>document.getElementById(id);
function row(t){return (V?.results||[]).find(x=>x.year===2026&&x.target===t)}
function fmt(x,d=5){return Number.isFinite(x)?x.toFixed(d):'—'}
function render(){if(!V)return;const s1=$('s1');if(!s1)return;let box=$('coherentValidationBadge');if(!box){box=document.createElement('div');box.id='coherentValidationBadge';box.className='sub';box.style.cssText='margin-top:8px;padding:9px 10px;border:1px solid #285267;border-radius:11px;background:#0a2030;line-height:1.55';const note=$('raceCoherentNote');note?note.insertAdjacentElement('afterend',box):s1.appendChild(box)}const w=row('win'),t2=row('top2'),t3=row('top3');if(!w||!t2||!t3)return;box.innerHTML=`<b style="color:#a9d7ea">2026 OOS確認済み</b>｜358レース・4,973頭<br>レース内整合化でLog Lossは 勝率 ${fmt(w.raw_logloss)}→${fmt(w.projected_logloss)}、連対 ${fmt(t2.raw_logloss)}→${fmt(t2.projected_logloss)}、3着内 ${fmt(t3.raw_logloss)}→${fmt(t3.projected_logloss)}。改善は小さいため「予測力向上」ではなく、確率の整合性を保つ補正として採用します。`}
fetch('data/race_coherent_validation_v1.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{V=x;render()}).catch(()=>{});
['race-coherent-probability-ready','rsa-addons-ready'].forEach(e=>addEventListener(e,()=>setTimeout(render,180)));addEventListener('load',()=>setTimeout(render,300));
})();