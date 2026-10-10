(()=>{'use strict';
if(window.__COURSE_FIT_EXPORT_V1)return;window.__COURSE_FIT_EXPORT_V1=true;
let lastSig='',boxObserver=null,bodyObserver=null,timer=0;
function parseRow(el){
  const nameText=(el.querySelector('.horseName')?.textContent||'').replace(/\s+/g,' ').trim();
  const m=nameText.match(/^(?:(\d+)番\s+)?(.+?)(?:\s*\(\d+人気\))?$/),no=m?.[1]||'',name=(m?.[2]||nameText).trim();
  const grade=(el.querySelector('.courseA,.courseB,.courseC')?.textContent||'').trim(),badge=(el.querySelector('.badge')?.textContent||'').trim(),nm=badge.match(/n=(\d+)/),n=nm?+nm[1]:null,stats={};
  el.querySelectorAll('.hs').forEach(x=>{const k=(x.querySelector('span')?.textContent||'').trim(),v=(x.querySelector('b')?.textContent||'').trim();if(k)stats[k]=v});
  const dp=String(stats['補正量']||'').match(/([+-]?\d+(?:\.\d+)?)pt/);
  return{no,name,grade,n,relation:badge.split(/\s+/)[0]||'',direction:stats['補正方向']||'',deltaPt:dp?+dp[1]:null,exact:stats['同条件']||'',source:'course-fit-addon-v1'};
}
function relay(state){
  if(window.parent===window)return;
  try{window.parent.postMessage({type:'course-fit-export-ready',version:'course-fit-export-v1',state},location.origin)}catch{}
}
function publish(){
  const box=document.getElementById('courseFitList');if(!box)return false;
  const rows=[...box.querySelectorAll('.horse')].map(parseRow).filter(x=>x.name&&['A','B','C'].includes(x.grade)),stateText=(document.getElementById('courseFitState')?.textContent||'').replace(/\s+/g,' ').trim(),notice=(box.querySelector('.notice')?.textContent||'').replace(/\s+/g,' ').trim(),sig=JSON.stringify(rows.map(x=>[x.no,x.name,x.grade,x.n,x.deltaPt]));
  window.CourseFitExportState={ready:true,version:'course-fit-export-v1',rows,stateText,notice,predictiveLogicChanged:false,meaning:'independent course-fit display export; A/B/C is not win probability'};
  relay(window.CourseFitExportState);
  if(sig!==lastSig){lastSig=sig;window.dispatchEvent(new CustomEvent('course-fit-export-ready',{detail:window.CourseFitExportState}))}
  return true;
}
function schedule(ms=20){clearTimeout(timer);timer=setTimeout(publish,ms)}
function bindBox(){
  const box=document.getElementById('courseFitList');if(!box)return false;
  bodyObserver?.disconnect();bodyObserver=null;boxObserver?.disconnect();boxObserver=new MutationObserver(()=>schedule(20));boxObserver.observe(box,{childList:true,subtree:true,characterData:true});
  const state=document.getElementById('courseFitState');if(state)boxObserver.observe(state,{childList:true,subtree:true,characterData:true});schedule(0);return true;
}
function init(){
  if(!bindBox()){bodyObserver=new MutationObserver(()=>{if(bindBox())schedule(0)});bodyObserver.observe(document.body,{childList:true,subtree:true})}
  window.addEventListener('rsa-addons-ready',()=>schedule(40));window.addEventListener('course-fit-ready',()=>schedule(20));document.getElementById('analyzeBtn')?.addEventListener('click',()=>schedule(250));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();