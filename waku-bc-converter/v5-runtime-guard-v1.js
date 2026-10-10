(()=>{'use strict';
if(window.__V5_RUNTIME_GUARD_V1)return;window.__V5_RUNTIME_GUARD_V1=true;
const nativeSetInterval=window.setInterval.bind(window),nativeClearInterval=window.clearInterval.bind(window);
const state={ready:true,version:'v5-runtime-guard-v1',registered:0,throttled:0,skippedWhileHidden:0,callbacks:0,nudges:0,policy:'V5 display polling minimized; V4 model logic untouched'};
function classify(fn,delay){let src='';try{src=Function.prototype.toString.call(fn)}catch{}const d=Number(delay)||0;
  if(d<=220)return{delay:250,kind:'analysis-watch'};
  if(d<1000){
    if(src.includes('lastSig')||src.includes('const r=result()'))return{delay:15000,kind:'v5-state-watchdog'};
    return{delay:15000,kind:'display-watchdog'};
  }
  return{delay:d,kind:'native'};
}
window.setInterval=function(fn,delay,...args){if(typeof fn!=='function')return nativeSetInterval(fn,delay,...args);const p=classify(fn,delay);state.registered++;if(p.delay!==(Number(delay)||0))state.throttled++;const wrapped=()=>{if(document.visibilityState==='hidden'){state.skippedWhileHidden++;return}state.callbacks++;try{fn(...args)}catch(e){setTimeout(()=>{throw e},0)}};return nativeSetInterval(wrapped,p.delay)};
window.clearInterval=function(id){return nativeClearInterval(id)};
let nudgeTimer=0,lastAnalyzed='';
function nudge(ms=40){clearTimeout(nudgeTimer);nudgeTimer=setTimeout(()=>{const b=document.querySelector('#v5Tabs [data-v5-tab].active')||document.querySelector('#v5Tabs [data-v5-tab="overview"]');if(b){state.nudges++;b.dispatchEvent(new MouseEvent('click',{bubbles:true}))}},ms)}
function init(){
  const status=document.getElementById('modelStatus');if(status)new MutationObserver(()=>{if((status.textContent||'').trim()==='解析完了'){const a=window.V4AppState?.state?.results?.analyzedAt||'';if(a&&a!==lastAnalyzed){lastAnalyzed=a;nudge(70)}}}).observe(status,{childList:true,subtree:true,characterData:true});
  document.getElementById('analyzeBtn')?.addEventListener('click',()=>nudge(900));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')nudge(80)});
  window.addEventListener('pageshow',()=>nudge(100));
}
window.V5RuntimeGuardState=state;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
