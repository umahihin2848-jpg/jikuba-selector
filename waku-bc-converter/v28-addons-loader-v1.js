(function(){'use strict';
function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(src));document.body.appendChild(s)})}
async function start(){
  const seq=[
    'target-csv-compat-v1.js?v=20261007c',
    'horse-fit-addon-v1.js',
    'ability-addon-opponent-v3.js',
    'course-fit-addon-v1.js',
    'condition-change-addon-v1.js',
    'performance-observer-pause-v1.js?v=20261007a',
    'integrated-view-addon-v2.js?v=20261007g',
    'calibrated-probability-addon-v1.js?v=20261007c',
    'final-probability-addon-v2.js?v=20261007b',
    'performance-observer-resume-v1.js?v=20261007a',
    'csv-format-guard-v1.js',
    'race-review-addon-v1.js',
    'v28-live-fix-v1.js?v=20261007b',
    'running-marks-addon-v1.js?v=20261007b'
  ];
  for(const src of seq){try{await load(src)}catch(e){console.warn('addon load failed',src,e)}}
  window.dispatchEvent(new CustomEvent('rsa-addons-ready'));
}
function afterPaint(){if('requestIdleCallback' in window){requestIdleCallback(()=>start(),{timeout:700})}else{setTimeout(start,120)}}
if(document.readyState==='loading'){
  window.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>requestAnimationFrame(afterPaint)),{once:true});
}else{
  requestAnimationFrame(()=>requestAnimationFrame(afterPaint));
}
})();