(()=>{'use strict';
if(!window.RSAMobileLean||window.__MOBILE_PRODUCT_UI_FIX_V1)return;window.__MOBILE_PRODUCT_UI_FIX_V1=true;
const V='mobile-product-ui-fix-v1.4-ability-bars',$=id=>document.getElementById(id);let timer=0,busy=false,revealed=false,detailLoading=false,barsLoading=false;
function css(){if($('mpuFix1-css'))return;const s=document.createElement('style');s.id='mpuFix1-css';s.textContent=`
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#axisReliabilityShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#raceStrengthProfileShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#opponentVetoShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#postVetoTop2ShadowV1,
body.iosMobileShellV2 #mpuResearch #mpuShadowHost>#opponentRankingDisplayV1{display:block!important;margin:7px 0!important}
body.iosMobileShellV2 #marketMispricingInputCard,body.iosMobileShellV2 #marketMispricingResultCard{display:none!important}
`;document.head.appendChild(s)}
function forceTabNames(){const m={ticket:'結論',axis:'全馬',pace:'検証中'};for(const [k,t] of Object.entries(m)){const b=document.querySelector(`[data-ims-tab="${k}"]`);if(b&&b.textContent!==t)b.textContent=t;b?.removeAttribute('hidden')}}
function loadOpponentDetail(){if(window.__MOBILE_OPPONENT_DETAIL_V1||document.querySelector('script[data-mobile-opponent-detail]')||detailLoading)return;detailLoading=true;const s=document.createElement('script');s.dataset.mobileOpponentDetail='1';s.src='mobile-opponent-detail-v1.js?v=20261030profile21';s.async=false;s.onload=()=>{detailLoading=false};s.onerror=()=>{detailLoading=false;console.warn('opponent detail load failed')};document.body.appendChild(s)}
function loadAbilityBars(){if(window.__MOBILE_HORSE_ABILITY_BARS_V1||document.querySelector('script[data-mobile-ability-bars]')||barsLoading)return;barsLoading=true;const s=document.createElement('script');s.dataset.mobileAbilityBars='1';s.src='mobile-horse-ability-bars-v1.js?v=20261030profile21';s.async=false;s.onload=()=>{barsLoading=false};s.onerror=()=>{barsLoading=false;console.warn('horse ability bars load failed')};document.body.appendChild(s)}
function readyToReveal(){return Boolean($('mpuSetup')&&$('mpuConclusion')&&$('mpuAllHorses')&&$('mpuResearch')&&document.querySelector('.imsTabs'))}
function revealOnce(){if(revealed||!readyToReveal())return;forceTabNames();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(revealed)return;revealed=true;document.documentElement.classList.add('mpuReady');document.documentElement.classList.remove('mpuBoot');window.dispatchEvent(new CustomEvent('mobile-product-ui-stable-ready'))}))}
function repair(){if(busy)return;busy=true;try{css();forceTabNames();loadOpponentDetail();loadAbilityBars();const setup=$('mpuSetup'),body=setup?.querySelector('.mpuSetupBody'),odds=$('oddsPaste')?.closest('section.card,.card');if(body&&odds&&odds.parentElement!==body)body.appendChild(odds);const mm=$('marketMispricingInputCard');if(mm)mm.hidden=true;revealOnce();window.MobileProductUIFixV1State={ready:true,version:V,oddsInsideSetup:Boolean(body&&odds&&odds.parentElement===body),researchVisible:true,opponentDetailLoader:true,abilityBarsLoader:true,stableReveal:revealed,persistentObserver:false,at:Date.now()}}finally{busy=false}}
function schedule(ms=0){clearTimeout(timer);timer=setTimeout(repair,ms)}
['rsa-addons-ready','rsa-analysis-complete','decision-shell-v2-ready','production-decision-pipeline-ready','finish600-ready','mobile-product-ui-stable-ready','five-ability-profile-v2-ready'].forEach(ev=>addEventListener(ev,()=>schedule(50)));
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-ims-tab]'))schedule(60);else if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))schedule(180)},true);
const start=()=>{css();loadOpponentDetail();loadAbilityBars();schedule(20);setTimeout(()=>schedule(),120);setTimeout(()=>schedule(),450);setTimeout(()=>schedule(),1000);setTimeout(()=>schedule(),1800)};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
