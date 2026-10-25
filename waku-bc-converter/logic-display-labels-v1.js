(()=>{'use strict';
if(!window.RSAMobileLean||window.__LOGIC_DISPLAY_LABELS_V1)return;window.__LOGIC_DISPLAY_LABELS_V1=true;
const V='logic-display-labels-v1.0';
const mapText=s=>String(s||'')
  .replaceAll('A2 CORE-Q','単独浮上＋馬連')
  .replaceAll('A2 CORE','単独浮上')
  .replaceAll('PAIR2 SECOND','2頭浮上')
  .replaceAll('LOGIC C','復活候補')
  .replaceAll('A2 PLUS','追加候補');
function exact(el,from,to){if(el&&el.textContent.trim()===from)el.textContent=to}
function relabelWide(){const root=document.getElementById('wsv1');if(!root)return;
  root.querySelectorAll('.wsvLogicItem b,.wsvSigTop b').forEach(el=>{el.textContent=mapText(el.textContent)});
  root.querySelectorAll('.wsvRole').forEach(el=>{const t=el.textContent.trim();if(t==='CORE')el.textContent='相手1位';else if(t==='SECOND')el.textContent='相手2位';else if(t==='C')el.textContent='復活'});
  root.querySelectorAll('.wsvFoot').forEach(el=>{el.textContent=mapText(el.textContent)});
  root.querySelectorAll('.wsvSignal .wsvRows .wsvFoot').forEach(el=>{el.textContent=mapText(el.textContent)});
}
function relabelQuinella(){const inline=document.getElementById('a2qd-inline');if(inline){inline.querySelectorAll('small,b').forEach(el=>{el.textContent=mapText(el.textContent)})}
  const log=document.getElementById('a2qf');if(log){const sum=log.querySelector('summary span:first-child');if(sum)sum.textContent='単独浮上＋馬連 前向き検証';log.querySelectorAll('.a2qfStatus b,.a2qfTiny,.a2qfFrozen').forEach(el=>{el.textContent=mapText(el.textContent)})}
}
function run(){relabelWide();relabelQuinella();window.LogicDisplayLabelsV1State={ready:true,version:V,at:Date.now()}}
let t=0;function schedule(ms=40){clearTimeout(t);t=setTimeout(run,ms)}
['wide-signal-v1-ready','rsa-analysis-complete','rsa-addons-ready','finish600-ready','m3-pure-ability-ready'].forEach(ev=>addEventListener(ev,()=>schedule()));
document.addEventListener('input',e=>{if(['oddsPaste','qmdWidePaste','wideFrameOddsPaste','a2qfOdds'].includes(e.target?.id))schedule(70)},true);
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','a2qfRecord'].includes(e.target?.id))schedule(150)},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(200),{once:true});else schedule(150);setTimeout(()=>schedule(),1000);setTimeout(()=>schedule(),1800);
window.LogicDisplayLabelsV1={ready:true,version:V,run,schedule};
})();