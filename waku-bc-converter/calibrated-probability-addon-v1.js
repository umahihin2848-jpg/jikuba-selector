(function(){'use strict';
const C=window.ShapeCore;if(!C)return;
let PM=null,lastCtx=null;
window.CalibratedProbabilityState={ready:false,resultsByName:{},results:[],version:'v1'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=document.createElement('style');
style.textContent='.cpHero{font-size:17px;font-weight:900;margin:4px 0 8px}.cpProbGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.cpProbBox{padding:10px 8px;border-radius:12px;background:#091a26;border:1px solid #1b394c;text-align:center}.cpProbBox span{display:block;font-size:10px;color:#89aabc;margin-bottom:3px}.cpProbBox b{font-size:24px;line-height:1}.cpRef{margin-top:8px;padding:8px 9px;border-radius:10px;background:#0d2231;font-size:11px;color:#b9d0dc;line-height:1.45}.cpDeltaPos{color:#7fe5bd;font-weight:800}.cpDeltaNeg{color:#ffaaaa;font-weight:800}.cpDeltaZero{color:#e8eef2;font-weight:800}.cpRank{font-size:11px;color:#89aabc}.cpFoot{margin-top:8px;font-size:10px;color:#7391a3;line-height:1.5}@media(max-width:560px){.cpProbBox b{font-size:22px}}';
document.head.appendChild(style);

function distBand(x){x=Number(x);if(!Number.isFinite(x))return'UNK';if(x<=1200)return'<=1200';if(x<=1400)return'1300-1400';if(x<=1600)return'1500-1600';if(x<=1800)return'1700-1800';if(x<=2000)return'1900-2000';if(x<=2200)return'2100-2200';if(x<=2400)return'2300-2400';if(x<=2600)return'2500-2600';return'2700+'}
function logistic(z){return 1/(1+Math.exp(-z))}
function normalizeSurface(v){return String(v||'').includes('ダ')?'ダ':'芝'}
function features(pop){
  const surface=normalizeSurface(document.getElementById('surface')?.value);
  const grade=String(document.getElementById('grade')?.value||'');
  const venue=String(document.getElementById('venue')?.value||'');
  const distance=Number(document.getElementById('distance')?.value);
  const field_size=Number(document.getElementById('fieldSize')?.value);
  const db=distBand(distance);
  return {pop:Number(pop),pop2:Number(pop)*Number(pop),log_pop:Math.log1p(Number(pop)),field_size,rank_frac:Number(pop)/field_size,distance,surface,grade,venue,dist_band:db,surface_dist:`${surface}_${db}`,grade_surface:`${grade}_${surface}`};
}
function modelProb(model,f){
  let z=model.intercept;
  for(const [key,c] of Object.entries(model.numeric||{})){let v=Number(f[key]);if(!Number.isFinite(v))v=c.mean;z+=c.coef*((v-c.mean)/(c.scale||1))}
  for(const [key,map] of Object.entries(model.categorical||{})){const v=String(f[key]??'');if(Object.prototype.hasOwnProperty.call(map,v))z+=map[v]}
  return logistic(z)
}
function refPop(pop){return PM?.reference_stats?.by_pop?.[String(Math.round(pop))]||null}
function fmtPct(p,d=0){return Number.isFinite(p)?`${(p*100).toFixed(d)}%`:'—'}
function deltaCls(x){return x>.005?'cpDeltaPos':x<-.005?'cpDeltaNeg':'cpDeltaZero'}
function ensureUI(){
  if(document.getElementById('calibratedProbabilityList')){renumber();return}
  const iv=document.getElementById('integratedViewList')?.closest('.card');
  const ab=document.getElementById('abilityListV27')?.closest('.card');
  const anchor=iv||ab||document.querySelector('.card.explain');
  if(!anchor)return;
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<h2>⑤ 10年較正検証済み確率</h2><div class="muted">2016〜2025年のJRA平地・3勝クラス以上を使い、発走前に分かる人気順位・頭数・芝ダート・距離・格・競馬場だけで推定します。2026年は完全ホールドアウトです。</div><div id="calibratedProbabilityList" class="horseList" style="margin-top:8px"></div><div id="calibratedProbabilityNote" class="cpFoot"></div>';
  anchor.parentNode.insertBefore(c,anchor);renumber()
}
function renumber(){
  const iv=document.getElementById('integratedViewList')?.closest('.card')?.querySelector('h2');if(iv)iv.textContent='⑥ 条件補正・総合3着内率';
  const map=[['abilityListV27','⑦ 地力・能力'],['courseFitList','⑧ コース相性'],['conditionChangeList','⑨ 条件替わり'],['horseFitList','⑩ 展開との相性']];
  for(const [id,t] of map){const h=document.getElementById(id)?.closest('.card')?.querySelector('h2');if(h)h.textContent=t}
  const ex=document.querySelector('.card.explain h2');if(ex)ex.textContent='⑪ レース展望・まとめ';
  const rel=document.getElementById('reliability')?.closest('.card')?.querySelector('h2');if(rel)rel.textContent='⑫ データ信頼度'
}
function render(){
  ensureUI();const box=document.getElementById('calibratedProbabilityList');if(!box)return;
  if(!PM){box.innerHTML='<div class="notice yellow">10年確率モデルを読込中です。</div>';return}
  if(!lastCtx){box.innerHTML='<div class="notice yellow">レース構造を解析すると表示します。</div>';return}
  const mm={};(lastCtx.analysis.market.list||[]).forEach(x=>mm[String(x.no)]=x);
  const rows=[];
  for(const h of lastCtx.analysis.hs||[]){
    const mk=mm[String(h.no)];if(!mk||!Number.isFinite(mk.rank))continue;
    const f=features(mk.rank);if(!Number.isFinite(f.field_size)||!Number.isFinite(f.distance)||!f.grade||!f.venue)continue;
    const win=modelProb(PM.models.win,f),top2=modelProb(PM.models.top2,f),top3=modelProb(PM.models.top3,f),ref=refPop(mk.rank);
    rows.push({name:h.name,no:h.no,pop:mk.rank,win,top2,top3,ref})
  }
  if(!rows.length){box.innerHTML='<div class="notice yellow">レース条件と単勝オッズを入力すると確率を計算できます。</div>';return}
  rows.sort((a,b)=>b.top3-a.top3);
  window.CalibratedProbabilityState={ready:true,resultsByName:Object.fromEntries(rows.map(x=>[x.name,x])),results:rows,version:'v1',model:PM};
  window.dispatchEvent(new CustomEvent('calibrated-probability-ready'));
  box.innerHTML=rows.map((x,i)=>{
    const d=x.ref?x.top3-x.ref.top3:NaN,ds=Number.isFinite(d)?`${d>=0?'+':''}${(d*100).toFixed(1)}pt`:'—',dc=Number.isFinite(d)?deltaCls(d):'cpDeltaZero';
    const ref=x.ref?`同じ${x.pop}人気の10年実績 n=${x.ref.n.toLocaleString()}：勝${fmtPct(x.ref.win,1)} / 連対${fmtPct(x.ref.top2,1)} / 複勝${fmtPct(x.ref.top3,1)}`:'人気別実績なし';
    return `<div class="horse"><div class="horseTop"><div class="horseName">${esc(x.no?`${x.no}番 `:'')}${esc(x.name)} <span class="cpRank">(${x.pop}人気)</span></div><span class="badge">複勝順 ${i+1}</span></div><div class="cpProbGrid"><div class="cpProbBox"><span>較正検証済み 勝率</span><b>${fmtPct(x.win)}</b></div><div class="cpProbBox"><span>連対率</span><b>${fmtPct(x.top2)}</b></div><div class="cpProbBox"><span>複勝率</span><b>${fmtPct(x.top3)}</b></div></div><div class="cpRef">${esc(ref)}<br>今回条件込みの複勝率は人気だけの10年実績比 <span class="${dc}">${esc(ds)}</span></div></div>`
  }).join('');
  const h=PM.holdout_2026||{},w=h.win||{},t2=h.top2||{},t3=h.top3||{};
  const note=document.getElementById('calibratedProbabilityNote');
  if(note)note.innerHTML=`学習：2016〜2025 ${Number(PM.scope.training_rows||0).toLocaleString()}頭 / ${Number(PM.scope.training_races||0).toLocaleString()}レース。追加Platt/Isotonicは2024年の選択基準で改善不足のため不採用。2026完全OOS ECE：勝${fmtPct(w.ece15,1)}・連対${fmtPct(t2.ece15,1)}・複勝${fmtPct(t3.ece15,1)}。※「raw」は未検証という意味ではなく、追加変換なしの方が較正性能を維持したという意味です。`
}
function schedule(){setTimeout(render,80);setTimeout(render,300);setTimeout(render,700);setTimeout(render,1400)}
const old=C.analyze;C.analyze=function(meta,odds,horses,M){const a=old(meta,odds,horses,M);lastCtx={meta,odds,horses,analysis:a};schedule();return a};
const mo=new MutationObserver(()=>{renumber();if(lastCtx&&PM){clearTimeout(window.__cpTimer);window.__cpTimer=setTimeout(render,120)}});
window.addEventListener('load',()=>{ensureUI();mo.observe(document.body,{childList:true,subtree:true,characterData:true})});
fetch('data/calibrated_outcome_probability_v1.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()}).then(x=>{PM=x;schedule()}).catch(()=>{ensureUI();const b=document.getElementById('calibratedProbabilityList');if(b)b.innerHTML='<div class="notice red">10年確率モデルの読込に失敗しました。</div>'});
})();