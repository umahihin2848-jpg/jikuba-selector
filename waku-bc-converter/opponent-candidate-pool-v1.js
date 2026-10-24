(()=>{'use strict';
if(window.__OPPONENT_CANDIDATE_POOL_V1)return;window.__OPPONENT_CANDIDATE_POOL_V1=true;
const V='opponent-candidate-pool-v1.0',$=id=>document.getElementById(id),E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FALLBACK={version:'opponent_candidate_pool_v1',decision:'ADOPT_MAX5_MANUAL_SHORTLIST_SHADOW',development_2025:{candidate5:{quinella_partner_capture:{hits:15,n:22,rate:.6818},wide_partner_capture:{hits:30,n:31,rate:.9677}}},confirmation_2026:{candidate5:{quinella_partner_capture:{hits:12,n:16,rate:.75},wide_partner_capture:{hits:15,n:19,rate:.7895}}},pooled_descriptive:{candidate5:{quinella_partner_capture:{hits:27,n:38,rate:.7105},wide_partner_capture:{hits:45,n:50,rate:.90}}}};
let AUDIT=FALLBACK,raf=0;
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN},pct=(x,d=0)=>Number.isFinite(Number(x))?`${(Number(x)*100).toFixed(d)}%`:'—';
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})}
function mapByNo(st){return st?.byNo||Object.fromEntries((st?.rows||[]).map(r=>[String(r.no),r]))}
function sectionByEyebrow(text){return[...document.querySelectorAll('#decisionShellV2 .dsSection')].find(s=>s.querySelector('.dsTitle small')?.textContent.trim()===text)||null}
function p10Penalty(x){return x>=.65?4:x>=.50?2:x>=.20?1:0}
function buildStructure(axisNo,m){
 const F=window.Finish600State?.rows||[],A=mapByNo(window.M3PureAbilityState),P=mapByNo(window.PositionRiskState),Q=mapByNo(window.ValidatedQueueState);
 return F.filter(f=>String(f.no)!==String(axisNo)).map(f=>{
   const no=String(f.no),a=A[no]||{},p=P[no]||{},q=Q[no]||{},mk=m?.byNo?.[no]||{};
   const ar=Number(a.abilityRank)||99,m3=Number(f.finishRank)||99,p10=num(p.p10),front=num(q.frontness5),pen=Number.isFinite(p10)?p10Penalty(p10):2;
   return{no,name:String(f.name||a.name||''),ar,m3,p10,front,pursuit:String(q.pursuitGrade||'—'),score:ar+m3+pen,pop:mk.pop??null,odds:mk.od??null}
 }).sort((a,b)=>a.score-b.score||a.ar-b.ar||a.m3-b.m3||Number(a.no)-Number(b.no))
}
function warning(r){
 if(Number.isFinite(r.p10)&&r.p10>=.65)return'⚠ 位置取り強警戒';
 if(r.ar>5&&r.m3>5)return'⚠ 人気先行注意';
 if(Number.isFinite(r.p10)&&r.p10>=.50)return'⚠ 位置取り注意';
 return''
}
function buildPool(state){
 const axis=state?.structure?.axis||null,m=state?.market||{},ready=Boolean(axis&&m.complete);
 if(!axis)return{ready:false,reason:'軸候補の計算待ち',axis:null,rows:[],structureBest:null};
 const structure=buildStructure(axis.no,m),best=structure[0]||null;
 if(!ready)return{ready:false,reason:`全頭単勝オッズ ${m.rows?.length||0}/${m.field||0}。市場入力後に候補プールを確定`,axis,rows:[],structureBest:best};
 const market=(m.rows||[]).filter(r=>String(r.no)!==String(axis.no)).slice(0,4).map((mk,i)=>{
   const s=structure.find(x=>x.no===String(mk.no))||{no:String(mk.no),name:'',ar:99,m3:99,p10:NaN,front:NaN,pursuit:'—',score:198};
   return{...s,pop:mk.pop,odds:mk.od,role:i<2?'市場本線':'市場候補',source:'market',marketOrder:i+1}
 });
 const rows=[...market];
 if(best&&!rows.some(r=>r.no===best.no))rows.push({...best,role:'👀 構造拾い',source:'structure',marketOrder:null});
 return{ready:true,reason:'市場上位4頭を土台に、構造総合1位を市場外なら最大1頭追加',axis,rows:rows.slice(0,5),structureBest:best}
}
function rowHtml(r,i){
 const warn=warning(r),p=Number.isFinite(r.p10)?pct(r.p10):'—',od=Number.isFinite(Number(r.odds))?`${Number(r.odds).toFixed(1)}倍`:'—',pop=Number.isFinite(Number(r.pop))?`${r.pop}人気`:'市場外';
 return `<div class="ocpRow ${r.source==='structure'?'rescue':''}">
   <div class="ocpNo"><b>${E(r.no)}</b><small>${i+1}</small></div>
   <div class="ocpMain"><div><b>${E(r.name||`${r.no}番`)}</b><span class="ocpRole">${E(r.role)}</span></div><div class="ocpChips"><span>${E(pop)}｜${E(od)}</span><span>Ability #${r.ar<99?r.ar:'—'}</span><span>M3 #${r.m3<99?r.m3:'—'}</span><span>P10 ${p}</span>${warn?`<span class="warn">${E(warn)}</span>`:''}</div></div>
 </div>`
}
function patchTicket(name,text){
 const card=[...document.querySelectorAll('#decisionShellV2 .dsTicket')].find(x=>x.querySelector('header>b')?.textContent.trim()===name);if(!card)return;
 const p=card.querySelector(':scope>p');if(p)p.textContent=text;
 if(!card.classList.contains('red')&&!card.classList.contains('wait')){card.classList.remove('green');card.classList.add('yellow');const b=card.querySelector('.dsBadge');if(b){b.className='dsBadge yellow';b.textContent='🟡 手動選択'}}
}
function renderPanel(state,pool,sec){
 let box=sec.querySelector('#opponentCandidatePoolV1');if(!box){box=document.createElement('div');box.id='opponentCandidatePoolV1';const old=sec.querySelector('.dsOppList');old?old.insertAdjacentElement('beforebegin',box):sec.appendChild(box)}
 const d=AUDIT?.development_2025?.candidate5||{},c=AUDIT?.confirmation_2026?.candidate5||{};
 if(!pool.ready){
   const b=pool.structureBest;
   box.innerHTML=`<div class="ocpHead"><div><small>MANUAL SHORTLIST / MAX 5</small><b>⚪ 相手候補は市場待ち</b></div><span>最終選択は手動</span></div><p class="ocpLead">${E(pool.reason)}</p>${b?`<div class="ocpPreview">構造参考1位：<b>${E(b.no)}番 ${E(b.name)}</b>｜Ability #${b.ar<99?b.ar:'—'}・M3 #${b.m3<99?b.m3:'—'}・P10 ${Number.isFinite(b.p10)?pct(b.p10):'—'}</div>`:''}<p class="ocpFoot">全頭単勝入力後に「市場上位4頭＋構造拾い最大1頭」を表示します。Abilityだけで相手を固定しません。</p>`;
   return;
 }
 box.innerHTML=`<div class="ocpHead"><div><small>MANUAL SHORTLIST / MAX 5</small><b>相手候補プール ${pool.rows.length}頭</b></div><span>買い相手は自分で選ぶ</span></div>
 <p class="ocpLead">市場上位4頭を基本候補として残し、Ability＋M3＋P10の構造総合1位が市場外なら最大1頭だけ追加します。人気馬は自動で消しません。</p>
 <div class="ocpRows">${pool.rows.map(rowHtml).join('')}</div>
 <div class="ocpAudit"><b>候補5頭の過去捕捉</b><span>2025 馬連 ${pct(d.quinella_partner_capture?.rate,1)} / ワイド ${pct(d.wide_partner_capture?.rate,1)}</span><span>2026確認 馬連 ${pct(c.quinella_partner_capture?.rate,1)} / ワイド ${pct(c.wide_partner_capture?.rate,1)}</span></div>
 <p class="ocpFoot">捕捉率は「軸が好走したとき、実際の相手が候補内にいた割合」。買い目全買いのROIではありません。過去市場は最終人気代理のため、実戦T−15はForward記録します。</p>`
}
function apply(state=window.DecisionShellV2State){
 const root=$('decisionShellV2');if(!root||!state)return;
 document.documentElement.classList.add('opponentCandidatePoolMode');
 const pool=buildPool(state),sec=sectionByEyebrow('PARTNER RANKING')||[...root.querySelectorAll('.dsSection')].find(s=>s.querySelector('#opponentCandidatePoolV1'))||null;
 if(sec){
   const title=sec.querySelector('.dsTitle b'),pill=sec.querySelector('.dsTitle>span'),note=sec.querySelector('.dsNote');
   if(title)title.textContent='相手候補プール';
   if(pill)pill.textContent='最大5頭｜最終選択は手動';
   if(note)note.textContent='候補を漏れにくく提示するための一覧です。順位＝買い順ではありません。市場・Ability・M3・P10を見て最終的な取捨選択は自分で行います。';
   renderPanel(state,pool,sec);
 }
 const audit=root.querySelector('.dsAudit');if(audit){audit.classList.add('ocpAuditBox');audit.innerHTML='<div><small>PARTNER POLICY / CORRECTED</small><b>相手は自動決定しない</b></div><span>MAX 5</span><p>旧Ability CORE/BACKUPは無効。市場上位4頭＋構造拾い最大1頭を「可能性のある候補」として提示し、最終取捨選択は手動にします。</p>'}
 patchTicket('馬連','最大5頭の相手候補プールから手動で選択。表示馬の全買いを意味しません。');
 patchTicket('ワイド','最大5頭の相手候補プールから手動で選択。市場と構造のズレを見て取捨選択します。');
 patchTicket('三連複','同じ候補プールから相手2頭以上を手動選択。ハイブリッド5頭の三連複「残り2頭同時捕捉率」は未再構成のため数値表示しません。');
 const mobile=$('decisionMobileV2');if(mobile){const meta=mobile.querySelector('.dsmMeta');if(meta){let x=meta.querySelector('.ocpMobile');if(!x){x=document.createElement('span');x.className='ocpMobile';meta.appendChild(x)}x.textContent=pool.ready?`相手候補 ${pool.rows.length}頭`:'相手：市場待ち'}}
 const rescue=$('scenarioRescueShadowV1');if(rescue)rescue.style.display='none';
 window.ScenarioRescueShadowState={ready:true,version:'disabled-by-opponent-candidate-pool-v1',active:false,productionImpact:false,invalidated:true,reason:'manual shortlist supersedes automatic scenario rescue',at:Date.now()};
 window.OpponentCandidatePoolState={ready:true,version:V,mode:'manual_shortlist',maxCandidates:5,marketBaseCount:4,structuralRescueMax:1,marketReady:Boolean(state?.market?.complete),axis:pool.axis,rows:pool.rows,structureBest:pool.structureBest,automaticPartnerOrder:false,manualFinalSelection:true,autoBet:false,validation:{development2025:AUDIT.development_2025?.candidate5||null,confirmation2026:AUDIT.confirmation_2026?.candidate5||null,pooled:AUDIT.pooled_descriptive?.candidate5||null,caveat:'historical market order uses final popularity proxy; live uses entered T-15 market'},at:Date.now()};
 window.dispatchEvent(new CustomEvent('opponent-candidate-pool-ready',{detail:window.OpponentCandidatePoolState}))
}
const css=document.createElement('style');css.textContent=`html.opponentCandidatePoolMode #decisionShellV2 .dsOppList,html.opponentCandidatePoolMode #decisionShellV2 .orMarketCompare,html.opponentCandidatePoolMode #decisionShellV2 .dsPair,html.opponentCandidatePoolMode #decisionShellV2 .dsPairGuide,html.opponentCandidatePoolMode #scenarioRescueShadowV1{display:none!important}.ocpAuditBox{border-color:#315b70!important;background:#0d2230!important}.ocpAuditBox b{color:#d9eef7!important}#opponentCandidatePoolV1{margin:9px 0}.ocpHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.ocpHead small{display:block;font-size:7px;letter-spacing:.12em;color:#6f91a3}.ocpHead b{font-size:11px;color:#edf7fb}.ocpHead>span{font-size:7px;padding:4px 7px;border:1px solid #355366;border-radius:999px;color:#a8c0cb;white-space:nowrap}.ocpLead,.ocpFoot{font-size:7.5px;line-height:1.55;color:#91aab6;margin:7px 0}.ocpRows{display:grid;gap:6px}.ocpRow{display:grid;grid-template-columns:34px 1fr;gap:8px;align-items:center;border:1px solid #2b4758;background:#0b1c28;border-radius:11px;padding:8px}.ocpRow.rescue{border-color:#7d6740;background:#241e12}.ocpNo{display:grid;place-items:center;position:relative;width:32px;height:32px;border-radius:9px;background:#122c3b}.ocpNo b{font-size:13px;color:#f3f8fa}.ocpNo small{position:absolute;right:-4px;top:-5px;font-size:6px;width:13px;height:13px;display:grid;place-items:center;border-radius:50%;background:#28495b;color:#cce0e8}.ocpMain>div:first-child{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ocpMain b{font-size:10px;color:#e9f3f7}.ocpRole{font-size:7px;padding:3px 6px;border-radius:999px;background:#173348;color:#b9d5df}.ocpRow.rescue .ocpRole{background:#4a3b1b;color:#f0d58a}.ocpChips{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.ocpChips span{font-size:6.8px;border:1px solid #2e4655;border-radius:6px;padding:3px 5px;color:#8faab6}.ocpChips .warn{border-color:#725c35;color:#e9cf88}.ocpAudit{display:grid;grid-template-columns:auto 1fr 1fr;gap:6px;margin-top:7px;padding:7px;border-radius:9px;background:#0d2431;border:1px solid #29495a;font-size:7px;color:#9eb5bf}.ocpAudit b{color:#d6e9f0}.ocpPreview{margin-top:7px;border:1px solid #334e5d;border-radius:9px;padding:7px;font-size:8px;color:#9eb6c1}.ocpPreview b{color:#e4f0f4}.ocpMobile{color:#c8dfe7!important}@media(max-width:560px){.ocpAudit{grid-template-columns:1fr}.ocpRow{padding:7px}.ocpLead,.ocpFoot{font-size:7px}}`;document.head.appendChild(css);
['decision-shell-v2-ready','rsa-analysis-complete','structural-ticket-engine-v3-ready','finish600-ready','m3-pure-ability-ready','position-risk-ready'].forEach(ev=>addEventListener(ev,e=>{if(ev==='decision-shell-v2-ready')setTimeout(()=>apply(e.detail||window.DecisionShellV2State),0);else setTimeout(schedule,80)}));
document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste')setTimeout(schedule,80)},true);document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn'].includes(e.target?.id))setTimeout(schedule,120)},true);
fetch('data/opponent_candidate_pool_v1.json?v=20261024cp1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(String(r.status)))).then(x=>{AUDIT=x;schedule()}).catch(()=>schedule());
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();