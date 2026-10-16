(()=>{'use strict';
if(window.__POSITION_RISK_CONFIDENCE_V1)return;window.__POSITION_RISK_CONFIDENCE_V1=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function conf(n){n=Number(n)||0;return n<=1?{key:'low',label:'低',reason:'履歴1走以下'}:n<=4?{key:'mid',label:'中',reason:`履歴${n}走`}:{key:'high',label:'高',reason:`履歴${n}走`}}
function addGuide(track){
  let guide=document.getElementById('positionRiskGuide');
  if(!guide){guide=document.createElement('details');guide.id='positionRiskGuide';guide.className='prGuide';const details=document.getElementById('positionRiskDetails');details?details.insertAdjacentElement('afterend',guide):track.appendChild(guide)}
  guide.innerHTML=`<summary>P10の見方｜かんたん解説</summary><div class="prGuideGrid"><div><b>P10</b><p>今回、最初に記録される通過順位が<strong>10番手以下</strong>になる確率です。高いほど「後ろからになりやすい」という意味で、能力や着順の予測ではありません。</p></div><div><b>圧 ±pt</b><p>今回のメンバー構成による先行圧で、P10が中立状態から何ポイント動いたかです。<strong>＋は後方化、−は前に行きやすい方向</strong>を示します。</p></div><div><b>推定信頼度</b><p>過去走データの<strong>充足度</strong>です。高＝5走以上、中＝2〜4走、低＝0〜1走。<strong>予測精度そのものを保証する表示ではありません。</strong></p></div><div><b>目安</b><p>P10 20%未満＝後方リスク低め、20〜50%＝中間、50〜65%＝注意、65%以上＝強い後方警告。M3順位・Top3率・馬券判定には直接反映しません。</p></div></div>`;
}
function render(ev){
  const st=ev?.detail||window.PositionRiskState;if(!st?.ready||!Array.isArray(st.rows))return;
  const track=document.getElementById('qRealTrack');if(!track)return;
  for(const r of st.rows){
    const c=conf(r.historyN),card=track.querySelector(`.rtHorse[data-no="${CSS.escape(String(r.no))}"] .prHorseInfo`);if(!card)continue;
    card.querySelector('.prConfidenceBadge')?.remove();
    const badge=document.createElement('span');badge.className=`prConfidenceBadge ${c.key}`;badge.innerHTML=`信頼度 ${E(c.label)} <i>${Number(r.historyN)||0}走</i>`;card.appendChild(badge);
    r.confidence=c.label;r.confidenceKey=c.key;
  }
  for(const row of $$('#positionRiskDetails .prRow')){
    const txt=row.querySelector('b')?.textContent||'',m=txt.match(/^\s*(\d+)番/);if(!m)continue;const r=st.byNo?.[String(Number(m[1]))]||st.rows.find(x=>String(x.no)===String(Number(m[1])));if(!r)continue;
    row.querySelector('.prConfidenceLine')?.remove();const c=conf(r.historyN),line=document.createElement('small');line.className=`prConfidenceLine ${c.key}`;line.textContent=`履歴 ${Number(r.historyN)||0}走｜推定信頼度 ${c.label}`;row.querySelector('div')?.appendChild(line)
  }
  addGuide(track);
}
const css=document.createElement('style');css.textContent=`.prConfidenceBadge{display:inline-flex;align-items:center;gap:3px;margin-top:4px;border:1px solid #3a5564;border-radius:999px;padding:2px 5px;font-size:7px;font-weight:900;line-height:1.1}.prConfidenceBadge i{font-style:normal;font-weight:700;opacity:.72}.prConfidenceBadge.high,.prConfidenceLine.high{color:#78dfad;border-color:#35664f}.prConfidenceBadge.mid,.prConfidenceLine.mid{color:#f0cc75;border-color:#6a5a35}.prConfidenceBadge.low,.prConfidenceLine.low{color:#ff9aa5;border-color:#74424b}.prConfidenceLine{margin-top:3px!important;font-weight:900}.prGuide{margin:7px 0 8px;border:1px solid #294b5d;border-radius:11px;background:#091d29;padding:8px}.prGuide summary{cursor:pointer;font-size:9px;font-weight:900;color:#c1d7e0}.prGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.prGuideGrid>div{border:1px solid #254554;background:#0b2230;border-radius:8px;padding:7px}.prGuideGrid b{font-size:9px;color:#d8e7ee}.prGuideGrid p{margin:3px 0 0;font-size:8px;line-height:1.55;color:#94acb7}.prGuideGrid strong{color:#dbeaf0}@media(max-width:560px){.prGuideGrid{grid-template-columns:1fr}.prConfidenceBadge{font-size:6.8px}}`;document.head.appendChild(css);
addEventListener('position-risk-ready',render);addEventListener('validated-queue-ready',()=>setTimeout(()=>render(),40));if(window.PositionRiskState?.ready)setTimeout(()=>render(),0);
})();
