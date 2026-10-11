(()=>{'use strict';
const $=id=>document.getElementById(id),C=window.ShapeCore;if(!C)return;
let originStructural=false,guardTimer=0;
function parsedOdds(){try{return C.parseOdds($('oddsPaste')?.value||'')?.odds||{}}catch{return{}}}
function field(){return Number($('fieldSize')?.value)||0}
function count(){return Object.keys(parsedOdds()).length}
function full(){const f=field(),n=count();return f>=2&&n>=f}
function setMode(){const isFull=full();window.RSAStructuralOnlyMode=!isFull;window.RSAMarketMode=isFull?'full':count()?'partial':'none';document.body.classList.toggle('rsaStructuralOnly',!isFull);return isFull}
function neutralOdds(n){return Array.from({length:n},(_,i)=>`${i+1} 100.0`).join('\n')}
function suppressLegacyMarket(){if(!originStructural)return;window.CalibratedProbabilityState={ready:false,resultsByName:{},results:[],version:'structural-only'};const b=$('calibratedProbabilityList');if(b)b.innerHTML='<div class="notice yellow">市場較正の旧詳細表示は、構造解析後に単勝オッズだけを追加した場合は更新しません。市場比較は「市場」タブを使用してください。</div>';const fd=$('finalDecisionCard');if(fd){fd.dataset.structuralStale='1';fd.style.display='none'}}
function restoreLegacy(){const fd=$('finalDecisionCard');if(fd){fd.style.display='';delete fd.dataset.structuralStale}}
function scheduleGuard(){clearTimeout(guardTimer);[0,80,240,700,1400].forEach(ms=>setTimeout(suppressLegacyMarket,ms));guardTimer=setTimeout(suppressLegacyMarket,2200)}
function bindAnalyze(){const b=$('analyzeBtn');if(!b||b.dataset.structuralBridge==='1')return;const base=b.onclick;if(typeof base!=='function')return;b.dataset.structuralBridge='1';b.onclick=function(ev){const n=count(),f=field(),isFull=f>=2&&n>=f;originStructural=!isFull;window.RSAAnalysisOriginStructural=originStructural;setMode();if(!originStructural)restoreLegacy();if(n>=2){$('applyOddsBtn')?.click();const out=base.call(this,ev);if(originStructural)scheduleGuard();return out}if(!(f>=2))return base.call(this,ev);const ta=$('oddsPaste'),info=$('oddsInfo'),oldText=ta?.value||'';try{window.__RSA_STRUCTURAL_PROXY_ANALYSIS=true;if(ta)ta.value=neutralOdds(f);$('applyOddsBtn')?.click();const out=base.call(this,ev);return out}finally{window.__RSA_STRUCTURAL_PROXY_ANALYSIS=false;if(ta)ta.value=oldText;if(info)info.innerHTML='<span class="ok">構造解析モード｜市場は未入力</span>';window.MarketOddsTop3State={ready:false,version:window.MarketOddsTop3State?.version||'odds_simple_top3_v2',reason:oldText.trim()?'incomplete_odds':'no_odds',expectedField:f,oddsCount:n,results:[]};dispatchEvent(new CustomEvent('market-odds-top3-ready',{detail:window.MarketOddsTop3State}));scheduleGuard()}}
}
function onApply(){setTimeout(()=>{const isFull=setMode();if(isFull){const info=$('oddsInfo');if(info)info.insertAdjacentHTML('beforeend',' <span class="ok">｜市場タブを更新</span>')}else if(originStructural)scheduleGuard()},0)}
function onClear(){setTimeout(()=>{setMode();window.MarketOddsTop3State={ready:false,version:window.MarketOddsTop3State?.version||'odds_simple_top3_v2',reason:'no_odds',expectedField:field(),oddsCount:0,results:[]};dispatchEvent(new CustomEvent('market-odds-top3-ready',{detail:window.MarketOddsTop3State}));if(originStructural)scheduleGuard()},0)}
addEventListener('calibrated-probability-ready',()=>{if(originStructural)scheduleGuard()});
addEventListener('final-decision-ready',()=>{if(originStructural)scheduleGuard()});
document.addEventListener('click',e=>{if(e.target?.id==='applyOddsBtn')onApply();if(e.target?.id==='clearOddsBtn')onClear()},true);
const css=document.createElement('style');css.textContent='body.rsaStructuralOnly #finalDecisionCard[data-structural-stale="1"]{display:none!important}';document.head.appendChild(css);
function bind(){bindAnalyze();setMode()}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
