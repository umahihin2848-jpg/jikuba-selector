(()=>{'use strict';
if(window.__UI_PLAIN_JAPANESE_V1)return;window.__UI_PLAIN_JAPANESE_V1=true;
const V='ui-plain-japanese-v1.0';
let raf=0,timer=0;
const TARGETS=['mfs1','axisReliabilityShadowV1','raceStrengthProfileShadowV1','opponentVetoShadowV1','postVetoTop2ShadowV1','aosv1','wsv1','a2qf','a2qd-inline','imsLogicStatus','imsSimpleTicket','imsAnswer'];
const EXACT=new Map([
 ['HIGH AXIS','軸馬判定'],
 ['🎯 HIGH AXIS','🎯 軸馬判定'],
 ['OPPONENT VETO','相手絞り込み'],
 ['🧹 OPPONENT VETO','🧹 相手絞り込み'],
 ['ANTI-OVERFIT','過学習チェック'],
 ['WIDE SIGNAL','ワイド判定'],
 ['AXIS DECISION','軸馬判定'],
 ['Shadow / Forward検証前','検証中'],
 ['Shadow / Production未変更','検証中'],
 ['Shadow / 条件固定','条件固定・検証中'],
 ['全相手基準 / Shadow','全相手を対象・検証中'],
 ['2026-10-26条件固定 / Shadow','2026-10-26から条件固定・検証中'],
 ['95%保持ハードVETO候補','相手から外す候補'],
 ['🔴 95%保持ハードVETO候補','🔴 相手から外す候補'],
 ['VETO除外','相手から外した頭数'],
 ['TOP2捕捉','相手2頭の捕捉率'],
 ['BUY条件','買い条件'],
 ['VETO後 最大2頭','絞り込み後 最大2頭'],
 ['ワイド｜VETO後 最大2頭 → 下限7.0倍','ワイド｜相手を絞って最大2頭 → 7.0倍以上'],
 ['馬連｜VETO後 最大2頭','馬連｜相手を絞って最大2頭'],
 ['HIGH軸','高信頼軸'],
 ['HIGH AXIS TICKETS','高信頼軸の買い目'],
 ['Shadow','検証中'],
 ['Production未変更','本番判定は変更なし'],
 ['Forward検証','実戦検証'],
 ['BUY','買い候補'],
 ['WAIT','待ち'],
 ['🟢 BUY','🟢 買い'],
 ['A2 CORE-Q 前向き検証','単独浮上＋馬連 実戦検証'],
 ['A2 CORE対象外','単独浮上の対象外'],
 ['Neff比','市場集中度（Neff）'],
 ['Neff / 5倍','市場集中度 / 5倍'],
 ['Shadowでは非ゲート','検証中は判定条件に使わない']
]);
const REPL=[
 [/\bHIGH AXIS\b/g,'軸馬判定'],
 [/HIGH軸/g,'高信頼軸'],
 [/OPPONENT VETO/g,'相手絞り込み'],
 [/ハードVETO/g,'強い除外条件'],
 [/VETO後/g,'絞り込み後'],
 [/VETO除外/g,'相手から外した頭数'],
 [/VETO/g,'相手除外'],
 [/TOP2/g,'相手2頭'],
 [/Shadow/g,'検証中'],
 [/Forward/g,'実戦'],
 [/Production/g,'本番判定'],
 [/Ability P3/g,'Ability 3着内率'],
 [/M3 P3/g,'M3 3着内率'],
 [/保守P3/g,'保守3着内率'],
 [/P3<12%/g,'3着内率<12%'],
 [/P3/g,'3着内率'],
 [/\bBUY候補\b/g,'買い候補'],
 [/\bBUY\b/g,'買い'],
 [/\bWAIT\b/g,'待ち'],
 [/CoreScore/g,'Ability×M3 一致度'],
 [/PositionScore/g,'位置取り安定度'],
 [/連続Core leader/g,'一致度トップ'],
 [/Core中央値/g,'一致度中央値'],
 [/Core /g,'一致度 '],
 [/市場VETO/g,'市場条件で除外'],
 [/市場込みTop2外/g,'市場込みで相手上位2頭の外'],
 [/95%保持/g,'正解を約95%以上残す'],
 [/unknown year OOS/gi,'未知期間検証'],
 [/未知年OOS確定/g,'未知期間で確認済み']
];
function cleanText(s){let out=String(s??'');const ex=EXACT.get(out.trim());if(ex!==undefined){const lead=out.match(/^\s*/)?.[0]||'',trail=out.match(/\s*$/)?.[0]||'';return lead+ex+trail}for(const [re,to] of REPL)out=out.replace(re,to);return out}
function patchRoot(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return n.nodeValue&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const node of nodes){const next=cleanText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next}}
function patchStatic(){const h=document.querySelector('.brand h1');if(h&&h.textContent.trim()==='Race Scenario Analyzer')h.textContent='レース分析';const badge=document.querySelector('.brand .badge');if(badge&&/^M3 Scenario Lab/.test(badge.textContent.trim()))badge.textContent='M3 レース分析';document.querySelectorAll('[data-ims-tab="ticket"]').forEach(x=>{if(x.textContent.includes('馬券候補'))x.textContent='🎫 買い目'});document.querySelectorAll('[data-ims-tab="axis"]').forEach(x=>{if(x.textContent.includes('軸構造'))x.textContent='◎ 軸馬'});document.querySelectorAll('[data-ims-tab="pace"]').forEach(x=>{if(x.textContent.includes('展開構造'))x.textContent='🏇 展開'})}
function run(){raf=0;patchStatic();for(const id of TARGETS)patchRoot(document.getElementById(id));window.UIPlainJapaneseV1State={ready:true,version:V,at:Date.now()}}
function schedule(ms=40){clearTimeout(timer);timer=setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(run)},ms)}
['axis-reliability-shadow-ready','race-strength-profile-ready','opponent-veto-shadow-ready','post-veto-top2-ready','wide-signal-v1-ready','decision-shell-v2-ready','opponent-candidate-pool-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,()=>schedule(90)));
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','mfsResearchToggle'].includes(e.target?.id))schedule(140)},true);
document.addEventListener('input',e=>{if(['oddsPaste','qmdWidePaste','wideOddsPaste','qmdQuinellaPaste'].includes(e.target?.id))schedule(130)},true);
if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(250),{once:true});else schedule(250);setTimeout(()=>schedule(0),1200);
window.UIPlainJapaneseV1={ready:true,version:V,run,schedule};
})();
