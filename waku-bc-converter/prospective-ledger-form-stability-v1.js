(()=>{'use strict';
if(window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1)return;window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1=true;
const IDS=['plBetType','plSelection','plStake','plOdds','plHitP'];
const state={plBetType:'単勝',plSelection:'',plStake:'',plOdds:'',plHitP:''};
const settlementState=new Map();
let observed=null,observer=null,applying=false,knownDraftCount=0,queued=false,armedClick=false;
function countDraft(){return document.querySelectorAll('#plDraftList .plDraftRow').length}
function settlementBucket(id){const key=String(id||'');if(!key)return null;if(!settlementState.has(key))settlementState.set(key,{places:{},returns:{},note:''});return settlementState.get(key)}
function captureSettlement(el){const article=el?.closest?.('[data-pl-id]');if(!article)return false;const bucket=settlementBucket(article.dataset.plId);if(!bucket)return false;const v=String(el.value??'');if(el.matches?.('[data-pl-place]')){bucket.places[String(el.dataset.plPlace)]=v;return true}if(el.matches?.('[data-pl-return]')){bucket.returns[String(el.dataset.plReturn)]=v;return true}if(el.matches?.('[data-pl-note]')){bucket.note=v;return true}return false}
function capture(el){if(!el||applying)return;if(IDS.includes(el.id)){state[el.id]=String(el.value??'');return}captureSettlement(el)}
function restoreSettlement(){for(const [id,bucket] of settlementState){const article=[...document.querySelectorAll('[data-pl-id]')].find(x=>String(x.dataset.plId||'')===id);if(!article)continue;for(const [place,v] of Object.entries(bucket.places||{})){const el=article.querySelector(`[data-pl-place="${CSS.escape(place)}"]`);if(el&&String(el.value??'')!==String(v))el.value=v}for(const [betId,v] of Object.entries(bucket.returns||{})){const el=article.querySelector(`[data-pl-return="${CSS.escape(betId)}"]`);if(el&&String(el.value??'')!==String(v))el.value=v}const note=article.querySelector('[data-pl-note]');if(note&&String(note.value??'')!==String(bucket.note??''))note.value=String(bucket.note??'')}}
function restore(){const root=document.getElementById('prospectiveLedger');if(!root)return;applying=true;try{for(const id of IDS){const el=document.getElementById(id);if(!el)continue;const v=state[id]??'';if(String(el.value??'')!==String(v))el.value=v}const sel=document.getElementById('plSelection'),type=document.getElementById('plBetType')?.value||'単勝';if(sel){sel.placeholder=type==='馬単'?'1着→2着 例 5→9':type==='馬連'||type==='ワイド'?'組合せ 例 5-9':'馬番 例 9'}restoreSettlement()}finally{applying=false}knownDraftCount=countDraft();window.ProspectiveLedgerFormGuardState={ready:true,version:'prospective-ledger-form-stability-v5-settlement-preserve',draftCount:knownDraftCount,settlementDrafts:settlementState.size,at:Date.now()}}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;ensure();restore()})}
function ensure(){const root=document.getElementById('prospectiveLedger');if(root===observed)return;observer?.disconnect();observed=root||null;if(!root)return;knownDraftCount=countDraft();observer=new MutationObserver(()=>schedule());observer.observe(root,{childList:true,subtree:true})}
function isProtectedAction(t){return !!t?.closest?.('#plAddBet,#plFreeze,[data-pl-settle]')}
function windowPreclick(e){if(!isProtectedAction(e.target))return;restore();armedClick=false;window.removeEventListener('click',windowPreclick,true)}
function armPreclick(){if(armedClick)return;armedClick=true;window.addEventListener('click',windowPreclick,true);setTimeout(()=>{if(!armedClick)return;armedClick=false;window.removeEventListener('click',windowPreclick,true)},1200)}
function preactivate(e){if(!isProtectedAction(e.target))return;ensure();restore();armPreclick()}
document.addEventListener('input',e=>capture(e.target),true);
document.addEventListener('change',e=>capture(e.target),true);
document.addEventListener('pointerdown',preactivate,true);
document.addEventListener('touchstart',preactivate,{capture:true,passive:true});
document.addEventListener('click',e=>{const t=e.target;if(isProtectedAction(t))restore();if(t?.id==='plAddBet'){const before=knownDraftCount;setTimeout(()=>{const current=countDraft();if(current>before){state.plSelection='';state.plStake='';state.plOdds='';state.plHitP='';knownDraftCount=current;schedule()}},0)}else if(t?.id==='plFreeze'){setTimeout(()=>{if(countDraft()===0){state.plSelection='';state.plStake='';state.plOdds='';state.plHitP='';schedule()}},0)}else if(t?.matches?.('[data-pl-settle]')){const id=String(t.closest?.('[data-pl-id]')?.dataset.plId||'');setTimeout(()=>{const article=[...document.querySelectorAll('[data-pl-id]')].find(x=>String(x.dataset.plId||'')===id);if(id&&article&&!article.querySelector('[data-pl-settle]'))settlementState.delete(id)},0)}},true);
['rsa-addons-ready','rsa-analysis-complete','market-independent-center-ready','race-independent-layers-ready'].forEach(ev=>addEventListener(ev,schedule));
new MutationObserver(()=>{if(document.getElementById('prospectiveLedger')!==observed)schedule()}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();