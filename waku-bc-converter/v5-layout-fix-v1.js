(()=>{'use strict';
const css=document.createElement('style');
css.id='v5-layout-fix-v1';
css.textContent=`
/* V5 A5: mobile spacing / overlap polish only. No model logic changes. */
.v5App{padding-bottom:calc(148px + env(safe-area-inset-bottom))!important}
.v5Results{padding-bottom:18px}
.v5Storage{margin-bottom:28px!important}
.v5Panel>.v5Card:last-child{margin-bottom:18px}

/* Market structure donut: keep caption clear of ring and chips */
.v5Gauge{min-height:198px!important;padding:4px 0 12px!important;align-items:start!important}
.v5Gauge>div{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;width:100%}
.v5GaugeRing{width:136px!important;height:136px!important;flex:0 0 136px!important}
.v5GaugeRing:after{inset:13px!important}
.v5GaugeValue strong{font-size:29px!important}
.v5GaugeValue small{margin-top:5px!important;line-height:1.2!important}
.v5GaugeCaption{position:static!important;margin:0!important;min-height:20px!important;line-height:20px!important;padding:0 8px!important;font-size:10px!important;font-weight:850!important;text-align:center!important;color:#b9cde0!important;white-space:nowrap!important}
.v5Gauge + .v5MetricChips{margin-top:8px!important}
.v5HeroGrid>.v5Card:first-child{padding-bottom:15px!important}

/* Pace card breathing room */
.v5PaceBars{gap:12px!important}
.v5PaceRow{grid-template-columns:25px minmax(0,1fr) 42px!important;gap:8px!important}
.v5PacePrimary{margin-top:14px!important;padding-top:12px!important}
.v5PacePrimary b{line-height:1.1!important}

/* RPCI: compact but never cramped */
.v5RpciStrip{gap:6px!important}
.v5RpciBand{min-width:0!important;padding:9px 4px!important}
.v5RpciBand small{font-size:6.5px!important;line-height:1.25!important;white-space:nowrap!important}
.v5RpciBand b{font-size:11px!important;line-height:1.2!important}

/* Cards and headings */
.v5Card{overflow:visible!important}
.v5CardHead{margin-bottom:12px!important}
.v5CardHead h3{line-height:1.25!important}
.v5Outlook{line-height:1.8!important;padding-bottom:2px}

/* Bottom nav must not cover readable content */
.v5BottomNav{bottom:calc(10px + env(safe-area-inset-bottom))!important;box-shadow:0 18px 55px rgba(0,0,0,.48)!important}
.v5BottomNav button{min-height:66px!important}

@media(max-width:430px){
  .v5App{padding-left:10px!important;padding-right:10px!important;padding-bottom:calc(154px + env(safe-area-inset-bottom))!important}
  .v5Card{padding:14px!important}
  .v5Gauge{min-height:194px!important}
  .v5GaugeRing{width:132px!important;height:132px!important;flex-basis:132px!important}
  .v5GaugeValue strong{font-size:28px!important}
  .v5GaugeCaption{font-size:9.5px!important}
  .v5RpciStrip{gap:5px!important}
  .v5RpciBand{padding:8px 3px!important}
  .v5BottomNav{width:calc(100% - 20px)!important}
}
@media(max-width:370px){
  .v5RpciStrip{grid-template-columns:repeat(2,1fr)!important}
  .v5GaugeRing{width:126px!important;height:126px!important;flex-basis:126px!important}
}
`;
document.head.appendChild(css);
function mark(){
 const ring=document.querySelector('.v5GaugeRing'),cap=document.querySelector('.v5GaugeCaption'),chips=document.querySelector('.v5Gauge')?.parentElement?.querySelector('.v5MetricChips');
 window.V5LayoutFixState={ready:true,version:'v5-layout-fix-v1',build:'20261009v5a5',ring:!!ring,caption:!!cap,chips:!!chips};
}
let raf=0;function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>setTimeout(mark,30))}
function init(){const p=document.getElementById('v5Panel');if(p)new MutationObserver(schedule).observe(p,{childList:true,subtree:true});schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();