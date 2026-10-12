(()=>{'use strict';
if(window.__PROSPECTIVE_LEDGER_TICKET_TYPES_V1)return;window.__PROSPECTIVE_LEDGER_TICKET_TYPES_V1=true;
const KEY='rsa_prospective_ledger_v1';
const ORDER=['単勝','複勝','馬連','馬単','ワイド'];
const EXTRA=['複勝','馬単'];
let queued=false;
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):NaN;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
function fmtYen(v){return Number.isFinite(Number(v))?`${Math.round(Number(v)).toLocaleString('ja-JP')}円`:'—'}
function pct(v){return Number.isFinite(Number(v))?`${(Number(v)*100).toFixed(1)}%`:'—'}
function stats(type){const settled=load().filter(r=>r?.prospectiveEligible===true&&r?.outcome&&Array.isArray(r.outcome.top3)&&r.outcome.top3.length===3);const bets=[];for(const r of settled)for(const b of r.bets||[])if(b?.type===type)bets.push({b,ret:num(r.outcome?.betReturns?.[b.id])||0});const stake=bets.reduce((s,x)=>s+(num(x.b.stake)||0),0),ret=bets.reduce((s,x)=>s+x.ret,0),hit=bets.filter(x=>x.ret>0).length;return{n:bets.length,stake,ret,hit,roi:stake?ret/stake:NaN}}
function hint(type){if(type==='馬単')return'1着→2着 例 5→9';if(type==='馬連'||type==='ワイド')return'組合せ 例 5-9';return'馬番 例 9'}
function ensureOptions(){const s=document.getElementById('plBetType');if(!s)return false;const current=s.value||'単勝',have=[...s.options].map(o=>o.textContent);if(ORDER.some(x=>!have.includes(x))||have.join('|')!==ORDER.join('|')){s.replaceChildren(...ORDER.map(x=>new Option(x,x)));s.value=ORDER.includes(current)?current:'単勝'}const sel=document.getElementById('plSelection');if(sel)sel.placeholder=hint(s.value);return true}
function ensureStats(){const d=document.querySelector('#prospectiveLedger .plTypes');if(!d)return false;const rows=[...d.querySelectorAll(':scope > div')],byType=new Map();for(const row of rows){const t=row.querySelector('span')?.textContent?.trim();if(t)byType.set(t,row)}for(const t of EXTRA){let row=byType.get(t);if(!row){row=document.createElement('div');row.dataset.plExtraType=t;row.innerHTML=`<span>${t}</span><b></b>`;byType.set(t,row)}const z=stats(t),text=`${z.n}件｜的中 ${z.hit}｜${fmtYen(z.stake)} → ${fmtYen(z.ret)}｜ROI ${Number.isFinite(z.roi)?pct(z.roi):'—'}`;const b=row.querySelector('b');if(b&&b.textContent!==text)b.textContent=text}
for(const t of ORDER){const row=byType.get(t);if(row&&row!==d.lastElementChild)d.appendChild(row)}return true}
function apply(){queued=false;const ok1=ensureOptions(),ok2=ensureStats();window.ProspectiveLedgerTicketTypesState={ready:ok1||ok2,version:'prospective-ledger-ticket-types-v1',types:ORDER.slice(),at:Date.now()}}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(apply)}
document.addEventListener('change',e=>{if(e.target?.id==='plBetType'){const sel=document.getElementById('plSelection');if(sel)sel.placeholder=hint(e.target.value)}},true);
const start=()=>{schedule();const root=document.getElementById('prospectiveLedger');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});[80,220,700,1400].forEach(ms=>setTimeout(schedule,ms))};
['rsa-addons-ready','m3-pure-ability-v2-ready','finish600-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,schedule));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();