(()=>{'use strict';
const css=document.createElement('style');css.textContent=`
html,body{max-width:100%!important;overflow-x:hidden!important}
.app,.view,#result,#scenarioView,#scenarioView>.sv,.card{width:100%!important;max-width:100%!important;min-width:0!important}
#result *,#scenarioView *{min-width:0}
#result img,#scenarioView img,#result canvas,#scenarioView canvas,#result svg,#scenarioView svg{max-width:100%!important;height:auto}
#raceQuickNav{max-width:100%!important}
#qRealTrack,.rtGate,.rtCourse,.rtGrid,.rtCell{max-width:100%!important;min-width:0!important}
@media(max-width:620px){
 body{background:#06111b!important}
 .top{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
 .card,.sv,#raceHeroV2,#scenarioView>.sv{box-shadow:none!important}
 #raceQuickNav{position:static!important;background:transparent!important;padding-top:4px!important}
 #scenarioView{display:block!important}
 #scenarioView>.sv{margin:0 0 10px!important;overflow:hidden!important}
 .g3,.rhSignals{grid-template-columns:1fr!important}
 .hg{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 #s4 .scs{grid-template-columns:1fr!important}
 .rtCourse{min-height:420px!important;padding-left:24px!important}
 .rtGateRow{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding-bottom:4px}
 .rtGateChip{min-width:44px!important}
 .actions{max-width:100%!important}
 .horse,.item,.sc,.bx,.mini,.metric{max-width:100%!important;overflow:hidden}
 .comment,.reason,.sub,.muted,.tiny,.notice,.horseName,.name{overflow-wrap:anywhere;word-break:break-word}
}
`;document.head.appendChild(css);
function settle(){document.documentElement.style.width='100%';document.body.style.width='100%';const app=document.querySelector('.app');if(app){app.style.width='100%';app.style.maxWidth='920px';app.style.marginLeft='auto';app.style.marginRight='auto'}window.scrollTo({left:0,top:window.scrollY,behavior:'auto'})}
['final-decision-ready','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>requestAnimationFrame(()=>requestAnimationFrame(settle))));
addEventListener('orientationchange',()=>setTimeout(settle,120));
if(document.readyState==='loading')addEventListener('DOMContentLoaded',settle,{once:true});else settle();
})();