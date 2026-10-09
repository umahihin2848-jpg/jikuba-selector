(()=>{'use strict';
const LABEL='Scenario v1 · R';
function mark(){const b=document.querySelector('.brand .badge');if(b&&b.textContent!==LABEL)b.textContent=LABEL;document.documentElement.dataset.rsaBuild='20261009r';let m=document.getElementById('rsaBuildMarkerR');if(!m){m=document.createElement('div');m.id='rsaBuildMarkerR';m.style.cssText='margin:6px 8px 0;padding:5px 8px;border:1px solid #35546f;border-radius:8px;background:#081827;color:#9ec4d4;font-size:9px;font-weight:800';const top=document.querySelector('.top');top?.insertAdjacentElement('afterend',m)}if(m)m.textContent='BUILD R / v3r.html · 自動復元OFF'}
function start(){mark();const root=document.querySelector('.brand');if(root){new MutationObserver(mark).observe(root,{childList:true,subtree:true,characterData:true})}let n=0;const t=setInterval(()=>{mark();if(++n>30)clearInterval(t)},500)}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
['rsa-addons-ready','final-decision-ready','turbulence-structure-ready'].forEach(ev=>addEventListener(ev,mark));
})();