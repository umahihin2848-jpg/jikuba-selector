(()=>{'use strict';
if(window.__WIN_CANDIDATE_LAYER_V1)return;window.__WIN_CANDIDATE_LAYER_V1=true;
const V='win-candidate-layer-v1.0',CUTOFF='2026-10-17',MIN_FIELD=12;
let raf=0,lastSig='';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').trim();
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
function panel(){return document.querySelector('#m3RaceLab [data-m3panel="horses"]')}
function clearDom(){document.getElementById('winCandidateLayerV1')?.remove();lastSig=''}
function publish(reason,extra={}){window.WinCandidateState={ready:true,version:V,status:'prospective_research_display_only',displayOnly:true,scoringImpact:false,probabilityImpact:false,bettingImpact:false,oddsThreshold:false,cutoff:CUTOFF,minFieldSize:MIN_FIELD,reason,candidates:[],...extra,at:Date.now()};dispatchEvent(new CustomEvent('win-candidate-ready',{detail:window.WinCandidateState}))}
function sameHorse(a,b){const x=norm(a),y=norm(b);return !x||!y||x===y}
function shapeFit(shapeBand,q){
  const valid=q&&q.validated===true,frontness5=Number(q?.frontness5);
  if(!valid||!Number.isFinite(frontness5))return{fit:'neutral',frontness5:null};
  if(shapeBand==='front')return{fit:frontness5>=.70?'aligned':'neutral',frontness5};
  if(shapeBand==='rear')return{fit:frontness5>=.70?'adverse':frontness5<=.45?'aligned':'neutral',frontness5};
  return{fit:'neutral',frontness5};
}
function tierFor(m3Rank,abilityRank,fit){
  const greenBase=m3Rank<=3&&abilityRank<=5;
  if(greenBase&&fit!=='adverse')return'green';
  const yellowBase=greenBase||(m3Rank<=3&&abilityRank<=8)||(abilityRank<=3&&m3Rank<=6);
  return yellowBase?'yellow':null;
}
function reasonText(r){
  if(r.tier==='green')return`M3 ${r.m3Rank}位 × Ability ${r.abilityRank}位${r.shapeFit==='aligned'?' × 展開一致':''}`;
  if(r.shapeFit==='adverse')return`M3 ${r.m3Rank}位 × Ability ${r.abilityRank}位 / 今回展開は逆風`;
  if(r.m3Rank<=3&&r.abilityRank>5)return`M3 ${r.m3Rank}位 / Ability ${r.abilityRank}位で評価差あり`;
  if(r.abilityRank<=3&&r.m3Rank>3)return`Ability ${r.abilityRank}位 / M3 ${r.m3Rank}位で評価差あり`;
  return`M3 ${r.m3Rank}位 × Ability ${r.abilityRank}位`;
}
function render(){
  const p=panel();if(!p)return;
  const finish=window.Finish600State,ability=window.M3PureAbilityState,queue=window.ValidatedQueueState,shape=window.RaceShapeBiasState;
  if(!finish?.ready||!ability?.ready||!queue?.ready||!shape?.ready)return;
  const raceDate=document.getElementById('raceDate')?.value||'',fieldSize=Number(document.getElementById('fieldSize')?.value)||Number(finish.rows?.length)||0;
  if(!raceDate||raceDate<=CUTOFF){clearDom();publish('pre_freeze_or_missing_date',{race:{date:raceDate,fieldSize},outOfScope:true});return}
  if(fieldSize<MIN_FIELD){clearDom();publish('field_size_below_12',{race:{date:raceDate,fieldSize},outOfScope:true});return}
  const shapeBand=String(shape.band||'neutral'),shapeLabel=String(shape.label||shape.displayLabel||shapeBand),shapeScore=Number(shape.score);
  const abByNo=ability.byNo||Object.fromEntries((ability.rows||[]).map(r=>[String(r.no),r])),qByNo=queue.byNo||Object.fromEntries((queue.rows||[]).map(r=>[String(r.no),r]));
  const candidates=[];
  for(const fr of finish.rows||[]){
    const no=String(fr.no),m3Rank=Number(fr.finishRank),ab=abByNo[no];
    if(!ab||!Number.isFinite(m3Rank)||!sameHorse(fr.name,ab.name))continue;
    const abilityRank=Number(ab.abilityRank);if(!Number.isFinite(abilityRank))continue;
    const q0=qByNo[no],q=q0&&sameHorse(fr.name,q0.name)?q0:null,sf=shapeFit(shapeBand,q),tier=tierFor(m3Rank,abilityRank,sf.fit);if(!tier)continue;
    candidates.push({no,name:fr.name||ab.name||q?.name||'',tier,m3Rank,abilityRank,shapeFit:sf.fit,frontness5:sf.frontness5,reason:''});
  }
  candidates.forEach(r=>{r.reason=reasonText(r)});
  candidates.sort((a,b)=>(a.tier==='green'?0:1)-(b.tier==='green'?0:1)||a.m3Rank-b.m3Rank||a.abilityRank-b.abilityRank||Number(a.no)-Number(b.no));
  const sig=[raceDate,fieldSize,shapeBand,Number.isFinite(shapeScore)?shapeScore.toFixed(5):'x',...candidates.map(r=>`${r.no}:${r.tier}:${r.m3Rank}:${r.abilityRank}:${r.shapeFit}:${r.frontness5??'x'}`)].join('|');
  if(sig===lastSig&&document.getElementById('winCandidateLayerV1'))return;lastSig=sig;
  let root=document.getElementById('winCandidateLayerV1');if(!root){root=document.createElement('section');root.id='winCandidateLayerV1';const structural=document.getElementById('structuralAlertsV1'),anchor=document.getElementById('m3AbilityCompareV1');structural?structural.insertAdjacentElement('afterend',root):anchor?anchor.insertAdjacentElement('afterend',root):(p.querySelector('.m3HorseList')||p).before(root)}
  const green=candidates.filter(r=>r.tier==='green'),yellow=candidates.filter(r=>r.tier==='yellow');
  const cards=(rows,tier)=>rows.length?rows.map(r=>`<div class="wcCard ${tier}"><div class="wcLabel">${tier==='green'?'🟢 単勝候補':'🟡 単勝検討'}</div><strong>${E(r.no)}番 ${E(r.name)}</strong><small>${E(r.reason)}</small><em>${r.shapeFit==='aligned'?'Race Shape と脚質が同方向':r.shapeFit==='adverse'?'Race Shape と脚質が逆方向':'Race Shape は中立扱い'} / 順位補正なし</em></div>`).join(''):`<div class="wcEmpty">${tier==='green'?'単勝候補':'単勝検討'}：該当なし</div>`;
  root.innerHTML=`<div class="wcHead"><div><small>WIN CANDIDATE / RESEARCH DISPLAY</small><b>単勝候補</b></div><span>M3順位は変更しない</span></div><div class="wcLead">M3・Ability・Race Shape の一致度から「単勝を検討する候補」を表示します。単勝収益性は未検証のため、買い推奨やEV判定ではありません。</div><div class="wcGrid"><div>${cards(green,'green')}</div><div>${cards(yellow,'yellow')}</div></div><div class="wcFoot">🟢：M3 3位以内 × Ability 5位以内を基本条件。🟡：M3/Abilityの評価差、または明確な展開逆風を含む候補。Race ShapeだけでM3下位馬を単勝候補へ昇格させません。</div>`;
  window.WinCandidateState={ready:true,version:V,status:'prospective_research_display_only',displayOnly:true,scoringImpact:false,probabilityImpact:false,bettingImpact:false,oddsThreshold:false,cutoff:CUTOFF,minFieldSize:MIN_FIELD,race:{date:raceDate,fieldSize},raceShape:{band:shapeBand,label:shapeLabel,score:Number.isFinite(shapeScore)?shapeScore:null},rules:{green:{m3MaxRank:3,abilityMaxRank:5,adverseShapeAllowed:false},yellow:{m3MaxRankWithAbility8:3,abilityMaxRankWithM36:3,m3MaxRankWithAbility3:6},shape:{frontAlignedFrontnessMin:.70,rearAdverseFrontnessMin:.70,rearAlignedFrontnessMax:.45}},candidates,greenCandidates:green,yellowCandidates:yellow,at:Date.now()};
  dispatchEvent(new CustomEvent('win-candidate-ready',{detail:window.WinCandidateState}));
}
const css=document.createElement('style');css.textContent=`#winCandidateLayerV1{margin:9px 0;border:1px solid #315a70;background:linear-gradient(180deg,#0b2130,#091923);border-radius:14px;padding:9px}.wcHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.wcHead>div{display:grid}.wcHead small{font-size:7px;color:#7fa7b9;letter-spacing:.1em}.wcHead b{font-size:12px;color:#eaf5f8}.wcHead>span{font-size:7px;color:#a8bdc8;border:1px solid #426275;border-radius:999px;padding:3px 6px}.wcLead,.wcFoot{font-size:7px;line-height:1.55;color:#90aab6}.wcLead{margin-top:6px}.wcGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.wcGrid>div{display:grid;gap:6px;align-content:start}.wcCard{border:1px solid #35596a;border-radius:10px;padding:8px;background:#0c2633}.wcCard.green{border-color:#3d735f;background:#0c2924}.wcCard.yellow{border-color:#776431;background:#2a2416}.wcLabel{font-size:8px;font-weight:900}.wcCard.green .wcLabel{color:#9be5c3}.wcCard.yellow .wcLabel{color:#efd37d}.wcCard strong{display:block;margin:4px 0;color:#f0f8fa;font-size:10px}.wcCard small,.wcCard em{display:block;font-size:7px;line-height:1.5;color:#93adb8;font-style:normal}.wcCard em{margin-top:3px}.wcEmpty{border:1px dashed #355466;border-radius:9px;padding:8px;font-size:8px;color:#718f9c}.wcFoot{margin-top:7px}@media(max-width:560px){.wcGrid{grid-template-columns:1fr}}`;document.head.appendChild(css);
['finish600-ready','m3-pure-ability-ready','validated-queue-ready','race-shape-bias-ready','m3-race-lab-ready','rsa-addons-ready','analysis-transition-ready'].forEach(ev=>addEventListener(ev,schedule));
document.getElementById('raceDate')?.addEventListener('change',schedule);document.getElementById('fieldSize')?.addEventListener('change',schedule);document.getElementById('csvFile')?.addEventListener('change',()=>{clearDom();publish('csv_changed',{pending:true})});document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn'){clearDom();publish('analysis_pending',{pending:true});setTimeout(schedule,120)}},true);schedule();
})();
