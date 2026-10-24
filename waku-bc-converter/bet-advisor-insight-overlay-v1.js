(()=>{'use strict';
if(window.__BET_ADVISOR_INSIGHT_OVERLAY_V1)return;window.__BET_ADVISOR_INSIGHT_OVERLAY_V1=true;
const V='bet-advisor-insight-overlay-v1.0';
let raf=0;
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})}
function pct(x){return Number.isFinite(x)?`${Math.round(x*100)}%`:'—'}
function rankReason(r){
 const s=[];
 if(r.ar<=3)s.push(`Ability #${r.ar}`);
 if(r.m3<=3)s.push(`M3 #${r.m3}`);
 if(Number.isFinite(r.main)&&r.main<=3)s.push(`本線 #${r.main}`);
 if(Number.isFinite(r.p10)&&r.p10<.20)s.push(`P10 ${pct(r.p10)}`);
 if(Number.isFinite(r.front)&&r.front>=.70)s.push(`前方度 ${pct(r.front)}`);
 if(!s.length){
  if(Number.isFinite(r.ar))s.push(`Ability #${r.ar}`);
  if(Number.isFinite(r.m3))s.push(`M3 #${r.m3}`);
  if(Number.isFinite(r.main))s.push(`本線 #${r.main}`);
 }
 return `${r.rank===1?'相手1位':'上位'}理由｜${s.slice(0,3).join(' × ')||'複数指標の総合順位'}`;
}
function marketView(r){
 if(!r.pop)return{level:'neutral',text:'市場未入力｜構造評価のみ'};
 const pop=Number(r.pop),weak=(r.m3>=7)||(Number.isFinite(r.main)&&r.main>=7)||(Number.isFinite(r.p10)&&r.p10>=.50),strong=(r.ar<=3)||(r.m3<=3)||(Number.isFinite(r.main)&&r.main<=3);
 if(pop===1&&weak)return{level:'warn',text:'⚠ 1番人気だが構造注意'};
 if(pop<=3&&weak)return{level:'warn',text:`⚠ ${pop}番人気｜人気先行注意`};
 if(pop>=7&&strong)return{level:'good',text:`👀 ${pop}番人気｜人気薄だが構造で拾える`};
 if(pop<=3&&r.ar<=3&&r.m3<=3)return{level:'good',text:`✓ ${pop}番人気｜市場と構造が一致`};
 if(pop>=7)return{level:'neutral',text:`${pop}番人気｜人気薄・構造根拠は限定的`};
 return{level:'neutral',text:`${pop}番人気｜市場評価は中位`};
}
function riskView(r){
 if(Number.isFinite(r.p10)&&r.p10>=.65)return{level:'warn',text:`位置取りリスク大｜P10 ${pct(r.p10)}`};
 if(Number.isFinite(r.p10)&&r.p10>=.50)return{level:'warn',text:`位置取り注意｜P10 ${pct(r.p10)}`};
 if(Number.isFinite(r.front)&&r.front>=.70&&Number.isFinite(r.p10)&&r.p10<.20)return{level:'good',text:`前で安定｜前方度 ${pct(r.front)}・P10 ${pct(r.p10)}`};
 if(Number.isFinite(r.p10)&&r.p10<.20)return{level:'good',text:`位置取り安定｜P10 ${pct(r.p10)}`};
 return{level:'neutral',text:'位置取り｜大きな強調材料なし'};
}
function ticketType(r){
 // 説明用ヒューリスティック。正式な券種判定は既存検証済みロジックを優先する。
 if(Number.isFinite(r.p10)&&r.p10>=.50)return{level:'warn',text:'券種タイプ｜軸相手として慎重'};
 if(r.ar<=3&&r.m3<=3&&(!Number.isFinite(r.p10)||r.p10<.35))return{level:'good',text:'券種タイプ｜馬連・ワイド両対応'};
 if(Number.isFinite(r.front)&&r.front>=.70&&Number.isFinite(r.p10)&&r.p10<.20&&(r.ar<=5||r.m3<=5))return{level:'good',text:'券種タイプ｜馬連寄り（説明用）'};
 if((r.m3<=3||(Number.isFinite(r.main)&&r.main<=3))&&(!Number.isFinite(r.p10)||r.p10<.50))return{level:'neutral',text:'券種タイプ｜ワイド寄り（説明用）'};
 return{level:'neutral',text:'券種タイプ｜全体判定を優先'};
}
function axisLabel(st){
 const a=st?.axis||{},m=a.metrics||{},ar=num(m.ar),p10=num(m.p10),front=num(m.front);
 if(a.level!=='yellow')return null;
 if(st.abilityRankAudit==='A2_shadow'||ar===2)return'条件付き｜Ability2 Shadow';
 if(String(a.label||'').includes('2頭'))return'条件付き｜2頭構造';
 const reasons=[];
 if(Number.isFinite(p10)&&p10>=.20)reasons.push('位置取り注意');
 if(Number.isFinite(front)&&front<.70)reasons.push('前方度不足');
 if(!reasons.length)reasons.push('条件未達');
 return`条件付き｜${reasons.slice(0,2).join('・')}`;
}
function adviceLabel(reason,label){
 const s=String(reason||'');
 if(String(label||'').includes('Ability2')||s.includes('Ability2'))return'条件付き｜Ability2 Shadow';
 if(s.includes('境界'))return'条件付き｜市場境界';
 if(s.includes('15分前')||s.includes('オッズ'))return'条件付き｜オッズ確認';
 if(s.includes('位置')||s.includes('P10'))return'条件付き｜位置取り';
 if(s.includes('前方'))return'条件付き｜前方度';
 return'条件付き｜条件未達';
}
function chip(x){return`<span class="baiChip ${x.level}">${x.text}</span>`}
function apply(){
 const root=document.getElementById('betAdvisorDashboardV1'),st=window.BetAdvisorDashboardState;if(!root||!st?.ready)return;
 const opp=Array.isArray(st.opponents)?st.opponents:[];
 const sig=JSON.stringify([st.version,st.abilityRankAudit,st.axis?.level,st.axis?.label,st.axis?.metrics?.p10,st.axis?.metrics?.front,opp.map(r=>[r.no,r.rank,r.ar,r.m3,r.main,r.p10,r.front,r.pop,r.odds])]);
 if(root.dataset.baiSig===sig)return;root.dataset.baiSig=sig;
 const al=axisLabel(st),ab=root.querySelector('.baAxis .baBadge');if(al&&ab)ab.textContent=`🟡 ${al}`;
 root.querySelectorAll('.baAdvice').forEach(card=>{const b=card.querySelector('.baBadge');if(!b||!b.classList.contains('yellow'))return;const p=card.querySelector('p')?.textContent||'',old=b.textContent||'';b.textContent=`🟡 ${adviceLabel(p,old)}`});
 const cards=[...root.querySelectorAll('.baHorse')];cards.forEach((card,i)=>{const r=opp[i];if(!r)return;card.querySelector('.baInsight')?.remove();const box=document.createElement('div');box.className='baInsight';box.innerHTML=[{level:'reason',text:rankReason(r)},marketView(r),riskView(r),ticketType(r)].map(chip).join('');card.querySelector('.baHorseMain')?.appendChild(box)});
 const note=root.querySelector('.baRankNote');if(note&&!note.dataset.baiNote){note.dataset.baiNote='1';note.insertAdjacentHTML('beforeend','<br><b>読み方：</b>「市場とのズレ」と「券種タイプ」は判断補助です。馬ごとの券種タイプは説明用で、最終の単勝・馬連・ワイド・三連複判定は過去検証済みの券種ロジックを優先します。')}
 window.BetAdvisorInsightState={ready:true,version:V,axisLabel:al,opponents:opp.map(r=>({no:r.no,rank:r.rank,reason:rankReason(r),market:marketView(r).text,risk:riskView(r).text,ticketType:ticketType(r).text})),at:Date.now()};
}
const css=document.createElement('style');css.textContent=`
.baInsight{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(117,151,175,.14)}
.baiChip{display:inline-flex;align-items:center;min-height:24px;padding:4px 7px;border-radius:8px;border:1px solid #29445f;background:#0a1a28;color:#a9bfce;font-size:9px;line-height:1.35;font-style:normal}
.baiChip.reason{border-color:#365571;color:#d5e6f0}.baiChip.good{border-color:rgba(67,191,139,.45);background:rgba(29,93,69,.20);color:#a9e4c9}.baiChip.warn{border-color:rgba(232,176,72,.48);background:rgba(116,78,19,.20);color:#f1d18b}.baiChip.neutral{color:#9fb5c6}
.baAxis .baBadge{max-width:100%;white-space:normal;text-align:center;line-height:1.25}
@media(max-width:560px){.baInsight{gap:4px}.baiChip{font-size:8.5px;padding:4px 6px;max-width:100%}}
`;document.head.appendChild(css);
['bet-advisor-ready','single-axis-ability2-shadow-ready','structural-ticket-v3-ready','finish600-ready','m3-race-lab-ready','validated-queue-ready','position-risk-ready'].forEach(e=>window.addEventListener(e,schedule));
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
setInterval(schedule,1200);schedule();
})();