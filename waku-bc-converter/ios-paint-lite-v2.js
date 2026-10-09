(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
document.body.classList.add('iosPaintLiteV2');
const css=document.createElement('style');css.textContent=`
html,body{background:#06111b!important;background-image:none!important;max-width:100%!important;overflow-x:hidden!important}
body.iosPaintLiteV2,body.iosPaintLiteV2.rsaResumeRepaint,.app,.view{transform:none!important;filter:none!important;perspective:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 .top{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;background:#07131f!important}
body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv,body.iosPaintLiteV2 #raceHeroV2{box-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 #result *,body.iosPaintLiteV2 #scenarioView *{will-change:auto!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;backface-visibility:visible!important}
body.iosPaintLiteV2 #raceQuickNav{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.iosPaintLiteV2 .iosPaintReady #result *,body.iosPaintLiteV2 .iosPaintReady #scenarioView *{animation:none!important;transition:none!important}
@media(max-width:620px){
 body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #s3 .horse,body.iosPaintLiteV2 #s4 .sc,body.iosPaintLiteV2 #s5 .item,body.iosPaintLiteV2 #s6 .item{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #qRealTrack,body.iosPaintLiteV2 .rtCourse,body.iosPaintLiteV2 .rtHorse{transform:none!important;will-change:auto!important;box-shadow:none!important;background-image:none!important}
}
`;document.head.appendChild(css);
let paintTimer=0;
function repaint(){clearTimeout(paintTimer);paintTimer=setTimeout(()=>{const y=window.scrollY||0;document.body.classList.remove('rsaResumeRepaint');const root=document.querySelector('.app')||document.body;const old=root.style.opacity;root.style.opacity='.999';void root.offsetHeight;requestAnimationFrame(()=>{root.style.opacity=old||'';window.scrollTo({left:0,top:y,behavior:'auto'})})},90)}
let scrollTimer=0;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(repaint,140)},{passive:true});
addEventListener('final-decision-ready',()=>{document.body.classList.add('iosPaintReady');repaint()});
document.getElementById('analyzeBtn')?.addEventListener('click',()=>document.body.classList.remove('iosPaintReady'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')repaint()});
addEventListener('pageshow',repaint);addEventListener('orientationchange',()=>setTimeout(repaint,180));
setTimeout(repaint,350);setTimeout(repaint,1200);
})();