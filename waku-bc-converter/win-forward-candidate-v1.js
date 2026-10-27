(()=>{'use strict';
if(!window.RSAMobileLean||window.__WIN_FORWARD_CANDIDATE_V1)return;window.__WIN_FORWARD_CANDIDATE_V1=true;
const V='win-forward-candidate-v1.0',$=id=>document.getElementById(id);let raf=0;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function schedule(ms=0){setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})},ms)}
function axisWinOdds(no){const r=window.ShapeCore?.parseOdds?.($('oddsPaste')?.value||'');const x=Number(r?.odds?.[String(no)]);return Number.isFinite(x)&&x>0?x:NaN}
function render(){
  const root=$('mfs1'),tickets=root?.querySelector?.('.mfsTickets');
  if(!root||!tickets){schedule(240);return}
  root.querySelector('#mfsWinForwardRow')?.remove();
  const ax=window.AxisReliabilityShadowV1State,rs=window.RaceStrengthProfileShadowV1State;
  const high=Boolean(ax?.ready&&ax.high),ready=Boolean(ax?.ready&&rs?.ready),axis=ax?.axis||{},N=Number(rs?.fieldSize),gap=Number(rs?.abilityGap);
  const bigField=Number.isFinite(N)&&N>=16,bigGap=Number.isFinite(gap)&&gap>=.12,candidate=Boolean(high&&ready&&bigField&&bigGap);
  const odds=axisWinOdds(axis?.no),row=document.createElement('div');row.id='mfsWinForwardRow';
  if(!ax?.ready){row.className='mfsRow wait';row.innerHTML='<strong>単勝</strong><div class="mfsMain"><b>判定待ち</b><small>HIGH軸の計算待ち</small></div><span class="mfsTag">WAIT</span>'}
  else if(!high){row.className='mfsRow stop';row.innerHTML='<strong>単勝</strong><div class="mfsMain"><b>見送り</b><small>HIGH軸なし</small></div><span class="mfsTag">PASS</span>'}
  else if(!rs?.ready){row.className='mfsRow wait';row.innerHTML='<strong>単勝</strong><div class="mfsMain"><b>判定待ち</b><small>頭数・Ability差を確認中</small></div><span class="mfsTag">WAIT</span>'}
  else if(candidate){const od=Number.isFinite(odds)?`｜単勝 ${odds.toFixed(1)}倍`:'｜単勝オッズ未入力';row.className='mfsRow buy';row.innerHTML=`<strong>単勝</strong><div class="mfsMain"><b>${E(axis.no)}番 ${E(axis.name||'')}</b><small>16頭以上＋Ability差 ${gap.toFixed(3)} ≥ 0.120${E(od)}｜Forward検証中</small></div><span class="mfsTag">🟢 BUY</span>`}
  else {const miss=[bigField?null:`頭数 ${Number.isFinite(N)?N:'—'}頭 < 16`,bigGap?null:`Ability差 ${Number.isFinite(gap)?gap.toFixed(3):'—'} < 0.120`].filter(Boolean).join('｜');row.className='mfsRow stop';row.innerHTML=`<strong>単勝</strong><div class="mfsMain"><b>見送り</b><small>${E(miss||'単勝強候補条件未達')}｜Forward検証ルール</small></div><span class="mfsTag">PASS</span>`}
  const h=tickets.querySelector('h4');if(h)h.insertAdjacentElement('afterend',row);else tickets.prepend(row);
  if(candidate){const hero=root.querySelector('.mfsHero'),title=hero?.querySelector('strong'),small=hero?.querySelector('small');if(hero){hero.classList.remove('wait','pass');hero.classList.add('buy')}if(title&&['買い目計算中','オッズ待ち','判定中'].includes(title.textContent.trim()))title.textContent='買い目候補あり';if(small&&!small.textContent.includes('単勝'))small.textContent=`単勝：${axis.no}番 ${axis.name||''} が強候補（16頭以上＋Ability差0.12以上）。`+small.textContent}
  window.WinForwardCandidateV1State={ready:Boolean(ax?.ready&&rs?.ready),version:V,candidate,axisNo:String(axis?.no||''),axisName:String(axis?.name||''),fieldSize:Number.isFinite(N)?N:null,abilityGap:Number.isFinite(gap)?gap:null,winOdds:Number.isFinite(odds)?odds:null,rule:{highAxis:true,minFieldSize:16,minAbilityGap:.12},forward:true,at:Date.now()};
}
['axis-reliability-shadow-ready','race-strength-profile-ready','post-veto-top2-ready','m3-calibrated-shared-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(130)));
document.addEventListener('input',e=>{if(['oddsPaste','fieldSize'].includes(e.target?.id))schedule(140)},true);
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id))schedule(220)},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(480),{once:true});else schedule(360);
})();
