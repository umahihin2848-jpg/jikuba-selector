(function(){'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let POLICY=null;
const style=document.createElement('style');
style.textContent='.fpLead{font-size:17px;font-weight:900;margin:3px 0 8px}.fpGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.fpBox{padding:10px 7px;border-radius:12px;background:#071b29;border:1px solid #1c3b4d;text-align:center}.fpBox span{display:block;font-size:10px;color:#89aabc;margin-bottom:3px}.fpBox b{font-size:25px;line-height:1}.fpTag{display:inline-block;margin-top:5px;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:800}.fpKeep{background:#173143;color:#c7dbe6}.fpUse{background:#11382d;color:#7fe5bd}.fpCompare{margin-top:8px;padding:8px 9px;border-radius:10px;background:#0d2231;font-size:11px;line-height:1.5;color:#bdd1dc}.fpUp{color:#7fe5bd;font-weight:900}.fpDown{color:#ffaaaa;font-weight:900}.fpFoot{margin-top:8px;font-size:10px;color:#7896a7;line-height:1.5}@media(max-width:560px){.fpBox b{font-size:22px}}';
document.head.appendChild(style);

function ensureUI(){
  if(document.getElementById('finalProbabilityList')){renumber();return}
  const base=document.getElementById('calibratedProbabilityList')?.closest('.card');
  const iv=document.getElementById('integratedViewList')?.closest('.card');
  const anchor=base||iv||document.querySelector('.card.explain');if(!anchor)return;
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<h2>⑤ 最終確率</h2><div class="muted">10年基礎確率を出発点に、馬固有補正は2026完全OOSで改善を確認できた目的だけ採用します。改善しない補正は入れません。</div><div id="finalProbabilityList" class="horseList" style="margin-top:8px"></div><div id="finalProbabilityNote" class="fpFoot"></div>';
  anchor.parentNode.insertBefore(c,anchor);renumber();
}
function renumber(){
  const set=(id,t)=>{const h=document.getElementById(id)?.closest('.card')?.querySelector('h2');if(h)h.textContent=t};
  set('calibratedProbabilityList','⑥ 10年基礎確率');
  set('integratedViewList','⑦ 馬固有3着内率・内訳');
  set('abilityListV27','⑧ 地力・能力');
  set('courseFitList','⑨ コース相性');
  set('conditionChangeList','⑩ 条件替わり');
  set('horseFitList','⑪ 展開との相性');
  const ex=document.querySelector('.card.explain h2');if(ex)ex.textContent='⑫ レース展望・まとめ';
  const rel=document.getElementById('reliability')?.closest('.card')?.querySelector('h2');if(rel)rel.textContent='⑬ データ信頼度';
}
function integratedMap(){
  const root=document.getElementById('integratedViewList'),out={};if(!root)return out;
  for(const card of root.querySelectorAll('.horse')){
    const ht=card.querySelector('.horseName')?.textContent||'';
    const m=ht.match(/^\s*(\d+)番\s+/);if(!m)continue;const no=m[1];
    const p=card.querySelector('.ivProb')?.textContent||'';const b=card.querySelector('.ivBase')?.textContent||'';
    const full=Number(p.replace('%',''))/100,market=Number(b.replace('%',''))/100;
    if(Number.isFinite(full))out[no]={fullP:full,marketP:Number.isFinite(market)?market:NaN};
  }
  return out;
}
function pct(x,d=0){return Number.isFinite(x)?`${(x*100).toFixed(d)}%`:'—'}
function render(){
  ensureUI();const box=document.getElementById('finalProbabilityList');if(!box)return;
  const S=window.CalibratedProbabilityState;if(!S?.ready){box.innerHTML='<div class="notice yellow">10年基礎確率の計算後に表示します。</div>';return}
  const im=integratedMap();
  const rows=(S.results||[]).map(x=>{const ix=im[String(x.no)]||null;return{...x,finalWin:x.win,finalTop2:x.top2,finalTop3:ix?.fullP??x.top3,horseTop3:ix?.fullP,horseMarket:ix?.marketP}}).sort((a,b)=>b.finalTop3-a.finalTop3);
  box.innerHTML=rows.map((x,i)=>{
    const has=Number.isFinite(x.horseTop3),d=has?x.horseTop3-x.top3:NaN,cls=d>0.004?'fpUp':d<-.004?'fpDown':'';
    const compare=has?`10年基礎の複勝率 ${pct(x.top3)} → 馬固有3着内率 <span class="${cls}">${pct(x.horseTop3)}</span>。<br><span class="tiny">※別モデルをOOSで比較して採用した値で、基礎率へptを単純加算したものではありません。</span>`:`馬固有モデルの入力が揃っていないため、複勝率も10年基礎確率を使用します。`;
    return `<div class="horse"><div class="horseTop"><div class="horseName">${esc(x.no?`${x.no}番 `:'')}${esc(x.name)} <span class="tiny">(${x.pop}人気)</span></div><span class="badge">最終複勝順 ${i+1}</span></div><div class="fpGrid"><div class="fpBox"><span>最終 勝率</span><b>${pct(x.finalWin)}</b><div class="fpTag fpKeep">基礎維持</div></div><div class="fpBox"><span>最終 連対率</span><b>${pct(x.finalTop2)}</b><div class="fpTag fpKeep">基礎維持</div></div><div class="fpBox"><span>最終 複勝率</span><b>${pct(x.finalTop3)}</b><div class="fpTag ${has?'fpUse':'fpKeep'}">${has?'馬固有補正採用':'基礎維持'}</div></div></div><div class="fpCompare">${compare}</div></div>`
  }).join('');
  const note=document.getElementById('finalProbabilityNote');if(note){
    const p=POLICY?.policy||{};const t=POLICY?.holdout_2026||{};
    note.innerHTML=`採用ルール：勝率＝${esc(p.win||'馬固有補正はOOS改善なしのため不採用')} / 連対率＝${esc(p.top2||'馬固有補正はOOS再現せず不採用')} / 複勝率＝${esc(p.top3||'既存統合モデルのみ採用')}。${t.top3?` 複勝モデル2026 OOS：Log Loss ${Number(t.top3.full_logloss).toFixed(5)}（市場基準 ${Number(t.top3.market_logloss).toFixed(5)}）。`:''}`;
  }
}
function schedule(){setTimeout(render,100);setTimeout(render,350);setTimeout(render,800);setTimeout(render,1500)}
window.addEventListener('calibrated-probability-ready',schedule);
window.addEventListener('ability-opponent-ready',schedule);
const mo=new MutationObserver(()=>{clearTimeout(window.__fpTimer);window.__fpTimer=setTimeout(()=>{renumber();render()},140)});
window.addEventListener('load',()=>{ensureUI();mo.observe(document.body,{childList:true,subtree:true,characterData:true});schedule()});
fetch('data/probability_correction_policy_v1.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{POLICY=x;schedule()}).catch(()=>schedule());
})();