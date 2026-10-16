(()=>{'use strict';
const V='m3-trait-rescue-watch-v1';
const FREEZE='2026-10-16';
let raf=0,lastSig='';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
function clear(panel,reason,extra={}){
  panel?.querySelector('#m3TraitRescueWatch')?.remove();lastSig='';
  window.M3TraitRescueWatchState={ready:true,version:V,freezeDate:FREEZE,displayOnly:true,scoringImpact:false,outOfScope:true,reason,rules:{minFieldSize:12,m3RankMin:7,trait:'A',abilityV2MaxRank:3},rows:[],...extra,at:Date.now()};
  dispatchEvent(new CustomEvent('m3-trait-rescue-watch-ready',{detail:window.M3TraitRescueWatchState}));
}
function render(){
  const panel=document.querySelector('#m3RaceLab [data-m3panel="horses"]');
  if(!panel)return;
  const trait=window.M3ClosingTraitState,ability=window.M3PureAbilityV2State,finish=window.Finish600State;
  if(!trait?.ready||!ability?.ready||!finish?.ready){panel.querySelector('#m3TraitRescueWatch')?.remove();lastSig='';return}
  const raceDate=document.getElementById('raceDate')?.value||'';
  if(!raceDate||raceDate<=String(trait.cutoff||'2026-10-04')){clear(panel,'trait_cutoff_or_missing_date',{raceDate});return}
  const fieldSize=Number(document.getElementById('fieldSize')?.value)||Number(finish.rows?.length)||0;
  if(fieldSize<12){clear(panel,'field_size_below_12',{raceDate,fieldSize});return}
  const traitByNo=new Map((trait.rows||[]).map(r=>[String(r.no),r]));
  const abilityByNo=ability.byNo||Object.fromEntries((ability.rows||[]).map(r=>[String(r.no),r]));
  const rows=[];
  for(const fr of finish.rows||[]){
    const no=String(fr.no),m3Rank=Number(fr.finishRank),tr=traitByNo.get(no),ab=abilityByNo[no];
    if(!tr||tr.trait!=='A'||!ab)continue;
    const abilityRank=Number(ab.abilityRank),top3=Number(ab.top3);
    if(!Number.isFinite(m3Rank)||m3Rank<7||!Number.isFinite(abilityRank)||abilityRank>3)continue;
    rows.push({no,name:fr.name||tr.name||ab.name,m3Rank,abilityRank,abilityTop3:Number.isFinite(top3)?top3:null,v1Rank:Number(ab.v1Rank),historyStatus:String(ab.historyStatus||''),histN:Number(ab.histN),trait:'A'});
  }
  rows.sort((a,b)=>a.abilityRank-b.abilityRank||a.m3Rank-b.m3Rank||Number(a.no)-Number(b.no));
  const sig=[raceDate,fieldSize,ability.version,...rows.map(r=>`${r.no}:${r.m3Rank}:${r.abilityRank}`)].join('|');
  if(sig===lastSig&&panel.querySelector('#m3TraitRescueWatch'))return;lastSig=sig;
  let root=panel.querySelector('#m3TraitRescueWatch');
  if(!rows.length){root?.remove();
    window.M3TraitRescueWatchState={ready:true,version:V,freezeDate:FREEZE,traitCutoff:trait.cutoff,displayOnly:true,scoringImpact:false,outOfScope:false,rules:{minFieldSize:12,m3RankMin:7,trait:'A',abilityV2MaxRank:3},race:{date:raceDate,fieldSize},abilityVersion:ability.version,rows:[],at:Date.now()};
    dispatchEvent(new CustomEvent('m3-trait-rescue-watch-ready',{detail:window.M3TraitRescueWatchState}));return;
  }
  if(!root){root=document.createElement('section');root.id='m3TraitRescueWatch';const anchor=panel.querySelector('#m3TraitContextResearch')||panel.querySelector('#m3ClosingTrait');anchor?anchor.insertAdjacentElement('afterend',root):(panel.querySelector('.m3HorseList')||panel).before(root)}
  const cards=rows.map(r=>`<div class="m3rwRow"><div><b>${E(r.no)}番 ${E(r.name)}</b><small>M3 ${r.m3Rank}位 → 救済監視</small></div><div class="m3rwTags"><i class="ab">Ability v2 #${r.abilityRank}</i><i class="tr">末脚A</i>${Number.isFinite(r.abilityTop3)?`<i class="p">v2 Top3 ${(r.abilityTop3*100).toFixed(0)}%</i>`:''}</div><small class="m3rwHist">3勝+履歴 ${Number.isFinite(r.histN)?r.histN:'—'}/5${r.historyStatus?`（${E(r.historyStatus)}）`:''}</small></div>`).join('');
  root.innerHTML=`<div class="m3rwHead"><div><small>RESCUE WATCH / PROSPECTIVE v1</small><b>M3外・救済監視</b></div><span>加点なし</span></div><div class="m3rwNote">M3 7位以下でも、末脚特性Aかつ Ability v2候補が上位3頭に入る馬だけを別枠表示します。Ability側で既に使っていた「v2上位3 × M3 7位以下」の境界をそのまま利用し、今回の好走馬に合わせて順位閾値を作り直していません。</div><div class="m3rwList">${cards}</div><div class="m3rwFoot">本命レイヤーとは分離。M3順位・Top3確率・馬券判定は変更しません。今後の新規レースで救済候補としての再現性だけを記録します。</div>`;
  window.M3TraitRescueWatchState={ready:true,version:V,freezeDate:FREEZE,traitCutoff:trait.cutoff,displayOnly:true,scoringImpact:false,outOfScope:false,abilityVersion:ability.version,rules:{minFieldSize:12,m3RankMin:7,trait:'A',abilityV2MaxRank:3},race:{date:raceDate,fieldSize},rows,at:Date.now()};
  dispatchEvent(new CustomEvent('m3-trait-rescue-watch-ready',{detail:window.M3TraitRescueWatchState}));
}
const s=document.createElement('style');s.textContent=`#m3TraitRescueWatch{margin:9px 0;border:1px solid #496d67;background:linear-gradient(180deg,#0d211f,#0d1921);border-radius:13px;padding:9px}.m3rwHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.m3rwHead>div{display:grid}.m3rwHead small{font-size:7px;color:#77a99c;letter-spacing:.08em}.m3rwHead b{font-size:11px;color:#bff2dd}.m3rwHead>span{font-size:7px;color:#9fd9c2;border:1px solid #467464;border-radius:999px;padding:3px 6px}.m3rwNote,.m3rwFoot{font-size:8px;line-height:1.55;color:#91a8ad;margin-top:7px}.m3rwList{display:grid;gap:5px;margin-top:8px}.m3rwRow{display:grid;grid-template-columns:minmax(120px,1fr) minmax(150px,1.4fr);gap:7px;align-items:center;background:#0b2528;border:1px solid #31565a;border-radius:9px;padding:7px}.m3rwRow>div:first-child{display:grid}.m3rwRow b{font-size:9px}.m3rwRow>div>small,.m3rwHist{font-size:7px;color:#819da3}.m3rwTags{display:flex;gap:4px;flex-wrap:wrap}.m3rwTags i{font-style:normal;font-size:7px;font-weight:900;border-radius:999px;padding:3px 6px;border:1px solid #4a666b;background:#14262d;color:#c6d5d9}.m3rwTags .ab{color:#9ed4ff;border-color:#466b8a;background:#10243a}.m3rwTags .tr{color:#8ee9bd;border-color:#39745a;background:#0e3025}.m3rwTags .p{color:#e7d58b;border-color:#6c5d2d;background:#2b2613}.m3rwHist{grid-column:1/-1}@media(max-width:520px){.m3rwRow{grid-template-columns:1fr}}`;document.head.appendChild(s);
['m3-pure-ability-v2-ready','m3-closing-trait-ready','finish600-ready','m3-race-lab-ready','analysis-transition-ready'].forEach(e=>addEventListener(e,schedule));
document.getElementById('raceDate')?.addEventListener('change',schedule);document.getElementById('fieldSize')?.addEventListener('change',schedule);schedule();
})();