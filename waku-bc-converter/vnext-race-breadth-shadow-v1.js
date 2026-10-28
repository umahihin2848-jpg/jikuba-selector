(()=>{'use strict';
if(!window.RSAMobileLean||window.__VNEXT_RACE_BREADTH_SHADOW_V1)return;
window.__VNEXT_RACE_BREADTH_SHADOW_V1=true;
const V='vnext-race-breadth-shadow-v1.1',$=id=>document.getElementById(id);let raf=0,last='';
const MARKET_CUT=0.48366774242113353;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function schedule(ms=0){setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})},ms)}
function marketSpread(){
 const txt=$('oddsPaste')?.value||'',parsed=window.ShapeCore?.parseOdds?.(txt),odds=parsed?.odds||{};
 const vals=Object.values(odds).map(Number).filter(x=>Number.isFinite(x)&&x>0);if(vals.length<2)return null;
 const inv=vals.map(x=>1/x),sum=inv.reduce((a,b)=>a+b,0),p=inv.map(x=>x/sum),neff=1/p.reduce((a,b)=>a+b*b,0),ratio=neff/vals.length;
 return{n:vals.length,neffRatio:ratio,concentrated:ratio<=MARKET_CUT,label:ratio<=MARKET_CUT?'人気が上位に集まる':'人気がばらける'};
}
function axisLabel(t){return t==='A'?'軸は強め':t==='B'?'軸はまずまず':t==='C'?'軸は慎重':'軸固定は避けたい'}
function collect(){
 const ax=window.VNextAxisShadowV1State,op=window.VNextOpponentDiagnosticShadowV1State,ms=marketSpread();
 if(!ax?.ready)return{ready:false,reason:'軸の評価待ち'};if(!op?.ready)return{ready:false,reason:'相手候補の評価待ち'};if(!ms)return{ready:false,reason:'全頭の単勝オッズ待ち'};
 const tier=String(ax.axis?.tier||''),main=(op.top4||[]).filter(x=>x.key==='main').length,strong=(op.top4||[]).filter(x=>x.key==='strong').length,cover=(op.top4||[]).filter(x=>x.key==='cover').length;
 let mode='neutral',headline='相手の優先順位は普通',advice='本線・有力・押さえの順で見ます。自動で点数は変えません。';
 if(ms.concentrated&&['A','B'].includes(tier)){mode='focus';headline='本線を厚くしやすい';advice='人気が上位に集まり、軸もA/B。上位相手を厚めにしやすい形です。ただし2頭だけに自動で絞るほどの根拠はまだありません。'}
 else if(!ms.concentrated){mode='wide';headline='相手は広めに見たい';advice='人気がばらけています。過去確認では上位2頭だけだと取りこぼしが増えたため、押さえまで残して考えます。'}
 else if(['C','D'].includes(tier)){mode='axisweak';headline='相手より軸を慎重に';advice='相手の順番はつけやすくても、軸の信頼が低めです。点数を減らす理由にはしません。'}
 const dataLabel=ax.route==='FULL_EXACT_QUEUE'?'完全計算':'安全計算';
 return{ready:true,version:V,productionChanged:false,automaticTicketChange:false,mode,headline,advice,tier,axisText:axisLabel(tier),market:ms,dataLabel,main,strong,cover,route:ax.route,at:Date.now()};
}
function ensure(){let r=$('vnextRaceBreadthShadowV1');if(r)return r;const host=$('vnextOpponentDiagV1')||$('imsTicket')||$('marketSection');if(!host)return null;r=document.createElement('section');r.id='vnextRaceBreadthShadowV1';r.className='card';r.dataset.shadow='true';if(host.id==='vnextOpponentDiagV1')host.insertAdjacentElement('afterend',r);else if(host.id==='imsTicket')host.appendChild(r);else host.insertAdjacentElement('beforebegin',r);return r}
function css(){if($('vnext-breadth-css'))return;const s=document.createElement('style');s.id='vnext-breadth-css';s.textContent=`#vnextRaceBreadthShadowV1{border:1px solid #35536a;background:#091827;margin:9px 0;border-radius:14px;padding:10px}.vrbHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.vrbHead b{font-size:12px}.vrbBadge{font-size:7px;border:1px solid #52697a;border-radius:999px;padding:3px 6px;color:#a9bdca}.vrbHero{margin-top:8px;border:1px solid #3b5669;border-radius:11px;padding:9px;background:#0a1d2c}.vrbHero.focus{border-color:#3f7e61;background:#0c2821}.vrbHero.wide{border-color:#826a45;background:#282013}.vrbHero.axisweak{border-color:#76515d;background:#26191e}.vrbHero b{display:block;font-size:12px}.vrbHero small{display:block;font-size:8px;color:#9bb0bb;line-height:1.5;margin-top:4px}.vrbGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}.vrbM{border:1px solid #30495d;border-radius:9px;padding:6px;background:#0a1e2d}.vrbM span{display:block;font-size:7px;color:#7f98a8}.vrbM b{display:block;font-size:9px;margin-top:2px}.vrbFoot{font-size:7px;color:#7892a1;line-height:1.5;margin-top:8px}@media(max-width:420px){.vrbGrid{grid-template-columns:1fr 1fr}}`;document.head.appendChild(s)}
function render(){css();const root=ensure();if(!root){schedule(250);return}const d=collect();if(!d.ready){root.innerHTML=`<div class="vrbHead"><b>相手の広がり</b><span class="vrbBadge">研究表示</span></div><div class="vrbFoot">${esc(d.reason||'計算待ち')}</div>`;return}const sig=JSON.stringify([d.mode,d.tier,d.market.neffRatio,d.main,d.strong,d.cover,d.route]);if(sig===last)return;last=sig;root.innerHTML=`<div class="vrbHead"><b>相手の広がり</b><span class="vrbBadge">Shadow / 買い目は自動変更しません</span></div><div class="vrbHero ${esc(d.mode)}"><b>${esc(d.headline)}</b><small>${esc(d.advice)}</small></div><div class="vrbGrid"><div class="vrbM"><span>軸</span><b>${esc(d.axisText)}</b></div><div class="vrbM"><span>人気の広がり</span><b>${esc(d.market.label)}</b></div><div class="vrbM"><span>本線相手</span><b>${d.main}頭</b></div><div class="vrbM"><span>計算</span><b>${esc(d.dataLabel)}</b></div></div><div class="vrbFoot">固定基準：2020〜23の人気の散らばり中央値で区分。2024〜26では人気集中時、相手優先上位2頭で拾えた率76.8%、人気分散時54.3%。ただし2020〜23では差が小さかったため、現時点では「厚くする/広めに見る」の補助表示だけに使います。</div>`;window.VNextRaceBreadthShadowV1State=d;dispatchEvent(new CustomEvent('vnext-race-breadth-shadow-ready',{detail:d}))}
['vnext-axis-shadow-ready','vnext-opponent-diagnostic-shadow-ready','decision-shell-v2-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,()=>schedule(40)));document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste')schedule(80)},true);document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id)){last='';schedule(120)}},true);if(document.readyState==='loading')addEventListener('DOMContentLoaded',()=>schedule(300),{once:true});else schedule(300);window.VNextRaceBreadthShadowV1={ready:true,version:V,schedule,collect};
})();
