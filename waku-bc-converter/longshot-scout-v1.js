(()=>{'use strict';
if(window.__LONGSHOT_SCOUT_V1)return;window.__LONGSHOT_SCOUT_V1=true;
const V='longshot-scout-v1.3',FREEZE='2026-10-19';
let raf=0,lastSig='',marketRevealed=false;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>{const x=Number(String(v??'').normalize('NFKC').replace(/[,倍\s]/g,''));return Number.isFinite(x)?x:NaN};
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;render()})}
function hideMarket(){marketRevealed=false;lastSig=''}
function publish(reason,extra={}){window.LongshotScoutState={ready:true,version:V,status:'structural_scout_display_only',displayOnly:true,scoringImpact:false,probabilityImpact:false,rankingImpact:false,bettingImpact:false,automaticBuyImpact:false,freezeDate:FREEZE,reason,candidates:[],...extra,at:Date.now()};dispatchEvent(new CustomEvent('longshot-scout-ready',{detail:window.LongshotScoutState}))}
function oddsMap(){
  const raw=document.getElementById('oddsPaste')?.value||'',byNo=new Map;
  for(const line of raw.split(/\r?\n/)){
    const m=line.normalize('NFKC').trim().match(/^(\d+)\s*[,\t ]+\s*([\d.]+)/);if(!m)continue;
    const no=String(Number(m[1])),od=n(m[2]);if(Number(no)>0&&od>0)byNo.set(no,{no,od});
  }
  const rows=[...byNo.values()].sort((a,b)=>a.od-b.od||Number(a.no)-Number(b.no)),out=new Map;
  rows.forEach((r,i)=>out.set(r.no,{...r,pop:i+1}));return out;
}
function expectedHorseNos(field){
  const f=Math.max(0,Math.floor(Number(field)||0)),fr=Array.isArray(window.Finish600State?.rows)?window.Finish600State.rows:[];
  const fromFinish=[...new Set(fr.map(r=>String(Number(r?.no))).filter(x=>Number(x)>0))].sort((a,b)=>Number(a)-Number(b));
  if(f>0&&fromFinish.length===f)return fromFinish;
  return Array.from({length:f},(_,i)=>String(i+1));
}
function marketCoverage(OM,field){
  const expectedNos=expectedHorseNos(field),expected=expectedNos.length,expectedSet=new Set(expectedNos);
  const missing=expectedNos.filter(no=>!OM.has(no)),unexpected=[...OM.keys()].filter(no=>!expectedSet.has(no));
  const complete=expected>0&&OM.size===expected&&missing.length===0&&unexpected.length===0;
  return{complete,count:OM.size,expected,missing,unexpected};
}
function scenario(){let p=(window.FourAxisIntegrationState?.p||[]).slice(0,4).map(x=>Math.max(0,Number(x)||0));while(p.length<4)p.push(0);let s=p.reduce((a,b)=>a+b,0);if(s<=0){p=[...document.querySelectorAll('#rpciBars .probRow')].slice(0,4).map(x=>n((x.querySelector('b')?.textContent.match(/[\d.]+/)||['0'])[0])/100);s=p.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)}if(s<=0)return{p:[.25,.25,.25,.25],main:2};p=p.map(x=>(Number.isFinite(x)?x:0)/s);let main=0;for(let i=1;i<p.length;i++)if(p[i]>p[main])main=i;return{p,main}}
function scope(){const field=Number(document.getElementById('fieldSize')?.value)||Number(window.Finish600State?.rows?.length)||0,grade=String(document.getElementById('grade')?.value||'').toUpperCase(),date=String(document.getElementById('raceDate')?.value||'');return{field,grade,date,eligible:field>=12&&/^(G1|G2|G3|L|OP|3勝)$/.test(grade),prospective:Boolean(date&&date>FREEZE)}}
function marketRole(pop){if(!Number.isFinite(pop))return{tier:2,label:'構造候補',cls:'blind',note:'市場未開示'};if(pop<=4)return{tier:0,label:'🟢 本線候補',cls:'main',note:'市場も上位評価'};if(pop<=6)return{tier:1,label:'🟠 構造中穴・優位確認',cls:'mid',note:'5〜6人気帯は同レース・同人気帯比較で優位を確認'};if(pop<=9)return{tier:2,label:'⚪ 構造候補',cls:'normal',note:'7〜9人気帯の追加優位は未確立'};return{tier:3,label:'🔥 構造大穴',cls:'bomb',note:'高配当監視。市場の見落としは未確定'}}
function collect(){
  const finish=window.Finish600State,ability=window.M3PureAbilityState,alerts=window.StructuralAlertsState,OM=oddsMap(),sc=scenario(),S=scope(),coverage=marketCoverage(OM,S.field),market=coverage.complete?OM:new Map;
  if(!S.eligible||!finish?.ready||!Array.isArray(finish.rows)||!ability?.ready)return{scope:S,scenario:sc,marketCoverage:coverage,rows:[],reason:!S.eligible?'out_of_scope':!finish?.ready?'finish_not_ready':'ability_not_ready'};
  const abByNo=ability?.byNo||Object.fromEntries((ability?.rows||[]).map(r=>[String(r.no),r])),alertByNo=new Map((alerts?.rows||[]).map(r=>[String(r.no),r])),rows=[];
  for(const fr of finish.rows){
    const no=String(fr.no),m3Rank=Number(fr.finishRank),ab=abByNo[no],abilityRank=Number(ab?.abilityRank);
    if(!(Number.isFinite(m3Rank)&&m3Rank<=3&&Number.isFinite(abilityRank)&&abilityRank<=3))continue;
    const om=market.get(no)||null,mainRank=Number(fr.sc?.[sc.main]?.rank),ar=alertByNo.get(no),frontLevel=String(ar?.frontLevel||'none'),role=marketRole(om?.pop),reasons=[`M3 ${m3Rank}位`,`Ability v1 ${abilityRank}位`];
    if(Number.isFinite(mainRank))reasons.push(`主展開 ${mainRank}位`);if(frontLevel==='strong')reasons.push('前残り監視');else if(frontLevel==='weak')reasons.push('先行注意');
    const watch=Boolean(om&&om.pop>=10&&abilityRank===1);
    rows.push({no,name:String(fr.name||ab?.name||''),m3Rank,abilityRank,mainScenarioRank:Number.isFinite(mainRank)?mainRank:null,frontLevel,pop:om?.pop??null,odds:om?.od??null,role,ability1LongshotWatch:watch,reasons});
  }
  rows.sort((a,b)=>a.m3Rank-b.m3Rank||a.abilityRank-b.abilityRank||Number(a.no)-Number(b.no));
  return{scope:S,scenario:sc,marketCoverage:coverage,rows,reason:rows.length?'ok':'no_structural_candidate'};
}
function ensure(){const market=document.querySelector('#m3RaceLab [data-m3panel="market"]');if(!market)return null;let root=document.getElementById('longshotScoutV1');if(!root){root=document.createElement('section');root.id='longshotScoutV1';market.prepend(root)}return root}
function marketStat(r){if(!Number.isFinite(r.pop))return'';if(r.pop<=4)return'構造候補として先に選出。市場も上位評価しています。';if(r.pop<=6)return'検証：構造候補35.4% vs 同人気帯通常馬23.5%。レース単位cluster bootstrapでも優位を確認。前向き記録を継続。';if(r.pop<=9)return'検証：18.0% vs 15.6%。追加優位はまだ明確ではありません。';return`検証：10人気以下の構造候補11.2% vs 同人気帯通常馬6.1%ですが、人気順位・オッズ構成の影響を除き切れていません。市場の見落としとは断定せず、高配当候補として前向き記録。${r.abilityRank===1?' Ability 1位は探索タグのみです。':''}`}
function render(){
  const root=ensure();if(!root)return;const x=collect(),S=x.scope;
  if(!S.eligible){root.remove();publish('out_of_scope',{race:S});return}
  const rows=x.rows||[],coverage=x.marketCoverage||marketCoverage(oddsMap(),S.field),hasMarket=coverage.complete,mode=S.prospective?'Forward記録対象':'過去再生・診断のみ';
  if(!hasMarket&&marketRevealed)marketRevealed=false;
  const marketButton=hasMarket?(marketRevealed?'市場を隠す':'市場を開示'):(coverage.count===0?'単勝オッズ未入力':`単勝オッズ ${coverage.count}/${coverage.expected}頭`);
  const sig=[S.date,S.field,S.grade,S.prospective,x.scenario?.main,marketRevealed,hasMarket,coverage.count,coverage.expected,coverage.missing.join(','),coverage.unexpected.join(','),rows.map(r=>`${r.no}:${r.m3Rank}:${r.abilityRank}:${r.mainScenarioRank}:${r.frontLevel}:${r.pop}`).join('|')].join('~');
  if(sig===lastSig&&root.dataset.lsSig===sig)return;lastSig=sig;
  root.innerHTML=`<div class="lsHead"><div><small>STRUCTURAL SCOUT / POPULARITY BLIND</small><b>構造スカウター</b></div><span>${E(mode)}</span></div><div class="lsIntro"><b>候補選定は人気・単勝オッズを使いません。</b> M3 Top3 × Ability v1 Top3だけで先に候補化し、主展開・隊列は理由タグとして表示します。</div>${rows.length?`<div class="lsList">${rows.map(r=>{const visible=marketRevealed&&hasMarket,role=visible?r.role:{label:'構造候補',cls:'blind'};return`<article class="lsCard ${E(role.cls)}"><header><div><em>${E(role.label)}${r.ability1LongshotWatch&&visible?'・Ability1注目':''}</em><strong>${E(r.no)}番 ${E(r.name)}</strong></div>${visible&&Number.isFinite(r.pop)?`<span>${r.pop}人気・${r.odds.toFixed(1)}倍</span>`:'<span>市場非表示</span>'}</header><div class="lsReasons">${r.reasons.map((z,i)=>`<span class="${i<2?'core':'info'}">${E(z)}</span>`).join('')}</div><small>${visible?E(marketStat(r)):'主展開順位は候補条件ではありません。市場評価を見ずに構造だけを確認してください。'}</small></article>`}).join('')}</div>`:`<div class="lsEmpty">M3 Top3 × Ability v1 Top3 の構造一致候補はありません。</div>`}<div class="lsActions"><span class="lsCoverage">${hasMarket?'全頭オッズ確認済み':coverage.count?`全頭分が揃うまで市場開示しません（${coverage.count}/${coverage.expected}頭）`:'全頭分の単勝オッズ入力後に市場開示できます'}</span><button type="button" id="lsRevealMarket" class="${marketRevealed&&hasMarket?'on':''}" ${hasMarket?'':'disabled'}>${E(marketButton)}</button></div><div class="lsBench"><b>検証メモ</b><span>正式OOS：M3 Top3 × Ability v1 Top3 = 802頭・3着内41.0%</span><span>5〜6人気：35.4% vs 同人気帯通常馬23.5%（優位確認・前向き継続）</span><span>10人気以下：11.2% vs 6.1%（市場の見落としは未確定・高配当監視）</span></div><div class="lsFoot">人気は候補を決める条件ではなく、最後に役割を付ける市場レイヤーです。🟢本線 / 🟠中穴・優位確認 / ⚪通常 / 🔥構造大穴・高配当監視に分けます。自動買い・確率・M3順位・Ability順位・ワイド/馬連/三連複判定は変更しません。</div>`;
  root.dataset.lsSig=sig;
  root.querySelector('#lsRevealMarket')?.addEventListener('click',()=>{if(!hasMarket)return;marketRevealed=!marketRevealed;lastSig='';render()});
  const visible=marketRevealed&&hasMarket,stateRows=rows.map(r=>({...r,displayRole:visible?r.role.label:'構造候補',marketVisible:visible}));
  window.LongshotScoutState={ready:true,version:V,status:'structural_scout_display_only',displayOnly:true,scoringImpact:false,probabilityImpact:false,rankingImpact:false,bettingImpact:false,automaticBuyImpact:false,freezeDate:FREEZE,mode:S.prospective?'prospective_forward':'retrospective_diagnostic',race:S,scenarioMainIndex:x.scenario?.main,marketRevealed:visible,marketCoverage:{complete:coverage.complete,count:coverage.count,expected:coverage.expected,missing:[...coverage.missing],unexpected:[...coverage.unexpected]},candidates:stateRows,selectionPolicy:{popularityBlind:true,required:'M3 rank <=3 AND Ability v1 rank <=3',mainScenarioRankIsDisplayOnly:true,queueIsDisplayOnly:true,marketUsedOnlyAfterSelection:true,marketRequiresCompleteField:true,marketRoles:{'1-4':'main','5-6':'mid_evidence','7-9':'normal','10+':'structural_longshot_watch'},noWeightedCompositeScore:true,noAutomaticBuy:true},at:Date.now()};
  dispatchEvent(new CustomEvent('longshot-scout-ready',{detail:window.LongshotScoutState}));
}
const css=document.createElement('style');css.textContent=`#longshotScoutV1{margin:8px 0 10px;border:1px solid #355a70;background:linear-gradient(180deg,#0b2130,#0b1822);border-radius:14px;padding:9px}.lsHead{display:flex;justify-content:space-between;gap:8px;align-items:center}.lsHead>div{display:grid}.lsHead small{font-size:7px;letter-spacing:.12em;color:#79a6ba;font-weight:900}.lsHead b{font-size:12px;color:#eaf7fb}.lsHead>span{font-size:7px;border:1px solid #426275;border-radius:999px;padding:3px 6px;color:#a9c0cb}.lsIntro,.lsFoot,.lsEmpty{font-size:7px;line-height:1.6;color:#91a7b1}.lsIntro{margin-top:6px}.lsIntro b{color:#c9edf5}.lsList{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}.lsCard{border:1px solid #385666;border-radius:10px;background:#0e222c;padding:8px}.lsCard.main{border-color:#3b765e;background:#0d2922}.lsCard.mid{border-color:#806331;background:#2a2113}.lsCard.normal{border-color:#53636c;background:#172129}.lsCard.bomb{border-color:#86566e;background:#2b1824}.lsCard.blind{border-color:#3b6073;background:#0d2532}.lsCard header{display:flex;justify-content:space-between;gap:5px;align-items:flex-start}.lsCard header>div{display:grid;min-width:0}.lsCard em{font-size:7px;font-style:normal;color:#cfeaf3;font-weight:900}.lsCard.bomb em{color:#ffb5d2}.lsCard.mid em{color:#efd279}.lsCard.main em{color:#9be4c5}.lsCard strong{font-size:10px;color:#f5f8fa;line-height:1.35}.lsCard header>span{font-size:7px;color:#c0d0d7;white-space:nowrap}.lsReasons{display:flex;gap:4px;flex-wrap:wrap;margin:6px 0}.lsReasons span{font-size:7px;padding:3px 5px;border-radius:999px}.lsReasons .core{border:1px solid #477767;color:#a7e8cd;background:#0e2e26}.lsReasons .info{border:1px solid #4e5d63;color:#b8c8ce;background:#101a20}.lsCard small{display:block;font-size:6.5px;line-height:1.55;color:#8fa0a6}.lsActions{display:flex;justify-content:flex-end;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px}.lsCoverage{font-size:6.5px;color:#829aa6}.lsActions button{border:1px solid #4d7183;background:#102a38;color:#bfe2ed;border-radius:999px;padding:5px 9px;font-size:7px;font-weight:900}.lsActions button.on{border-color:#886079;background:#2b1c28;color:#ffd0e2}.lsActions button:disabled{opacity:.45}.lsBench{display:grid;gap:2px;margin-top:7px;padding:7px;border:1px dashed #3b5968;border-radius:9px;background:#0a1820;font-size:6.5px;color:#879da8}.lsBench b{color:#bcd9e4;font-size:7px}.lsFoot{margin-top:7px;border-top:1px dashed #35505d;padding-top:6px}.lsEmpty{margin-top:8px;padding:8px;border:1px dashed #4b555c;border-radius:9px}@media(max-width:760px){.lsList{grid-template-columns:1fr}}`;document.head.appendChild(css);
['finish600-ready','m3-pure-ability-ready','m3-race-lab-ready','structural-alerts-ready','race-shape-bias-ready','rsa-addons-ready','analysis-transition-ready'].forEach(ev=>addEventListener(ev,schedule));
const raceInputs=['raceDate','venue','raceName','fieldSize','surface','distance','grade','going'];
raceInputs.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.addEventListener(id==='raceName'||id==='fieldSize'||id==='distance'?'input':'change',()=>{hideMarket();schedule()})});
document.getElementById('oddsPaste')?.addEventListener('input',()=>{hideMarket();schedule()});
document.addEventListener('click',e=>{const id=e.target?.id;if(['analyzeBtn','parseCsvBtn','applyOddsBtn','demoBtn','clearOddsBtn','clearCsvBtn'].includes(id)){hideMarket();setTimeout(schedule,80)}},true);
schedule();
})();