(()=>{'use strict';
if(window.__TICKET_SCOPE_WQW_V1)return;window.__TICKET_SCOPE_WQW_V1=true;
const V='ticket-scope-wqw-v1.0',$=id=>document.getElementById(id);let raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;scrub()})}
function text(el){return String(el?.textContent||'').trim()}
function scrub(){
 document.documentElement.classList.add('ticketScopeWqw');
 ['trioThirdRow','trioForwardDecomposition','trioForwardEasyInput','trioThirdRows','trioAxisRecommendation'].forEach(id=>$(id)?.remove());
 const root=$('decisionShellV2');
 if(root){
   root.querySelectorAll('.dsTicket').forEach(card=>{if(text(card.querySelector('header>b')).includes('三連複'))card.remove()});
   root.querySelectorAll('.dsShadow>div>div').forEach(row=>{if(text(row.querySelector('b')).includes('三連複'))row.remove()});
   root.querySelectorAll('.dsTrioPool').forEach(x=>x.remove());
 }
 const mobile=$('decisionMobileV2');
 if(mobile)mobile.querySelectorAll('.dsmTickets>span').forEach(x=>{const b=text(x.querySelector('b'));if(b==='3複'||b.includes('三連複'))x.remove()});
 window.TicketScopeWQWState={ready:true,version:V,enabledTickets:['win','quinella','wide'],trioUi:false,trioRuntimeLoaded:Boolean(window.__TRIO_THIRD_ROW_V1||window.__TRIO_FORWARD_DECOMPOSITION_V1||window.__TRIO_FORWARD_EASY_INPUT_V1),historicalTrioDataPreserved:true,at:Date.now()};
}
const css=document.createElement('style');css.id='ticketScopeWqwStyle';css.textContent=`html.ticketScopeWqw #trioThirdRow,html.ticketScopeWqw #trioForwardDecomposition,html.ticketScopeWqw #trioForwardEasyInput,html.ticketScopeWqw .dsTrioPool{display:none!important}html.ticketScopeWqw #decisionShellV2 .dsTicketGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}html.ticketScopeWqw #decisionMobileV2 .dsmTickets{grid-template-columns:repeat(3,minmax(0,1fr))!important}html.ticketScopeWqw #decisionShellV2 .dsShadow>div{grid-template-columns:repeat(2,minmax(0,1fr))!important}@media(max-width:620px){html.ticketScopeWqw #decisionShellV2 .dsTicketGrid{grid-template-columns:1fr!important}html.ticketScopeWqw #decisionShellV2 .dsShadow>div{grid-template-columns:1fr!important}}`;document.head.appendChild(css);
['decision-shell-v2-ready','opponent-candidate-pool-ready','rsa-analysis-complete','structural-ticket-engine-v3-ready'].forEach(ev=>addEventListener(ev,()=>setTimeout(schedule,0)));
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))setTimeout(schedule,80)},true);
document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste')setTimeout(schedule,40)},true);
const mo=new MutationObserver(()=>schedule());if(document.body)mo.observe(document.body,{childList:true,subtree:true});else addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});schedule()},{once:true});
if(document.readyState==='loading')addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();