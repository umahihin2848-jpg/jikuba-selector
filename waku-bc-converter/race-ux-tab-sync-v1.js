(()=>{'use strict';
if(window.__RACE_UX_TAB_SYNC_V1)return;window.__RACE_UX_TAB_SYNC_V1=true;
let queued=false,observer=null,observed=null,semanticGeneration=0;
const valid=v=>['flow','horses','market','detail'].includes(v);
const generation=()=>Number(window.RSAAnalysisTransitionState?.generation)||0;
function seedSemantic(old,gen){if(semanticGeneration===0&&old?.semanticsReady===true&&old?.version==='race-ux-v2-semantics')semanticGeneration=gen||Number(old.generation)||0}
function sync(){const tabs=document.getElementById('raceUXTabs');if(!tabs)return false;const b=tabs.querySelector('[data-rux-tab][aria-selected="true"]'),active=b?.dataset?.ruxTab;if(!valid(active))return false;const old=window.RaceUXState||{},gen=generation()||Number(old.generation)||0;seedSemantic(old,gen);const semanticReady=semanticGeneration>0&&semanticGeneration===gen;window.RaceUXState={...old,active,generation:gen,version:semanticReady?'race-ux-v2-semantics':(old.version||'race-ux-v1'),semanticsReady:semanticReady?true:old.semanticsReady,tabStateSynced:true,tabStateAt:Date.now()};return true}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()});setTimeout(sync,20);setTimeout(sync,100)}
function observe(){const tabs=document.getElementById('raceUXTabs');if(!tabs||tabs===observed)return false;observer?.disconnect();observer=new MutationObserver(m=>{if(m.some(x=>x.type==='attributes'&&x.attributeName==='aria-selected'))schedule()});observer.observe(tabs,{subtree:true,attributes:true,attributeFilter:['aria-selected']});observed=tabs;return true}
document.addEventListener('click',e=>{const b=e.target?.closest?.('#raceUXTabs [data-rux-tab]');if(!b)return;schedule()},{capture:false});
document.getElementById('analyzeBtn')?.addEventListener('click',()=>{semanticGeneration=0},{capture:true});
addEventListener('race-ux-v2-ready',()=>{semanticGeneration=generation()||Number(window.RaceUXState?.generation)||0;observe();sync()});
addEventListener('race-ux-ready',()=>{observe();sync()});
['race-ux-tab-change','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>{observe();schedule()}));
const init=()=>{const old=window.RaceUXState||{},gen=generation()||Number(old.generation)||0;seedSemantic(old,gen);observe();sync();new MutationObserver(()=>{observe()}).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();