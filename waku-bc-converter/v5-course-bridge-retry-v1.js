(()=>{'use strict';
if(window.__V5_COURSE_BRIDGE_RETRY_V1)return;window.__V5_COURSE_BRIDGE_RETRY_V1=true;
let timer=0,runId=0;
function pull(){
  try{
    const f=document.querySelector('#engineHost iframe'),s=f?.contentWindow?.CourseFitExportState;
    if(!s?.ready||!(s.rows||[]).length)return false;
    const rows=(s.rows||[]).map(x=>({...x}));
    window.V5CourseFitBridgeState={ready:true,version:'v5-course-fit-bridge-v2',rows,stateText:s.stateText||'',notice:s.notice||'',capturedAt:Date.now(),meaning:'independent OOS-validated course-fit badge; not win probability'};
    const active=document.querySelector('#v5Tabs [data-v5-tab].active');
    if(active)active.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    return true;
  }catch{return false}
}
function kick(){
  const id=++runId;clearTimeout(timer);let n=0;
  const step=()=>{if(id!==runId)return;n++;if(pull()||n>=24)return;timer=setTimeout(step,n<8?180:320)};
  timer=setTimeout(step,80);
}
function init(){
  document.getElementById('analyzeBtn')?.addEventListener('click',kick);
  const h=document.getElementById('engineHost');if(h)new MutationObserver(kick).observe(h,{childList:true});
  window.addEventListener('pageshow',kick);kick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
