(()=>{'use strict';
if(window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1)return;window.__PROSPECTIVE_LEDGER_FORM_STABILITY_V1=true;
const IDS=['plBetType','plSelection','plStake','plOdds','plHitP'];
const state={plBetType:'単勝',plSelection:'',plStake:'',plOdds:'',plHitP:''};
let observed=null,observer=null,applying=false,knownDraftCount=0,queued=false;
function countDraft(){return document.querySelectorAll('#plDraftList .plDraftRow').length}
function capture(el){if(!el||!IDS.includes(el.id)||applying)return;state[el.id]=String(el.value??'')}
function restore(){const root=document.getElementById('prospectiveLedger');if(!root)return;applying=true;try{for(const id of IDS){const el=document.getElementById(id);if(!el)continue;const v=state[id]??'';if(String(el.value??'')!==String(v))el.value=v}}finally{applying=false}knownDraftCount=countDraft();window.ProspectiveLedgerFormGuardState={ready:true,version:'prospective-ledger-form-stability-v1',draftCount:knownDraftCount,at:Date.now()}}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;ensure();restore()})}
function ensure(){const root=document.getElementById('prospectiveLedger');if(root===observed)return;observer?.disconnect();observed=root||null;if(!root)return;knownDraftCount=countDraft();observer=new MutationObserver(()=>schedule());observer.observe(root,{childList:true,subtree:true})}
document.addEventListener('input',e=>capture(e.target),true);
document.addEventListener('change',e=>capture(e.target),true);
document.addEventListener('click',e=>{const t=e.target;if(t?.id==='plAddBet'){const current=countDraft();if(current>knownDraftCount){state.plSelection='';state.plStake='';state.plOdds='';state.plHitP='';knownDraftCount=current;schedule()}}else if(t?.id==='plFreeze'){setTimeout(()=>{if(countDraft()===0){state.plSelection='';state.plStake='';state.plOdds='';state.plHitP='';schedule()}},0)}},true);
['rsa-addons-ready','rsa-analysis-complete','market-independent-center-ready','race-independent-layers-ready'].forEach(ev=>addEventListener(ev,schedule));
new MutationObserver(()=>{if(document.getElementById('prospectiveLedger')!==observed)schedule()}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();