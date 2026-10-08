(function(){'use strict';
function add(src){return new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=ok;s.onerror=()=>fail(new Error(src));document.body.appendChild(s)})}
function fixPaceSummary(){const target=document.getElementById('rsaStructureTextV3');if(!target)return;let pace='';const hero=(document.getElementById('heroSub')?.textContent||'').replace(/\s+/g,' ').trim();const hm=hero.match(/流れ本線\s*([^｜]+).*?90%レンジ\s*([^｜]+)/);if(hm)pace=`本線：${hm[1].trim()}｜90%予測レンジ：${hm[2].trim()}`;if(!pace){const rt=(document.getElementById('rpciText')?.textContent||'').replace(/\s+/g,' ').trim();const m=rt.match(/本線：?\s*(.*?)\s*90%予測レンジ：?\s*(.*?)(?:。|$)/);if(m)pace=`本線：${m[1].trim()}｜90%予測レンジ：${m[2].trim()}`}if(!pace)return;const lines=target.innerHTML.split('<br>');target.innerHTML=lines.map(line=>line.startsWith('ペース：')?`ペース：${pace}`:line).join('<br>')}
function schedulePaceFix(){setTimeout(fixPaceSummary,260);setTimeout(fixPaceSummary,760);setTimeout(fixPaceSummary,1650)}
async function boot(){const files=[
  'target-csv-compat-v1.js?v=20261007c',
  'surface-alias-compat-v1.js?v=20261007a',
  'horse-fit-addon-v1.js',
  'ability-addon-opponent-v3.js',
  'course-fit-addon-v1.js',
  'course-label-compat-v1.js?v=20261007a',
  'condition-change-addon-v1.js',
  'performance-observer-pause-v1.js?v=20261007a',
  'integrated-view-addon-v2.js?v=20261007g',
  'calibrated-probability-addon-v1.js?v=20261007c',
  'statistical-core-v1.js?v=20261008f',
  'final-probability-addon-v3.js?v=20261007a',
  'joint-pair-probability-addon-v3.js?v=20261007a',
  'running-marks-addon-v1.js?v=20261007c',
  'performance-observer-resume-v1.js?v=20261007a',
  'csv-format-guard-v1.js',
  'race-review-addon-v1.js',
  'v28-live-fix-v1.js?v=20261007b',
  'running-marks-light-refresh-v1.js?v=20261007a',
  'race-workspace-store-v1.js?v=20261007a',
  'v3-ui-final.js?v=20261007a',
  'scenario-ui-v1.js?v=20261008a',
  'validated-queue-model-v1.js?v=20261008j',
  'queue-analysis-v1.js?v=20261008b',
  'queue-realistic-v1.js?v=20261008n',
  'queue-validated-visual-v1.js?v=20261008j',
  'dashboard-polish-v1.js?v=20261008d',
  'statistical-ui-v1.js?v=20261008g',
  'statistical-validation-badge-v1.js?v=20261008h',
  'structure-validation-ui-v1.js?v=20261008i',
  'ui-refresh-v2.js?v=20261008k',
  'ui-fix-v3.js?v=20261008l',
  'scenario-statistics-v1.js?v=20261008n',
  'remaining600-validated-v1.js?v=20261008o',
  'finish600-simulator-v2.js?v=20261008q',
  'rpci-fit-addon-v1.js?v=20261009a',
  'ui-fix-v4.js?v=20261008n'
];for(const f of files){try{await add(f)}catch(e){console.warn('addon',f)}}window.addEventListener('calibrated-probability-ready',schedulePaceFix);window.addEventListener('joint-pair-probability-ready',schedulePaceFix);window.addEventListener('rsa-addons-ready',schedulePaceFix);document.getElementById('analyzeBtn')?.addEventListener('click',schedulePaceFix);window.dispatchEvent(new CustomEvent('rsa-addons-ready'));schedulePaceFix()}
function kick(){setTimeout(boot,60)}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',kick,{once:true});else kick();
})();