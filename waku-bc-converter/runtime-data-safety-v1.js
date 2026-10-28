(()=>{'use strict';
if(window.__RSA_RUNTIME_DATA_SAFETY_V1)return;window.__RSA_RUNTIME_DATA_SAFETY_V1=true;
const V='runtime-data-safety-v1.0',resourceErrors=[];
const missing=v=>v===null||v===undefined||(typeof v==='string'&&v.trim()==='');
function clean(obj,keys){if(!obj||typeof obj!=='object')return;for(const k of keys)if(missing(obj[k]))try{delete obj[k]}catch{obj[k]=undefined}}
function sanitize(){
 const pool=window.OpponentCandidatePoolState;if(pool){clean(pool.axis,['abilityRank','m3Rank','abilityP3','pop','odds','p10']);clean(pool.structureBest,['pop','odds','p10','ar','m3']);for(const r of(pool.rows||[]))clean(r,['pop','odds','p10','ar','m3','marketOrder'])}
 const ax=window.AxisReliabilityShadowV1State;if(ax?.axis)clean(ax.axis,['abilityRank','m3Rank','abilityP3','histN','pop','odds']);
 const mm=window.MarketMispricingState;if(mm)for(const r of(mm.horseEdges||[]))clean(r,['winP','winEdge','marketTop3','top3P','top3Edge','marketP','marketRank']);
 const ds=window.DecisionShellV2State;if(ds?.market)for(const r of(ds.market.rows||[]))clean(r,['pop','od','p','share']);
 window.RSARuntimeDataSafetyState={ready:true,version:V,resourceErrors:[...resourceErrors],at:Date.now()};
}
function recordResourceError(src){const s=String(src||'').trim()||'unknown resource';if(resourceErrors.includes(s))return;resourceErrors.push(s);const h=window.RSAAddonHealth;if(h?.ready&&Array.isArray(h.failures)&&!h.failures.includes(s)){h.failures.push(s);dispatchEvent(new CustomEvent('rsa-addons-ready',{detail:h}))}window.RSARuntimeDataSafetyState={ready:true,version:V,resourceErrors:[...resourceErrors],at:Date.now()}}
addEventListener('error',e=>{const t=e.target;if(t&&t!==window&&['SCRIPT','LINK'].includes(t.tagName)){recordResourceError(t.src||t.href||t.tagName)}},true);
['opponent-candidate-pool-ready','axis-reliability-shadow-ready','market-mispricing-ready','decision-shell-v2-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,()=>{sanitize();setTimeout(sanitize,0)}));
addEventListener('rsa-addons-ready',()=>{sanitize();const h=window.RSAAddonHealth;if(h?.ready&&Array.isArray(h.failures))for(const s of resourceErrors)if(!h.failures.includes(s))h.failures.push(s)});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',sanitize,{once:true});else sanitize();setTimeout(sanitize,1200);
})();