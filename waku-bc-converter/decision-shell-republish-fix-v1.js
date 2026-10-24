(()=>{'use strict';
if(window.__DECISION_SHELL_REPUBLISH_FIX_V1)return;window.__DECISION_SHELL_REPUBLISH_FIX_V1=true;
let timer=0,retryTimer=0,healing=false;
const structural=()=>window.StructuralTicketEngineV3State;
const decision=()=>window.DecisionShellV2State;
function freshEnough(s,d){return Boolean(s?.ready&&d?.ready&&Number(d.at||0)>=Number(s.at||0)-5)}
function reemit(d,source){if(!d?.ready)return false;dispatchEvent(new CustomEvent('decision-shell-v2-ready',{detail:{...d,republishedBy:'decision-shell-republish-fix-v1',republishSource:source}}));return true}
function forceRender(source){const root=document.getElementById('decisionShellV2');if(root)delete root.dataset.sig;dispatchEvent(new CustomEvent('rsa-addons-ready',{detail:{ready:true,source:'decision-shell-republish-fix-v1',reason:source,at:Date.now()}}))}
function heal(source='unknown'){
 clearTimeout(timer);const s=structural();if(!s?.ready)return;
 const d=decision();if(freshEnough(s,d)){reemit(d,source);return}
 if(healing)return;healing=true;forceRender(source);
 clearTimeout(retryTimer);retryTimer=setTimeout(()=>{
   const s2=structural(),d2=decision();
   if(freshEnough(s2,d2)){reemit(d2,`${source}:after-render`);healing=false;return}
   forceRender(`${source}:retry`);
   retryTimer=setTimeout(()=>{const d3=decision();if(d3?.ready)reemit(d3,`${source}:final`);healing=false},140)
 },90)
}
function schedule(source,delay=45){clearTimeout(timer);timer=setTimeout(()=>heal(source),delay)}
addEventListener('structural-ticket-engine-v3-ready',()=>schedule('structural-ticket-engine-v3-ready',35));
addEventListener('rsa-analysis-complete',()=>schedule('rsa-analysis-complete',50));
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')schedule('analyze-click',260)},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule('dom-ready',700),{once:true});else schedule('boot',700);
setTimeout(()=>schedule('late-boot',0),1600);
})();
