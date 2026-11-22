/* Cross-type ticket research: manual joint probabilities, price comparison; no production selections. */
(function(root){'use strict';
const VERSION='cross-ticket-research-v1.0-20261122';
const TYPES=['単勝','複勝','馬連','ワイド','馬単','3連複','3連単'];
const N=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
const ok=v=>Number.isFinite(N(v));
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const $=id=>root.document?.getElementById(id);
const key=t=>String(t.type)+'|'+t.nos.join('-');
function makeTickets(axis,partners){
 const a=String(axis),p=partners.map(String);
 if(p.length!==3||new Set([a,...p]).size!==4||[a,...p].some(x=>!/^\d+$/.test(x)||Number(x)<1))return[];
 const t=[],add=(type,nums)=>t.push({type,nos:nums,key:key({type,nos:nums})});
 add('単勝',[a]);add('複勝',[a]);
 for(const b of p){add('馬連',[a,b].sort((x,y)=>Number(x)-Number(y)));add('ワイド',[a,b].sort((x,y)=>Number(x)-Number(y)));add('馬単',[a,b]);add('馬単',[b,a]);}
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
  const x=[a,p[i],p[j]];add('3連複',[...x].sort((u,v)=>Number(u)-Number(v)));
  for(const f of x)for(const s of x)if(f!==s&&f===a){const th=x.find(z=>z!==f&&z!==s);add('3連単',[f,s,th]);}
 }
 return t;
}
function evaluate(probPct,odds,stake){
 const p=N(probPct),o=N(odds),s=N(stake);
 if(!ok(p)||p<0||p>100||!ok(o)||o<1||!Number.isInteger(s)||s<100||s%100!==0)return{ready:false,reason:'確率0〜100%、オッズ1倍以上、購入額100円単位が必要'};
 const roi=p*o/100,breakEvenPct=100/o;
 return{ready:true,roi,expectedPayout:s*roi,expectedNet:s*(roi-1),stake:s,breakEvenPct,probPct:p,odds:o};
}
function portfolio(rows){
 const evaluated=rows.map(r=>({...r,ev:evaluate(r.probPct,r.odds,r.stake)})).filter(r=>r.ev.ready);
 const totalStake=evaluated.reduce((s,r)=>s+r.ev.stake,0),expectedPayout=evaluated.reduce((s,r)=>s+r.ev.expectedPayout,0);
 return{n:evaluated.length,totalStake,expectedPayout,expectedNet:expectedPayout-totalStake,roi:totalStake?expectedPayout/totalStake:null};
}
function hit(t,finish){
 const f=(finish||[]).map(String),v=t.nos.map(String),k=t.type;
 if(f.length<3||new Set(f).size<3)return null;
 if(k==='単勝')return f[0]===v[0];
 if(k==='複勝')return f.slice(0,3).includes(v[0]);
 if(k==='馬連')return v.every(x=>f.slice(0,2).includes(x));
 if(k==='ワイド')return v.every(x=>f.slice(0,3).includes(x));
 if(k==='馬単')return v[0]===f[0]&&v[1]===f[1];
 if(k==='3連複')return v.every(x=>f.slice(0,3).includes(x));
 if(k==='3連単')return v.every((x,i)=>x===f[i]);
 return null;
}
root.RSACrossTicketResearchCoreV1=Object.freeze({version:VERSION,types:TYPES,makeTickets,evaluate,portfolio,hit});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const state={race:'',rows:[],open:false,kind:'単勝',choice:''};
const pct=x=>ok(x)?(100*x).toFixed(1)+'%':'—';
const yen=x=>ok(x)?Math.round(x).toLocaleString('ja-JP')+'円':'—';
function ctx(){
 const f=root.RSAFocusedThreeTabsState||{},m=root.Finish600State||{};
 if(!f.analysisReady||root.RSAFocusedThreeTabsV1?.dirty||!f.axisNo||!Array.isArray(f.partnerNos)||f.partnerNos.length!==3||!m.ready)return null;
 const all=(m.rows||[]),nos=new Set(all.map(h=>String(h.no)));
 if(!nos.has(String(f.axisNo))||f.partnerNos.some(no=>!nos.has(String(no))))return null;
 const race=[$('raceDate')?.value,$('venue')?.value,$('grade')?.value,$('surface')?.value,$('distance')?.value,$('raceName')?.value,$('going')?.value,f.axisNo,...f.partnerNos].join('|');
 return {race,tickets:makeTickets(f.axisNo,f.partnerNos),axis:String(f.axisNo),partners:f.partnerNos.map(String)};
}
function label(t){return t.type+' '+t.nos.join(t.type==='馬単'||t.type==='3連単'?' → ':'－')+(t.type==='単勝'||t.type==='複勝'?'番':'');}
function refresh(){
 const host=$('rscTickets'),c=ctx();if(!host||!c)return;
 const applicable=c.tickets.filter(t=>t.type===state.kind),sel=$('rscChoice'),old=state.choice;
 if(sel){sel.innerHTML=applicable.map(t=>'<option value="'+E(t.key)+'">'+E(label(t))+'</option>').join('');sel.value=applicable.some(t=>t.key===old)?old:applicable[0]?.key||'';state.choice=sel.value;}
 const detail=$('rscRows');if(!detail)return;
 detail.innerHTML=state.rows.map((r,i)=>{const t=c.tickets.find(t=>t.key===r.ticketKey);if(!t)return'';
 const v=evaluate(r.probPct,r.odds,r.stake);
 return '<div class="rsc-line"><div><strong>'+E(label(t))+'</strong><button type="button" data-rsc-remove="'+i+'">削除</button></div>'+
 '<div class="rsc-inputs"><label>同時成立確率 %<input type="number" min="0" max="100" step=".1" inputmode="decimal" data-rsc-i="'+i+'" data-rsc-key="probPct" value="'+E(r.probPct)+'" placeholder="仮説"></label>'+
 '<label>オッズ（複勝・ワイドは下限）<input type="number" min="1" step=".1" inputmode="decimal" data-rsc-i="'+i+'" data-rsc-key="odds" value="'+E(r.odds)+'" placeholder="実際の価格"></label>'+
 '<label>仮の購入額（円）<input type="number" min="100" step="100" inputmode="numeric" data-rsc-i="'+i+'" data-rsc-key="stake" value="'+E(r.stake)+'"></label></div>'+
 '<small>'+ (v.ready?'仮定した期待回収率 '+pct(v.roi)+' ／ 採算分岐確率 '+v.breakEvenPct.toFixed(2)+'% ／ 仮の期待収支 '+yen(v.expectedNet):v.reason)+'</small></div>';
 }).join('');
 const result=$('rscTotal'),valid=state.rows.filter(r=>evaluate(r.probPct,r.odds,r.stake).ready),sum=portfolio(state.rows);
 if(result){result.innerHTML='<strong>入力済み '+sum.n+'/'+state.rows.length+'点｜仮の総投資額 '+yen(sum.totalStake)+'</strong><div>仮の合計期待回収率 '+pct(sum.roi)+' ／ 仮の期待収支 '+yen(sum.expectedNet)+'</div>'+
  '<small>買い目ごとの期待払戻の合計には独立性の仮定は不要。ただし券種間の同時的中・的中レース率・損失変動・将来オッズ・適正な配分はこの値から分かりません。未入力は計算から除外。</small>';}
}
function render(){
 const panel=$('rsafFormation'),c=ctx();if(!panel||panel.hidden||!c)return;
 if(state.race!==c.race){state.race=c.race;state.rows=[];state.open=false;state.kind='単勝';state.choice='';}
 let node=$('rscTickets');
 if(node&&node.parentElement===panel&&node.dataset.race===c.race)return;
 node?.remove();node=root.document.createElement('details');node.id='rscTickets';node.dataset.race=c.race;node.className='rsc-lab';node.open=state.open;
 node.innerHTML='<summary>券種横断ラボ｜単勝〜3連単の価格比較</summary><section>'+
  '<p>現在の軸'+E(c.axis)+'番と相手'+E(c.partners.join('・'))+'番から、各券種の買い目を生成する研究用ツール。馬連・ワイド・3連複は順不同、馬単・3連単は着順どおり。</p>'+
  '<p class="rsc-warning">今のアプリには券種別の較正済み的中確率がありません。確率とオッズは手入力の仮説です。入力した値に基づく数値を、推奨買い目や予測精度と誤解しないでください。</p>'+
  '<div class="rsc-add"><label>券種<select id="rscKind">'+TYPES.map(k=>'<option>'+k+'</option>').join('')+'</select></label>'+
  '<label>買い目<select id="rscChoice"></select></label><button type="button" id="rscAdd">比較に追加</button></div>'+
  '<div id="rscRows"></div><div id="rscTotal"></div>'+
  '<p class="rsc-foot">公式馬番とCSV表示番号を照合してください。枠連は枠番照合が必要なので未対応。ワイド・複勝の表示オッズは最終払戻と異なり得ます。データはレース切替やページ更新で消去。購入は行いません。</p>'+
  '</section>';
 panel.appendChild(node);
 node.addEventListener('toggle',()=>{state.open=node.open});
 node.addEventListener('change',e=>{if(e.target.id==='rscKind'){state.kind=e.target.value;state.choice='';refresh();}});
 node.addEventListener('input',e=>{const t=e.target;if(t.dataset.rscI===undefined)return;const i=Number(t.dataset.rscI),key=t.dataset.rscKey;if(!state.rows[i]||!['probPct','odds','stake'].includes(key))return;state.rows[i][key]=t.value;
  // Update computation without replacing focused input.
  const v=evaluate(state.rows[i].probPct,state.rows[i].odds,state.rows[i].stake);
  const small=t.closest('.rsc-line')?.querySelector('small');if(small)small.textContent=v.ready?'仮定した期待回収率 '+pct(v.roi)+' ／ 採算分岐確率 '+v.breakEvenPct.toFixed(2)+'% ／ 仮の期待収支 '+yen(v.expectedNet):v.reason;
  const sum=portfolio(state.rows),total=$('rscTotal');if(total)total.innerHTML='<strong>入力済み '+sum.n+'/'+state.rows.length+'点｜仮の総投資額 '+yen(sum.totalStake)+'</strong><div>仮の合計期待回収率 '+pct(sum.roi)+' ／ 仮の期待収支 '+yen(sum.expectedNet)+'</div><small>平均回収率は入力済みだけで計算。的中相関やドローダウンは未推定。</small>';
 });
 node.addEventListener('click',e=>{
  if(e.target.id==='rscAdd'){const chosen=c.tickets.find(t=>t.key===$('rscChoice')?.value);if(!chosen)return;
   if(state.rows.some(x=>x.ticketKey===chosen.key))return;
   if(state.rows.length>=35)return;state.choice=chosen.key;state.rows.push({ticketKey:chosen.key,probPct:'',odds:'',stake:'100'});refresh();
  }else if(e.target.dataset.rscRemove!==undefined){const idx=Number(e.target.dataset.rscRemove);state.rows.splice(idx,1);refresh();}
 });
 refresh();
}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(render,80)}
['rsa-focused-partner-ready','rsa-analysis-complete','finish600-ready'].forEach(ev=>root.addEventListener(ev,schedule));
if(root.document.readyState==='loading')root.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})(typeof window!=='undefined'?window:globalThis);
