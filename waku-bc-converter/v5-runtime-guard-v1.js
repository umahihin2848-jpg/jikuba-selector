(()=>{'use strict';
if(window.__V5_RUNTIME_GUARD_V1)return;window.__V5_RUNTIME_GUARD_V1=true;
const nativeSetInterval=window.setInterval.bind(window),nativeClearInterval=window.clearInterval.bind(window);
const state={ready:true,version:'v5-runtime-guard-v1',registered:0,throttled:0,skippedWhileHidden:0,callbacks:0,policy:'V5-only interval throttling; V4 model logic untouched'};
function classify(fn,delay){let src='';try{src=Function.prototype.toString.call(fn)}catch{}const d=Number(delay)||0;
  if(d<=220)return{delay:250,kind:'analysis-watch'};
  if(d<1000){
    if(src.includes('const r=result()')&&src.includes('lastSig'))return{delay:900,kind:'v5-state-sync'};
    return{delay:6000,kind:'display-watchdog'};
  }
  return{delay:d,kind:'native'};
}
window.setInterval=function(fn,delay,...args){
  if(typeof fn!=='function')return nativeSetInterval(fn,delay,...args);
  const p=classify(fn,delay);state.registered++;if(p.delay!==(Number(delay)||0))state.throttled++;
  const wrapped=()=>{if(document.visibilityState==='hidden'){state.skippedWhileHidden++;return}state.callbacks++;try{fn(...args)}catch(e){setTimeout(()=>{throw e},0)}};
  return nativeSetInterval(wrapped,p.delay);
};
window.clearInterval=function(id){return nativeClearInterval(id)};
window.V5RuntimeGuardState=state;
})();
