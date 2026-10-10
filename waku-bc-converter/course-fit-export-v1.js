(()=>{'use strict';
if(window.__COURSE_FIT_EXPORT_V1)return;window.__COURSE_FIT_EXPORT_V1=true;
const N=v=>Number.isFinite(+v)?+v:null;
let lastSig='';
function parseRow(el){
  const nameText=(el.querySelector('.horseName')?.textContent||'').replace(/\s+/g,' ').trim();
  const m=nameText.match(/^(?:(\d+)番\s+)?(.+?)(?:\s*\(\d+人気\))?$/);
  const no=m?.[1]||'';const name=(m?.[2]||nameText).trim();
  const gradeEl=el.querySelector('.courseA,.courseB,.courseC');
  const grade=(gradeEl?.textContent||'').trim();
  const badge=(el.querySelector('.badge')?.textContent||'').trim();
  const nm=badge.match(/n=(\d+)/);const n=nm?+nm[1]:null;
  const stats={};el.querySelectorAll('.hs').forEach(x=>{const k=(x.querySelector('span')?.textContent||'').trim(),v=(x.querySelector('b')?.textContent||'').trim();if(k)stats[k]=v});
  const dp=String(stats['補正量']||'').match(/([+-]?\d+(?:\.\d+)?)pt/);
  return{no,name,grade,n,relation:badge.split(/\s+/)[0]||'',direction:stats['補正方向']||'',deltaPt:dp?+dp[1]:null,exact:stats['同条件']||'',source:'course-fit-addon-v1'};
}
function publish(){
  const box=document.getElementById('courseFitList');if(!box)return;
  const rows=[...box.querySelectorAll('.horse')].map(parseRow).filter(x=>x.name&&['A','B','C'].includes(x.grade));
  const stateText=(document.getElementById('courseFitState')?.textContent||'').replace(/\s+/g,' ').trim();
  const notice=(box.querySelector('.notice')?.textContent||'').replace(/\s+/g,' ').trim();
  const sig=JSON.stringify(rows.map(x=>[x.no,x.name,x.grade,x.n,x.deltaPt]));
  window.CourseFitExportState={ready:true,version:'course-fit-export-v1',rows,stateText,notice,predictiveLogicChanged:false,meaning:'independent course-fit display export; A/B/C is not win probability'};
  if(sig!==lastSig){lastSig=sig;window.dispatchEvent(new CustomEvent('course-fit-export-ready',{detail:window.CourseFitExportState}))}
}
function init(){const root=document.body;new MutationObserver(()=>setTimeout(publish,0)).observe(root,{childList:true,subtree:true,characterData:true});setInterval(publish,250);publish()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
