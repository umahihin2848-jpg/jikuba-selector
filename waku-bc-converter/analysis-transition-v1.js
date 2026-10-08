(()=>{'use strict';
const $=id=>document.getElementById(id);
let active=false,started=0,generation=0,fallback=0,minTimer=0,readyTimer=0;
const seen=new Set();
const required=['calibrated-probability-ready','scenario-statistics-ready','finish600-ready','rpci-fit-beta-ready','final-decision-ready'];
const labels={
  'calibrated-probability-ready':'確率を較正中',
  'scenario-statistics-ready':'展開シナリオを整理中',
  'finish600-ready':'残600m・末脚を計算中',
  'rpci-fit-beta-ready':'RPCI適性を照合中',
  'final-decision-ready':'最終結論を整理中'
};
function ensurePanel(){
  const result=$('result');if(!result)return null;
  let p=$('rsaCalcPanel');if(p)return p;
  p=document.createElement('div');p.id='rsaCalcPanel';p.setAttribute('role','status');p.setAttribute('aria-live','polite');
  p.innerHTML='<div class="rsaSpin" aria-hidden="true"></div><div class="rsaCalcBody"><b>レースを分析しています</b><span id="rsaCalcText">基礎モデルを計算中</span><div class="rsaProg"><i id="rsaProgBar"></i></div><small>各モデルの表示が揃ってから結果を一度に表示します</small></div>';
  result.prepend(p);return p;
}
function setProgress(text){
  const t=$('rsaCalcText');if(t&&text)t.textContent=text;
  const n=required.filter(x=>seen.has(x)).length,bar=$('rsaProgBar');if(bar)bar.style.width=`${Math.max(8,Math.min(96,8+n/required.length*88))}%`;
}
function begin(){
  const result=$('result'),btn=$('analyzeBtn');if(!result)return;
  generation++;active=true;started=performance.now();seen.clear();
  clearTimeout(fallback);clearTimeout(minTimer);clearTimeout(readyTimer);
  ensurePanel();result.classList.add('rsaCalcPending');
  document.body.classList.add('rsaAnalysisBusy');
  if(btn){btn.dataset.rsaOldText=btn.textContent||'';btn.textContent='分析中…';btn.setAttribute('aria-busy','true')}
  setProgress('基礎モデルを計算中');
  const g=generation;
  minTimer=setTimeout(()=>tryFinish(g),900);
  fallback=setTimeout(()=>finish(g),2400);
}
function finish(g){
  if(!active||g!==generation)return;
  active=false;clearTimeout(fallback);clearTimeout(minTimer);clearTimeout(readyTimer);
  const result=$('result'),btn=$('analyzeBtn');
  if(result){result.classList.remove('rsaCalcPending');const p=$('rsaCalcPanel');if(p)p.remove()}
  document.body.classList.remove('rsaAnalysisBusy');
  if(btn){btn.textContent=btn.dataset.rsaOldText||'このレースを分析';btn.removeAttribute('aria-busy')}
  requestAnimationFrame(()=>requestAnimationFrame(()=>{const card=$('finalDecisionCard')||result?.firstElementChild;if(card)window.scrollTo({top:Math.max(0,card.getBoundingClientRect().top+window.scrollY-64),behavior:'smooth'})}));
}
function tryFinish(g){
  if(!active||g!==generation)return;
  const elapsed=performance.now()-started,core=required.every(x=>seen.has(x));
  if(core&&elapsed>=900){clearTimeout(readyTimer);readyTimer=setTimeout(()=>finish(g),180);return}
  if(core){clearTimeout(readyTimer);readyTimer=setTimeout(()=>tryFinish(g),Math.max(80,920-elapsed))}
}
required.forEach(ev=>addEventListener(ev,()=>{
  if(!active)return;seen.add(ev);setProgress(labels[ev]||'分析結果を整理中');tryFinish(generation);
}));
addEventListener('remaining600-validated-ready',()=>{if(active)setProgress('残600m位置を推定中')});
document.addEventListener('click',e=>{if(e.target?.id==='analyzeBtn')begin()},true);
const css=document.createElement('style');css.textContent=`
#result.rsaCalcPending{display:block!important;min-height:245px;position:relative}
#result.rsaCalcPending>*:not(#rsaCalcPanel){display:none!important}
#rsaCalcPanel{margin-top:12px;min-height:210px;box-sizing:border-box;border:1px solid #2e6176;border-radius:16px;background:linear-gradient(180deg,#0a2130,#071721);display:flex;align-items:center;justify-content:center;gap:14px;padding:26px 20px;box-shadow:0 14px 32px rgba(0,0,0,.18)}
.rsaSpin{width:32px;height:32px;border-radius:50%;border:3px solid #21485a;border-top-color:#73cce8;animation:rsaSpin .85s linear infinite;flex:0 0 auto}
.rsaCalcBody{min-width:0;max-width:360px;flex:1}.rsaCalcBody b{display:block;font-size:15px;color:#effaff}.rsaCalcBody span{display:block;font-size:11px;color:#9fc2d1;margin-top:5px}.rsaCalcBody small{display:block;font-size:8px;color:#6f91a0;margin-top:7px;line-height:1.45}.rsaProg{height:5px;border-radius:999px;background:#102f3e;overflow:hidden;margin-top:10px}.rsaProg i{display:block;height:100%;width:8%;border-radius:999px;background:linear-gradient(90deg,#4588a3,#75d0e9);transition:width .22s ease}
body.rsaAnalysisBusy #analyzeBtn{opacity:.78;pointer-events:none}
@keyframes rsaSpin{to{transform:rotate(360deg)}}
@media(max-width:520px){#rsaCalcPanel{min-height:190px;padding:22px 16px}.rsaSpin{width:28px;height:28px}.rsaCalcBody b{font-size:14px}}
@media(prefers-reduced-motion:reduce){.rsaSpin{animation:none}.rsaProg i{transition:none}}
`;document.head.appendChild(css);
})();