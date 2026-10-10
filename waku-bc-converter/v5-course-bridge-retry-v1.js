(()=>{'use strict';
if(window.__V5_COURSE_BRIDGE_RETRY_V1)return;window.__V5_COURSE_BRIDGE_RETRY_V1=true;
let timer=0,runId=0;
function accept(s){
  if(!s?.ready||!(s.rows||[]).length)return false;
  const rows=(s.rows||[]).map(x=>({...x}));
  window.V5CourseFitBridgeState={ready:true,version:'v5-course-fit-bridge-v2',rows,stateText:s.stateText||'',notice:s.notice||'',capturedAt:Date.now(),meaning:'independent OOS-validated course-fit badge; not win probability'};
  const active=document.querySelector('#v5Tabs [data-v5-tab].active');
  if(active)active.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  window.dispatchEvent(new CustomEvent('v5-course-fit-bridge-ready',{detail:window.V5CourseFitBridgeState}));
  return true;
}
function pull(){
  try{const f=document.querySelector('#engineHost iframe');return accept(f?.contentWindow?.CourseFitExportState)}catch{return false}
}
function onMessage(ev){
  try{
    const f=document.querySelector('#engineHost iframe');
    if(!f||ev.source!==f.contentWindow||ev.origin!==location.origin||ev.data?.type!=='course-fit-export-ready')return;
    accept(ev.data.state);
  }catch{}
}
function kick(){
  const id=++runId;clearTimeout(timer);let n=0;
  const step=()=>{if(id!==runId)return;n++;if(pull()||n>=36)return;timer=setTimeout(step,n<8?180:320)};
  timer=setTimeout(step,80);
}
function init(){
  window.addEventListener('message',onMessage);
  document.getElementById('analyzeBtn')?.addEventListener('click',kick);
  const h=document.getElementById('engineHost');if(h)new MutationObserver(kick).observe(h,{childList:true});
  window.addEventListener('pageshow',kick);kick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();