(()=>{'use strict';
if(window.__V5_MOBILE_RENDER_FIX_V1)return;window.__V5_MOBILE_RENDER_FIX_V1=true;
const css=document.createElement('style');css.id='v5-mobile-render-fix-v1-css';css.textContent=`
#engineHost{position:absolute!important;left:-10000px!important;top:0!important;opacity:0!important;z-index:-1!important;pointer-events:none!important}
#engineHost iframe{display:block!important}
@media(max-width:560px){
  html{scroll-padding-bottom:calc(96px + env(safe-area-inset-bottom))}
  body{-webkit-overflow-scrolling:touch}
  .v5App{padding-bottom:calc(104px + env(safe-area-inset-bottom))!important}
  .v5Results{padding-bottom:0!important}
  .v5Storage{margin-bottom:8px!important}
  .v5Panel>.v5Card:last-child{margin-bottom:4px!important}
  .v5Status,.v5BottomNav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
  .v5Setup,.v5Storage,.v5RaceHero,.v5Card{box-shadow:0 8px 24px rgba(0,0,0,.18)!important}
  #v5Panel,.v5HorseCards,.v5HorseCard,.v5KartCard{content-visibility:visible!important;contain:none!important;will-change:auto!important}
  .v5KartCard{overflow:visible!important;transform:none!important}
  .v5KartCard:before{border-radius:18px 0 0 18px}
  .v5HorseCards{overflow:visible!important}
  .v5BottomNav{box-shadow:0 10px 30px rgba(0,0,0,.34)!important}
}
`;
document.head.appendChild(css);
let timer=0;
function audit(){
  const cards=[...document.querySelectorAll('#v5Panel .v5KartCard')].filter(x=>x.dataset.v5Hidden!=='1'),panel=document.getElementById('v5Panel');
  let clipped=0,maxGap=0,minHeight=Infinity;
  for(let i=0;i<cards.length;i++){
    const c=cards[i],r=c.getBoundingClientRect(),cs=getComputedStyle(c);minHeight=Math.min(minHeight,r.height||Infinity);
    if((cs.overflowY==='hidden'||cs.overflow==='hidden')&&c.scrollHeight>c.clientHeight+2)clipped++;
    if(i){const p=cards[i-1].getBoundingClientRect();maxGap=Math.max(maxGap,r.top-p.bottom)}
  }
  window.V5RenderHealthState={ready:true,version:'v5-mobile-render-fix-v1',cards:cards.length,clipped,maxGap:Math.round(maxGap),minHeight:Number.isFinite(minHeight)?Math.round(minHeight):0,panelHeight:panel?Math.round(panel.getBoundingClientRect().height):0,webkitPaintSafe:true};
}
function schedule(ms=70){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(audit),ms)}
function init(){const p=document.getElementById('v5Panel');if(p)new MutationObserver(()=>schedule(80)).observe(p,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-v5-tab]')||e.target.closest?.('[data-hf]'))schedule(100)});window.addEventListener('orientationchange',()=>schedule(180));window.addEventListener('pageshow',()=>schedule(120));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(100)});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
