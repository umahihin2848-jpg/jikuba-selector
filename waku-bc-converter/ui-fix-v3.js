(()=>{'use strict';
const $=id=>document.getElementById(id);
const text=el=>(el?.textContent||'').replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let running=false;
const style=document.createElement('style');
style.textContent=`
/* UI hotfix v3: keep the three most important race-reading cues visible */
#uvAtGlance{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;margin-top:13px!important}
#uvAtGlance .uvSnap{display:block!important;min-width:0;padding:9px 8px;border-radius:12px;background:rgba(3,15,23,.58);border:1px solid rgba(77,132,158,.44)}
#uvAtGlance .uvSnap span{display:block;font-size:8px;color:#7899aa;margin-bottom:4px}
#uvAtGlance .uvSnap b{display:block;font-size:11px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#uvAtGlance .uvSnap.good b{color:#66e4b4}#uvAtGlance .uvSnap.warn b{color:#f0d06d}#uvAtGlance .uvSnap.bad b{color:#ff9098}
.rtHorse .qNoFix{display:grid!important;place-items:center!important;width:100%;height:100%;font-size:12px!important;line-height:1!important;font-weight:950!important;color:#f3fbff!important;text-shadow:0 1px 2px rgba(0,0,0,.55);position:relative;z-index:3}
#s3 .mini.positionSynced{border:1px solid rgba(102,228,180,.28)!important;background:rgba(20,58,65,.55)!important}
#s3 .mini.positionSynced b{color:#8ce8c0!important}
@media(max-width:700px){#uvAtGlance{grid-template-columns:repeat(2,minmax(0,1fr))!important}#uvAtGlance .uvSnap:last-child{grid-column:1/-1}.rtHorse .qNoFix{font-size:11px!important}}
`;
document.head.appendChild(style);

function numFromCard(card){const t=text(card?.querySelector('.name'))||text(card?.querySelector('.top'))||text(card);const m=t.match(/(?:^|\s)(\d{1,2})番/);return m?m[1]:null}
function topFive(){const hero=$('raceHeroV2'),s1=$('s1');if(!hero||!s1)return;const boxes=[...s1.querySelectorAll(':scope>.g3 .bx')];if(boxes.length<3)return;const market=text(boxes[0].querySelector('b'))||'分析中';const match=text(boxes[1].querySelector('b'))||'分析中';const rough=text(boxes[2].querySelector('b'))||'—';const scenarios=[...document.querySelectorAll('#s4 .sc')].map(c=>({p:parseFloat(text(c.querySelector('.sp')))||0,n:text(c.querySelector('.name')).replace('本命シナリオ｜','').replace(/^A\s*本線｜?/,'').trim()})).sort((a,b)=>b.p-a.p);const sc=scenarios[0];let pressure=text(document.querySelector('#sQueue .qSummary .qBox:first-child b'));if(!pressure){const q=text($('sQueue'));const m=q.match(/前の競り合い\s*(高|中|低)/);pressure=m?m[1]:'—'}const items=[...document.querySelectorAll('#s5 .item')].slice(0,3);const issueN=items.filter(x=>/不安あり|注意|向かい風|負荷|能力順位/.test(text(x))).length;let box=$('uvAtGlance');if(!box){box=document.createElement('div');box.id='uvAtGlance';hero.appendChild(box)}const mc=match.includes('ズレ大')?'bad':match.includes('少し')?'warn':'good';const rc=rough.includes('大')?'bad':rough.includes('小')?'good':'warn';const pc=pressure==='高'?'warn':pressure==='低'?'good':'';box.innerHTML=`<div class="uvSnap"><span>市場</span><b>${esc(market)}</b></div><div class="uvSnap ${mc}"><span>人気通り度</span><b>${esc(match)}</b></div><div class="uvSnap ${rc}"><span>荒れる余地</span><b>${esc(rough)}</b></div><div class="uvSnap ${pc}"><span>前の競り合い</span><b>${esc(pressure)}</b></div><div class="uvSnap ${issueN?'warn':'good'}"><span>本線 / 人気馬</span><b>${esc(sc?`${sc.n||'本線'} ${Math.round(sc.p)}%`:'分析中')}・${issueN?`${issueN}頭注意`:'注意少なめ'}</b></div>`}

function mapNumbers(){const root=$('qRealTrack');if(!root)return;for(const h of root.querySelectorAll('.rtHorse')){let no='';const hidden=text(h.querySelector('b'));const m=hidden.match(/^(\d{1,2})(?:\s|番)/);if(m)no=m[1];if(!no){const t=text(h);const mm=t.match(/(?:^|\s)(\d{1,2})(?:\s|番)/);if(mm)no=mm[1]}if(!no)continue;let s=h.querySelector('.qNoFix');if(!s){s=document.createElement('span');s.className='qNoFix';h.appendChild(s)}s.textContent=no}}

function syncPositions(){const S=window.ValidatedQueueState;if(!S?.ready||!S.byNo)return;for(const card of document.querySelectorAll('#s3 .horse')){const no=numFromCard(card);if(!no)continue;const r=S.byNo[String(no)];if(!r||!r.position||r.position==='—')continue;const minis=[...card.querySelectorAll('.mini')];const m=minis.find(x=>text(x.querySelector('span')).includes('位置'));if(!m)continue;const b=m.querySelector('b');if(!b)continue;b.textContent=r.position;m.classList.add('positionSynced');m.title=r.validated?'検証済みの1コーナー前後位置モデルから反映':'隊列推定から反映'}}

function run(){if(running)return;running=true;try{topFive();mapNumbers();syncPositions()}finally{running=false}}
function schedule(){[0,80,220,520,950,1600,2800,4500].forEach(t=>setTimeout(run,t))}
['validated-queue-ready','rsa-addons-ready','calibrated-probability-ready','joint-pair-probability-ready'].forEach(ev=>addEventListener(ev,schedule));
addEventListener('load',schedule);document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn'||e.target?.id==='parseCsvBtn')schedule()});
const mo=new MutationObserver(()=>{clearTimeout(window.__uiFixV3Timer);window.__uiFixV3Timer=setTimeout(run,90)});if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});schedule()},{once:true});else{mo.observe(document.body,{childList:true,subtree:true});schedule()}
})();