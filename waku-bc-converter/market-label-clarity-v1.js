(function(){'use strict';
function patch(){
  const card=document.getElementById('finalProbabilityList')?.closest('.card');if(!card)return;
  const h=card.querySelector('h2');if(h&&h.textContent.includes('最終確率・市場差'))h.textContent='⑤ 最終確率・単勝市場差';
  const muted=card.querySelector('.muted');if(muted)muted.textContent='較正済み確率に、実単勝オッズから計算した単勝市場確率・単勝EV、2026完全OOSの信頼レンジ、レース全体の買いやすさを重ねます。';
  const root=document.getElementById('finalProbabilityList');if(!root)return;
  for(const el of root.querySelectorAll('.fpCompare')){
    let html=el.innerHTML;
    html=html.replace(/🟢 割安候補/g,'🟢 単勝割安候補')
             .replace(/🔵 やや割安/g,'🔵 単勝やや割安')
             .replace(/🔴 割高寄り/g,'🔴 単勝割高寄り')
             .replace(/⚪ 市場並み/g,'⚪ 単勝市場並み')
             .replace(/市場勝率/g,'単勝市場勝率');
    if(html!==el.innerHTML)el.innerHTML=html;
  }
  const assess=document.getElementById('finalRaceAssessment');
  if(assess){assess.innerHTML=assess.innerHTML.replace(/EV≥1\.10強候補/g,'単勝EV≥1.10強候補').replace(/単勝単勝/g,'単勝')}
}
function bind(){patch();const root=document.getElementById('finalProbabilityList');if(root){const mo=new MutationObserver(()=>patch());mo.observe(root,{childList:true,subtree:true})}document.getElementById('analyzeBtn')?.addEventListener('click',()=>{setTimeout(patch,100);setTimeout(patch,500)})}
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('calibrated-probability-ready',()=>setTimeout(patch,300));
window.addEventListener('ability-opponent-ready',()=>setTimeout(patch,300));
})();