(()=>{'use strict';
if(window.__POSITION_RISK_STARTTURN_BRIDGE_V1)return;window.__POSITION_RISK_STARTTURN_BRIDGE_V1=true;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const conf=n=>{n=Number(n)||0;return n<=1?{key:'low',label:'低'}:n<=4?{key:'mid',label:'中'}:{key:'high',label:'高'}};
const impactText=d=>{const pt=Math.round((Number(d)||0)*100);return `${pt>0?'+':''}${pt}pt`};
function render(){
  const st=window.PositionRiskState,root=document.getElementById('m3StartFirstTurn');
  if(!st?.ready||!root)return;
  const byNo=st.byNo||Object.fromEntries((st.rows||[]).map(r=>[String(r.no),r]));
  root.querySelectorAll('.sftRow').forEach(row=>{
    const b=row.querySelector('b'),m=(b?.textContent||'').match(/^\s*(\d+)番/);if(!m)return;
    const r=byNo[String(Number(m[1]))]||byNo[m[1]];if(!r)return;
    row.querySelector('.sftRiskLine')?.remove();
    const c=conf(r.historyN),p=Math.round(Number(r.p10)*100),impact=Number(r.impact)||0;
    const line=document.createElement('div');
    line.className=`sftRiskLine risk-${p>=65?'danger':p>=50?'warn':p>=20?'mid':'low'} conf-${c.key}`;
    line.innerHTML=`<span><b>P10 ${p}%${p>=65?' ⚠':''}</b></span><span class="impact ${impact>.05?'up':impact<-.05?'down':'flat'}">圧 ${E(impactText(impact))}</span><span class="conf">信頼度 ${E(c.label)}・${Number(r.historyN)||0}走</span>`;
    const info=b.parentElement;info?.appendChild(line);
  });
  let guide=root.querySelector('.sftRiskGuide');
  if(!guide){guide=document.createElement('details');guide.className='sftRiskGuide';root.appendChild(guide)}
  guide.innerHTML=`<summary>P10・圧・信頼度の見方</summary><div class="sftRiskGuideGrid"><div><b>P10</b><p>今回、最初に記録される通過順位が<strong>10番手以下</strong>になる確率です。高いほど後方からになりやすいという意味で、能力や着順の予測ではありません。</p></div><div><b>圧 ±pt</b><p>今回のメンバー構成による先行圧で、P10が中立状態からどれだけ動いたかです。<strong>＋は後方化、−は前に行きやすい方向</strong>です。</p></div><div><b>信頼度</b><p>予測に使える過去走データの充足度です。<strong>高=5走以上、中=2〜4走、低=0〜1走</strong>。的中率の保証ではありません。</p></div><div><b>使い方</b><p>P10 20%未満=低め、20〜50%=中間、50〜65%=注意、65%以上=強警告。M3順位・Top3率・馬券判定は直接変更しません。</p></div></div>`;
  window.PositionRiskStartTurnBridgeState={ready:true,version:'position-risk-startturn-bridge-v1',rows:root.querySelectorAll('.sftRiskLine').length,at:Date.now()};
}
let timers=[];function schedule(){timers.forEach(clearTimeout);timers=[0,80,220,520,1000].map(ms=>setTimeout(()=>requestAnimationFrame(render),ms))}
['position-risk-ready','m3-start-firstturn-visual-ready','validated-queue-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id))schedule()},true);
const css=document.createElement('style');css.textContent=`.sftRiskLine{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:4px;font-size:7px;line-height:1.25}.sftRiskLine>span{font-weight:800}.sftRiskLine.risk-low>span:first-child{color:#78dfad}.sftRiskLine.risk-mid>span:first-child{color:#9fd6ef}.sftRiskLine.risk-warn>span:first-child{color:#f0cc75}.sftRiskLine.risk-danger>span:first-child{color:#ff9aa5}.sftRiskLine .impact.up{color:#ffb071}.sftRiskLine .impact.down{color:#78dfad}.sftRiskLine .impact.flat{color:#9bb0ba}.sftRiskLine .conf{border:1px solid #3a5564;border-radius:999px;padding:1px 4px;color:#a9bdc7}.sftRiskLine.conf-high .conf{color:#78dfad;border-color:#35664f}.sftRiskLine.conf-mid .conf{color:#f0cc75;border-color:#6a5a35}.sftRiskLine.conf-low .conf{color:#ff9aa5;border-color:#74424b}.sftRiskGuide{margin-top:8px;border:1px solid #294b5d;border-radius:10px;background:#091d29;padding:7px}.sftRiskGuide summary{cursor:pointer;font-size:8px;font-weight:900;color:#bfd5de}.sftRiskGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.sftRiskGuideGrid>div{border:1px solid #254554;background:#0b2230;border-radius:8px;padding:7px}.sftRiskGuideGrid b{font-size:8px;color:#d8e7ee}.sftRiskGuideGrid p{margin:3px 0 0;font-size:7.5px;line-height:1.5;color:#94acb7}.sftRiskGuideGrid strong{color:#dbeaf0}@media(max-width:620px){.sftRiskLine{gap:5px;font-size:7px}.sftRiskGuideGrid{grid-template-columns:1fr}}`;
document.head.appendChild(css);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
