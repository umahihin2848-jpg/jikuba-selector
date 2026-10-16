(()=>{'use strict';
if(window.__POSITION_RISK_CONFIDENCE_SAFE_V2)return;window.__POSITION_RISK_CONFIDENCE_SAFE_V2=true;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function conf(n){n=Number(n)||0;return n<=1?{key:'low',label:'低'}:n<=4?{key:'mid',label:'中'}:{key:'high',label:'高'}}
function impactText(d){const pt=Math.round((Number(d)||0)*100);return`${pt>0?'+':''}${pt}pt`}
function guideHtml(){return `<summary>P10・圧・信頼度の見方</summary><div class="prGuideGrid"><div><b>P10</b><p>今回、最初に記録される通過順位が<strong>10番手以下</strong>になる確率です。高いほど後ろからになりやすいという意味で、能力や着順の予測ではありません。</p></div><div><b>圧 ±pt</b><p>今回のメンバー構成による先行圧で、P10が中立状態から何ポイント動いたかです。<strong>＋は後方化、−は前に行きやすい方向</strong>です。</p></div><div><b>信頼度</b><p>予測に使える過去走データの充足度です。高＝5走以上、中＝2〜4走、低＝0〜1走。<strong>高でも的中を保証する意味ではありません。</strong></p></div><div><b>目安</b><p>20%未満＝後方リスク低め、20〜50%＝中間、50〜65%＝注意、65%以上＝強い後方警告。M3順位・Top3率・馬券判定には直接反映しません。</p></div></div>`}
function byNo(st){return st.byNo||Object.fromEntries((st.rows||[]).map(r=>[String(r.no),r]))}
function render(){
  try{
    const st=window.PositionRiskState,root=document.getElementById('m3StartFirstTurn');
    if(!st?.ready||!Array.isArray(st.rows)||!root)return;
    const map=byNo(st);
    root.querySelectorAll('.sftRow').forEach(row=>{
      const title=row.querySelector('b')?.textContent||'',m=title.match(/^\s*(\d+)番/);if(!m)return;
      const r=map[String(Number(m[1]))]||map[m[1]];if(!r)return;
      const host=row.querySelector('div');if(!host)return;
      let line=host.querySelector('.sftRiskInline');if(!line){line=document.createElement('span');line.className='sftRiskInline';host.appendChild(line)}
      const p=Math.max(0,Math.min(100,Math.round((Number(r.p10)||0)*100))),impact=Number(r.impact)||0,c=conf(r.historyN),band=p>=65?'danger':p>=50?'warn':p>=20?'mid':'low';
      line.className=`sftRiskInline risk-${band} conf-${c.key}`;
      line.innerHTML=`<b>P10 ${p}%${p>=65?' ⚠':''}</b><i>圧 ${E(impactText(impact))}</i><em>信頼度 ${E(c.label)}・${Number(r.historyN)||0}走</em>`;
    });
    let guide=root.querySelector('.sftRiskGuideSafe');if(!guide){guide=document.createElement('details');guide.className='sftRiskGuideSafe';const foot=root.querySelector('.sftFoot');foot?foot.insertAdjacentElement('afterend',guide):root.appendChild(guide)}guide.innerHTML=guideHtml();
  }catch(e){console.warn('position risk confidence safe',e)}
}
let raf=0,timer=0;function schedule(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{raf=0;render()});clearTimeout(timer);timer=setTimeout(render,240)}
['position-risk-ready','m3-start-firstturn-visual-ready','validated-queue-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id))schedule()},true);
const css=document.createElement('style');css.textContent=`.sftRiskInline{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:3px;font-size:7px;line-height:1.25;color:#9bb0ba}.sftRiskInline b,.sftRiskInline i,.sftRiskInline em{font-style:normal;font-weight:800}.sftRiskInline.risk-low b{color:#78dfad}.sftRiskInline.risk-mid b{color:#9fd6ef}.sftRiskInline.risk-warn b{color:#f0cc75}.sftRiskInline.risk-danger b{color:#ff9aa5}.sftRiskInline i{color:#a8bbc4}.sftRiskInline em{border:1px solid #3a5564;border-radius:999px;padding:1px 4px}.sftRiskInline.conf-high em{color:#78dfad;border-color:#35664f}.sftRiskInline.conf-mid em{color:#f0cc75;border-color:#6a5a35}.sftRiskInline.conf-low em{color:#ff9aa5;border-color:#74424b}.sftRiskGuideSafe{margin-top:8px;border:1px solid #294b5d;border-radius:10px;background:#091d29;padding:7px}.sftRiskGuideSafe summary{cursor:pointer;font-size:8px;font-weight:900;color:#c1d7e0}.prGuideGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.prGuideGrid>div{border:1px solid #254554;background:#0b2230;border-radius:8px;padding:6px}.prGuideGrid b{font-size:8px;color:#d8e7ee}.prGuideGrid p{margin:3px 0 0;font-size:7.5px;line-height:1.5;color:#94acb7}.prGuideGrid strong{color:#dbeaf0}@media(max-width:560px){.prGuideGrid{grid-template-columns:1fr}.sftRiskInline{font-size:6.8px}}`;document.head.appendChild(css);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();