(()=>{'use strict';
const V='m3-closing-trait-context-v1';
const C=window.ShapeCore;
if(!C||typeof C.analyze!=='function')return;
const originalAnalyze=C.analyze.bind(C);
let latest=null,raf=0,lastSig='';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topLabel=i=>['<45','45〜49','50〜54','≥55'][Number(i)]||'—';
function posFor(row){
  const hs=latest?.analysis?.hs||[];
  const no=String(row?.no??'');
  const name=String(row?.name??'');
  const h=hs.find(x=>String(x?.no??'')===no)||hs.find(x=>String(x?.name??'')===name);
  return h?C.position(h):'—';
}
C.analyze=function(meta,odds,horses,M){
  const out=originalAnalyze(meta,odds,horses,M);
  latest={meta:{...meta},analysis:out,at:Date.now()};
  window.M3TraitContextSource={version:V,meta:latest.meta,analysis:out,at:latest.at};
  dispatchEvent(new CustomEvent('m3-trait-context-source-ready',{detail:window.M3TraitContextSource}));
  schedule();
  return out;
};
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
function render(){
  const trait=window.M3ClosingTraitState,finish=window.Finish600State;
  const panel=document.querySelector('#m3RaceLab [data-m3panel="horses"]');
  if(!trait?.ready||!finish?.ready||!latest?.analysis||!panel)return;
  const raceDate=document.getElementById('raceDate')?.value||'';
  if(!raceDate||raceDate<=String(trait.cutoff||'2026-10-04'))return;
  if(String(latest.meta?.date||'')!==raceDate)return;
  const distance=Number(latest.meta?.distance)||Number(document.getElementById('distance')?.value)||0;
  const paceTop=Number(latest.analysis?.pred?.top);
  const pace45=paceTop===1;
  const dist1821=distance>=1800&&distance<=2100;
  const finishByNo=new Map((finish.rows||[]).map(r=>[String(r.no),r]));
  const selected=[];
  for(const tr of trait.rows||[]){
    if(tr.trait!=='A')continue;
    const fr=finishByNo.get(String(tr.no));
    const rank=Number(fr?.finishRank);
    if(!Number.isFinite(rank)||rank<1||rank>6)continue;
    const position=posFor(tr),chips=[];
    if(pace45)chips.push({k:'pace',t:'RPCI 45〜49予測',d:'主候補'});
    if(dist1821)chips.push({k:'dist',t:'1800〜2100m',d:'距離候補'});
    if(position==='好位〜中団')chips.push({k:'pos',t:'好位〜中団想定',d:'補助'});
    selected.push({no:String(tr.no),name:tr.name,rank,position,chips});
  }
  const sig=[raceDate,distance,paceTop,...selected.map(x=>`${x.no}:${x.rank}:${x.position}:${x.chips.map(c=>c.k).join(',')}`)].join('|');
  if(sig===lastSig)return;lastSig=sig;
  let root=panel.querySelector('#m3TraitContextResearch');
  if(!root){root=document.createElement('section');root.id='m3TraitContextResearch';const anchor=panel.querySelector('#m3ClosingTrait');anchor?anchor.insertAdjacentElement('afterend',root):(panel.querySelector('.m3HorseList')||panel).before(root)}
  const raceChips=[`事前RPCI本線 ${topLabel(paceTop)}`,distance?`${distance}m`:'距離—'];
  const rows=selected.length?selected.map(r=>{
    const ch=r.chips.length?r.chips.map(c=>`<i class="${c.k}">${E(c.t)}<small>${E(c.d)}</small></i>`).join(''):'<span class="m3tcNone">固定研究条件の該当なし</span>';
    return `<div class="m3tcRow"><div><b>M3 ${r.rank}位｜${E(r.no)}番 ${E(r.name)}</b><small>末脚特性A｜想定 ${E(r.position)}</small></div><div class="m3tcChips">${ch}</div></div>`;
  }).join(''):'<div class="m3tcEmpty">M3 1〜6位に末脚特性Aの馬はいません。</div>';
  root.innerHTML=`<div class="m3tcHead"><div><small>PROSPECTIVE RESEARCH / FROZEN v1</small><b>末脚A × 今回条件</b></div><span>加点なし</span></div><div class="m3tcRace">${raceChips.map(x=>`<em>${E(x)}</em>`).join('')}</div><div class="m3tcNote">2025〜26の回顧検証で固定した3条件だけを表示します。RPCI45〜49、1800〜2100m、好位〜中団想定。複数該当しても合成点・M3順位・確率は変更しません。芝/ダート補正、2200m以上の減点、50〜54の加点は実装していません。</div><div class="m3tcStats"><span>RPCI45〜49：A差 +13.1pt</span><span>1800〜2100m：+11.4pt</span><span>好位〜中団：+11.1pt</span><em>いずれも回顧値</em></div><div class="m3tcList2">${rows}</div><div class="m3tcFoot">対象は検証と同じM3 1〜6位のみ。今後のレースで再現性を確認するための研究表示です。</div>`;
  window.M3TraitContextState={ready:true,version:V,freezeDate:'2026-10-16',traitCutoff:trait.cutoff,displayOnly:true,scoringImpact:false,rules:{paceTop:'45-49',distance:[1800,2100],position:'好位〜中団',m3Rank:[1,6]},race:{date:raceDate,distance,paceTop,paceLabel:topLabel(paceTop)},rows:selected,at:Date.now()};
  dispatchEvent(new CustomEvent('m3-trait-context-ready',{detail:window.M3TraitContextState}));
}
const s=document.createElement('style');s.textContent=`#m3TraitContextResearch{margin:9px 0;border:1px solid #5a5130;background:linear-gradient(180deg,#17180f,#101820);border-radius:13px;padding:9px}.m3tcHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.m3tcHead>div{display:grid}.m3tcHead small{font-size:7px;color:#a79b67}.m3tcHead b{font-size:11px;color:#f0e7b3}.m3tcHead>span{font-size:7px;color:#e4cf7a;border:1px solid #6e6030;border-radius:999px;padding:3px 6px}.m3tcRace,.m3tcStats,.m3tcChips{display:flex;gap:4px;flex-wrap:wrap}.m3tcRace{margin-top:7px}.m3tcRace em{font-style:normal;font-size:7px;color:#bdd4df;background:#0b2633;border:1px solid #315164;border-radius:999px;padding:3px 6px}.m3tcNote,.m3tcFoot{font-size:8px;line-height:1.55;color:#99aab2;margin-top:7px}.m3tcStats{margin-top:7px}.m3tcStats span,.m3tcStats em{font-size:7px;font-style:normal;color:#d8c984;background:#282410;border:1px solid #63572c;border-radius:999px;padding:3px 6px}.m3tcStats em{color:#9aa9b0;background:#131d23;border-color:#344652}.m3tcList2{display:grid;gap:5px;margin-top:8px}.m3tcRow{display:grid;grid-template-columns:minmax(130px,1fr) minmax(150px,1.4fr);gap:7px;align-items:center;background:#0c222c;border:1px solid #2c4653;border-radius:9px;padding:6px}.m3tcRow>div:first-child{display:grid}.m3tcRow b{font-size:9px}.m3tcRow>div>small{font-size:7px;color:#8fa7b2;margin-top:2px}.m3tcChips i{font-style:normal;font-size:7px;font-weight:900;border-radius:999px;padding:3px 6px;border:1px solid #49606b;color:#c8d7dd;background:#142630}.m3tcChips i small{font-size:6px;margin-left:3px;color:#92a8b2}.m3tcChips .pace{color:#8ff0c0;border-color:#34745a;background:#0e3025}.m3tcChips .dist{color:#ecd889;border-color:#6a5c31;background:#2b2715}.m3tcChips .pos{color:#c9d8ff;border-color:#455b86;background:#151f39}.m3tcNone,.m3tcEmpty{font-size:7px;color:#7f929d}.m3tcEmpty{padding:6px 0}@media(max-width:520px){.m3tcRow{grid-template-columns:1fr}}`;document.head.appendChild(s);
['m3-closing-trait-ready','finish600-ready','analysis-transition-ready','rsa-addons-ready'].forEach(e=>addEventListener(e,schedule));
document.getElementById('raceDate')?.addEventListener('change',schedule);document.getElementById('distance')?.addEventListener('change',schedule);schedule();
})();