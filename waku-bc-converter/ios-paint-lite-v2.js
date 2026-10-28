(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
document.body.classList.add('iosPaintLiteV2');
const css=document.createElement('style');css.textContent=`
html,body{background:#06111b!important;background-image:none!important;max-width:100%!important;overflow-x:hidden!important}
body.iosPaintLiteV2,body.iosPaintLiteV2.rsaResumeRepaint,.app,.view{transform:none!important;filter:none!important;perspective:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 .top{position:static!important;padding-top:max(8px,env(safe-area-inset-top))!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;background:#07131f!important}
body.iosPaintLiteV2 .top .brand small,body.iosPaintLiteV2 .top .q5build,body.iosPaintLiteV2 .q5flow{display:none!important}
body.iosPaintLiteV2 main.view{padding-left:10px!important;padding-right:10px!important}
body.iosPaintLiteV2 input,body.iosPaintLiteV2 select,body.iosPaintLiteV2 textarea{font-size:16px!important}
body.iosPaintLiteV2 #analyzeBtn{min-height:50px!important;margin:10px 0 8px!important;font-size:15px!important;font-weight:900!important}
body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv,body.iosPaintLiteV2 #raceHeroV2{box-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 #result *,body.iosPaintLiteV2 #scenarioView *{will-change:auto!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;backface-visibility:visible!important}
body.iosPaintLiteV2 #raceQuickNav,body.iosPaintLiteV2 .ruxTabs,body.iosPaintLiteV2 .iosStableTabs{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;will-change:auto!important}
body.iosPaintLiteV2 .iosPaintReady #result *,body.iosPaintLiteV2 .iosPaintReady #scenarioView *{animation:none!important;transition:none!important}
@media(max-width:620px){
 body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #s3 .horse,body.iosPaintLiteV2 #s4 .sc,body.iosPaintLiteV2 #s5 .item,body.iosPaintLiteV2 #s6 .item{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #m3RaceLab,body.iosPaintLiteV2 .m3labPanel,body.iosPaintLiteV2 #iosStableStartTurn,body.iosPaintLiteV2 .isqRows,body.iosPaintLiteV2 .isqChunk,body.iosPaintLiteV2 .isqRow{contain:none!important;content-visibility:visible!important;transform:none!important;will-change:auto!important;backface-visibility:visible!important;height:auto!important;max-height:none!important;clip-path:none!important;-webkit-clip-path:none!important;overflow:visible!important}
}
`;document.head.appendChild(css);
/* The mobile shell used to load much later, after several analysis modules. That made Safari
   paint the desktop-ish layout first and then visibly rebuild it. Start the shell here,
   immediately after the first iOS paint guard. The later static script is harmless because
   ios-mobile-shell-v3 has its own one-time guard. */
if(!window.__IOS_MOBILE_SHELL_V3&&!document.querySelector('script[data-rsa-early-mobile-shell]')){
 const s=document.createElement('script');s.src='ios-mobile-shell-v3.js?v=20261029boot1';s.async=false;s.dataset.rsaEarlyMobileShell='1';s.onerror=()=>console.warn('early mobile shell load failed');document.body.appendChild(s);
}
function settle(){document.body.classList.remove('rsaResumeRepaint');void document.documentElement.offsetHeight;void document.body.offsetHeight;const a=document.getElementById('m3RaceLab');if(a)void a.offsetHeight;const b=document.getElementById('iosStableStartTurn');if(b)void b.offsetHeight}
function settleSoon(){[0,80,220,520].forEach(ms=>setTimeout(settle,ms))}
addEventListener('final-decision-ready',()=>{document.body.classList.add('iosPaintReady');settleSoon()});
['m3-race-lab-ready','position-risk-ready','rsa-analysis-complete','validated-queue-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,settleSoon));
document.getElementById('analyzeBtn')?.addEventListener('click',()=>document.body.classList.remove('iosPaintReady'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(settle,80)});
addEventListener('pageshow',()=>setTimeout(settle,80));addEventListener('orientationchange',()=>setTimeout(settle,180));
setTimeout(settle,350);
})();