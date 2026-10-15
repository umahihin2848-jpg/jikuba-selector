(()=>{'use strict';
if(window.__RACE_UX_NARRATIVE_COLLAPSE_V1)return;window.__RACE_UX_NARRATIVE_COLLAPSE_V1=true;
let raf=0,fallback=0,observed=null,narrativeObserver=null;
function enforce(){const n=document.getElementById('m3NarrativeAnalysis');if(!n)return false;if(!n.classList.contains('ruxNarrativeCompact'))n.classList.add('ruxNarrativeCompact');const head=n.querySelector('.m3sectionHead');if(head&&!head.querySelector('.ruxNarrativeToggle')){const b=document.createElement('button');b.type='button';b.className='ruxNarrativeToggle';b.textContent=n.classList.contains('ruxOpen')?'閉じる':'文章解説を開く';b.addEventListener('click',()=>{n.classList.toggle('ruxOpen');b.textContent=n.classList.contains('ruxOpen')?'閉じる':'文章解説を開く'});head.appendChild(b)}return true}
function watchNarrative(){const n=document.getElementById('m3NarrativeAnalysis');if(n===observed)return;narrativeObserver?.disconnect();observed=n||null;if(!n)return;narrativeObserver=new MutationObserver(m=>{if(m.some(x=>x.type==='childList'))schedule(false)});narrativeObserver.observe(n,{childList:true,subtree:false});enforce()}
function run(){raf=0;watchNarrative();enforce()}
function schedule(withFallback=true){if(!raf)raf=requestAnimationFrame(run);if(withFallback){clearTimeout(fallback);fallback=setTimeout(()=>{fallback=0;run()},180)}}
['m3-analysis-narrative-ready','m3-race-lab-ready','race-ux-ready','race-ux-v2-ready','race-ux-tab-change','rsa-analysis-complete','rsa-addons-ready','m3-narrative-role-sync-ready','market-independent-center-ready'].forEach(ev=>addEventListener(ev,()=>schedule(true)));
const boot=()=>{watchNarrative();schedule(true)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();