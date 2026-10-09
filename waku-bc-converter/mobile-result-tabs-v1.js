(()=>{'use strict';
const isMobile=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)||matchMedia('(max-width:620px)').matches;
if(!isMobile())return;
let active='s1',timers=[];
const $=id=>document.getElementById(id);
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function later(fn,ms){const t=setTimeout(()=>{timers=timers.filter(x=>x!==t);fn()},ms);timers.push(t)}
function sectionLabel(sec,i){const raw=(sec.querySelector('h2')?.textContent||`表示${i+1}`).replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩0-9.\-]+\s*/,'').trim();return raw.length>8?raw.slice(0,8):raw}
function updateHorsePager(){const s=$('s3');if(!s)return;const host=s.querySelector('.horses');if(!host)return;const cards=[...host.children].filter(x=>x.classList?.contains('horse'));const per=4,total=Math.max(1,Math.ceil(cards.length/per));let page=Math.min(total-1,Math.max(0,Number(s.dataset.mrtPage||0)));s.dataset.mrtPage=String(page);cards.forEach((c,i)=>c.classList.toggle('mrtHorseHidden',Math.floor(i/per)!==page));let p=$('mobileHorsePager');if(cards.length<=per){p?.remove();return}if(!p){p=document.createElement('div');p.id='mobileHorsePager';p.className='mrtPager';p.innerHTML='<button type="button" data-mrt-prev>← 前へ</button><span></span><button type="button" data-mrt-next>次へ →</button>';host.insertAdjacentElement('afterend',p);p.querySelector('[data-mrt-prev]').addEventListener('click',()=>{s.dataset.mrtPage=String(Math.max(0,Number(s.dataset.mrtPage||0)-1));updateHorsePager();s.scrollIntoView({block:'start',behavior:'auto'})});p.querySelector('[data-mrt-next]').addEventListener('click',()=>{s.dataset.mrtPage=String(Math.min(total-1,Number(s.dataset.mrtPage||0)+1));updateHorsePager();s.scrollIntoView({block:'start',behavior:'auto'})})}p.querySelector('span').textContent=`全頭 ${page*per+1}〜${Math.min(cards.length,(page+1)*per)} / ${cards.length}`;p.querySelector('[data-mrt-prev]').disabled=page===0;p.querySelector('[data-mrt-next]').disabled=page>=total-1}
function setActive(id,scroll=false){const v=$('scenarioView');if(!v)return;const sections=[...v.querySelectorAll(':scope>.sv')];if(!sections.some(x=>x.id===id))id=sections[0]?.id||'';if(!id)return;active=id;sections.forEach(s=>s.classList.toggle('mrtHidden',s.id!==active));const nav=$('mobileResultNav');nav?.querySelectorAll('button[data-target]').forEach(b=>{const on=b.dataset.target===active;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});if(active==='s3')updateHorsePager();if(scroll&&nav)nav.scrollIntoView({block:'start',behavior:'auto'});window.MobileResultTabsState={ready:true,active,sections:sections.map(x=>x.id),visibleHorses:active==='s3'?[...($('s3')?.querySelectorAll('.horses>.horse:not(.mrtHorseHidden)')||[])].length:0,at:Date.now()}}
function ensure(){const result=$('result'),v=$('scenarioView');if(!result||!v||result.classList.contains('hidden'))return;const sections=[...v.querySelectorAll(':scope>.sv')];if(!sections.length)return;let nav=$('mobileResultNav');if(!nav){nav=document.createElement('div');nav.id='mobileResultNav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','分析結果の表示切替');v.insertAdjacentElement('beforebegin',nav)}nav.innerHTML='';sections.forEach((sec,i)=>{const b=document.createElement('button');b.type='button';b.dataset.target=sec.id;b.textContent=sectionLabel(sec,i);b.addEventListener('click',()=>setActive(sec.id,true));nav.appendChild(b)});if(!sections.some(x=>x.id===active))active=sections[0].id;setActive(active,false)}
function schedule(){clearTimers();[0,80,240,650,1400].forEach(ms=>later(ensure,ms))}
const css=document.createElement('style');css.textContent=`
@media(max-width:620px){
 #mobileResultNav{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:10px 0 8px;padding:2px 0 5px;scrollbar-width:none}
 #mobileResultNav::-webkit-scrollbar{display:none}
 #mobileResultNav button{flex:0 0 auto;min-height:42px;min-width:82px;padding:8px 10px;border:1px solid #31566b;border-radius:10px;background:#0a1c29;color:#95adba;font-size:10px;font-weight:850}
 #mobileResultNav button.active{background:#123649;border-color:#4d8198;color:#edf8fb}
 #scenarioView>.sv.mrtHidden{display:none!important;visibility:hidden!important}
 #scenarioView #s3 .horses>.horse.mrtHorseHidden{display:none!important;visibility:hidden!important}
 .mrtPager{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:7px;margin:9px 0 2px}
 .mrtPager button{min-height:42px;border:1px solid #31566b;border-radius:9px;background:#0b2635;color:#d9edf5;font-size:10px;font-weight:850}
 .mrtPager button:disabled{opacity:.35}
 .mrtPager span{text-align:center;color:#89a6b5;font-size:9px;white-space:nowrap}
 #scenarioView{min-height:0!important}
}
`;document.head.appendChild(css);
['rsa-analysis-complete','final-decision-ready','calibrated-probability-ready','finish600-ready','turbulence-structure-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id))schedule()},true);
addEventListener('resize',schedule);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();