(()=>{'use strict';
if(window.__LOGIC45_STRATEGIES_V1)return;window.__LOGIC45_STRATEGIES_V1=true;
const V='logic45-strategies-v1.1';
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').trim();
const pairKey=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join('-');
let raf=0,lastSig='';
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
function sameHorse(a,b){const x=norm(a),y=norm(b);return !x||!y||x===y}
function winOdds(){
  const by=new Map();
  for(const line of String($('oddsPaste')?.value||'').split(/\r?\n/)){
    const m=line.normalize('NFKC').trim().match(/^(\d+)\s*[,\t ]+\s*([\d.]+)/);if(!m)continue;
    const no=String(Number(m[1])),od=Number(m[2]);if(Number(no)>0&&od>0)by.set(no,{no,od});
  }
  const a=[...by.values()].sort((x,y)=>x.od-y.od||Number(x.no)-Number(y.no));
  a.forEach((x,i)=>x.pop=i+1);return a;
}
function runnerRows(){
  return (window.Finish600State?.rows||[])
    .filter(r=>Number.isFinite(Number(r?.no))&&Number(r.no)>0)
    .slice().sort((a,b)=>Number(a.no)-Number(b.no));
}
function marketCoverage(odds){
  const runners=runnerRows(),market=odds.slice().sort((a,b)=>Number(a.no)-Number(b.no));
  const expected=runners.length||Number($('fieldSize')?.value)||0;
  if(!(expected>0))return{complete:false,count:market.length,expected:0,mode:'unknown',byRunnerNo:{}};
  if(runners.length){
    if(market.length!==runners.length)return{complete:false,count:market.length,expected:runners.length,mode:'runner_count',byRunnerNo:{}};
    const got=new Map(market.map(x=>[String(x.no),x]));
    const exact=runners.every(r=>got.has(String(r.no)));
    if(exact){
      return{complete:true,count:market.length,expected:runners.length,mode:'exact',byRunnerNo:Object.fromEntries(runners.map(r=>[String(r.no),got.get(String(r.no))]))};
    }
    const byRunnerNo={};
    runners.forEach((r,i)=>{byRunnerNo[String(r.no)]=market[i]});
    return{complete:true,count:market.length,expected:runners.length,mode:'ordered_active',byRunnerNo,internalNos:runners.map(r=>String(r.no)),actualNos:market.map(x=>String(x.no))};
  }
  return{complete:market.length===expected,count:market.length,expected,mode:'count_only',byRunnerNo:{}};
}
function scenarioMain(){
  const direct=Number(window.M3RaceLabState?.mainScenario);
  if(Number.isInteger(direct)&&direct>=0&&direct<=3)return direct;
  const p=(window.FourAxisIntegrationState?.p||[]).slice(0,4).map(x=>Math.max(0,Number(x)||0));
  if(!p.length)return null;let j=0;for(let i=1;i<p.length;i++)if(p[i]>p[j])j=i;return j;
}
function logic4(){
  const ability=window.M3PureAbilityState,finish=window.Finish600State,queue=window.ValidatedQueueState,risk=window.PositionRiskState;
  if(!ability?.ready||!finish?.ready||!queue?.ready||!risk?.ready)return{ready:false,status:'waiting',reason:'Ability / M3 / 隊列 / P10 の計算待ち'};
  const a1=(ability.rows||[]).find(r=>Number(r.abilityRank)===1);
  if(!a1)return{ready:true,status:'off',reason:'Ability 1位を特定できません'};
  const no=String(a1.no),fr=(finish.rows||[]).find(r=>String(r.no)===no),q=queue.byNo?.[no]||(queue.rows||[]).find(r=>String(r.no)===no),pr=risk.byNo?.[no]||(risk.rows||[]).find(r=>String(r.no)===no);
  if(!fr||!q||!pr||!sameHorse(a1.name,fr.name)||!sameHorse(a1.name,q.name)||!sameHorse(a1.name,pr.name))return{ready:true,status:'waiting',reason:'Logic4用の馬データ同期待ち',horse:{no,name:a1.name||''}};
  const m3Rank=Number(fr.finishRank),frontness=Number(q.frontness5),p10=Number(pr.p10),checks={ability1:true,m3Top3:Number.isFinite(m3Rank)&&m3Rank<=3,p10Low:Number.isFinite(p10)&&p10<.20,front70:Number.isFinite(frontness)&&frontness>=.70};
  const active=Object.values(checks).every(Boolean);
  return{ready:true,status:active?'active':'off',horse:{no,name:a1.name||fr.name||q.name||pr.name||''},m3Rank,frontness,p10,checks,rule:'Ability1位 × M3 Top3 × P10<20% × 前方度≥70%',historical:{n:88,winRate:.284,winROI:1.356,quinellaROI:1.593,exactaROI:2.349},researchNote:'馬連・馬単の相手人気は過去検証では最終人気。実戦では参考表示のみ。'};
}
function logic5(){
  const finish=window.Finish600State;if(!finish?.ready)return{ready:false,status:'waiting',reason:'M3計算待ち'};
  const main=scenarioMain();if(main===null)return{ready:false,status:'waiting',reason:'メインシナリオ計算待ち'};
  const odds=winOdds(),coverage=marketCoverage(odds);
  if(!coverage.complete)return{ready:true,status:'waiting_market',reason:`T−15単勝オッズを出走馬分入力 ${coverage.count}/${coverage.expected}`,coverage,mainScenario:main};
  const favorite=odds.find(x=>x.pop===1);
  if(!favorite)return{ready:true,status:'off',reason:'1番人気を特定できません',coverage,mainScenario:main};
  const exactMarket=new Map(odds.map(x=>[x.no,x])),elig=[];
  for(const fr of finish.rows||[]){
    const internalNo=String(fr.no),mk=coverage.byRunnerNo?.[internalNo]||exactMarket.get(internalNo),m3Rank=Number(fr.finishRank),mainRank=Number(fr.sc?.[main]?.rank);
    if(!mk||mk.pop<7||mk.pop>9||!Number.isFinite(m3Rank)||!Number.isFinite(mainRank))continue;
    if(m3Rank<=3&&mainRank<=3)elig.push({no:String(mk.no),internalNo,name:fr.name||'',pop:mk.pop,od:mk.od,m3Rank,mainRank,sum:m3Rank+mainRank,maxRank:Math.max(m3Rank,mainRank)});
  }
  elig.sort((a,b)=>a.sum-b.sum||a.maxRank-b.maxRank||a.pop-b.pop||Number(a.no)-Number(b.no));
  const challenger=elig[0]||null;
  if(!challenger)return{ready:true,status:'off',reason:'7〜9番人気に M3 Top3 × 本線Top3 の挑戦馬なし',favorite,eligible:[],coverage,mainScenario:main};
  return{ready:true,status:'active',favorite,challenger,eligible:elig,coverage,mainScenario:main,ticket:pairKey(favorite.no,challenger.no),rule:'T−15 1番人気 × T−15 7〜9番人気の構造挑戦馬（M3 Top3 × 本線Top3）',tieBreak:'M3+本線順位が最小 → max順位が小さい → 人気上位',historical:{n:273,hits:12,hitRate:.043956,roi:1.4696},researchNote:'過去成績は最終人気代理。実戦はT−15固定で前向き検証。'};
}
function ensure(){
  let root=$('logic45StrategiesV1');if(root)return root;
  const anchor=$('structuralTicketEngineV3')||$('longshotScoutV1')||document.querySelector('#m3RaceLab [data-m3panel="market"]')||$('marketSection');
  if(!anchor)return null;root=document.createElement('section');root.id='logic45StrategiesV1';
  anchor.insertAdjacentElement(anchor.id==='structuralTicketEngineV3'?'afterend':anchor.id==='longshotScoutV1'?'afterend':'afterbegin',root);return root;
}
function check(label,ok,text){return`<span class="l45check ${ok?'ok':'no'}"><i>${ok?'✓':'–'}</i><b>${E(label)}</b><small>${E(text)}</small></span>`}
function logic4Html(x){
  if(!x.ready||x.status==='waiting')return`<article class="l45card wait"><header><div><small>LOGIC 4</small><b>FRONT CORE</b></div><span>WAIT</span></header><p>${E(x.reason||'計算待ち')}</p></article>`;
  const h=x.horse||{},active=x.status==='active';
  if(!x.checks)return`<article class="l45card off"><header><div><small>LOGIC 4</small><b>FRONT CORE</b></div><span>OFF</span></header><p>${E(x.reason||'非該当')}</p></article>`;
  return`<article class="l45card ${active?'active':'off'}"><header><div><small>LOGIC 4</small><b>FRONT CORE</b></div><span>${active?'🟢 該当':'— 非該当'}</span></header><strong>${E(h.no)}番 ${E(h.name)}</strong><div class="l45checks">${check('Ability',true,'1位')}${check('M3',x.checks.m3Top3,Number.isFinite(x.m3Rank)?`${x.m3Rank}位`:'—')}${check('P10',x.checks.p10Low,Number.isFinite(x.p10)?`${Math.round(x.p10*100)}%`:'—')}${check('前方度',x.checks.front70,Number.isFinite(x.frontness)?`${Math.round(x.frontness*100)}%`:'—')}</div><p>${active?'単勝軸候補。馬連・馬単の相手は現在人気で参考表示し、本番判定には混ぜません。':'4条件すべて一致した時だけ発火します。'}</p><footer>固定条件｜88例：単勝ROI 135.6% / 馬連159.3% / 馬単234.9%（相手は最終人気検証のためShadow）</footer></article>`;
}
function logic5Html(x){
  if(!x.ready||x.status==='waiting'||x.status==='waiting_market')return`<article class="l45card wait"><header><div><small>LOGIC 5</small><b>STRUCTURAL CHALLENGER</b></div><span>WAIT</span></header><p>${E(x.reason||'T−15待ち')}</p><footer>単勝オッズ1回だけ使用。発走15分前の出走馬オッズを入力して固定判定。</footer></article>`;
  if(x.status!=='active')return`<article class="l45card off"><header><div><small>LOGIC 5</small><b>STRUCTURAL CHALLENGER</b></div><span>— 非該当</span></header><p>${E(x.reason||'候補なし')}</p><footer>T−15 7〜9人気 × M3 Top3 × 本線Top3 のみ。</footer></article>`;
  const f=x.favorite,c=x.challenger,mapNote=x.coverage?.mode==='ordered_active'?'｜欠番対応':'';
  return`<article class="l45card active"><header><div><small>LOGIC 5</small><b>STRUCTURAL CHALLENGER</b></div><span>🟡 T−15 SHADOW</span></header><div class="l45pair"><div><em>1番人気</em><strong>${E(f.no)}番</strong><small>${Number(f.od).toFixed(1)}倍</small></div><i>×</i><div><em>構造挑戦馬</em><strong>${E(c.no)}番 ${E(c.name)}</strong><small>${c.pop}人気 ${Number(c.od).toFixed(1)}倍｜M3 ${c.m3Rank}位 / 本線 ${c.mainRank}位${mapNote}</small></div></div><div class="l45ticket"><span>馬連 1点</span><b>${E(x.ticket)}</b></div><p>複数候補時は「M3+本線順位 → max順位 → 人気」の固定順で1頭だけ選択。</p><footer>2025–26最終人気代理 273例：12的中 / ROI 146.96%。実戦T−15は前向き検証中。</footer></article>`;
}
function render(){
  const l4=logic4(),l5=logic5(),prod=window.StructuralTicketEngineV3State,root=ensure();if(!root)return;
  const sig=JSON.stringify([l4.status,l4.horse?.no,l4.m3Rank,l4.frontness,l4.p10,l5.status,l5.ticket,l5.coverage?.count,l5.coverage?.mode,prod?.wide?.status,prod?.quinella?.status,prod?.trio?.status]);
  if(sig===lastSig&&root.dataset.sig===sig)return;lastSig=sig;root.dataset.sig=sig;
  root.innerHTML=`<div class="l45head"><div><small>INDEPENDENT LOGICS</small><b>Logic 1〜5</b></div><span>1〜3 本番固定 / 4〜5 独立</span></div><div class="l45prod"><span>Logic1 ワイド <b>${prod?.wide?.status==='candidate'?'🟢 BUY':prod?.wide?.status==='hold'||prod?.wide?.status==='waiting_market'?'🟡 WAIT':'—'}</b></span><span>Logic2 馬連 <b>${prod?.quinella?.status==='candidate'?'🟢 BUY':prod?.quinella?.status==='hold'||prod?.quinella?.status==='waiting_market'?'🟡 WAIT':'—'}</b></span><span>Logic3 三連複 <b>${prod?.trio?.status==='candidate'?'🟢 BUY':prod?.trio?.status==='hold'||prod?.trio?.status==='waiting_market'?'🟡 WAIT':'—'}</b></span></div><div class="l45grid">${logic4Html(l4)}${logic5Html(l5)}</div><div class="l45note">Logic4/5は既存のLogic1〜3の判定・買い目・資金配分を変更しません。各ロジックは独立して発火します。</div>`;
  window.Logic45StrategiesState={ready:true,version:V,productionUntouched:true,logic4:l4,logic5:l5,at:Date.now()};
  dispatchEvent(new CustomEvent('logic45-strategies-ready',{detail:window.Logic45StrategiesState}));
}
const css=document.createElement('style');css.textContent=`#logic45StrategiesV1{margin:9px 0 11px;border:1px solid #43647a;background:linear-gradient(180deg,#0a1d29,#07151e);border-radius:15px;padding:10px}.l45head{display:flex;justify-content:space-between;gap:8px;align-items:center}.l45head small{display:block;font-size:7px;letter-spacing:.12em;color:#79a9bd;font-weight:900}.l45head b{font-size:13px;color:#eef8fb}.l45head>span{font-size:7px;color:#a6bdc8;border:1px solid #3b5d6e;border-radius:999px;padding:4px 7px}.l45prod{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}.l45prod span{display:flex;justify-content:space-between;gap:5px;border:1px solid #294b5d;background:#0a202d;border-radius:9px;padding:6px;font-size:7px;color:#8ea9b6}.l45prod b{font-size:8px;color:#eaf6fa}.l45grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.l45card{border:1px solid #315264;background:#0b2230;border-radius:12px;padding:9px;min-width:0}.l45card.active{border-color:#3d775f;background:#0c2924}.l45card.wait{border-color:#756437;background:#292414}.l45card.off{opacity:.78}.l45card header{display:flex;justify-content:space-between;gap:7px;align-items:flex-start}.l45card header small{display:block;font-size:7px;letter-spacing:.1em;color:#7e9ead}.l45card header b{font-size:10px}.l45card header>span{font-size:7px;font-weight:900;white-space:nowrap}.l45card>strong{display:block;font-size:14px;margin-top:8px;color:#f0f9fb}.l45card p,.l45card footer{font-size:7px;line-height:1.5;color:#8da8b4;margin:7px 0 0}.l45card footer{border-top:1px solid rgba(160,195,210,.12);padding-top:6px}.l45checks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:7px}.l45check{border:1px solid #345466;background:#0a1f2b;border-radius:8px;padding:5px;min-width:0}.l45check.ok{border-color:#3c6f5b;background:#0c2722}.l45check i{font-size:8px;font-style:normal;color:#7592a0}.l45check.ok i{color:#82ddb4}.l45check b,.l45check small{display:block}.l45check b{font-size:7px;color:#dcebf0;margin-top:2px}.l45check small{font-size:7px;color:#8ba5b0;margin-top:1px}.l45pair{display:grid;grid-template-columns:1fr auto 1.4fr;gap:7px;align-items:center;margin-top:8px}.l45pair>div{border:1px solid #355b69;border-radius:9px;background:#0a202b;padding:7px}.l45pair em,.l45pair small{display:block;font-size:7px;font-style:normal;color:#83a0ac}.l45pair strong{display:block;font-size:11px;color:#eef8fb;margin:2px 0}.l45pair>i{font-style:normal;font-weight:950;color:#78a3b6}.l45ticket{display:flex;justify-content:space-between;align-items:center;margin-top:7px;border:1px solid #4a725f;background:#102b25;border-radius:9px;padding:7px}.l45ticket span{font-size:7px;color:#8fc7aa}.l45ticket b{font-size:15px;color:#e9faf2}.l45note{font-size:7px;color:#748f9b;line-height:1.5;margin-top:7px}@media(max-width:620px){.l45grid{grid-template-columns:1fr}.l45checks{grid-template-columns:1fr 1fr}.l45prod{grid-template-columns:1fr}.l45head{align-items:flex-start}.l45head>span{white-space:normal;text-align:right;max-width:145px}}`;
document.head.appendChild(css);
['structural-ticket-engine-v3-ready','m3-pure-ability-ready','finish600-ready','validated-queue-ready','position-risk-ready','m3-race-lab-ready','four-axis-integration-ready','rsa-analysis-complete'].forEach(ev=>addEventListener(ev,()=>setTimeout(schedule,0)));
document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste'){lastSig='';setTimeout(schedule,50)}},true);
document.addEventListener('click',e=>{if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id)){lastSig='';setTimeout(schedule,80)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();