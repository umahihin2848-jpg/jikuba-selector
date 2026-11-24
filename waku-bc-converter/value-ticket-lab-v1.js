/* Price-aware research layer. Pure mathematics over user-entered, uncalibrated inputs.
 * Never changes official selection, partner count, price gates, tickets, or staking. */
(function(root){'use strict';
const VERSION='value-ticket-lab-v1.1-conditional-20261124';
const N=v=>v==null||String(v).trim()===''?NaN:Number(v);
const finite=v=>Number.isFinite(N(v));
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>root.document?.getElementById(id);
function evaluate(x){
 const p=N(x?.probPct),od=N(x?.wideLow),lo=N(x?.cautiousPct);
 if(!finite(p)||!finite(od)||p<0||p>100||od<1)return{ready:false,reason:'ワイド同時好走率(0〜100%)とワイドオッズ下限(1倍以上)を入力'};
 if(finite(lo)&&(lo<0||lo>p))return{ready:false,reason:'慎重推定値は0%以上・通常推定値以下'};
 const probability=p/100,lower=finite(lo)?lo/100:null,roi=probability*od;
 return{ready:true,probability,odds:od,roi,netPer100:100*(roi-1),breakEven:probability>0?1/probability:null,
 lowerRoi:lower===null?null:lower*od,lowerNetPer100:lower===null?null:100*(lower*od-1)};
}
/* A and B are both Top3 events. The conditional rate means P(B Top3 | A Top3),
 * NOT the standalone Top3 probability of B and NOT a market-odds model. */
function evaluateConditional(x){
 const axis=N(x?.axisPct),given=N(x?.givenAxisPct),axisLow=N(x?.axisLowerPct),givenLow=N(x?.givenAxisLowerPct),od=N(x?.wideLow);
 if(!finite(axis)||axis<0||axis>100)return{ready:false,reason:'軸の3着内確率（0〜100%）を入力'};
 if(!finite(given)||given<0||given>100)return{ready:false,reason:'軸が3着内だった場合の相手の3着内確率（0〜100%）を入力'};
 if(!finite(od)||od<1)return{ready:false,reason:'ワイドオッズ下限（1倍以上）を入力'};
 if(finite(axisLow)&&(axisLow<0||axisLow>axis))return{ready:false,reason:'軸の慎重下限は通常推定値以下'};
 if(finite(givenLow)&&(givenLow<0||givenLow>given))return{ready:false,reason:'相手の条件付き慎重下限は通常推定値以下'};
 const jointPct=axis*given/100,lowerAvailable=finite(axisLow)&&finite(givenLow);
 const estimate=evaluate({probPct:jointPct,wideLow:od,cautiousPct:lowerAvailable?axisLow*givenLow/100:null});
 return{...estimate,source:'manual_axis_conditional',axisProbability:axis/100,conditionalProbability:given/100,
  jointPct,conditionalBreakEvenPct:axis>0?10000/(axis*od):null,
  cautiousInputsComplete:lowerAvailable};
}
function compare(r,opts={}){
 const arr=(r||[]).map(x=>({...x,result:opts.mode==='conditional'?evaluateConditional({...x,axisPct:opts.axisPct,axisLowerPct:opts.axisLowerPct}):evaluate(x)})).filter(x=>x.result.ready);
 const sorted=arr.sort((a,b)=>b.result.roi-a.result.roi||String(a.no).localeCompare(String(b.no),'ja'));
 const paths=[];
 for(let k=1;k<=sorted.length;k++){
  const chosen=sorted.slice(0,k),totalExpectedPayout=chosen.reduce((sum,x)=>sum+100*x.result.roi,0);
  paths.push({count:k,nos:chosen.map(x=>String(x.no)),costYen:100*k,expectedPayoutYen:totalExpectedPayout,
   expectedNetYen:totalExpectedPayout-100*k,roi:totalExpectedPayout/(100*k),
   lowerRoi:chosen.every(x=>x.result.lowerRoi!==null)?chosen.reduce((sum,x)=>sum+100*x.result.lowerRoi,0)/(100*k):null});
 }
 return{evaluated:sorted.length,scenarios:paths};
}
root.RSAValueTicketLabCoreV1=Object.freeze({version:VERSION,evaluate,evaluateConditional,compare});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const state={key:'',rows:{},open:false,last:'',mode:'conditional',axisPct:'',axisLowerPct:''};
const displayPct=x=>finite(x)?(100*x).toFixed(1)+'%':'—';
const yen=x=>finite(x)?Math.round(x).toLocaleString('ja-JP')+'円':'—';
function context(){
 const st=root.RSAFocusedThreeTabsState||{},f=root.Finish600State||{};
 if(!st.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!st.axisNo||!Array.isArray(st.partnerNos)||st.partnerNos.length!==3||!f.ready)return null;
 const by=Object.fromEntries((f.rows||[]).map(h=>[String(h.no),h]));
 if(!by[String(st.axisNo)]||new Set(st.partnerNos.map(String)).size!==3||st.partnerNos.some(n=>!by[String(n)]))return null;
 const key=[$('raceDate')?.value,$('venue')?.value,$('distance')?.value,$('raceName')?.value,st.axisNo,...st.partnerNos].join('|');
 return{key,axis:by[String(st.axisNo)],partners:st.partnerNos.map(no=>by[String(no)])};
}
function rowHtml(h){
 const no=String(h.no),r=state.rows[no]||{};
 const field=(key,lab,placeholder,max,min)=>'<label><span>'+lab+'</span><input inputmode="decimal" type="number" step="0.1" min="'+min+'"'+(max!==null?' max="'+max+'"':'')+' data-vtl-no="'+E(no)+'" data-vtl-key="'+key+'" placeholder="'+placeholder+'" value="'+E(r[key]??'')+'"></label>';
 const inner=state.mode==='conditional'?
  field('givenAxisPct','軸3着内のとき相手も3着内 %','例 30',100,0)+
  field('givenAxisLowerPct','条件付き確率の慎重下限 %（任意）','例 22',100,0):
  field('probPct','ワイド同時的中率 %（自分の推定）','例 18',100,0)+
  field('cautiousPct','同時確率の慎重下限 %（任意）','例 12',100,0);
 return '<div class="vtl-row"><b>'+E(no)+'番 '+E(h.name)+'</b><div class="vtl-fields">'+
  inner+field('wideLow','ワイドオッズ下限（手入力）','例 7.0',null,1)+
  '</div><div class="vtl-computed" data-vtl-out="'+E(no)+'">確率・オッズ入力待ち</div></div>';
}
function params(){return{mode:state.mode,axisPct:state.axisPct,axisLowerPct:state.axisLowerPct}}
function calc(e){return state.mode==='conditional'?evaluateConditional({...e,axisPct:state.axisPct,axisLowerPct:state.axisLowerPct}):evaluate(e)}
function update(){
 const c=context(),el=$('vtlLab');if(!c||!el)return;
 const entries=c.partners.map(h=>({no:String(h.no),...state.rows[String(h.no)]}));let active=0;
 for(const e of entries){const z=calc(e),out=el.querySelector('[data-vtl-out="'+e.no+'"]');if(!out)continue;
  if(!z.ready){out.textContent=z.reason;continue;}
  active++;
  const joint=state.mode==='conditional'?'同時的中率 <b>'+displayPct(z.probability)+'</b> ／ ':'';
  const conditionalBreak=state.mode==='conditional'&&Number.isFinite(z.conditionalBreakEvenPct)?' ／ 必要な相手条件付き率 <b>'+z.conditionalBreakEvenPct.toFixed(1)+'%</b>':'';
  out.innerHTML=joint+'損益分岐 <b>'+(z.breakEven!==null?z.breakEven.toFixed(2)+'倍':'算出不可')+'</b> ／ 仮の期待回収率 <b>'+displayPct(z.roi)+'</b>'+
   (z.lowerRoi!==null?' ／ 慎重試算 <b>'+displayPct(z.lowerRoi)+'</b>':' ／ 慎重試算：未入力')+conditionalBreak;
 }
 const p=$('vtlPlans');if(!p)return;
 if(!active){p.innerHTML='<p>2頭同時確率は自動推定していません。手入力した仮説とワイドオッズ下限がそろった場合だけ計算します。</p>';return;}
 const cmp=compare(entries,params());
 p.innerHTML='<b>1点・2点・3点の等額購入比較（入力済み'+cmp.evaluated+'点）</b>'+
 cmp.scenarios.map(s=>'<div class="vtl-plan"><span>'+s.count+'点：'+s.nos.map(n=>E(n)+'番').join('・')+'</span>'+
 '<strong>仮の期待回収率 '+displayPct(s.roi)+'</strong><small>各100円・仮投資'+yen(s.costYen)+'／仮の期待収支 '+yen(s.expectedNet)+
 (s.lowerRoi!==null?'／慎重試算 '+displayPct(s.lowerRoi):'')+'</small></div>').join('')+
 '<small>期待値の合計は各買い目の期待払戻の合計。的中率の独立性は仮定していません。実際のオッズ変動と、確率の推定誤差があるためBUY根拠ではありません。</small>';
}
function render(){
 const parent=$('rsafPartners'),c=context();if(!parent||parent.hidden||!c)return;
 if(state.key!==c.key){state.key=c.key;state.rows={};state.open=false;state.axisPct='';state.axisLowerPct='';state.mode='conditional';}
 let panel=$('vtlLab');if(panel&&panel.parentElement!==parent)panel=null;
 if(panel&&panel.getAttribute('data-key')===c.key)return update();
 panel?.remove();panel=root.document.createElement('details');panel.id='vtlLab';panel.className='vtl-lab';panel.setAttribute('data-key',c.key);panel.open=state.open;
 const axisBox=state.mode==='conditional'?'<div class="vtl-axis"><b>軸 '+E(c.axis.no)+'番 '+E(c.axis.name)+'｜3着内確率</b><div class="vtl-fields">'+
  '<label><span>軸の3着内確率 %（自分の推定）</span><input type="number" inputmode="decimal" min="0" max="100" step="0.1" data-vtl-axis-key="axisPct" placeholder="例 60" value="'+E(state.axisPct)+'"></label>'+
  '<label><span>軸の慎重下限 %（任意）</span><input type="number" inputmode="decimal" min="0" max="100" step="0.1" data-vtl-axis-key="axisLowerPct" placeholder="例 50" value="'+E(state.axisLowerPct)+'"></label></div></div>':'';
 panel.innerHTML='<summary>組合せ期待値の研究｜軸の好走率 × 相手の条件付き率</summary><section><p class="vtl-intro">軸 '+E(c.axis.no)+'番 '+E(c.axis.name)+'を固定。軸の信頼度と、軸が好走したときの相手の好走率を分けて考えます。ワイド1〜3点を比較できます。</p>'+
 '<div class="vtl-mode"><button type="button" data-vtl-mode="conditional" aria-pressed="'+(state.mode==='conditional')+'">軸 × 条件付き確率</button><button type="button" data-vtl-mode="direct" aria-pressed="'+(state.mode==='direct')+'">同時確率を直接入力</button></div>'+
 '<p class="vtl-warning">確率は利用者の<b>未較正の仮説</b>。軸の複勝確率と相手の単独複勝確率を掛けてはいけません。アプリの市場由来参考ペア確率をそのままオッズに掛けてBUY判定もしません。</p>'+
 axisBox+c.partners.map(rowHtml).join('')+
 '<div id="vtlPlans" class="vtl-plans"></div><p class="vtl-foot">すべて研究専用の試算。ワイドオッズ下限は手入力であり発走前の価格証明ではありません。慎重試算は2つの慎重下限がそろった場合のみ算出します。公式軸、相手3頭、購入条件、BUY/PASSは一切変更しません。予想固定時には入力済み仮説をJSONへ記録します。</p>'+
 '</section>';
 parent.appendChild(panel);
 panel.addEventListener('toggle',()=>{state.open=panel.open;});
 panel.addEventListener('click',e=>{const mode=e.target?.dataset?.vtlMode;if(!['conditional','direct'].includes(mode)||mode===state.mode)return;state.mode=mode;panel.remove();render();});
 panel.addEventListener('input',e=>{const t=e.target;if(t?.dataset?.vtlAxisKey){const key=t.dataset.vtlAxisKey;if(['axisPct','axisLowerPct'].includes(key)){state[key]=t.value;update();}return;}
  if(!t?.dataset?.vtlNo)return;const no=t.dataset.vtlNo,key=t.dataset.vtlKey;
  if(!['probPct','cautiousPct','givenAxisPct','givenAxisLowerPct','wideLow'].includes(key))return;
  if(!state.rows[no])state.rows[no]={};state.rows[no][key]=t.value;update();
 });
 update();
}
function getSnapshot(){
 const c=context();if(!c||state.key!==c.key)return null;
 const rows=c.partners.map(h=>{const no=String(h.no),r=state.rows[no]||{},z=calc(r);
  if(!z.ready)return null;
  return{no,name:String(h.name||''),wideOddsLower:Number(r.wideLow),probabilitySource:'user_manual_hypothesis',
   givenAxisPct:state.mode==='conditional'?Number(r.givenAxisPct):null,
   givenAxisLowerPct:state.mode==='conditional'&&finite(r.givenAxisLowerPct)?Number(r.givenAxisLowerPct):null,
   directJointPct:state.mode==='direct'?Number(r.probPct):null,
   jointProbabilityPct:100*z.probability,estimatedRoiPct:100*z.roi,
   cautiousJointProbabilityPct:z.lowerRoi===null?null:100*z.lowerRoi/z.odds};
 }).filter(Boolean);
 if(!rows.length)return null;
 return{version:VERSION,raceKey:c.key,axisNo:String(c.axis.no),mode:state.mode,
  axisTop3Pct:state.mode==='conditional'?Number(state.axisPct):null,
  axisTop3LowerPct:state.mode==='conditional'&&finite(state.axisLowerPct)?Number(state.axisLowerPct):null,
  partners:rows,probabilityProvenance:'user_manual_uncalibrated',
  oddsProvenance:'user_manual_lower_quote_unverified',betEligible:false,productionImpact:false};
}
root.RSAValueTicketLabV1=Object.freeze({version:VERSION,getSnapshot});
let t=0;function schedule(){clearTimeout(t);t=setTimeout(render,60)}
['rsa-focused-partner-ready','rsa-analysis-complete','finish600-ready'].forEach(ev=>root.addEventListener(ev,schedule));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
