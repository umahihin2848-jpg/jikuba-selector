(()=>{'use strict';
if(window.__RSA_MOBILE_SIMPLE_UI_V1)return;window.__RSA_MOBILE_SIMPLE_UI_V1=true;
const V='mobile-simple-ui-v1.0';
let advancedOpen=false,rehoming=false;
const $=id=>document.getElementById(id);
const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text};
function css(){if($('rsaMobileSimpleStyle'))return;const s=document.createElement('style');s.id='rsaMobileSimpleStyle';s.textContent=`
html.rsaSimpleUI{--simple-gap:8px}
html.rsaSimpleUI body{letter-spacing:0}
html.rsaSimpleUI .view{padding-bottom:18px}
html.rsaSimpleUI .card{margin-top:8px;border-radius:13px}
html.rsaSimpleUI .card h2{letter-spacing:0}
html.rsaSimpleUI .sectionTitle{gap:8px}
html.rsaSimpleUI .muted,html.rsaSimpleUI .tiny{line-height:1.45}
html.rsaSimpleUI .q5flow{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:7px 0 3px}
html.rsaSimpleUI .q5step{padding:6px 7px;border-radius:9px;min-width:0}
html.rsaSimpleUI .q5step:nth-child(4){display:none!important}
html.rsaSimpleUI #marketMispricingInputCard{padding:9px 10px!important;border-color:#274457!important;background:#091a27!important}
html.rsaSimpleUI #marketMispricingInputCard>.sectionTitle{margin:0!important;align-items:center}
html.rsaSimpleUI #marketMispricingInputCard>.sectionTitle .muted{display:none!important}
html.rsaSimpleUI #marketMispricingInputCard>.sectionTitle h2{font-size:12px!important;margin:0!important}
html.rsaSimpleUI #marketMispricingInputCard>.sectionTitle .badge{font-size:7px!important;opacity:.72}
html.rsaSimpleUI .rsaAdvancedToggle{width:100%;min-height:40px;margin-top:7px;padding:8px 10px;border:1px solid #31566c;border-radius:10px;background:#0d2534;color:#dcecf3;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;font-weight:800;text-align:left}
html.rsaSimpleUI .rsaAdvancedToggle span{font-size:8px;color:#8eabb9;font-weight:600}
html.rsaSimpleUI .rsaAdvancedToggle b{font-size:13px;line-height:1}
html.rsaSimpleUI .rsaAdvancedBody{margin-top:8px}
html.rsaSimpleUI .rsaAdvancedBody[hidden]{display:none!important}
html.rsaSimpleUI #trioForwardDecomposition.rsaAdvancedExternal{display:none!important}
html.rsaSimpleUI.rsaAdvancedOpen #trioForwardDecomposition.rsaAdvancedExternal{display:block!important}
html.rsaSimpleUI #analyzeBtn{margin-top:8px;min-height:48px;font-size:14px;border-radius:11px}
html.rsaSimpleUI .mmSummaryGrid{gap:5px}
html.rsaSimpleUI .mmSummaryCard{padding:7px 8px;border-radius:9px}
html.rsaSimpleUI .mmSummaryMeta{display:none}
html.rsaSimpleUI .mmSummaryLabel{margin-bottom:3px}
html.rsaSimpleUI .mmSummaryEdge{font-size:15px;margin-top:2px}
html.rsaSimpleUI #marketMispricingInputCard .mmLiveSummary{margin:7px 0}
html.rsaSimpleUI #marketMispricingInputCard .mmLiveTitle{display:none}
@media(max-width:560px){
 html.rsaSimpleUI .view{padding-left:7px!important;padding-right:7px!important}
 html.rsaSimpleUI .card{padding:10px!important}
 html.rsaSimpleUI .grid2{gap:6px!important}
 html.rsaSimpleUI .field label{margin-bottom:4px!important}
 html.rsaSimpleUI input,html.rsaSimpleUI select,html.rsaSimpleUI textarea{border-radius:9px!important}
 html.rsaSimpleUI .actions{gap:6px!important}
 html.rsaSimpleUI .actions button{min-height:38px}
 html.rsaSimpleUI .q5step{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 html.rsaSimpleUI .q5step b{font-size:9px}
 html.rsaSimpleUI #csvCard .tiny:first-of-type{display:none}
 html.rsaSimpleUI #marketMispricingInputCard .mmSummaryGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}
 html.rsaSimpleUI #marketMispricingInputCard .mmSummaryMain{font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 html.rsaSimpleUI #marketMispricingInputCard .mmSummaryEdge{font-size:13px!important}
 html.rsaSimpleUI #marketMispricingInputCard .mmSummaryLabel{font-size:7px!important}
}
`;document.head.appendChild(s)}
function titleify(card){setText(card.querySelector(':scope>.sectionTitle h2'),'詳細分析（任意）');setText(card.querySelector(':scope>.sectionTitle .badge'),'Research')}
function ensureAdvancedCard(){const card=$('marketMispricingInputCard');if(!card||rehoming)return false;css();document.documentElement.classList.add('rsaSimpleUI');titleify(card);
 let body=card.querySelector(':scope>.rsaAdvancedBody'),toggle=card.querySelector(':scope>.rsaAdvancedToggle');
 if(!body){body=document.createElement('div');body.className='rsaAdvancedBody';body.hidden=!advancedOpen;card.appendChild(body)}
 if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='rsaAdvancedToggle';toggle.innerHTML='<span>馬連・ワイド・研究ログ</span><b>＋</b>';toggle.addEventListener('click',()=>setAdvanced(!advancedOpen));const head=card.querySelector(':scope>.sectionTitle');if(head)head.insertAdjacentElement('afterend',toggle);else card.prepend(toggle)}
 rehoming=true;try{[...card.children].forEach(el=>{if(el===body||el===toggle||el.classList.contains('sectionTitle'))return;body.appendChild(el)})}finally{rehoming=false}
 updateToggle(toggle,body);return true}
function updateToggle(toggle,body){if(!toggle||!body)return;const exp=advancedOpen?'true':'false';if(toggle.getAttribute('aria-expanded')!==exp)toggle.setAttribute('aria-expanded',exp);setText(toggle.querySelector('b'),advancedOpen?'−':'＋');setText(toggle.querySelector('span'),advancedOpen?'詳細分析を閉じる':'馬連・ワイド・研究ログを開く');if(body.hidden===advancedOpen)body.hidden=!advancedOpen;document.documentElement.classList.toggle('rsaAdvancedOpen',advancedOpen)}
function setAdvanced(v){advancedOpen=Boolean(v);const card=$('marketMispricingInputCard');updateToggle(card?.querySelector(':scope>.rsaAdvancedToggle'),card?.querySelector(':scope>.rsaAdvancedBody'));syncExternal()}
function syncExternal(){const f=$('trioForwardDecomposition');if(f)f.classList.add('rsaAdvancedExternal')}
function simplifyCopy(){const card=$('csvCard');setText(card?.querySelector('.sectionTitle .muted'),'TARGET CSVを読み込みます。');const odds=$('oddsPaste')?.closest('.card');setText(odds?.querySelector(':scope>.muted'),'任意。市場との比較に使います。')}
function apply(){css();document.documentElement.classList.add('rsaSimpleUI');ensureAdvancedCard();syncExternal();simplifyCopy();window.RSAMobileSimpleUI={ready:true,version:V,advancedOpen,setAdvanced,at:Date.now()}}
let timer=0;const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(apply,40)});
function boot(){apply();mo.observe(document.body,{childList:true,subtree:true});setTimeout(apply,400);setTimeout(apply,1400)}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
