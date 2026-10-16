(()=>{'use strict';
const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;
document.body.classList.add('iosPaintLiteV2');
const css=document.createElement('style');css.textContent=`
html,body{background:#06111b!important;background-image:none!important;max-width:100%!important;overflow-x:hidden!important}
body.iosPaintLiteV2,body.iosPaintLiteV2.rsaResumeRepaint,.app,.view{transform:none!important;filter:none!important;perspective:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 .top{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;background:#07131f!important}
body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv,body.iosPaintLiteV2 #raceHeroV2{box-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;will-change:auto!important;background-image:none!important}
body.iosPaintLiteV2 #result *,body.iosPaintLiteV2 #scenarioView *{will-change:auto!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;backface-visibility:visible!important}
body.iosPaintLiteV2 #raceQuickNav,body.iosPaintLiteV2 .ruxTabs{position:static!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:none!important;will-change:auto!important}
body.iosPaintLiteV2 .iosPaintReady #result *,body.iosPaintLiteV2 .iosPaintReady #scenarioView *{animation:none!important;transition:none!important}
@media(max-width:620px){
 body.iosPaintLiteV2 .card,body.iosPaintLiteV2 #scenarioView>.sv{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #s3 .horse,body.iosPaintLiteV2 #s4 .sc,body.iosPaintLiteV2 #s5 .item,body.iosPaintLiteV2 #s6 .item{contain:none!important;content-visibility:visible!important}
 body.iosPaintLiteV2 #qRealTrack,body.iosPaintLiteV2 .rtCourse,body.iosPaintLiteV2 .rtHorse{transform:none!important;will-change:auto!important;box-shadow:none!important;background-image:none!important}
 body.iosPaintLiteV2 #m3RaceLab,body.iosPaintLiteV2 .m3labPanel,body.iosPaintLiteV2 .m3section,body.iosPaintLiteV2 #m3StartFirstTurn,body.iosPaintLiteV2 .sftWrap,body.iosPaintLiteV2 .sftList,body.iosPaintLiteV2 .sftRow{contain:none!important;content-visibility:visible!important;transform:none!important;will-change:auto!important;backface-visibility:visible!important;height:auto!important;max-height:none!important;clip-path:none!important;-webkit-clip-path:none!important}
 body.iosPaintLiteV2 #m3RaceLab,body.iosPaintLiteV2 .m3labPanel.ruxPanelOn,body.iosPaintLiteV2 #m3StartFirstTurn,body.iosPaintLiteV2 #m3StartFirstTurn .sftWrap,body.iosPaintLiteV2 #m3StartFirstTurn .sftList{overflow:visible!important;overflow-x:visible!important;overflow-y:visible!important}
 body.iosPaintLiteV2 #m3StartFirstTurn.ruxQueueHero{box-shadow:none!important;filter:none!important}
}
`;document.head.appendChild(css);
function seedStartTurn(){
  const panel=document.querySelector('#m3RaceLab [data-m3panel="structure"]');if(!panel)return false;
  let root=document.getElementById('m3StartFirstTurn');
  if(!root){root=document.createElement('section');root.id='m3StartFirstTurn';root.className='m3section m3StartTurnSection ruxQueueHero';panel.prepend(root);root.dataset.iosSeeded='1';return true}
  if(root.parentElement===panel&&panel.firstElementChild!==root&&root.dataset.iosSeeded==='1')panel.prepend(root);
  return true
}
function settle(){document.body.classList.remove('rsaResumeRepaint');seedStartTurn();void document.documentElement.offsetHeight;void document.body.offsetHeight;const a=document.getElementById('m3RaceLab');if(a)void a.offsetHeight;const b=document.getElementById('m3StartFirstTurn');if(b)void b.offsetHeight}
function settleSoon(){[0,80,220,520].forEach(ms=>setTimeout(settle,ms))}
addEventListener('final-decision-ready',()=>{document.body.classList.add('iosPaintReady');settleSoon()});
['m3-race-lab-ready','m3-start-firstturn-visual-ready','position-risk-ready','rsa-analysis-complete','validated-queue-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>{seedStartTurn();settleSoon()}));
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id)){seedStartTurn();document.body.classList.remove('iosPaintReady')}},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(settle,80)});
addEventListener('pageshow',()=>setTimeout(settle,80));addEventListener('orientationchange',()=>setTimeout(settle,180));
setTimeout(settle,350);
})();