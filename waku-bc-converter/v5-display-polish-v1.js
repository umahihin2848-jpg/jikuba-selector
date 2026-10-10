(()=>{
'use strict';
if(window.__V5_DISPLAY_POLISH_V1)return;
window.__V5_DISPLAY_POLISH_V1=true;

const $=id=>document.getElementById(id);
const N=v=>Number.isFinite(+v)?+v:null;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let lastSig='';

function activeOverview(){return!!document.querySelector('#v5Tabs [data-v5-tab="overview"].active')}
function wave(){
  const grade=String($('grade')?.value||'');
  const r=window.V4AppState?.state?.results;
  if(grade==='OP')return window.V5OPMarketState?.wave||r?.wave||null;
  if(grade==='3勝')return window.V5ThreeWinMarketState?.wave||r?.wave||null;
  return r?.wave||null;
}
function gaugeData(){
  const w=wave();
  if(!w)return null;
  const label=String(w.label||w.action||'市場構造');
  if((w.modelType==='op-field-size-oos'||w.modelType==='threewin-field-size-oos')&&N(w.eventRate)!==null){
    const pct=clamp(N(w.eventRate)*100,0,100);
    return{position:pct,label,metric:`同条件OOS実測 ${pct.toFixed(1)}%`,sub:'7番人気以下が3着以内に1頭以上',kind:'oos-empirical'};
  }
  let s=N(w.score);
  if(s===null)return null;
  if(s<=1)s*=100;
  s=clamp(s,0,100);
  return{position:s,label,metric:`STRUCTURE SCORE ${Math.round(s)}`,sub:'市場構造の指数',kind:'structure-score'};
}
function gaugeHtml(g){
  return `<div id="v5StructureScale" class="v5StructureScale" aria-label="市場構造ゲージ">
    <div class="v5StructureScaleHead"><small>MARKET BALANCE</small><strong>${E(g.label)}</strong></div>
    <div class="v5StructureScaleLabels"><span>堅い決着寄り</span><span>荒れ寄り</span></div>
    <div class="v5StructureScaleTrack"><i style="left:${g.position.toFixed(1)}%"></i></div>
    <div class="v5StructureScaleFoot"><b>${E(g.metric)}</b><span>${E(g.sub)}｜個別レースの「荒れる確率」ではありません</span></div>
  </div>`;
}
function patchGauge(){
  const q=$('v5QuickView');
  if(!q||!activeOverview()){$('v5StructureScale')?.remove();return}
  const g=gaugeData();
  if(!g){$('v5StructureScale')?.remove();return}
  const sig=JSON.stringify(g);
  if(sig===lastSig&&$('v5StructureScale'))return;
  lastSig=sig;
  $('v5StructureScale')?.remove();
  const grid=q.querySelector('.v5QuickGrid');
  if(!grid)return;
  grid.insertAdjacentHTML('afterend',gaugeHtml(g));
  window.V5StructureGaugeState={ready:true,version:'v5-display-polish-v1',...g,probability:false,meaning:'descriptive market-structure position only'};
}
function renameVisibleM3(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){
    const t=n.nodeValue||'';
    if(t.includes('M3'))n.nodeValue=t.replace(/M3/g,'終い性能');
  }
}
function patchHistoryLabel(){
  document.querySelectorAll('#v5Panel .v5KartMetric small').forEach(x=>{
    if(x.textContent.trim()==='データ')x.textContent='参照履歴';
  });
}
function patch(){
  patchGauge();
  renameVisibleM3($('v5Panel'));
  patchHistoryLabel();
  window.V5DisplayPolishState={ready:true,version:'v5-display-polish-v1',displayOnly:true,predictiveLogicChanged:false};
}

const css=document.createElement('style');
css.id='v5-display-polish-v1-css';
css.textContent=`
.v5StructureScale{margin-top:9px;border:1px solid #315b4a;background:linear-gradient(90deg,#0a1e19,#102018);border-radius:13px;padding:10px}
.v5StructureScaleHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.v5StructureScaleHead small{font-size:7px;letter-spacing:.16em;color:#709284}.v5StructureScaleHead strong{font-size:11px;color:#d9f2e5}
.v5StructureScaleLabels{display:flex;justify-content:space-between;margin-top:8px;color:#78968a;font-size:7px}
.v5StructureScaleTrack{position:relative;height:8px;margin-top:5px;border-radius:999px;background:linear-gradient(90deg,#315d7a 0%,#4d705e 48%,#78643b 72%,#7d433e 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.v5StructureScaleTrack:after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.14)}
.v5StructureScaleTrack i{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;transform:translate(-50%,-50%);background:#eef8ff;border:3px solid #56a9ff;box-shadow:0 2px 12px rgba(0,0,0,.35)}
.v5StructureScaleFoot{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-top:8px}.v5StructureScaleFoot b{font-size:9px;color:#b9ddca;white-space:nowrap}.v5StructureScaleFoot span{font-size:6.5px;line-height:1.45;color:#6e8d80;text-align:right}
@media(max-width:360px){.v5StructureScaleFoot{display:block}.v5StructureScaleFoot span{display:block;margin-top:4px;text-align:left}}
`;
document.head.appendChild(css);

let t=null;
function schedule(){clearTimeout(t);t=setTimeout(patch,30)}
function init(){
  const p=$('v5Panel');
  if(p)new MutationObserver(schedule).observe(p,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-v5-tab]')||e.target.closest?.('#analyzeBtn'))setTimeout(patch,100)});
  ['grade','fieldSize'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(patch,80)));
  setInterval(patch,700);
  patch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
