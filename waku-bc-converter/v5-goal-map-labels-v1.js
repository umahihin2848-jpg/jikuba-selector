(()=>{'use strict';
if(window.__V5_GOAL_MAP_LABELS_V1)return;window.__V5_GOAL_MAP_LABELS_V1=true;
const labels={reach:'🟢 前方射程',fringe:'🟡 後方から浮上',out:'⚫ 射程外'};
function countOf(el){const m=(el?.textContent||'').match(/(\d+)頭/);return m?m[1]:''}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function apply(){
  document.querySelectorAll('#v5Panel .v5GoalLegend').forEach(legend=>{
    ['reach','fringe','out'].forEach(k=>{const el=legend.querySelector('.'+k);if(!el)return;const n=countOf(el);setText(el,`${labels[k]}${n?` ${n}頭`:''}`)});
  });
  document.querySelectorAll('.v5GoalSheetStatus').forEach(el=>{
    const k=el.classList.contains('reach')?'reach':el.classList.contains('fringe')?'fringe':el.classList.contains('out')?'out':null;
    if(k)setText(el,labels[k]);
  });
  document.querySelectorAll('#v5Panel .v5GoalOut b').forEach(el=>setText(el,'射程外：'));
  document.querySelectorAll('#v5Panel .v5GoalNote').forEach(el=>{
    const t='横位置＝残600mの予測秒差。縦ずらしは重なり回避のみ。🟢前方射程＝残600mから前方圏、🟡後方から浮上＝残600mでは後方寄りでも主展開でGOAL順位を上げる馬、⚫射程外＝今回条件では届きにくい位置。勝率や3着内率そのものではありません。';
    if(el.textContent!==t)el.textContent=t;
  });
  window.V5GoalMapLabelState={ready:true,version:'v5-goal-map-labels-v1',semantics:{reach:'front-reach',fringe:'late-rise',out:'outside-reach'},probability:false};
}
let queued=false;function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply()})}
function init(){schedule();const p=document.getElementById('v5Panel');if(p)new MutationObserver(schedule).observe(p,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-goal-no],[data-v5-tab="formation"],[data-form]'))setTimeout(apply,0)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
