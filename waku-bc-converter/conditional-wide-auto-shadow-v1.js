/* SHADOW ONLY: conditional Wide probabilities from Ability market-independent
 * coherent fixed-3 max-entropy Top3 model. Never writes to Production or BUY/PASS. */
(function(root){'use strict';
const VERSION='conditional-wide-auto-shadow-v1.0-20261125';
const N=v=>v==null||String(v).trim()===''?NaN:Number(v);
const valid=v=>Number.isFinite(N(v));
const norm=v=>String(v??'').normalize('NFKC').trim();
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>root.document?.getElementById(id);
const key=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join('-');
const blank=reason=>({ready:false,reason,version:VERSION});
function compute(input){
 const {axisNo,partnerNos,ability,shadow,market}=input||{};
 const axis=String(axisNo||''),opp=(partnerNos||[]).map(String);
 if(!/^\d+$/.test(axis)||opp.length!==3||new Set([axis,...opp]).size!==4)return blank('公式軸または相手3頭が未確定');
 if(!ability?.ready||!Array.isArray(ability.rows)||!shadow?.ready||shadow.marketIndependent!==true)return blank('市場非依存Abilityモデルの計算待ち');
 if(valid(ability.at)&&valid(shadow.at)&&N(shadow.at)<N(ability.at))return blank('最新のAbility計算と同時確率の同期待ち');
 const roster=ability.rows,hs=shadow.horses;
 if(!Array.isArray(hs)||hs.length!==roster.length||hs.length<12||hs.length>18||Number(shadow.field)!==hs.length)return blank('レース全頭の整合性確認待ち');
 const orig=new Map(roster.map(r=>[String(r.no),norm(r.name)])),pred=new Map(hs.map(r=>[String(r.no),r]));
 if(orig.size!==roster.length||pred.size!==roster.length||[...orig].some(([no,name])=>!pred.has(no)||norm(pred.get(no).name)!==name))return blank('予測の対象レースが一致しないため保留');
 const coh=shadow.coherence||{};
 if(coh.converged!==true||!valid(coh.sumWide)||Math.abs(N(coh.sumWide)-3)>1e-4||
    !valid(coh.maxMarginalError)||N(coh.maxMarginalError)>1e-4||
    !valid(coh.maxDegreeError)||N(coh.maxDegreeError)>1e-4)return blank('同時確率の整合性条件を満たしていない');
 const ax=pred.get(axis),pa=N(ax?.pTop3);
 if(!(pa>0&&pa<=1))return blank('軸馬の3着内確率が未計算');
 const pairs=[];
 for(const no of opp){
  const h=pred.get(no),z=shadow.pairMap?.[key(axis,no)],q=N(z?.pWide),pb=N(h?.pTop3);
  if(!h||!valid(q)||!valid(pb)||q<0||q>Math.min(pa,pb)+1e-4||q<Math.max(0,pa+pb-1)-1e-4)return blank('相手馬との同時確率に不足または矛盾あり');
  pairs.push({no,name:orig.get(no),joint:q,conditional:q/pa,partnerTop3:pb,market:null});
 }
 let marketAxisTop3=null,marketAvailable=false;
 if(market?.ready===true&&market.marketDerived===true&&String(market.axisNo)===axis&&Number(market.field)===roster.length&&market.pairMap){
  const edges=Object.values(market.pairMap);
  let marketAxisDegree=0,validEdges=0;
  for(const z of edges){if(!z?.a||!z?.b)continue;const na=String(z.a.no),nb=String(z.b.no),mq=N(z.wide);
   if((na===axis||nb===axis)&&Number.isFinite(mq)&&mq>=0){marketAxisDegree+=mq;validEdges++;}
  }
  const mpa=marketAxisDegree/2;
  if(validEdges===roster.length-1&&mpa>0&&mpa<=1+1e-5){
   const mRows=pairs.map(p=>{const z=market.pairMap[key(axis,p.no)],mq=N(z?.wide);
    const left=z?.a,right=z?.b;
    if(!valid(mq)||mq<0||mq>mpa+1e-4||![left,right].some(h=>String(h.no)===p.no&&norm(h.name)===p.name))return null;
    return{joint:mq,conditional:mq/mpa};
   });
   if(mRows.every(Boolean)){marketAvailable=true;marketAxisTop3=mpa;pairs.forEach((p,i)=>{p.market=mRows[i]});}
  }
 }
 return{ready:true,version:VERSION,source:'ability_maxent_market_independent_shadow',
  abilityModel:String(ability.activeModel||'unknown'),abilityCUncalibrated:ability.activeModel==='C',
  researchOnly:true,productionImpact:false,betEligible:false,field:roster.length,axisNo:axis,axisName:orig.get(axis),
  axisTop3:pa,partners:pairs,marketAvailable,marketAxisTop3,
  marketSource:marketAvailable?'market_calibrated_reference_2026_oos':null,
  coherence:{maxMarginalError:N(coh.maxMarginalError),maxDegreeError:N(coh.maxDegreeError)}};
}
function price(q,od){
 if(!valid(q)||N(q)<0||N(q)>1||!valid(od)||N(od)<1)return{ready:false};
 const p=N(q),o=N(od);
 return{ready:true,odds:o,researchRoi:p*o,breakEvenOdds:p>0?1/p:null,netPer100:100*(p*o-1)};
}
root.RSAConditionalWideAutoCoreV1=Object.freeze({version:VERSION,compute,price});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const state={raceKey:'',quote:{},open:false,signature:''};
const pct=p=>valid(p)?(N(p)*100).toFixed(1)+'%':'—';
const odds=p=>valid(p)?N(p).toFixed(2)+'倍':'—';
function context(){
 const st=root.RSAFocusedThreeTabsState||{},fr=root.Finish600State||{};
 if(!st.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!st.axisNo||
    !Array.isArray(st.partnerNos)||st.partnerNos.length!==3||!fr.ready)return null;
 const a=root.M3PureAbilityState||{},shadow=root.WideProbabilityShadowV1State||{},market=root.MobilePairProbabilityReferenceV1State||{};
 const race=[$('raceDate')?.value,$('venue')?.value,$('grade')?.value,$('surface')?.value,$('distance')?.value,
  $('raceName')?.value,$('fieldSize')?.value,st.axisNo,...st.partnerNos,
  (fr.rows||[]).map(h=>String(h.no)+':'+norm(h.name)).join(';')].join('|');
 return{race,model:compute({axisNo:st.axisNo,partnerNos:st.partnerNos,ability:a,shadow,market})};
}
function priceRefresh(){
 const node=$('conditionalWideAutoLab'),c=context();if(!node||!c||!c.model.ready||state.raceKey!==c.race)return;
 for(const p of c.model.partners){
  const line=node.querySelector('[data-cwas-result="'+p.no+'"]');if(!line)continue;
  const z=price(p.joint,state.quote[p.no]);
  line.textContent=z.ready?'研究上の損益分岐 '+odds(z.breakEvenOdds)+' ／ 仮の期待回収率 '+pct(z.researchRoi)+' ／ 100円当たりの仮収支 '+(z.netPer100>=0?'+':'')+z.netPer100.toFixed(0)+'円':
   'オッズ未入力：同時確率の参考表示のみ';
 }
}
function render(){
 const parent=$('rsafPartners'),c=context();if(!parent||parent.hidden||!c){return;}
 if(state.raceKey!==c.race){state.raceKey=c.race;state.quote={};state.open=false;state.signature='';}
 const m=c.model;let node=$('conditionalWideAutoLab');
 if(node&&node.parentElement!==parent){node.remove();node=null;}
 const signature=JSON.stringify([m.ready,m.reason,m.axisTop3,m.partners?.map(p=>[p.no,p.joint,p.market?.joint]),m.marketAvailable]);
 if(node&&state.signature===signature){priceRefresh();return;}
 if(node){state.open=node.open;node.remove();}
 node=root.document.createElement('details');node.id='conditionalWideAutoLab';node.className='cwas-panel';node.open=state.open;
 const label='<summary>ワイド条件付き好走率｜モデル自動推定（研究）</summary>';
 if(!m.ready){node.innerHTML=label+'<div class="cwas-inner"><p>'+E(m.reason)+'</p></div>';}
 else{
  const warn=m.abilityCUncalibrated?'重賞Ability Cのスコア→確率変換は、この形式では長期の較正未確認。数値は探索用です。':
   'Ability由来の固定3頭モデルは過去のウォークフォワードで確率整合性を検証。ただし今回の軸・相手選択条件別の較正は未確定です。';
  node.innerHTML=label+'<div class="cwas-inner"><p class="cwas-note">市場オッズを使わず算出。軸好走率×相手の条件付き好走率＝ワイド同時的中率。</p>'+
   '<div class="cwas-axis"><b>軸 '+E(m.axisNo)+'番 '+E(m.axisName)+'</b><strong>3着内の参考確率 '+pct(m.axisTop3)+'</strong>'+
   '<small>'+(m.marketAvailable?'市場参考の軸3着内確率 '+pct(m.marketAxisTop3):'市場参考は全頭単勝オッズの照合待ち')+'</small></div>'+
   m.partners.map(p=>'<div class="cwas-partner"><b>'+E(m.axisNo)+'－'+E(p.no)+' '+E(p.name)+'</b>'+
    '<div class="cwas-metrics"><span>軸好走時の相手 <strong>'+pct(p.conditional)+'</strong></span><span>同時的中 <strong>'+pct(p.joint)+'</strong></span></div>'+
    (p.market?'<small>市場参考：軸好走時 '+pct(p.market.conditional)+' ／ 同時的中 '+pct(p.market.joint)+'</small>':'<small>市場参考：未照合</small>')+
    '<label class="cwas-quote">ワイドオッズ下限（手入力）<input type="number" min="1" step=".1" inputmode="decimal" data-cwas-no="'+E(p.no)+'" placeholder="例 7.0" value="'+E(state.quote[p.no]??'')+'"></label>'+
    '<div class="cwas-result" data-cwas-result="'+E(p.no)+'"></div></div>').join('')+
   '<p class="cwas-warning">'+E(warn)+'</p>'+
   '<p class="cwas-foot">すべてSHADOW研究値。市場参考は人気・単勝オッズ由来なので、能力との差を利益の証拠にしません。ワイド下限は利用者入力で購入時点の価格証明ではありません。研究ROIが100%超でもBUY判定・本番相手・点数は変えません。予想を固定すると研究値をJSONに残します。</p></div>';
 }
 const manual=$('vtlLab');if(manual?.parentElement===parent)manual.insertAdjacentElement('beforebegin',node);else parent.appendChild(node);
 node.addEventListener('toggle',()=>{state.open=node.open;});
 node.addEventListener('input',e=>{const no=e.target?.dataset?.cwasNo;if(!no||!m.ready)return;state.quote[String(no)]=e.target.value;priceRefresh();});
 state.signature=signature;priceRefresh();
 root.RSAConditionalWideAutoV1State={...m,raceKey:c.race,at:Date.now()};
}
function getSnapshot(){
 const c=context();if(!c||!c.model.ready)return null;
 const m=c.model,quotes=c.race===state.raceKey?state.quote:{};
 return{version:VERSION,raceKey:c.race,researchOnly:true,productionImpact:false,betEligible:false,
  axisNo:m.axisNo,axisTop3:m.axisTop3,abilityModel:m.abilityModel,abilityCUncalibrated:m.abilityCUncalibrated,
  probabilityProvenance:'ability_market_independent_maxent_shadow',comparisonProvenance:m.marketAvailable?'market_derived_reference_only':null,
  partners:m.partners.map(p=>{const pr=price(p.joint,quotes[p.no]);return{no:p.no,name:p.name,
   conditionalOnAxisTop3:p.conditional,jointTop3:p.joint,marketJointTop3:p.market?.joint??null,
   marketConditionalOnAxisTop3:p.market?.conditional??null,
   userQuotedWideLower:pr.ready?pr.odds:null,researchExpectedReturnRatio:pr.ready?pr.researchRoi:null}}),
  historicalStatus:m.abilityCUncalibrated?'GRADE_C_PROBABILITY_UNCALIBRATED':'ABILITY_BASELINE_WALK_FORWARD_RESEARCH',
  priceTiming:'USER_MANUAL_QUOTE_UNVERIFIED',autoBuy:false};
}
root.RSAConditionalWideAutoV1=Object.freeze({version:VERSION,getSnapshot,refresh:render});
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(render,85);}
['rsa-focused-partner-ready','wide-probability-shadow-ready','mobile-pair-probability-reference-ready',
 'm3-pure-ability-ready','rsa-analysis-complete','production-decision-pipeline-ready'].forEach(e=>root.addEventListener(e,schedule));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
