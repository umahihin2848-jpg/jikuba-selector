(()=>{'use strict';
if(window.__POSITION_RISK_CONFIDENCE_V1)return;window.__POSITION_RISK_CONFIDENCE_V1=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function conf(n){n=Number(n)||0;return n<=1?{key:'low',label:'低',reason:'履歴1走以下'}:n<=4?{key:'mid',label:'中',reason:`履歴${n}走`}:{key:'high',label:'高',reason:`履歴${n}走`}}
function impactText(d){const pt=Math.round((Number(d)||0)*100);return`${pt>0?'+':''}${pt}pt`}
function guideHtml(){return `<summary>P10・圧・信頼度の見方</summary><div class="prGuideGrid"><div><b>P10</b><p>今回、最初に記録される通過順位が<strong>10番手以下</strong>になる確率です。高いほど後ろからになりやすいという意味で、能力や着順の予測ではありません。</p></div><div><b>圧 ±pt</b><p>今回のメンバー構成による先行圧で、P10が中立状態から何ポイント動いたかです。<strong>＋は後方化、−は前に行きやすい方向</strong>を示します。</p></div><div><b>推定信頼度</b><p>予測に使える過去走データの<strong>充足度</strong>です。高＝5走以上、中＝2〜4走、低＝0〜1走。<strong>予測精度そのものを保証する表示ではありません。</strong></p></div><div><b>目安</b><p>P10 20%未満＝後方リスク低め、20〜50%＝中間、50〜65%＝注意、65%以上＝強い後方警告。M3順位・Top3率・馬券判定には直接反映しません。</p></div></div>`}
function addOldGuide(track){
  if(!track)return;let guide=document.getElementById('positionRiskGuide');
  if(!guide){guide=document.createElement('details');guide.id='positionRiskGuide';guide.className='prGuide';const details=document.getElementById('positionRiskDetails');details?details.insertAdjacentElement('afterend',guide):track.appendChild(guide)}
  guide.innerHTML=guideHtml();
}
function renderOld(st){
  const track=document.getElementById('qRealTrack');if(!track)return;
  for(const r of st.rows){const c=conf(r.historyN),card=track.querySelector(`.rtHorse[data-no="${CSS.escape(String(r.no))}"] .prHorseInfo`);if(!card)continue;card.querySelector('.prConfidenceBadge')?.remove();const badge=document.createElement('span');badge.className=`prConfidenceBadge ${c.key}`;badge.innerHTML=`信頼度 ${E(c.label)} <i>${Number(r.historyN)||0}走</i>`;card.appendChild(badge);r.confidence=c.label;r.confidenceKey=c.key}
  for(const row of $$('#positionRiskDetails .prRow')){const txt=row.querySelector('b')?.textContent||'',m=txt.match(/^\s*(\d+)番/);if(!m)continue;const r=st.byNo?.[String(Number(m[1]))]||st.rows.find(x=>String(x.no)===String(Number(m[1])));if(!r)continue;row.querySelector('.prConfidenceLine')?.remove();const c=conf(r.historyN),line=document.createElement('small');line.className=`prConfidenceLine ${c.key}`;line.textContent=`履歴 ${Number(r.historyN)||0}走｜推定信頼度 ${c.label}`;row.querySelector('div')?.appendChild(line)}
  addOldGuide(track)
}
function renderStartTurn(st){
  const root=document.getElementById('m3StartFirstTurn');if(!root)return;
  const byNo=st.byNo||Object.fromEntries((st.rows||[]).map(r=>[String(r.no),r]));
  root.querySelectorAll('.sftRow').forEach(row=>{
    const title=row.querySelector('b')?.textContent||'',m=title.match(/^\s*(\d+)番/);if(!m)return;const r=byNo[String(Number(m[1]))]||byNo[m[1]];if(!r)return;
    row.querySelector('.sftRiskLine')?.remove();const c=conf(r.historyN),p=Math.round((Number(r.p10)||0)*100),impact=Number(r.impact)||0;
    const line=document.createElement('div');line.className=`sftRiskLine risk-${p>=65?'danger':p>=50?'warn':p>=20?'mid':'low'} conf-${c.key}`;
    line.innerHTML=`<span class="p10">P10 ${p}%${p>=65?' ⚠':''}</span><span class="impact ${impact>.05?'up':impact<-.05?'down':'flat'}">圧 ${E(impactText(impact))}</span><span class="conf">信頼度 ${E(c.label)}・${Number(r.historyN)||0}走</span>`;
    row.querySelector('div')?.appendChild(line);r.confidence=c.label;r.confidenceKey=c.key
  });
  let guide=root.querySelector('.sftRiskGuide');if(!guide){guide=document.createElement('details');guide.className='prGuide sftRiskGuide';root.appendChild(guide)}guide.innerHTML=guideHtml();
}
function render(ev){const st=ev?.detail||window.PositionRiskState;if(!st?.ready||!Array.isArray(st.rows))return;renderOld(st);renderStartTurn(st)}
let timers=[];function schedule(){timers.forEach(clearTimeout);timers=[0,80,220,520,1000].map(ms=>setTimeout(()=>requestAnimationFrame(()=>render()),ms))}
const css=document.createElement('style');css.textContent=`.prConfidenceBadge{display:inline-flex;align-items:center;gap:3px;margin-top:4px;border:1px solid #3a5564;border-radius:999px;padding:2px 5px;font-size:7px;font-weight:900;line-height:1.1}.prConfidenceBadge i{font-style:normal;font-weight:700;opacity:.72}.prConfidenceBadge.high,.prConfidenceLine.high{color:#78dfad;border-color:#35664f}.prConfidenceBadge.mid,.prConfidenceLine.mid{color:#f0cc75;border-color:#6a5a35}.prConfidenceBadge.low,.prConfidenceLine.low{color:#ff9aa5;border-color:#74424b}.prConfidenceLine{margin-top:3px!important;font-weight:900}.prGuide{margin:7px 0 8px;border:1px solid #294b5d;border-radius:11px;background:#091d29;padding:8px}.prGuide summary{cursor:pointer;font-size:9px;font-weight:900;color:#c1d7e0}.prGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.prGuideGrid>div{border:1px solid #254554;background:#0b2230;border-radius:8px;padding:7px}.prGuideGrid b{font-size:9px;color:#d8e7ee}.prGuideGrid p{margin:3px 0 0;font-size:8px;line-height:1.55;color:#94acb7}.prGuideGrid strong{color:#dbeaf0}.sftRiskLine{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:4px;font-size:7px;line-height:1.25}.sftRiskLine>span{font-weight:900}.sftRiskLine.risk-low .p10{color:#78dfad}.sftRiskLine.risk-mid .p10{color:#9fd6ef}.sftRiskLine.risk-warn .p10{color:#f0cc75}.sftRiskLine.risk-danger .p10{color:#ff9aa5}.sftRiskLine .impact.up{color:#ffb071}.sftRiskLine .impact.down{color:#78dfad}.sftRiskLine .impact.flat{color:#9bb0ba}.sftRiskLine .conf{border:1px solid #3a5564;border-radius:999px;padding:1px 4px;color:#a9bdc7}.sftRiskLine.conf-high .conf{color:#78dfad;border-color:#35664f}.sftRiskLine.conf-mid .conf{color:#f0cc75;border-color:#6a5a35}.sftRiskLine.conf-low .conf{color:#ff9aa5;border-color:#74424b}.sftRiskGuide{margin-top:8px}@media(max-width:560px){.prGuideGrid{grid-template-columns:1fr}.prConfidenceBadge{font-size:6.8px}.sftRiskLine{font-size:7px;gap:4px}}`;document.head.appendChild(css);
addEventListener('position-risk-ready',render);addEventListener('validated-queue-ready',schedule);addEventListener('m3-start-firstturn-visual-ready',schedule);addEventListener('rsa-analysis-complete',schedule);if(window.PositionRiskState?.ready)schedule();
})();