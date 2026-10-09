(()=>{
'use strict';
if(window.__V5_HORSE_KART_V2)return;
window.__V5_HORSE_KART_V2=true;

const FLOW_KEY='rsa-v4-validated-flow-cache-v2';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>Number.isFinite(+v)?+v:null;
let filterState='all';

const css=document.createElement('style');
css.id='v5-horse-kart-v2-css';
css.textContent=`
.v5HorseCards{display:grid!important;gap:10px!important}
.v5HorseCard.v5KartCard{position:relative!important;padding:13px!important;border:1px solid #244765!important;border-radius:18px!important;background:linear-gradient(180deg,#0a1726,#07111d)!important;overflow:hidden;min-height:0!important}
.v5KartCard:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#4ea8ff;opacity:.9}
.v5KartCard.rise:before{background:#45d893}.v5KartCard.caution:before{background:#ef776f}.v5KartCard.unknown:before{background:#66798b}
.v5KartTop{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}
.v5KartNo{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1.5px solid #4e9bd2;background:#0d2840;color:#f5f9ff;font-weight:950;font-size:21px;box-shadow:0 8px 20px rgba(0,0,0,.24)}
.v5KartCard.rise .v5KartNo{border-color:#45d893;background:#0d3127;box-shadow:0 0 0 3px rgba(69,216,147,.07),0 8px 20px rgba(0,0,0,.24)}
.v5KartCard.caution .v5KartNo{border-color:#ef776f;background:#321b1d}
.v5KartName{min-width:0}.v5KartName b{display:block;font-size:15px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.v5KartName small{display:block;margin-top:4px;color:#7691a8;font-size:8px;line-height:1.25}
.v5KartOdds{text-align:right;white-space:nowrap}.v5KartOdds strong{display:block;font-size:17px;line-height:1.1}.v5KartOdds small{display:block;margin-top:4px;color:#6f8aa1;font-size:7px}
.v5KartEval{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:10px;border:1px solid #2d5475;border-radius:13px;padding:9px 10px;background:#0a1b2b}.v5KartEval strong{font-size:11px;line-height:1.2}.v5KartEval span{font-size:8px;color:#88a2b8;text-align:right;white-space:nowrap}
.v5KartCard.rise .v5KartEval{border-color:#31775d;background:linear-gradient(90deg,#0b2a22,#0a1a28)}.v5KartCard.rise .v5KartEval strong{color:#8bf0bc}
.v5KartCard.caution .v5KartEval{border-color:#784642;background:linear-gradient(90deg,#2a1719,#0b1723)}.v5KartCard.caution .v5KartEval strong{color:#ffaaa2}.v5KartCard.align .v5KartEval strong{color:#91ceff}
.v5KartMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:9px}
.v5KartMetric{min-width:0;min-height:57px;border:1px solid #203d58;border-radius:11px;background:#081522;padding:8px 8px 7px}.v5KartMetric small{display:block;color:#69869f;font-size:7px;line-height:1.2;white-space:nowrap}.v5KartMetric b{display:block;margin-top:5px;color:#eef6ff;font-size:11px;line-height:1.2;word-break:break-word}
.v5KartMetric.positive{border-color:#2d755a;background:#0b271f}.v5KartMetric.positive b{color:#8bf0bc}.v5KartMetric.negative{border-color:#74433f;background:#261719}.v5KartMetric.negative b{color:#ffaaa2}.v5KartMetric.neutral{border-color:#2a5677;background:#0b2032}.v5KartMetric.neutral b{color:#a6d9ff}
.v5KartSummary{margin-top:10px;padding-top:9px;border-top:1px solid rgba(73,120,157,.24);color:#91a8bb;font-size:8.5px;line-height:1.58;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:27px}
.v5KartCard.rise .v5KartSummary:before{content:"🟢 "}.v5KartCard.caution .v5KartSummary:before{content:"🔴 "}.v5KartCard.align .v5KartSummary:before{content:"🔵 "}.v5KartCard.unknown .v5KartSummary:before{content:"⚪️ "}
.v5HorseFilters{display:flex!important;gap:6px!important;overflow-x:auto!important;margin-bottom:10px!important;padding:1px 1px 4px!important;scrollbar-width:none}.v5HorseFilters::-webkit-scrollbar{display:none}
.v5HorseFilters button{white-space:nowrap;border:1px solid #284863;background:#081522;color:#809bb1;border-radius:999px;padding:7px 10px;font-size:8px}.v5HorseFilters button[data-hf="rise"]{border-color:#2c6e56!important;color:#8aeab8!important;background:#0a241d!important}.v5HorseFilters button[data-hf="caution"]{border-color:#6f403d!important;color:#efa39c!important;background:#241516!important}.v5HorseFilters button[data-hf="align"]{border-color:#315f82!important;color:#9ed4ff!important;background:#0b2032!important}.v5HorseFilters button.active{box-shadow:inset 0 0 0 1px currentColor!important}
.v5KartCard[data-v5-hidden="1"]{display:none!important}
@media(max-width:360px){.v5KartMetrics{grid-template-columns:repeat(2,minmax(0,1fr))}.v5KartTop{gap:8px}.v5KartNo{width:42px;height:42px;font-size:19px}.v5KartName b{font-size:14px}.v5KartOdds strong{font-size:15px}}
`;
document.head.appendChild(css);

function flow(){try{return JSON.parse(localStorage.getItem(FLOW_KEY)||'null')}catch{return null}}
function results(){return window.V4AppState?.state?.results||null}
function featureMap(card){
  const out={};
  card.querySelectorAll('.v5Feature').forEach(x=>{
    const k=(x.querySelector('small')?.textContent||'').trim();
    const v=(x.querySelector('b')?.textContent||'').trim();
    if(k)out[k]=v;
  });
  return out;
}
function getVal(m,keys,fallback='—'){for(const k of keys){if(m[k])return m[k]}return fallback}
function readClass(base,m3){if(base===null||m3===null)return'unknown';const d=base-m3;if(d>=4)return'rise';if(d<=-4)return'caution';return'align'}
function evalText(c){return c==='rise'?'🟢 構造浮上':c==='caution'?'🔴 要注意':c==='align'?'🔵 概ね一致':'⚪️ 判定不足'}
function deltaText(base,m3){if(base===null||m3===null)return'—';const d=base-m3;return d>0?`↑${d}`:d<0?`↓${Math.abs(d)}`:'→'}

function rewriteCard(card){
  if(card.dataset.kart==='2')return;
  const no=(card.querySelector('.v5No')?.textContent||'').trim();
  if(!no)return;
  const r=results();
  const h=(r?.horses||[]).find(x=>String(x.no)===String(no));
  if(!h)return;
  const old=featureMap(card);
  const oldSummary=(card.querySelector('.v5HorseSummary')?.textContent||'').replace(/\s+/g,' ').trim();
  const F=flow();
  const ff=(F?.f||[]).find(x=>String(x.no)===String(no));
  const base=N(h.pRank),m3=N(ff?.rank??h.m3),c=readClass(base,m3),mv=deltaText(base,m3);
  const one=getVal(old,['1角','予測1角']);
  const six=getVal(old,['残600m','残600']);
  const best=getVal(old,['得意SC','得意シナリオ']);
  const data=getVal(old,['データ','履歴']);
  const odd=N(h.odds);
  const meta=base!==null&&m3!==null?`基礎 ${base}位 → M3 ${m3}位`:'基礎 / M3 判定不足';
  const summary=oldSummary||(c==='rise'?'市場評価より構造側が上。人気順だけでは見えにくい浮上候補。':c==='caution'?'市場基礎に対してM3が下位。人気だけで過信しない。':c==='align'?'市場基礎とM3が概ね一致。大きなモデル間乖離なし。':'必要な指標が揃っていません。');
  const m3Class=c==='rise'?'positive':c==='caution'?'negative':'neutral';
  card.dataset.kart='2';
  card.dataset.readClass=c;
  card.className=`v5HorseCard v5KartCard ${c}`;
  card.innerHTML=`
    <div class="v5KartTop">
      <div class="v5KartNo">${E(no)}</div>
      <div class="v5KartName"><b>${E(h.name||'')}</b><small>${E(meta)}</small></div>
      <div class="v5KartOdds"><strong>${odd===null?'—':odd.toFixed(1)+'倍'}</strong><small>単勝</small></div>
    </div>
    <div class="v5KartEval"><strong>${evalText(c)}</strong><span>${E(meta)}</span></div>
    <div class="v5KartMetrics">
      <div class="v5KartMetric"><small>1角</small><b>${E(one)}</b></div>
      <div class="v5KartMetric"><small>残600m</small><b>${E(six)}</b></div>
      <div class="v5KartMetric ${m3Class}"><small>M3</small><b>${m3===null?'—':`${m3}位 ${mv}`}</b></div>
      <div class="v5KartMetric neutral"><small>得意ペース</small><b>${E(best)}</b></div>
      <div class="v5KartMetric"><small>基礎</small><b>${base===null?'—':base+'位'}</b></div>
      <div class="v5KartMetric"><small>データ</small><b>${E(data)}</b></div>
    </div>
    <div class="v5KartSummary">${E(summary)}</div>`;
}

function applyFilter(){
  document.querySelectorAll('#v5Panel .v5KartCard').forEach(card=>{
    const c=card.dataset.readClass||'unknown';
    card.dataset.v5Hidden=(filterState==='all'||filterState===c)?'0':'1';
  });
  document.querySelectorAll('#v5Panel .v5HorseFilters [data-hf]').forEach(b=>b.classList.toggle('active',b.dataset.hf===filterState));
}
function ensureFilters(wrap){
  let f=wrap.previousElementSibling?.classList?.contains('v5HorseFilters')?wrap.previousElementSibling:document.querySelector('#v5Panel .v5HorseFilters');
  if(!f){f=document.createElement('div');f.className='v5HorseFilters';wrap.parentNode.insertBefore(f,wrap)}
  if(f.dataset.kartVersion!=='2'){
    f.dataset.kartVersion='2';
    f.replaceChildren();
    [['all','全頭'],['rise','🟢 プラス'],['caution','🔴 注意'],['align','🔵 一致']].forEach(([key,label])=>{
      const b=document.createElement('button');
      b.type='button';b.dataset.hf=key;b.textContent=label;f.appendChild(b);
    });
    f.onclick=e=>{const b=e.target.closest('[data-hf]');if(!b)return;filterState=b.dataset.hf;applyFilter()};
  }
  applyFilter();
}
function render(){
  const wrap=document.querySelector('#v5Panel .v5HorseCards');
  if(!wrap)return;
  wrap.querySelectorAll('.v5HorseCard').forEach(rewriteCard);
  ensureFilters(wrap);
  window.V5HorseKartState={ready:true,version:'v5-horse-kart-v2',cards:wrap.querySelectorAll('.v5KartCard').length,layout:'compact-kart',colorMeaning:'model-disagreement-only',filter:filterState};
}
let t=null;
function schedule(){clearTimeout(t);t=setTimeout(render,40)}
function init(){
  const p=document.getElementById('v5Panel');
  if(p)new MutationObserver(schedule).observe(p,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v5-tab="horses"]'))setTimeout(render,90)});
  setInterval(render,800);
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();