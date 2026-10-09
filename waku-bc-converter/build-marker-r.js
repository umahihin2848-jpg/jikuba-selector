(()=>{'use strict';
const LABEL='Scenario v1 · R';
function mark(){const b=document.querySelector('.brand .badge');if(b&&b.textContent!==LABEL)b.textContent=LABEL;document.documentElement.dataset.rsaBuild='20261009r'}
function start(){mark();const root=document.querySelector('.brand');if(root){new MutationObserver(mark).observe(root,{childList:true,subtree:true,characterData:true})}let n=0;const t=setInterval(()=>{mark();if(++n>20)clearInterval(t)},500)}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
['rsa-addons-ready','final-decision-ready','turbulence-structure-ready'].forEach(ev=>addEventListener(ev,mark));
})();