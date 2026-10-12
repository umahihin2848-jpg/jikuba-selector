(()=>{'use strict';
if(window.__RACE_UX_NARRATIVE_COLLAPSE_V1)return;window.__RACE_UX_NARRATIVE_COLLAPSE_V1=true;
let queued=false;
function enforce(){const n=document.getElementById('m3NarrativeAnalysis');if(!n)return false;n.classList.add('ruxNarrativeCompact');const head=n.querySelector('.m3sectionHead');if(head&&!head.querySelector('.ruxNarrativeToggle')){const b=document.createElement('button');b.type='button';b.className='ruxNarrativeToggle';b.textContent=n.classList.contains('ruxOpen')?'閉じる':'文章解説を開く';b.addEventListener('click',()=>{n.classList.toggle('ruxOpen');b.textContent=n.classList.contains('ruxOpen')?'閉じる':'文章解説を開く'});head.appendChild(b)}return true}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enforce()});requestAnimationFrame(enforce);setTimeout(enforce,30);setTimeout(enforce,160)}
const boot=()=>{new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))schedule()}).observe(document.body,{childList:true,subtree:true});schedule()};
['m3-analysis-narrative-ready','m3-race-lab-ready','race-ux-ready','race-ux-v2-ready','race-ux-tab-change','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();