/* Price-aware research layer. Pure mathematics over user-entered, uncalibrated inputs.
 * Never changes official selection, partner count, price gates, tickets, or staking. */
(function(root){'use strict';
const VERSION='value-ticket-lab-v1.0-20261122';
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
function compare(r){
 const arr=(r||[]).map(x=>({...x,result:evaluate(x)})).filter(x=>x.result.ready);
 const sorted=arr.sort((a,b)=>b.result.roi-a.result.roi||String(a.no).localeCompare(String(b.no),'ja'));
 const paths=[];
 for(let k=1;k<=sorted.length;k++){
  const chosen=sorted.slice(0,k),totalExpectedPayout=chosen.reduce((s,x)=>s+100*x.result.roi,0);
  paths.push({count:k,nos:chosen.map(x=>String(x.no)),costYen:100*k,expectedPayoutYen:totalExpectedPayout,
   expectedNetYen:totalExpectedPayout-100*k,roi:totalExpectedPayout/(100*k),
   lowerRoi:chosen.every(x=>x.result.lowerRoi!==null)?chosen.reduce((s,x)=>s+100*x.result.lowerRoi,0)/(100*k):null});
 }
 return{evaluated:sorted.length,scenarios:paths};
}
root.RSAValueTicketLabCoreV1=Object.freeze({version:VERSION,evaluate,compare});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const state={key:'',rows:{},open:false,last:''};
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
 return '<div class="vtl-row"><b>'+E(no)+'番 '+E(h.name)+'</b><div class="vtl-fields">'+
 field('probPct','ワイド同時好走率 %（自分の推定）','例 15',100,0)+
 field('cautiousPct','慎重に見た下限 %（任意）','例 10',100,0)+
 field('wideLow','ワイドオッズ下限','例 7.5',null,1)+
 '</div><div class="vtl-computed" data-vtl-out="'+E(no)+'">確率・オッズ入力待ち</div></div>';
}
function update(){
 const c=context(),el=$('vtlLab');if(!c||!el)return;
 const entries=c.partners.map(h=>({no:String(h.no),...state.rows[String(h.no)]}));let active=0;
 for(const e of entries){const z=evaluate(e),out=el.querySelector('[data-vtl-out="'+e.no+'"]');if(!out)continue;
  if(!z.ready){out.textContent=z.reason;continue;}
  active++;
  out.innerHTML='損益分岐 <b>'+(z.breakEven!==null?z.breakEven.toFixed(2)+'倍':'算出不可')+'</b> ／ 仮の期待回収率 <b>'+displayPct(z.roi)+'</b>'+
   (z.lowerRoi!==null?' ／ 慎重試算 <b>'+displayPct(z.lowerRoi)+'</b>':' ／ 慎重試算：未入力');
 }
 const p=$('vtlPlans');if(!p)return;
 if(!active){p.innerHTML='<p>同時好走確率はアプリではまだ較正されていません。空欄のままでも問題ありません。確率とワイドの最低オッズを入力した組み合わせだけ計算します。</p>';return;}
 const cmp=compare(entries);
 p.innerHTML='<b>1点・2点・3点の等額購入比較（入力済み'+cmp.evaluated+'点）</b>'+
 cmp.scenarios.map(s=>'<div class="vtl-plan"><span>'+s.count+'点：'+s.nos.map(n=>E(n)+'番').join('・')+'</span>'+
 '<strong>期待回収率 '+displayPct(s.roi)+'</strong><small>各100円・投資'+yen(s.costYen)+'／推定収支 '+yen(s.expectedNetYen)+
 (s.lowerRoi!==null?'／慎重試算 '+displayPct(s.lowerRoi):'')+'</small></div>').join('')+
 '<small>点数を増やした場合の期待払戻は各買い目の期待払戻の合計。少なくとも1点が当たる確率、実際の損益変動、資金の最適配分はこの計算からは分かりません。</small>';
}
function render(){
 const parent=$('rsafPartners'),c=context();if(!parent||parent.hidden||!c)return;
 if(state.key!==c.key){state.key=c.key;state.rows={};state.open=false;}
 let panel=$('vtlLab');if(panel&&panel.parentElement!==parent)panel=null;
 if(panel&&panel.getAttribute('data-key')===c.key)return update();
 panel?.remove();
 panel=root.document.createElement('details');panel.id='vtlLab';panel.className='vtl-lab';panel.setAttribute('data-key',c.key);panel.open=state.open;
 panel.innerHTML='<summary>価格・買い方の研究｜ワイド1〜3点を比較</summary><section><p class="vtl-intro">軸 '+E(c.axis.no)+'番 '+E(c.axis.name)+'を固定。各相手とのワイド同時好走率とオッズ下限を<b>手入力</b>して、価格が見合うか比較します。</p>'+
 '<p class="vtl-warning">現在の確率推定は未較正です。入力値は利用者の仮説であり、アプリが推定した的中確率ではありません。単勝オッズはワイドオッズの代わりに使用しません。</p>'+
 c.partners.map(rowHtml).join('')+
 '<div id="vtlPlans" class="vtl-plans"></div><p class="vtl-foot">全て参考試算。最終オッズの変動、購入金額による払戻変化、的中相関を保証・調整していません。購入条件・公式軸・相手3頭は変えません。レース変更時に手入力値を破棄します。</p>'+
 '</section>';
 parent.appendChild(panel);
 panel.addEventListener('toggle',()=>{state.open=panel.open;});
 panel.addEventListener('input',e=>{const t=e.target;if(!t?.dataset?.vtlNo)return;
  const no=t.dataset.vtlNo,key=t.dataset.vtlKey;if(!['probPct','cautiousPct','wideLow'].includes(key))return;
  if(!state.rows[no])state.rows[no]={};state.rows[no][key]=t.value;update();
 });
 update();
}
let t=0;function schedule(){clearTimeout(t);t=setTimeout(render,60)}
['rsa-focused-partner-ready','rsa-analysis-complete','finish600-ready'].forEach(ev=>root.addEventListener(ev,schedule));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
