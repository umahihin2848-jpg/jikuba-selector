(()=>{'use strict';
if(!window.RSAMobileLean||window.__MOBILE_OPPONENT_CORE_V1)return;window.__MOBILE_OPPONENT_CORE_V1=true;
const V='mobile-opponent-core-v1.12-top2',$=id=>document.getElementById(id);let raf=0,lastSig='';
const num=v=>{if(v===null||v===undefined||v==='')return NaN;const x=Number(v);return Number.isFinite(x)?x:NaN};
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})}
function mapByNo(st){return st?.byNo||Object.fromEntries((st?.rows||[]).map(r=>[String(r.no),r]))}
function penalty(p){return p>=.65?4:p>=.50?2:p>=.20?1:0}
function abilityScoreRank(a,ar){const s=num(a?.abilityTieStart),e=num(a?.abilityTieEnd);return Number.isFinite(s)&&Number.isFinite(e)&&e>=s?(s+e)/2:ar}
function structure(axisNo,m){
  const F=window.Finish600State?.rows||[],A=mapByNo(window.M3PureAbilityState),P=mapByNo(window.PositionRiskState),Q=mapByNo(window.ValidatedQueueState);
  return F.filter(f=>String(f.no)!==String(axisNo)).map(f=>{
    const no=String(f.no),a=A[no]||{},p=P[no]||{},q=Q[no]||{},mk=m?.byNo?.[no]||{};
    const ar=Number(a.abilityRank)||99,arScore=abilityScoreRank(a,ar),m3=Number(f.finishRank)||99,p10=num(p.p10),front=num(q.frontness5),abilityTieSize=num(a.abilityTieSize);
    return{no,name:String(f.name||a.name||''),ar,arScore,m3,p10,front,abilityTieSize,pursuit:String(q.pursuitGrade||'—'),score:arScore+m3+(Number.isFinite(p10)?penalty(p10):2),pop:mk.pop??null,odds:mk.od??null}
  }).sort((a,b)=>a.score-b.score||a.arScore-b.arScore||a.m3-b.m3||Number(a.no)-Number(b.no))
}
function enrichMarket(mk,st,i){
  const s=st.find(x=>x.no===String(mk.no))||{no:String(mk.no),name:'',ar:99,arScore:99,m3:99,p10:NaN,front:NaN,abilityTieSize:1,pursuit:'—',score:198};
  return{...s,pop:mk.pop,odds:mk.od,marketOrder:i+1,inMarketGate:true,source:'market_gate'}
}
function selectTop2(axis,m,st){
  if(!axis||!m?.complete)return{rows:[],marketGate:[],outsideBest:null,rescueUsed:false};
  const marketGate=(m.rows||[]).filter(r=>String(r.no)!==String(axis.no)).slice(0,4).map((mk,i)=>enrichMarket(mk,st,i));
  const marketNos=new Set(marketGate.map(r=>r.no));
  let selected=[...marketGate].sort((a,b)=>a.score-b.score||a.marketOrder-b.marketOrder||Number(a.no)-Number(b.no)).slice(0,2);
  const outsideBest=st.find(s=>!marketNos.has(s.no))||null;
  let rescueUsed=false;
  if(outsideBest){
    if(selected.length<2){selected.push({...outsideBest,inMarketGate:false,source:'structure_rescue',marketOrder:null});rescueUsed=true}
    else{
      selected.sort((a,b)=>a.score-b.score||a.marketOrder-b.marketOrder||Number(a.no)-Number(b.no));
      const second=selected[1];
      if(outsideBest.score<second.score){selected[1]={...outsideBest,inMarketGate:false,source:'structure_rescue',marketOrder:null};rescueUsed=true}
    }
  }
  selected.sort((a,b)=>a.score-b.score||(a.marketOrder??99)-(b.marketOrder??99)||Number(a.no)-Number(b.no));
  return{
    rows:selected.slice(0,2).map((r,i)=>({...r,role:`相手${i+1}`,selectionRank:i+1,selectionReason:r.source==='structure_rescue'?'市場Top4外の構造1位が2頭目を逆転':'市場Top4内で構造Score上位'})),
    marketGate,outsideBest,rescueUsed
  }
}
function render(){
  const state=window.DecisionShellV2State;if(!state?.ready)return;
  const axis=state.structure?.axis||null,m=state.market||{},st=axis?structure(axis.no,m):[];
  const pick=selectTop2(axis,m,st),rows=pick.rows;
  const sig=JSON.stringify([axis?.no,state.structure?.abilityRankTie,m.complete,m.rows?.map?.(x=>[x.no,x.od]),rows.map(x=>[x.no,x.role,x.pop,x.odds,x.ar,x.arScore,x.m3,x.p10,x.score,x.source])]);
  if(sig===lastSig&&window.OpponentCandidatePoolState?.ready)return;lastSig=sig;
  const noAxisReason=state.structure?.abilityRankTie?state.structure.reason:'軸候補の計算待ち';
  const reason=!axis?noAxisReason:!m.complete?`全頭単勝オッズ ${m.rows?.length||0}/${m.field||0}。市場入力後に相手2頭を確定`:'市場Top4を構造Scoreで比較して2頭へ。市場外の構造1位が2頭目より低Scoreなら差し替え';
  const out={
    ready:true,version:V,mobileLean:true,mode:'production_shortlist_top2',maxCandidates:2,marketBaseCount:4,structuralRescueMax:1,marketReady:Boolean(axis&&m.complete),reason,axis,rows,
    marketGate:pick.marketGate,outsideStructureBest:pick.outsideBest,rescueUsed:pick.rescueUsed,
    structureBest:st[0]||null,abilityRankAmbiguous:Boolean(state.structure?.abilityRankTie),tieNeutralScore:true,
    selectionMethod:'market_top4_then_structure_top2_with_outside_rescue',selectionFormula:'Ability順位 + M3順位 + P10ペナルティ',
    p10Penalty:{lt20:0,from20to49:1,from50to64:2,gte65:4},
    marketRankAddedToScore:false,pairProbabilityUsed:false,conditionEdgeUsed:false,
    automaticPartnerOrder:true,manualFinalSelection:true,autoBet:false,newRuleNeedsForwardValidation:true,at:Date.now()
  };
  window.OpponentCandidatePoolState=out;dispatchEvent(new CustomEvent('opponent-candidate-pool-ready',{detail:out}))
}
['decision-shell-v2-ready','finish600-ready','m3-pure-ability-ready','validated-queue-ready','position-risk-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,()=>setTimeout(schedule,20)));
document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste')setTimeout(schedule,50)},true);
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id)){lastSig='';setTimeout(schedule,90)}},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,700);
window.MobileOpponentCoreV1={ready:true,version:V,render,schedule};
})();
(()=>{'use strict';if(window.__RACE_DISSECTION_CARD_LOADER_V1)return;window.__RACE_DISSECTION_CARD_LOADER_V1=true;const build='20261030profile29',css=document.createElement('link');css.rel='stylesheet';css.href=`race-dissection-visual-v1.css?v=${build}`;document.head.appendChild(css);const add=(src,onload)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;s.onerror=()=>console.warn('race dissection addon load failed',src);document.body.appendChild(s)};add(`race-dissection-card-v1.js?v=${build}`,()=>add(`structural-watch-summary-v1.js?v=${build}`,()=>add(`race-dissection-overview-v2.js?v=${build}`)))})();