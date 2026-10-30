(()=>{'use strict';
if(!window.RSAMobileLean||window.__MOBILE_PRODUCT_UI_FIX_V1)return;window.__MOBILE_PRODUCT_UI_FIX_V1=true;
const V='mobile-product-ui-fix-v1.0',$=id=>document.getElementById(id);let timer=0,busy=false;
function css(){if($('mpuFix1-css'))return;const s=document.createElement('style');s.id='mpuFix1-css';s.textContent=`
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#axisReliabilityShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#raceStrengthProfileShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#opponentVetoShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#postVetoTop2ShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#opponentRankingDisplayV1{display:block!important;margin:7px 0!important}
body.iosMobileShellV2 #marketMispricingInputCard,body.iosMobileShellV2 #marketMispricingResultCard{display:none!important}
`;document.head.appendChild(s)}
function repair(){if(busy)return;busy=true;try{css();const setup=$('mpuSetup'),body=setup?.querySelector('.mpuSetupBody'),odds=$('oddsPaste')?.closest('section.card,.card');if(body&&odds&&odds.parentElement!==body)body.appendChild(odds);const mm=$('marketMispricingInputCard');if(mm)mm.hidden=true;window.MobileProductUIFixV1State={ready:true,version:V,oddsInsideSetup:Boolean(body&&odds&&odds.parentElement===body),researchVisible:true,at:Date.now()}}finally{busy=false}}
function schedule(ms=0){clearTimeout(timer);timer=setTimeout(repair,ms)}
['rsa-addons-ready','rsa-analysis-complete','decision-shell-v2-ready','production-decision-pipeline-ready','finish600-ready'].forEach(ev=>addEventListener(ev,()=>schedule(40)));
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-ims-tab]')||['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))schedule(40)},true);
const start=()=>{css();const view=document.querySelector('main.view');if(view)new MutationObserver(()=>schedule(30)).observe(view,{childList:true,subtree:true});schedule(80);setTimeout(()=>schedule(),500);setTimeout(()=>schedule(),1500)};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
