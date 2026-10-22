(()=>{'use strict';
if(window.__STRUCTURAL_TICKET_EXACT_PAIR_GUARD_V1)return;window.__STRUCTURAL_TICKET_EXACT_PAIR_GUARD_V1=true;
const V='structural-ticket-exact-pair-guard-v1.0';
const $=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function structural(){return (window.LongshotScoutState?.candidates||[]).filter(r=>Number(r.m3Rank)<=3&&Number(r.abilityRank)<=3)}
function apply(){
  const s=window.StructuralTicketAutoV2State;if(!s?.ready)return;
  const c=structural(),n=c.length,root=$('structuralTicketAutoV2');
  if(s.route==='single_ability1')return;
  if(n===2){
    if(s.pairSurvival)s.pairSurvival.rule='exactly 2 structural horses AND Ability #1 included AND field<=15 AND M3 #1 included';
    window.StructuralTicketExactPairGuardState={ready:true,version:V,exactlyTwo:true,count:n,at:Date.now()};return;
  }
  const off={status:'pass',tickets:[],stake:0,stakeTotal:0,stakePer:0,third:[]};
  const next={...s,route:'double_structural_stop',axis:null,partner:null,wide:{...off},quinella:{...off},trio:{...off},pairSurvival:{pass:false,fieldSize:s.pairSurvival?.fieldSize??null,m3Ranks:[],rule:'exactly 2 structural horses AND Ability #1 included AND field<=15 AND M3 #1 included',stopReason:`structural_count_${n}`},guard:{version:V,exactlyTwo:false,count:n},at:Date.now()};
  window.StructuralTicketAutoV2State=next;
  window.StructuralTicketAutoState={...(window.StructuralTicketAutoState||{}),...next};
  if(root)root.innerHTML=`<div class="stav2Head"><div><small>STRUCTURAL TICKET AUTO v2</small><b>3券種 自動買い目</b></div><span>見送り</span></div><div class="stav2Lead">Pair Survivalは構造一致が<b>ちょうど2頭</b>のレースだけを対象にします。現在は${E(n)}頭のため2頭型ルートを作りません。</div><div class="stav2Rule"><div class="gateOff"><em>Pair Survival Gate</em><b>STOP</b><small>構造一致 ${E(n)}頭｜固定条件：2頭構造 + Ability #1 + 15頭以下 + M3 #1</small></div></div>`;
  window.StructuralTicketExactPairGuardState={ready:true,version:V,exactlyTwo:false,count:n,at:Date.now()};
  dispatchEvent(new CustomEvent('structural-ticket-exact-pair-ready',{detail:window.StructuralTicketExactPairGuardState}));
}
addEventListener('structural-ticket-auto-v2-ready',apply);
['longshot-scout-ready','m3-pure-ability-ready','finish600-ready'].forEach(ev=>addEventListener(ev,()=>setTimeout(apply,0)));
setTimeout(()=>{const base=window.StructuralTicketAutoState;if(window.__STRUCTURAL_TICKET_AUTO_V2&&base?.ready)dispatchEvent(new CustomEvent('structural-ticket-auto-ready',{detail:base}));setTimeout(apply,30)},80);
})();