(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
document.body.classList.add('iosPaintLite');
const badge=document.querySelector('.brand .badge');if(badge)badge.textContent='Scenario v1 · iOS Lite O';
const css=document.createElement('style');css.textContent=`
body.iosPaintLite,body.iosPaintLite.rsaResumeRepaint{transform:none!important;filter:none!important;perspective:none!important;background:#06111b!important}
@media(max-width:620px){
 html,body,.app,.view,#result,#scenarioView{transform:none!important;filter:none!important;perspective:none!important;will-change:auto!important;background:#06111b!important}
 .top{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;background:#07131f!important}
 #result *,#scenarioView *{will-change:auto!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;backface-visibility:visible!important}
 #result .card,#scenarioView>.sv,#raceHeroV2,#scenarioView .horse,#scenarioView .item,#scenarioView .sc,#scenarioView .bx,#scenarioView .mini,#result .metric,#qRealTrack .rtHorse,#qRealTrack .rtCourse{box-shadow:none!important;background-image:none!important}
 #raceHeroV2:before,#s4 .sc:before,#s6 .item:after{display:none!important}
 #raceQuickNav{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:#06111b!important}
 .iosPaintReady #result *,.iosPaintReady #scenarioView *{animation:none!important;transition:none!important}
 .iosPaintReady #rsaCalcPanel .rsaSpin{animation:rsaSpin .85s linear infinite!important}
 #scenarioView>.sv,.card{contain:none!important;content-visibility:visible!important}
 #s3 .horse,#s4 .sc,#s5 .item,#s6 .item{contain:layout style!important}
}
`;document.head.appendChild(css);
function settle(){document.body.classList.remove('rsaResumeRepaint');void document.body.offsetHeight;window.scrollTo({left:0,top:window.scrollY,behavior:'auto'})}
addEventListener('final-decision-ready',()=>{document.body.classList.add('iosPaintReady');requestAnimationFrame(()=>requestAnimationFrame(settle))});
document.getElementById('analyzeBtn')?.addEventListener('click',()=>document.body.classList.remove('iosPaintReady'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(settle,80)});
addEventListener('pageshow',()=>setTimeout(settle,80));
})();