(()=>{'use strict';
if(window.__M3_ABILITY_NARRATIVE_APPEND_V1)return;window.__M3_ABILITY_NARRATIVE_APPEND_V1=true;
const V='m3-ability-narrative-append-v2',FREEZE='2026-10-16';
let raf=0,fallback=0,lastSig='';
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function horse(r){return `${r.no}番${r.name}`}
function currentRaceDate(){return document.getElementById('raceDate')?.value||''}
function derive(){
 const s=window.M3PureAbilityV2State;if(!s?.ready)return null;
 const rows=Array.isArray(s.rows)?s.rows:[],hi=rows.filter(r=>Number(r.abilityRank)<=3&&Number(r.m3Rank)>=7).sort((a,b)=>Number(b.v2Gap||b.gap)-Number(a.v2Gap||a.gap)),rev=rows.filter(r=>Number(r.m3Rank)<=3&&Number(r.abilityRank)>=7).sort((a,b)=>Number(a.v2Gap||a.gap)-Number(b.v2Gap||b.gap)),a1=[...rows].sort((a,b)=>Number(a.abilityRank)-Number(b.abilityRank))[0];
 const rs=window.M3TraitRescueWatchState,rd=currentRaceDate(),rescue=rs?.ready&&!rs.outOfScope&&String(rs.race?.date||'')===rd&&Array.isArray(rs.rows)?rs.rows:[];
 const rescueNos=new Set(rescue.map(r=>String(r.no))),hiOnly=hi.filter(r=>!rescueNos.has(String(r.no)));
 return{rows,hi,hiOnly,rev,a1,rescue,abilityVersion:String(s.version||'')}}
function publish(d){
 const sig=`${generation()}|${currentRaceDate()}|`+d.rows.map(r=>`${r.no}:${r.abilityRank}:${r.m3Rank}:${Number(r.top3||0).toFixed(7)}`).join(';')+'|R:'+d.rescue.map(r=>`${r.no}:${r.m3Rank}:${r.abilityRank}`).join(';');
 if(sig===lastSig&&window.M3AbilityNarrativeState?.ready)return;lastSig=sig;
 window.M3AbilityNarrativeState={ready:true,version:V,generation:generation(),abilityVersion:d.abilityVersion,highM3Low:d.hi.map(r=>r.no),m3HighAbilityLow:d.rev.map(r=>r.no),rescueWatch:d.rescue.map(r=>r.no),freezeDate:FREEZE,at:Date.now()};
 dispatchEvent(new CustomEvent('m3-ability-narrative-ready',{detail:window.M3AbilityNarrativeState}))
}
function liveNarrativeText(root){
 const paras=[...(root?.querySelectorAll('.m3NarrativeBody p')||[])].map(x=>x.textContent.trim()).filter(Boolean);
 const bullets=[...(root?.querySelectorAll('.m3NarrativeSummary span')||[])].map(x=>x.textContent.trim()).filter(Boolean);
 return [...paras,...(bullets.length?['',...bullets]:[])].join('\n\n')
}
function patchCopy(){
 const root=document.getElementById('m3NarrativeAnalysis'),old=root?.querySelector('.m3NarrativeCopy');
 if(old&&!old.dataset.liveNarrativeCopy){
   const b=old.cloneNode(true);b.dataset.liveNarrativeCopy='1';old.replaceWith(b);
   b.addEventListener('click',async e=>{const text=liveNarrativeText(root);try{await navigator.clipboard.writeText(text);e.currentTarget.textContent='コピー済み';setTimeout(()=>e.currentTarget.textContent='コピー',1200)}catch{}})
 }
 const oldBase=document.getElementById('copyBtn');
 if(oldBase&&!oldBase.dataset.liveExplainCopy){
   const b=oldBase.cloneNode(true);b.dataset.liveExplainCopy='1';oldBase.replaceWith(b);
   b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(document.getElementById('explain')?.innerText||'')}catch{}})
 }
}
function drawBaseRescue(d){
 const box=document.getElementById('explain');if(!box)return;
 box.querySelectorAll('.m3RescueBaseExplain').forEach(x=>x.remove());
 if(!d.rescue.length)return;
 const p=document.createElement('p');p.className='m3RescueBaseExplain';
 const names=d.rescue.slice(0,3).map(r=>`${r.no}番${r.name}（M3 ${r.m3Rank}位／Ability v2 #${r.abilityRank}／末脚A）`).join('、');
 p.textContent=`救済監視：${names}。M3本命とは別枠の研究表示で、順位・確率・馬券判定への加点はありません。`;
 box.appendChild(p)
}
function draw(d){
 const root=document.getElementById('m3NarrativeAnalysis'),body=root?.querySelector('.m3NarrativeBody');if(!root||!body){drawBaseRescue(d);patchCopy();return}
 root.querySelectorAll('.m3AbilityNarrativeText,.m3AbilityNarrativeChip').forEach(x=>x.remove());
 const {hiOnly,rev,a1,rescue}=d,head=document.createElement('p');head.className='m3AbilityNarrativeText';
 head.textContent='Ability v2候補とM3も分けて確認します。Ability v2は過去3勝クラス以上の実績にstrict-prior Eloを加えた別レイヤーで、市場・PCI/RPCI・隊列・今回シナリオを使わず、M3順位を上書きしません。';
 body.appendChild(head);
 if(rescue.length){
   for(const r of rescue.slice(0,3)){
     const p=document.createElement('p');p.className='m3AbilityNarrativeText';
     p.textContent=`${horse(r)}はM3 ${r.m3Rank}位ですが、Ability v2候補${r.abilityRank}位かつ末脚特性Aで「M3外・救済監視」に該当します。M3が拾わなかった馬を別角度で監視する固定研究条件であり、本命への昇格や確率補正ではありません。M3順位・構造3着内率・馬券判定は変更しません。`;
     body.appendChild(p)
   }
 }else if(hiOnly.length){
   const r=hiOnly[0],p=document.createElement('p');p.className='m3AbilityNarrativeText';
   p.textContent=`${horse(r)}はAbility v2候補${r.abilityRank}位に対してM3 ${r.m3Rank}位。過去実績＋相手レベルでは上位ですが、今回の位置取り・末脚構造では慎重な「能力高・M3慎重」の馬です。末脚特性Aまで揃わない限り、救済監視には昇格しません。`;
   body.appendChild(p)
 }else if(a1){
   const p=document.createElement('p');p.className='m3AbilityNarrativeText';
   p.textContent=`Ability v2候補1位は${horse(a1)}で、M3は${a1.m3Rank}位です。Abilityと今回構造の順位差として確認します。`;
   body.appendChild(p)
 }
 if(hiOnly.length&&rescue.length){
   const r=hiOnly[0],p=document.createElement('p');p.className='m3AbilityNarrativeText';
   p.textContent=`救済監視とは別に、${horse(r)}はAbility v2候補${r.abilityRank}位・M3 ${r.m3Rank}位の「能力高・M3慎重」。末脚特性Aの条件を満たしていないため、救済監視とは分けて扱います。`;body.appendChild(p)
 }
 if(rev.length){
   const r=rev[0],p=document.createElement('p');p.className='m3AbilityNarrativeText';
   p.textContent=`逆に${horse(r)}はAbility v2候補${r.abilityRank}位に対してM3 ${r.m3Rank}位。基礎能力よりも今回の位置取り・末脚構造で浮上している「M3高・能力慎重」のタイプです。`;
   body.appendChild(p)
 }
 let sum=root.querySelector('.m3NarrativeSummary');if(!sum){sum=document.createElement('div');sum.className='m3NarrativeSummary';root.querySelector('.m3note')?.before(sum)}
 if(rescue.length){const x=document.createElement('span');x.className='m3AbilityNarrativeChip';x.textContent=`M3外・救済監視：${rescue.slice(0,3).map(r=>r.no).join('・')}`;sum.appendChild(x)}
 if(hiOnly.length){const x=document.createElement('span');x.className='m3AbilityNarrativeChip';x.textContent=`能力高・M3慎重：${hiOnly.slice(0,3).map(r=>r.no).join('・')}`;sum.appendChild(x)}
 if(rev.length){const x=document.createElement('span');x.className='m3AbilityNarrativeChip';x.textContent=`M3高・能力慎重：${rev.slice(0,3).map(r=>r.no).join('・')}`;sum.appendChild(x)}
 const note=root.querySelector('.m3note');
 if(note&&!note.dataset.abilityV2Note){note.dataset.abilityV2Note='1';note.textContent+=' Ability v2は候補モデルとして並列表示し、救済監視は2026-10-16に条件固定したprospective研究です。どちらもM3確率の単純加算や買い判定には使用しません。'}
 drawBaseRescue(d);patchCopy()
}
function render(){raf=0;const d=derive();if(!d)return;publish(d);draw(d)}
function schedule(withFallback=false){if(!raf)raf=requestAnimationFrame(render);if(withFallback){clearTimeout(fallback);fallback=setTimeout(()=>{fallback=0;render()},320)}}
['m3-analysis-narrative-ready','m3-pure-ability-v2-ready','m3-trait-rescue-watch-ready','m3-race-lab-ready','rsa-addons-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,()=>schedule(ev==='m3-pure-ability-v2-ready'||ev==='m3-trait-rescue-watch-ready'||ev==='rsa-analysis-complete')));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id)){lastSig='';window.M3AbilityNarrativeState={ready:false,version:V,generation:generation(),at:Date.now()};schedule(true)}},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});else schedule(true);
})();