(function(){'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let BINS=null,lastSig='';
const css=document.createElement('style');
css.textContent='.fpGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.fpBox{padding:10px 7px;border-radius:12px;background:#071b29;border:1px solid #1c3b4d;text-align:center}.fpBox span{display:block;font-size:10px;color:#89aabc;margin-bottom:3px}.fpBox b{font-size:25px;line-height:1}.fpCi{margin-top:5px;font-size:9px;color:#7fa0b2;line-height:1.35}.fpTag{display:inline-block;margin-top:5px;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:800;background:#173143;color:#c7dbe6}.fpCompare{margin-top:8px;padding:8px 9px;border-radius:10px;background:#0d2231;font-size:11px;line-height:1.55;color:#bdd1dc}.fpUp{color:#7fe5bd;font-weight:900}.fpDown{color:#ffaaaa;font-weight:900}.fpFlat{color:#e8eef2;font-weight:800}.fpFoot{margin-top:8px;font-size:10px;color:#7896a7;line-height:1.5}@media(max-width:560px){.fpBox b{font-size:22px}}';
document.head.appendChild(css);
const pct=(p,d=0)=>Number.isFinite(p)?`${(p*100).toFixed(d)}%`:'—';
const signedPt=x=>Number.isFinite(x)?`${x>=0?'+':''}${(x*100).toFixed(1)}pt`:'—';
function ensureUI(){
  if($('finalProbabilityList'))return;
  const base=$('calibratedProbabilityList')?.closest('.card'),iv=$('integratedViewList')?.closest('.card'),anchor=base||iv||document.querySelector('.card.explain');
  if(!anchor)return;
  const c=document.createElement('div');c.className='card';
  c.innerHTML='<h2>⑤ 着順構造</h2><div class="muted">2026 OOSで直接較正を確認した10年基礎モデルの勝率・連対率・複勝率を主表示します。馬固有の条件補正は最終確率を上書きしません。</div><div id="finalProbabilityList" class="horseList" style="margin-top:8px"></div><div id="finalProbabilityNote" class="fpFoot"></div>';
  anchor.parentNode.insertBefore(c,anchor);
}
function findBin(target,p){
  const a=BINS?.targets?.[target]||[];if(!a.length||!Number.isFinite(p))return null;
  return a.find((b,i)=>p>=b.lo&&(p<=b.hi||i===a.length-1))||a.slice().sort((x,y)=>Math.abs(p-x.pred_mean)-Math.abs(p-y.pred_mean))[0]||null;
}
function band(target,p){
  const b=findBin(target,p);return b?`2026同予測帯の実績 ${pct(b.ci95[0])}–${pct(b.ci95[1])}（n=${b.n}）`:'2026同予測帯の実績 —';
}
function valueLabel(ev,edge,ready){
  if(!Number.isFinite(ev))return{txt:'市場比較なし',cls:'fpFlat'};
  if(!ready||!Number.isFinite(edge))return{txt:`単勝EV ${ev.toFixed(2)}`,cls:ev>=1.1?'fpUp':ev<.9?'fpDown':'fpFlat'};
  if(ev>=1.10&&edge>=.015)return{txt:'🟢 単勝割安候補',cls:'fpUp'};
  if(ev>=1.05&&edge>=.005)return{txt:'🔵 単勝やや割安',cls:'fpUp'};
  if(ev<.90||edge<=-.02)return{txt:'🔴 単勝割高寄り',cls:'fpDown'};
  return{txt:'⚪ 単勝市場並み',cls:'fpFlat'};
}
function render(){
  ensureUI();const box=$('finalProbabilityList');if(!box)return;
  const S=window.CalibratedProbabilityState;
  if(!S?.ready){box.innerHTML='<div class="notice yellow">10年基礎確率の計算後に表示します。</div>';return}
  const C=window.ShapeCore,odds=C?.parseOdds($('oddsPaste')?.value||'')?.odds||{};
  const pairs=Object.entries(odds).map(([no,o])=>({no:String(no),o:Number(o)})).filter(x=>x.o>0);
  const over=pairs.reduce((z,x)=>z+1/x.o,0),field=Number($('fieldSize')?.value)||(S.results||[]).length,marketReady=field?pairs.length/field>=.90:false,mp={};
  pairs.forEach(x=>mp[x.no]=over>0?(1/x.o)/over:NaN);
  const rows=(S.results||[]).map(x=>{
    const o=Number(odds[x.no]),marketP=marketReady?mp[String(x.no)]:NaN,ev=Number.isFinite(o)?Number(x.win)*o:NaN,edge=Number.isFinite(marketP)?Number(x.win)-marketP:NaN;
    return{...x,win:Number(x.win),top2:Number(x.top2),top3:Number(x.top3),odds:o,marketP,ev,edge};
  }).sort((a,b)=>b.top3-a.top3);
  const sig=JSON.stringify(rows.map(x=>[x.no,x.win,x.top2,x.top3,x.odds,x.marketP]));if(sig===lastSig)return;lastSig=sig;
  box.innerHTML=rows.map((x,i)=>{
    const v=valueLabel(x.ev,x.edge,marketReady);
    const market=Number.isFinite(x.odds)?`単勝 ${x.odds.toFixed(1)}倍 ｜ 単勝市場勝率 ${marketReady&&Number.isFinite(x.marketP)?pct(x.marketP,1):'—'} ｜ モデル差 <span class="${Number.isFinite(x.edge)?(x.edge>.005?'fpUp':x.edge<-.005?'fpDown':'fpFlat'):'fpFlat'}">${signedPt(x.edge)}</span> ｜ EV <b class="${x.ev>=1.05?'fpUp':x.ev<.9?'fpDown':'fpFlat'}">${Number.isFinite(x.ev)?x.ev.toFixed(2):'—'}</b> <span class="${v.cls}">${v.txt}</span>`:'単勝オッズ未入力のため市場比較は表示しません。';
    return `<div class="horse"><div class="horseTop"><div class="horseName">${esc(x.no?`${x.no}番 `:'')}${esc(x.name)} <span class="tiny">(${x.pop}人気)</span></div><span class="badge">複勝順 ${i+1}</span></div><div class="fpGrid"><div class="fpBox"><span>最終 勝率</span><b>${pct(x.win)}</b><div class="fpCi">${esc(band('win',x.win))}</div><div class="fpTag">10年較正済み</div></div><div class="fpBox"><span>最終 連対率</span><b>${pct(x.top2)}</b><div class="fpCi">${esc(band('top2',x.top2))}</div><div class="fpTag">10年較正済み</div></div><div class="fpBox"><span>最終 複勝率</span><b>${pct(x.top3)}</b><div class="fpCi">${esc(band('top3',x.top3))}</div><div class="fpTag">10年較正済み</div></div></div><div class="fpCompare">${market}<br><span class="tiny">単勝市場比較は参考情報です。着順構造・組み合わせ構造の買い判定には使いません。</span></div></div>`;
  }).join('');
  const note=$('finalProbabilityNote');
  if(note)note.textContent='2026同予測帯の実績＝2026完全ホールドアウトで、近い予測確率帯に入った馬の実測率のWilson 95%区間です。個々の馬の信頼区間ではありません。勝率・連対率・複勝率はいずれも10年較正モデルを採用しています。';
  window.dispatchEvent(new CustomEvent('final-probability-ready'));
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(render,120)}
window.addEventListener('calibrated-probability-ready',schedule);
window.addEventListener('rsa-addons-ready',schedule);
$('analyzeBtn')?.addEventListener('click',()=>setTimeout(render,180));
$('applyOddsBtn')?.addEventListener('click',schedule);
fetch('data/oos_calibration_bins_v1.json',{cache:'no-store'}).then(r=>r.json()).then(x=>{BINS=x;schedule()}).catch(schedule);
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',()=>{ensureUI();schedule()},{once:true});else{ensureUI();schedule()}
})();