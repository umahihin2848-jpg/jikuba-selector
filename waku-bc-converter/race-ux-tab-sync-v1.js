(()=>{'use strict';
if(window.__RACE_UX_TAB_SYNC_V1)return;window.__RACE_UX_TAB_SYNC_V1=true;
let queued=false,observer=null,observed=null;
const valid=v=>['flow','horses','market','detail'].includes(v);
function sync(){const tabs=document.getElementById('raceUXTabs');if(!tabs)return false;const b=tabs.querySelector('[data-rux-tab][aria-selected="true"]'),active=b?.dataset?.ruxTab;if(!valid(active))return false;const old=window.RaceUXState||{},t=window.RSAAnalysisTransitionState,gen=Number(t?.generation)||Number(old.generation)||0;window.RaceUXState={...old,active,generation:gen,version:old.semanticsReady?'race-ux-v2-semantics':(old.version||'race-ux-v1'),tabStateSynced:true,tabStateAt:Date.now()};return true}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()});setTimeout(sync,20);setTimeout(sync,100)}
function observe(){const tabs=document.getElementById('raceUXTabs');if(!tabs||tabs===observed)return false;observer?.disconnect();observer=new MutationObserver(m=>{if(m.some(x=>x.type==='attributes'&&x.attributeName==='aria-selected'))schedule()});observer.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});observed=tabs;return true}
document.addEventListener('click',e=>{const b=e.target?.closest?.('#raceUXTabs [data-rux-tab]');if(!b)return;schedule()},{capture:false});
['race-ux-ready','race-ux-v2-ready','race-ux-tab-change','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>{observe();schedule()}));
const init=()=>{observe();schedule();new MutationObserver(()=>{observe()}).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();