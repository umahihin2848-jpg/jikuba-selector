(()=>{'use strict';
if(window.__RACE_DISSECTION_OVERVIEW_V2)return;window.__RACE_DISSECTION_OVERVIEW_V2=true;
const V='race-dissection-overview-v2.0',$=id=>document.getElementById(id);let raf=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return NaN;const x=Number(v);return Number.isFinite(x)?x:NaN};
function schedule(ms=0){setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})},ms)}
function center(){const ab=window.M3PureAbilityState||{},ax=window.AxisReliabilityShadowV1State||{},a=ax.axis||window.DecisionShellV2State?.structure?.axis||null;if(ab.leaderAmbiguous)return{tone:'hold',k:'中心',v:'判定保留',s:`Ability首位 ${Number(ab.leaderTieCount)||2}頭同点`};if(ab.top3BoundaryAmbiguous)return{tone:'hold',k:'中心',v:'判定保留',s:'Ability Top3境界が同点'};if(!ax.ready)return{tone:'wait',k:'中心',v:'計算中',s:'Ability・M3確認待ち'};if(ax.high&&a)return{tone:'axis',k:'中心',v:`${a.no||''}番 ${a.name||''}`,s:'明確さ：高（Shadow）'};if(a)return{tone:'hold',k:'中心',v:`${a.no||''}番 ${a.name||''}`,s:'起点候補｜HIGH条件未達'};return{tone:'hold',k:'中心',v:'判定保留',s:'HIGH条件未達'} }
function flow(){const d=window.RaceDifficultyDiagnosticV1State?.flow,q=window.ValidatedQueueState;if(d?.label){const v=d.label==='判定不能'?'材料不足':d.label;return{tone:d.level==='good'?'flow':d.level==='mid'?'mid':'hold',k:'隊列',v,s:d.detail||''}}if(!q?.ready||!q.rows?.length)return{tone:'wait',k:'隊列',v:'計算中',s:'履歴確認待ち'};const n=q.rows.length,ok=q.rows.filter(r=>r.validated).length;return{tone:ok===n?'flow':ok===0?'hold':'mid',k:'隊列',v:ok===n?'高':ok===0?'材料不足':'中',s:`有効履歴 ${ok}/${n}頭`}}
function market(){const m=window.DecisionShellV2State?.market||{},rows=m.rows||[],n=rows.length;if(!n)return{tone:'wait',k:'市場',v:'オッズ待ち',s:'全頭単勝で確定'};const shape=String(m.shape||'中間'),neff=num(m.neff),field=Number(m.field)||n;return{tone:shape==='集中'?'market':shape==='分散'?'spread':'mid',k:'市場',v:shape,s:`Neff ${Number.isFinite(neff)?neff.toFixed(1):'—'} / ${field}`}}
function watch(){const ab=window.M3PureAbilityState||{},st=window.StructuralWatchSummaryV1State,pool=window.OpponentCandidatePoolState||{};if(ab.leaderAmbiguous||ab.top3BoundaryAmbiguous)return{tone:'hold',k:'構造注目',v:'判定保留',s:'Ability同点境界'};if(st?.ready){const n=Array.isArray(st.candidates)?st.candidates.length:0;return{tone:n?'watch':'quiet',k:'構造注目',v:n?`${n}頭`:'なし',s:n?'理由付きで下段に表示':'無理に候補を作らない'}}if(pool?.structureBest)return{tone:'watch',k:'構造注目',v:'1頭+',s:'詳細計算中'};return{tone:'wait',k:'構造注目',v:'計算中',s:'Ability・M3・P10'}}
function raceType(){const s=window.RaceDifficultyDiagnosticV1State?.summary;return s?.title||'中心・隊列・市場・構造を分けて見るレース'}
function css(){if($('rdcov2-css'))return;const s=document.createElement('style');s.id='rdcov2-css';s.textContent=`
#raceDissectionCardV1 .rdcOverviewV2{margin-top:10px;border:1px solid #42677a;background:linear-gradient(180deg,#0a2432,#081b27);border-radius:14px;padding:9px}
#raceDissectionCardV1 .rdcoHead{display:flex;align-items:center;justify-content:space-between;gap:8px}
#raceDissectionCardV1 .rdcoHead b{font-size:11px;letter-spacing:.02em;color:#eef8fb}
#raceDissectionCardV1 .rdcoHead span{font-size:6.8px;font-weight:800;color:#88a5b3;border:1px solid #3d5c6d;border-radius:999px;padding:3px 6px}
#raceDissectionCardV1 .rdcoGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}
#raceDissectionCardV1 .rdcoTile{min-height:68px;border:1px solid #314f60;background:#091d29;border-radius:11px;padding:8px;box-shadow:inset 3px 0 0 #557789}
#raceDissectionCardV1 .rdcoTile.axis{box-shadow:inset 3px 0 0 #79c8e8;background:#0a2532;border-color:#3f6d82}
#raceDissectionCardV1 .rdcoTile.flow{box-shadow:inset 3px 0 0 #67b9b0}
#raceDissectionCardV1 .rdcoTile.market{box-shadow:inset 3px 0 0 #78c6a3}
#raceDissectionCardV1 .rdcoTile.watch{box-shadow:inset 3px 0 0 #c5a6df;background:#181723;border-color:#554a64}
#raceDissectionCardV1 .rdcoTile.spread{box-shadow:inset 3px 0 0 #d08e9a;background:#21181d;border-color:#674a53}
#raceDissectionCardV1 .rdcoTile.mid{box-shadow:inset 3px 0 0 #d4bd72}
#raceDissectionCardV1 .rdcoTile.hold{box-shadow:inset 3px 0 0 #8695a1;background:#111d27}
#raceDissectionCardV1 .rdcoTile.quiet,#raceDissectionCardV1 .rdcoTile.wait{opacity:.82}
#raceDissectionCardV1 .rdcoTile small{display:block;font-size:6.8px;font-weight:850;letter-spacing:.08em;color:#7895a3}
#raceDissectionCardV1 .rdcoTile strong{display:block;margin-top:5px;font-size:12px;line-height:1.18;color:#f2f8fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#raceDissectionCardV1 .rdcoTile em{display:block;margin-top:4px;font-size:7px;font-style:normal;line-height:1.35;color:#91a9b4}
#raceDissectionCardV1 .rdcoType{margin-top:7px;border:1px solid #365b6c;background:#0b202c;border-radius:10px;padding:8px 9px}
#raceDissectionCardV1 .rdcoType small{display:block;font-size:6.5px;color:#7393a1;letter-spacing:.08em}
#raceDissectionCardV1 .rdcoType b{display:block;margin-top:3px;font-size:10.5px;line-height:1.35;color:#dcebf0}
#raceDissectionCardV1 .rdcoToggle{width:100%;min-height:40px;margin-top:8px;border:1px solid #426779!important;border-radius:10px!important;background:#0b2633!important;color:#c7d8df!important;font-size:8.5px!important;font-weight:900!important}
#raceDissectionCardV1:not(.rdcDetailsOpen)>.rdcSection,#raceDissectionCardV1:not(.rdcDetailsOpen)>#rdcResearchToggle,#raceDissectionCardV1:not(.rdcDetailsOpen)>.rdcFoot{display:none!important}
#raceDissectionCardV1.rdcDetailsOpen .rdcoToggle{background:#102d3b!important}
@media(max-width:390px){#raceDissectionCardV1 .rdcoTile{min-height:64px;padding:7px}#raceDissectionCardV1 .rdcoTile strong{font-size:11px}}
`;document.head.appendChild(s)}
function ensure(root){let box=$('rdcOverviewV2');if(!box){box=document.createElement('div');box.id='rdcOverviewV2';box.className='rdcOverviewV2';const lead=root.querySelector('.rdcLead'),head=root.querySelector('.rdcHead');(lead||head)?.insertAdjacentElement('afterend',box)}let btn=$('rdcoToggle');if(!btn){btn=document.createElement('button');btn.type='button';btn.id='rdcoToggle';btn.className='rdcoToggle';box.insertAdjacentElement('afterend',btn)}if(root.dataset.rdcoBound!=='1'){root.dataset.rdcoBound='1';root.addEventListener('click',e=>{if(e.target?.id!=='rdcoToggle')return;root.classList.toggle('rdcDetailsOpen');render()})}return{box,btn}}
function tile(x){return`<div class="rdcoTile ${esc(x.tone)}"><small>${esc(x.k)}</small><strong>${esc(x.v)}</strong><em>${esc(x.s)}</em></div>`}
function render(){css();const root=$('raceDissectionCardV1');if(!root){schedule(220);return}const {box,btn}=ensure(root),a=center(),f=flow(),m=market(),w=watch(),t=raceType();box.innerHTML=`<div class="rdcoHead"><b>3秒サマリー</b><span>4レイヤー独立</span></div><div class="rdcoGrid">${tile(a)}${tile(f)}${tile(m)}${tile(w)}</div><div class="rdcoType"><small>RACE TYPE</small><b>${esc(t)}</b></div>`;btn.textContent=root.classList.contains('rdcDetailsOpen')?'詳細を閉じる':'詳細を見る';window.RaceDissectionOverviewV2State={ready:true,version:V,displayOnly:true,detailsOpen:root.classList.contains('rdcDetailsOpen'),center:a,flow:f,market:m,watch:w,raceType:t,at:Date.now()}}
['race-dissection-card-ready','race-difficulty-diagnostic-ready','axis-reliability-shadow-ready','validated-queue-ready','decision-shell-v2-ready','opponent-candidate-pool-ready','structural-watch-summary-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(40)));document.addEventListener('input',e=>{if(['oddsPaste','fieldSize','distance'].includes(e.target?.id))schedule(80)},true);if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(300),{once:true});else schedule(200);setTimeout(()=>schedule(),800);setTimeout(()=>schedule(),1800);
})();
