(()=>{'use strict';
const C=window.ShapeCore,$=id=>document.getElementById(id);if(!C)return;
let lastCtx=null,busy=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)*100)}%`:'—';
const shortName=s=>String(s||'').replace(/\s+/g,'').trim();
function strictRPCI(){
  const S=window.RPCIFitBetaState,sim=$('finish600Simulator');if(!S?.rows?.length||!sim)return;
  const nodes=[...sim.querySelectorAll('.f6Row')];
  const rows=S.rows.map((r,i)=>{
    const n=Number(r.n)||0,good=Number(r.good)||0,avg=Number(r.avgPct),pr=Number(r.avgPr);
    let level='none',label='同RPCI帯データなし';
    if(n>0){
      level='low';label='RPCI帯経験あり β';
      if(n>=2&&good>=1&&Number.isFinite(avg)&&avg<=.5){level='high';label='RPCI適性一致 β'}
      else if(good>=1||(Number.isFinite(avg)&&avg<=.65)||(Number.isFinite(pr)&&pr>0)){level='mid';label='RPCI適性候補 β'}
    }
    const nr={...r,level,label};
    const el=nodes[i]?.querySelector('.rpciFitBeta');
    if(el){
      el.className=`rpciFitBeta ${level}`;
      const chip=el.querySelector('.rfChip');if(chip)chip.textContent=`🧭 ${label}`;
      el.title=level==='high'?'同RPCI帯2走以上＋好走型1回以上＋平均着順位置50%以内。FinishScore・確率は変更しません。':level==='mid'?'同RPCI帯の経験はあるものの、正式な一致判定にはサンプル不足または条件未達です。':'RPCI帯経験の参考表示です。';
    }
    return nr;
  });
  window.RPCIFitBetaState={...S,rows,strictRule:'high = same-band n>=2 AND good>=1 AND avgPct<=0.50'};
}
function clarifyM3(){
  const sim=$('finish600Simulator');if(!sim)return;
  const badge=sim.querySelector('.f6Head span');if(badge)badge.textContent='M3末脚順位';
  const em=sim.querySelector('.f6Head em');if(em)em.textContent='最終予想順位ではありません';
  const note=sim.querySelector('.f6Note');if(note&&!note.dataset.m3clarified){note.dataset.m3clarified='1';note.textContent='残600mの予測位置から、過去5走のPCI/RPCI・上がり・位置取りを使って「そこからどれだけ伸びるか」を比較したM3末脚順位です。最終予想順位・勝率順位ではありません。RPCI4帯はM4の what-if 表示です。'}
  [...sim.querySelectorAll('.f6Rank')].forEach((el,i)=>{const rank=i+1;el.title=`M3末脚順位 ${rank}位（最終予想順位ではありません）`;el.setAttribute('aria-label',el.title)});
}
function getProbRows(){
  const S=window.CalibratedProbabilityState;return(S?.results||[]).map(x=>({...x,win:Number(x.win),top2:Number(x.top2),top3:Number(x.top3),no:String(x.no)})).filter(x=>x.name&&Number.isFinite(x.top3)).sort((a,b)=>b.top3-a.top3);
}
function m3Rows(){return(window.Finish600State?.rows||[]).slice().sort((a,b)=>Number(a.finishRank)-Number(b.finishRank))}
function fitMap(){return new Map((window.RPCIFitBetaState?.rows||[]).map(x=>[String(x.no),x]))}
function paceLabel(){const v=Number(window.RPCIFitBetaState?.expectedRPCI);if(!Number.isFinite(v))return'';return v<45?`速い流れ想定（RPCI ${v.toFixed(1)}）`:v<50?`やや速め想定（RPCI ${v.toFixed(1)}）`:v<55?`平均想定（RPCI ${v.toFixed(1)}）`:`スロー想定（RPCI ${v.toFixed(1)}）`}
function raceTitle(){
  const venue=$('venue')?.value||lastCtx?.meta?.venue||'',name=$('raceName')?.value||lastCtx?.meta?.raceName||'レース',grade=$('grade')?.value||lastCtx?.meta?.grade||'';
  return `${venue}${grade?` ${grade}`:''} ${name}`.trim();
}
function makePost(){
  const probs=getProbRows();if(probs.length<3)return'分析結果が揃うとX投稿用の予想を自動生成します。';
  const fits=fitMap(),m3=m3Rows(),top=probs.slice(0,3),used=new Set(top.map(x=>x.no));
  let star=m3.find(x=>!used.has(String(x.no))&&fits.get(String(x.no))?.level==='high');
  if(!star)star=m3.find(x=>!used.has(String(x.no)));
  const starProb=star?probs.find(x=>x.no===String(star.no)):null;
  const mark=(sym,x)=>`${sym}${x.no} ${shortName(x.name)}`;
  const reasons=[];
  const f0=fits.get(top[0].no);if(f0?.level==='high')reasons.push(`${top[0].no}はRPCI適性一致`);
  if(star)reasons.push(`${star.no}はM3末脚${star.finishRank}位`);
  let txt=`【${raceTitle()}】\n${mark('◎',top[0])} ${pct(top[0].top3)}\n${mark('○',top[1])} ${pct(top[1].top3)}\n${mark('▲',top[2])} ${pct(top[2].top3)}`;
  if(star)txt+=`\n☆${star.no} ${shortName(star.name)}${starProb?` ${pct(starProb.top3)}`:''}`;
  const pace=paceLabel();if(pace)txt+=`\n展開：${pace}`;
  if(reasons.length)txt+=`\n注目：${reasons.slice(0,2).join('、')}`;
  txt+='\n#競馬予想';
  return txt;
}
function ensureX(){
  const result=$('result');if(!result)return null;
  let card=$('xPostCard');if(card)return card;
  card=document.createElement('section');card.id='xPostCard';card.className='card xPostCard';
  card.innerHTML=`<div class="xph"><div><h2>⑧ X投稿用まとめ</h2><div class="muted">最終確率を本線、M3末脚順位とRPCI適性を注目材料として短く要約します。投稿前に自由に編集できます。</div></div><span>コピペ用</span></div><textarea id="xPostText" rows="8" spellcheck="false"></textarea><div class="xpActions"><button id="xPostRefresh" type="button">要約を更新</button><button id="xPostCopy" type="button" class="primary">X用文章をコピー</button><span id="xPostCount"></span></div><div class="xpFoot">※ M3は末脚順位で、最終予想順位ではありません。RPCI適性β・末脚情報は確率を上書きしていません。</div>`;
  result.appendChild(card);
  $('xPostRefresh')?.addEventListener('click',renderX);
  $('xPostCopy')?.addEventListener('click',async()=>{const t=$('xPostText')?.value||'';try{await navigator.clipboard.writeText(t);const b=$('xPostCopy');if(b){const old=b.textContent;b.textContent='コピー済み ✓';setTimeout(()=>b.textContent=old,1000)}}catch(e){console.warn('x post copy',e)}});
  $('xPostText')?.addEventListener('input',updateCount);
  return card;
}
function updateCount(){const t=$('xPostText')?.value||'';const n=Array.from(t).length;const el=$('xPostCount');if(el)el.textContent=`${n}文字（目安）`}
function renderX(){ensureX();const ta=$('xPostText');if(!ta)return;ta.value=makePost();updateCount()}
function render(){if(busy)return;busy=true;try{clarifyM3();strictRPCI();renderX()}finally{busy=false}}
function schedule(){[100,260,600,1100,1900,3200].forEach(t=>setTimeout(render,t))}
const css=document.createElement('style');css.textContent=`#xPostCard{margin-top:12px}.xph{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.xph h2{margin:0 0 4px}.xph>span{font-size:9px;border:1px solid #355d70;color:#9fc3d4;border-radius:999px;padding:4px 7px;white-space:nowrap}#xPostText{width:100%;box-sizing:border-box;margin-top:9px;min-height:170px;border-radius:12px;border:1px solid #315568;background:#071b29;color:#eef8fb;padding:11px;font:500 13px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;resize:vertical}.xpActions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}.xpActions button{border:1px solid #315568;background:#0d2a3a;color:#dff3fb;border-radius:9px;padding:8px 10px;font-weight:800}.xpActions button.primary{background:#1b6177;border-color:#2c819b}.xpActions span,.xpFoot{font-size:9px;color:#7898a8}.xpFoot{margin-top:7px;line-height:1.5}`;document.head.appendChild(css);
const old=C.analyze;C.analyze=function(meta,odds,horses,M){const a=old(meta,odds,horses,M);lastCtx={meta,analysis:a};schedule();return a};
['finish600-ready','rpci-fit-beta-ready','final-probability-ready','calibrated-probability-ready','scenario-statistics-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn','applyOddsBtn'].includes(e.target?.id))schedule()});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>{ensureX();schedule()},{once:true});else{ensureX();schedule()}
})();