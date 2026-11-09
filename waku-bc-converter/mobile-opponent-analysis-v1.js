(()=>{'use strict';
if(!window.RSAMobileLean||window.__MOBILE_OPPONENT_ANALYSIS_V1)return;window.__MOBILE_OPPONENT_ANALYSIS_V1=true;
const V='mobile-opponent-analysis-v1.6-mineta-insights',BUILD='20261110mineta1',$=id=>document.getElementById(id);
let raf=0,timer=0,last='',currentRaceKey='',selectedNo='',paceOpen=false,m4Open=false;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>{if(v===null||v===undefined||v==='')return NaN;const x=Number(v);return Number.isFinite(x)?x:NaN};
const pct=(v,d=0)=>Number.isFinite(N(v))?`${(N(v)*100).toFixed(d)}%`:'—';
const rank=v=>Number.isFinite(N(v))?`#${Math.round(N(v))}`:'—';
function schedule(ms=0){clearTimeout(timer);timer=setTimeout(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;render()})},ms)}
function raceKey(){return ['raceDate','venue','raceName','surface','distance'].map(id=>$(id)?.value||'').join('|')||'current'}
function storeKey(){return`rsaOppAnalysis:${raceKey()}`}
function loadPrefs(){try{return JSON.parse(localStorage.getItem(storeKey())||'{}')}catch(e){return{}}}
function savePrefs(p){try{localStorage.setItem(storeKey(),JSON.stringify(p))}catch(e){}}
function pref(no,k){return loadPrefs()?.[String(no)]?.[k]??''}
function setPref(no,k,v){const p=loadPrefs();p[String(no)]={...(p[String(no)]||{}),[k]:v};savePrefs(p)}
function css(){if($('moa1-css'))return;const s=document.createElement('style');s.id='moa1-css';s.textContent=`
body.iosMobileShellV2 #mpuConclusion>.mpuSection{display:none!important}body.iosMobileShellV2 #mpuResearch{display:none!important}
#moaRoot{display:block}.moaHead{border:1px solid #31566a;border-radius:15px;background:linear-gradient(180deg,#0b2230,#081923);padding:11px 12px}.moaHead small{font-size:7px;letter-spacing:.12em;color:#7898a7;font-weight:900}.moaHead h2{margin:3px 0 0;font-size:17px;color:#eff8fb}.moaHead p{margin:5px 0 0;font-size:8px;line-height:1.55;color:#91a9b4}.moaFlow{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px}.moaFlow span{border:1px solid #2b4a5a;border-radius:8px;background:#091b25;padding:5px 3px;text-align:center;font-size:6px;color:#86a0ac}.moaSec{margin-top:9px;border:1px solid #294b5d;border-radius:14px;background:#091c27;padding:10px}.moaSecHead{display:flex;align-items:center;justify-content:space-between;gap:7px}.moaSecHead h3{margin:0;font-size:11px;color:#eaf4f8}.moaSecHead span{font-size:6.5px;color:#8aa4af}.moaRule{margin-top:6px;font-size:7px;line-height:1.55;color:#7f9aa7}.moaList{display:grid;gap:7px;margin-top:8px}.moaCard{border:1px solid #315162;border-radius:12px;background:#0a202b;overflow:hidden}.moaCard.market{border-color:#5c5a3d}.moaCard.watch{border-color:#3f6170}.moaCard>summary{list-style:none;display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px}.moaCard>summary::-webkit-details-marker{display:none}.moaNo{width:34px;height:34px;border:1px solid #4d7588;border-radius:10px;background:#12394c;display:grid;place-items:center;font-size:14px;font-weight:950;color:#f2f8fb}.moaName b{display:block;font-size:10px;color:#eef7fa}.moaName small{display:block;margin-top:2px;font-size:6.5px;color:#839eaa;line-height:1.4}.moaType{font-size:6.5px;font-weight:900;border:1px solid #4b6a60;border-radius:999px;padding:4px 6px;color:#b9dfcf;background:#10271f;white-space:nowrap}.moaBody{border-top:1px solid #294b5d;padding:9px;background:#071923}.moaSix{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.moaLens{border:1px solid #294857;border-radius:9px;background:#0a202b;padding:7px;min-width:0}.moaLens span{display:block;font-size:6px;color:#7895a3}.moaLens b{display:block;margin-top:2px;font-size:8px;color:#e6f1f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.moaLens.risk b{color:#efc2a2}.moaLens.price b{color:#bfe6d1}.moaReason{margin-top:7px;display:grid;gap:5px}.moaBox{border-radius:9px;padding:7px 8px;font-size:7px;line-height:1.55}.moaGood{border:1px solid #3d705b;background:#0f2921;color:#b9e3cf}.moaBad{border:1px solid #76514b;background:#291a19;color:#e9b8ae}.moaThink{border:1px solid #5e5b3b;background:#252313;color:#e4d69a}.moaScenario{border:1px solid #345367;background:#0a1d29;color:#a9c5d1}.moaPriceBox{margin-top:7px;border:1px solid #3a5d50;border-radius:10px;background:#0d251f;padding:8px}.moaPriceGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.moaPriceBox label{display:block;font-size:6px;color:#83a598}.moaPriceBox input{margin-top:4px;min-height:34px!important;padding:6px 8px!important;font-size:11px!important}.moaPriceJudge{margin-top:6px;font-size:7px;line-height:1.45;color:#a9c7ba}.moaActions{display:flex;gap:5px;margin-top:7px}.moaCompareBtn{min-height:32px!important;border:1px solid #385a6a!important;border-radius:9px!important;background:#0b202b!important;color:#9db7c2!important;font-size:7px!important;padding:5px 8px!important}.moaCompareBtn.on{border-color:#5c806e!important;background:#123229!important;color:#c9efdc!important}.moaCompare{margin-top:8px;border:1px solid #4a6659;border-radius:11px;background:#0d241e;padding:9px}.moaCompare h4{margin:0 0 7px;font-size:9px;color:#dff2e8}.moaVs{display:grid;grid-template-columns:64px 1fr 1fr;gap:3px;font-size:6.5px}.moaVs>*{padding:5px;border-bottom:1px solid rgba(130,170,190,.12)}.moaVs b{color:#eaf4f8}.moaVs span{color:#8ca6b1}.moaPace{margin-top:7px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.moaPace div{border:1px solid #2c4959;border-radius:8px;background:#091a24;padding:5px 3px;text-align:center}.moaPace span{display:block;font-size:5.5px;color:#7894a1}.moaPace b{display:block;margin-top:2px;font-size:9px;color:#e7f2f6}.moaScenarioRows{display:grid;gap:4px;margin-top:7px}.moaScenarioRow{display:grid;grid-template-columns:52px repeat(3,1fr);gap:4px;align-items:center;font-size:6.5px}.moaScenarioRow>span{color:#839da9}.moaScenarioRow>b{border:1px solid #294858;border-radius:7px;padding:5px;text-align:center;color:#dcebf0;background:#0a1d27}.moaBiasCtl{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:7px;border:1px solid #4c5b3a;border-radius:9px;background:#211f12;padding:8px}.moaBiasCtl b{font-size:8px;color:#eadb9b}.moaBiasCtl button{min-height:30px!important;padding:4px 9px!important;border-radius:999px!important;font-size:7px!important}.moaBiasList{display:grid;gap:4px;margin-top:6px}.moaBiasHorse{border:1px solid #5c5636;border-radius:8px;background:#211f13;padding:6px 7px;font-size:7px;color:#dbc985}.moaAxisExtra{margin-top:8px;border:1px solid #3a5d50;border-radius:11px;background:#0b241e;padding:9px}.moaAxisExtra h3{margin:0;font-size:10px;color:#d9f0e5}.moaAxisExtra p{margin:5px 0 0;font-size:7px;line-height:1.55;color:#9db7aa}.moaAxisBadges{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.moaAxisBadge{font-size:6.5px;border:1px solid #466658;border-radius:999px;padding:3px 6px;color:#b5dcc9}.moaAxisBadge.warn{border-color:#77534a;color:#e6b5aa}.moaEmpty{font-size:7px;color:#7f9aa7;border:1px dashed #36576a;border-radius:9px;padding:8px;margin-top:7px}@media(max-width:380px){.moaSix{grid-template-columns:1fr 1fr}.moaFlow{grid-template-columns:1fr 1fr 1fr}.moaLens{padding:6px}.moaCard>summary{grid-template-columns:34px minmax(0,1fr)}}
.moaM4Quick{display:block;margin-top:5px;color:#a8e6d0;font-size:11px;line-height:1.45;font-weight:750}.moaM4Sec{margin-bottom:12px}.moaM4Choice{font-size:12px;color:#bfe8dc;margin-top:8px;font-weight:800;line-height:1.5}.moaM4List{display:grid;gap:6px;margin-top:10px}.moaM4Item{border:1px solid #294c5f;border-radius:10px;background:#081c29;overflow:hidden}.moaM4Item.rise{border-color:#387a69}.moaM4Item.steady{border-color:#586f86}.moaM4Item>summary{list-style:none;display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:6px;padding:9px 7px;cursor:pointer;min-height:52px}.moaM4Item>summary::-webkit-details-marker{display:none}.moaM4No{border-radius:6px;padding:5px 2px;text-align:center;font-size:12px;font-weight:900;background:#143949;color:#edf7fb}.moaM4Names{min-width:0}.moaM4Names b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8f4f9}.moaM4Names small{display:block;font-size:10px;color:#94c7b5;margin-top:2px}.moaM4Main{text-align:right;white-space:nowrap}.moaM4Main b{display:block;font-size:11px;color:#eaf8f8}.moaM4Main small{display:block;font-size:11px;margin-top:3px;color:#b1d4df}.moaM4Detail{border-top:1px solid #254659;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:8px}.moaM4Detail>div{min-width:0;border:1px solid #294858;border-radius:7px;background:#102b39;text-align:center;padding:6px 2px}.moaM4Detail small{font-size:10px;display:block;color:#92b6c5}.moaM4Detail b{font-size:14px;display:block;margin-top:3px;color:#edfcfd}
.moaM4Filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:9px}
.moaM4Filter{min-width:0;min-height:40px!important;border:1px solid #35546a!important;border-radius:9px!important;background:#0d2432!important;color:#a7bdc9!important;font-size:10px!important;font-weight:800!important;padding:6px 2px!important}
.moaM4Filter span{font-variant-numeric:tabular-nums;color:#d4e6ef}
.moaM4Filter.on{border-color:#599580!important;background:#123c32!important;color:#e0fff0!important}
.moaM4Item.drop{border-color:#69534c}.moaM4ToLedger{margin-top:8px!important;width:100%;min-height:42px!important;border:1px solid #39735e!important;border-radius:11px!important;background:#113b30!important;color:#d9f6e8!important;font-size:11px!important;font-weight:850!important;padding:8px 10px!important}
.moaM4Names small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:380px){.moaM4Item>summary{grid-template-columns:25px minmax(0,1fr) auto;gap:4px;padding:7px 5px}.moaM4Names b{font-size:11px}.moaM4Names small{font-size:9px}.moaM4Main b,.moaM4Main small{font-size:10px}}
`;document.head.appendChild(s)}
function shell(){const ticket=$('imsTicket'),axis=$('imsAxis'),pace=$('imsPace');if(!ticket||!axis||!pace)return null;for(const [k,t] of [['ticket','軸馬'],['axis','全馬分析'],['pace','全馬比較']]){const b=document.querySelector(`[data-ims-tab="${k}"]`);if(b){b.textContent=t;b.removeAttribute('hidden')}}let root=$('moaRoot');if(!root){root=document.createElement('section');root.id='moaRoot';axis.insertBefore(root,axis.firstChild)}const all=$('mpuAllHorses');if(all&&all.parentElement!==pace)pace.insertBefore(all,pace.firstChild);return{ticket,axis,pace,root}}
function dataRows(){const F=window.Finish600State?.rows||[],A=window.M3PureAbilityState?.byNo||{},Q=window.ValidatedQueueState?.byNo||{},P=window.PositionRiskState?.byNo||{},Prof=(window.FourAbilityProfileV1State||window.FiveAbilityProfileV2State)?.rows||[],prof=Object.fromEntries(Prof.map(x=>[String(x.no),x])),ds=window.DecisionShellV2State,market=ds?.market?.byNo||Object.fromEntries((ds?.market?.rows||[]).map(x=>[String(x.no),x])),prod=window.ProductionDecisionPipelineV1State,pairSet=window.DecisionShellV2State?.structure?.kind==='double'?new Set((window.DecisionShellV2State.structure.candidates||[]).map(x=>String(x.no))):new Set(),axis=pairSet.size?'':String(prod?.stages?.axis?.no||'');return F.map(f=>{const no=String(f.no),a=A[no]||{},q=Q[no]||{},p=P[no]||{},m=market[no]||{},pr=prof[no]||{};return{no,name:String(f.name||a.name||''),axis:no===axis,pair:pairSet.has(no),abilityRank:N(a.abilityRank),abilityP3:N(a.top3),histN:N(a.histN),m3Rank:validRank(f.finishRank),sc:Array.isArray(f.sc)?f.sc.map(x=>validRank(x?.rank)):[],position:String(q.position||''),expectedRank:N(q.expectedRank),front:N(q.frontness5),frontRate:N(q.frontRate5),p10:N(p.p10),pop:N(m.pop),winOdds:N(m.od??m.odds),speed:N(pr.speedPct),ultra:N(pr.ultraPct),accel:N(pr.accelPct),sust:N(pr.sustPct)}})}

function validRank(v){if(v===null||v===undefined||v==='')return NaN;const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=20?n:NaN}
const SCL=['強前傾','前傾','標準','スロー'];
let m4Filter='all';
function setM4Filter(value){if(['all','stable','rise','drop'].includes(value))m4Filter=value;}
function m4Kind(s){if(s.stable)return'stable';if(s.up)return'rise';if(Number.isFinite(s.change)&&s.change<=-3)return'drop';return'other';}
function chosenM4(){
 const tr=window.RSAAnalysisTransitionState,finish=window.Finish600State,vis=window.RaceProgressVisualV1State;
 const generation=Number(tr?.generation)||0;
 const sourceOK=!!(vis?.ready&&vis.scenarioSource==='manual'&&Number.isInteger(vis.scenarioBand)&&vis.scenarioBand>=0&&vis.scenarioBand<=3&&Number(vis.generation||0)===generation&&(!finish?.generation||Number(finish.generation)===generation));
 if(sourceOK)return{band:vis.scenarioBand,source:'manual',text:'レース推移で手動選択'};
 const p=window.MobileAnalysisCoreState?.analysis?.pred?.p||window.FourAxisIntegrationState?.p||window.ScenarioStatisticsState?.scenarioProbabilities;
 if(Array.isArray(p)&&p.length===4){
  const numbers=p.map(x=>x===null||x===undefined||x===''?NaN:Number(x));
  if(numbers.every(x=>Number.isFinite(x)&&x>=0)){
   const sum=numbers.reduce((a,b)=>a+b,0);
   if(sum>0)return{band:numbers.indexOf(Math.max(...numbers)),source:'app-default',text:'アプリの最多確率帯（仮表示）'};
  }
 }
 return{band:null,source:'unset',text:'シナリオ未選択'};
}
function m4Stats(no,choice){
 const src=(window.Finish600State?.rows||[]).find(x=>String(x.no)===String(no));
 const m3=validRank(src?.finishRank);
 const all=SCL.map((_,i)=>validRank(src?.sc?.[i]?.rank));
 const full=all.every(Number.isFinite),selected=choice.band===null?NaN:all[choice.band];
 const top5=full?all.filter(x=>x<=5).length:null;
 const change=Number.isFinite(m3)&&Number.isFinite(selected)?m3-selected:NaN;
 return{m3,all,selected,top5,change,stable:top5===4,up:Number.isFinite(selected)&&selected<=5&&Number.isFinite(change)&&change>=3};
}
function m4BadgeText(s){if(s.stable)return'4展開で上位5';if(s.up)return'選択展開で浮上';return'参考比較'}
function m4Quick(no){
 const s=m4Stats(no,chosenM4());
 const d=Number.isFinite(s.change)?(s.change>0?' ↑'+s.change:s.change<0?' ↓'+(-s.change):' ±0'):'';
 return'<span class="moaM4Quick">選択M4 '+rank(s.selected)+d+' ｜ 上位5 '+(s.top5===null?'—':s.top5+'/4')+'</span>';
}
function m4Panel(rows,choice){
 const all=rows.map(x=>({...x,m4:m4Stats(x.no,choice)})).sort((a,b)=>Number(a.no)-Number(b.no));
 const shown=all.filter(x=>m4Filter==='all'||m4Kind(x.m4)===m4Filter);
 const fmt=x=>Number.isFinite(x)?'#'+x:'—';
 const delta=x=>!Number.isFinite(x)?'—':x>0?'↑'+x:x<0?'↓'+(-x):'±0';
 const options=[['all','全頭'],['stable','安定型'],['rise','展開浮上'],['drop','評価低下']];
 const counts=Object.fromEntries(options.map(x=>[x[0],x[0]==='all'?all.length:all.filter(r=>m4Kind(r.m4)===x[0]).length]));
 const buttons=options.map(([key,label])=>'<button type="button" class="moaM4Filter'+(m4Filter===key?' on':'')+'" data-oa-m4-filter="'+key+'" aria-pressed="'+(m4Filter===key?'true':'false')+'">'+label+' <span>'+counts[key]+'</span></button>').join('');
 const header='<section class="moaSec moaM4Sec"><div class="moaSecHead"><h3>④ Ability × M3 × M4｜全馬の展開別比較</h3><span>参考表示・買い目に非連動</span></div>'+
 '<div class="moaM4Choice">選択：'+(choice.band===null?'未選択':SCL[choice.band])+'｜'+E(choice.text)+'</div>'+
 '<div class="moaRule">安定型＝4展開すべてM4上位5位。展開浮上＝選択M4が上位5位でM3から3位以上上昇（安定型は除外）。評価低下＝選択M4がM3より3位以上下がった馬。複数該当時は安定型を優先。順位差は好走確率ではありません。</div>'+
 '<div class="moaM4Filters" role="group" aria-label="M4比較の表示絞り込み">'+buttons+'</div>';
 const content=shown.map(x=>{
  const s=x.m4,kind=m4Kind(s),tag=kind==='stable'?'4展開で上位5':kind==='rise'?'選択展開で浮上':kind==='drop'?'選択展開で低下':'参考比較';
  const className=kind==='rise'?' rise':kind==='stable'?' steady':kind==='drop'?' drop':'';
  return '<details class="moaM4Item'+className+'"><summary><span class="moaM4No">'+E(x.no)+'</span>'+
  '<span class="moaM4Names"><b>'+E(x.name)+'</b><small>Ability '+rank(x.abilityRank)+' ｜ '+E(tag)+'</small></span>'+
  '<span class="moaM4Main"><b>M3 '+fmt(s.m3)+' → M4 '+fmt(s.selected)+'</b><small>'+delta(s.change)+' ／ 上位5 '+(s.top5===null?'—':s.top5+'/4')+'</small></span></summary>'+
  '<div class="moaM4Detail">'+SCL.map((lab,i)=>'<div><small>'+lab+'</small><b>'+fmt(s.all[i])+'</b></div>').join('')+'</div></details>';
 }).join('');
 const note='<div class="moaRule">評価はあくまで参考。M3/M4の順位は3着内確率・着順やワイド期待値を意味しません。ワイドオッズと実購入・見送りの理由は発走前に「予想記録」に保存し、結果入力後に検証してください。</div>';
 const empty=shown.length?'':'<div class="moaEmpty">'+(all.length?'該当馬はありません。フィルターを変更してください。':'予測データがありません。')+'</div>';
 return header+'<div class="moaM4List">'+content+empty+'</div>'+note+'<button type="button" class="moaM4ToLedger" data-oa-open-ledger>📝 発走前の判断・ワイド価格を記録</button></section>';
}
function typeOf(r){const pop=r.pop<=4,ability=r.abilityRank<=3,m3=r.m3Rank<=3,risk=r.p10>=.5;if(pop&&(!ability||r.m3Rank>=7||risk))return['🔴','人気慎重型'];if(pop&&ability&&!risk&&r.m3Rank<=6)return['🟢','信頼型'];if(!pop&&m3)return['🔵','構造浮上型'];return['🟠','条件付き型']}
function scenarioInfo(r){const a=r.sc.filter(Number.isFinite);if(!a.length)return{label:'シナリオ待ち',best:'—',worst:'—',spread:NaN};const best=Math.min(...a),worst=Math.max(...a),spread=worst-best;if(a.length!==4)return{label:'一部の展開は未算出',best:`#${best}`,worst:`#${worst}`,spread};return{label:worst<=4?'全展開で上位':spread<=2?'展開変化に安定':spread>=6?'展開依存大':'展開で順位変動',best:`#${best}`,worst:`#${worst}`,spread}}
function strengths(r,bias){const a=[];if(r.abilityRank<=3)a.push(`Ability ${rank(r.abilityRank)}で地力面の裏付け`);if(r.m3Rank<=3)a.push(`M3 ${rank(r.m3Rank)}で今回構造上位`);if(r.pop<=4&&r.abilityRank<=4)a.push('市場評価とAbilityが同方向');if(r.p10<.2)a.push('後方化リスクが低い');if(bias&&(r.expectedRank<=5||r.front>=.55))a.push('前有利バイアス時の位置取り候補');return a.slice(0,3)}
function risks(r,pressure,bias){const a=[];if(r.histN<3)a.push(`Ability高クラス履歴${Number.isFinite(r.histN)?r.histN:'—'}走で材料少なめ`);if(r.p10>=.5)a.push(`P10 ${pct(r.p10)}で後方化リスク大`);else if(r.p10>=.2)a.push(`P10 ${pct(r.p10)}で位置取りに注意`);if(r.m3Rank>=7)a.push(`M3 ${rank(r.m3Rank)}で今回構造は低め`);if(pressure==='高'&&r.front>=.55)a.push('先行圧高で前の競り合いを受ける可能性');if(bias&&r.expectedRank>8)a.push('前有利バイアスと想定位置が逆');return a.slice(0,3)}
function marketView(r){if(!Number.isFinite(r.pop))return'市場入力待ち';if(r.pop<=4&&r.abilityRank<=3)return'市場評価にAbilityの裏付けあり';if(r.pop<=4&&r.m3Rank<=3)return'市場評価に今回構造の裏付けあり';if(r.pop<=4&&(r.abilityRank>4||r.m3Rank>6||r.p10>=.5))return'市場評価は高いが弱点もあり要確認';if(r.pop>4&&r.m3Rank<=3)return'市場支持は低めだが構造面は要確認';return'市場と構造を別々に確認'}
function scenarioText(r){const s=scenarioInfo(r);if(s.label==='全展開で上位')return`展開が変わってもM4上位を維持しやすい（最良${s.best}〜最悪${s.worst}）。`;if(s.label==='展開依存大')return`展開でM4順位が大きく動く（最良${s.best}〜最悪${s.worst}）。合うシナリオを確認したい。`;return`シナリオ別M4は最良${s.best}〜最悪${s.worst}。${s.label}。`}
function goodScenario(r,bias){if(bias&&(r.expectedRank<=5||r.front>=.55))return'前目〜好位を確保し、前有利の位置を活かせる形。';if(r.m3Rank<=3)return'基本M3上位の末脚構造を活かせる形。';if(r.abilityRank<=3)return'地力を発揮できる位置と流れに収まり、Ability優位をそのまま出せる形。';return'得意な位置取りに収まり、展開別M4評価が上がる流れ。'}
function badScenario(r,pressure,bias){if(r.p10>=.5)return'後方化して位置取り差を埋める負荷が大きくなる形。';if(pressure==='高'&&r.front>=.55)return'先行争いに巻き込まれ、前半で脚を使う形。';if(bias&&r.expectedRank>8)return'前有利の馬場で後ろからになり、位置取り差が残る形。';if(r.histN<3)return'昇級・履歴不足で、過去材料からの評価が安定しない形。';return'M3が下がる展開や想定より悪い位置取りになった形。'}
function maxRisk(r,pressure,bias){return risks(r,pressure,bias)[0]||'大きな単独リスクなし'}
function priceJudge(no){const w=N(pref(no,'wide')),min=N(pref(no,'min'));if(!Number.isFinite(w)&&!Number.isFinite(min))return'ワイド価格を入れると、リスクと価格を同じ場所で比較できます。';if(Number.isFinite(w)&&Number.isFinite(min))return w>=min?`現在 ${w.toFixed(1)}倍 ≥ 自分の最低ライン ${min.toFixed(1)}倍。価格条件は満たしています。`:`現在 ${w.toFixed(1)}倍 ＜ 自分の最低ライン ${min.toFixed(1)}倍。価格面では待ち。`;if(Number.isFinite(w))return`現在ワイド ${w.toFixed(1)}倍。上のリスクをこの価格で許容するか判断。`;return`自分の最低ライン ${min.toFixed(1)}倍。現在ワイドを入力して比較。`}
function miniCard(r){
 const active=selectedNo===String(r.no);
 const p=Number(r.p10),risk=Number.isFinite(p)?p>=.5?'caution':p>=.2?'attention':'low':'unknown';
 return '<button type="button" class="moaGridCard'+(active?' active':'')+'" data-oa-open-horse="'+E(r.no)+'" aria-expanded="'+(active?'true':'false')+'" aria-controls="moaHorseDetail">'+
  '<span class="moaGridHead"><span class="moaGridNo">'+E(r.no)+'</span><span class="moaGridRole">'+(r.pair?'Pair候補':r.axis?'軸馬':'')+'</span></span>'+
  '<strong class="moaGridName">'+E(r.name)+'</strong>'+
  '<span class="moaGridMetrics"><span><small>Ability</small><b>'+rank(r.abilityRank)+'</b></span><span><small>M3</small><b>'+rank(r.m3Rank)+'</b></span>'+
  '<span class="moaGridP10 '+risk+'"><small>P10</small><b>'+pct(r.p10)+'</b></span><span><small>想定位置</small><b>'+E(r.position||'—')+'</b></span></span>'+
  '<span class="moaGridMarket">'+(Number.isFinite(r.pop)?r.pop+'人気':'人気未入力')+'<i>・</i>単勝 '+(Number.isFinite(r.winOdds)?r.winOdds.toFixed(1)+'倍':'—')+'</span>'+
  '<span class="moaGridMore">'+(active?'分析を表示中':'タップで詳しく見る')+'</span></button>';
}
const MINETA_LABELS={
 sandwich:"逃げハサミ",outside:"逃げ馬のすぐ外",
 advance:"位置取り前進候補",recover:"道中後退から巻き返し"
};
function minetaDetail(h){
 const I=window.MinetaPositionStudyV1;
 const info=I?.inspectHorse?.(h.no);
 if(!info?.ready){
  const message=info?.reason||"研究用の前走通過順位を読み込み中です";
  return '<section class="moaMineta" aria-label="みねた式・研究分析">'+
   '<header><span>POSITION STUDY</span><h4>みねた式｜位置取りと決着形</h4><small>参考研究・自動推奨には未使用</small></header>'+
   '<p class="moaMinetaWaiting">'+E(message)+'</p></section>';
 }
 const row=info.row,notes=info.notes||[],signals=info.signals||[];
 const chips=signals.length?signals.map((key,i)=>'<div class="moaMinetaChip"><strong>'+E(MINETA_LABELS[key]||key)+'</strong>'+
  '<p>'+E(notes[i]||"前走通過・隊列から抽出した研究条件")+'</p></div>').join(''):
  '<p class="moaMinetaNone">'+(row.known?'4つの位置取り条件には該当しません。能力が低いという意味ではありません。':'前走の有効通過順位がなく、判定できません。')+'</p>';
 const prior=row.known&&row.corners.length?row.corners.join(' → '):'履歴不足';
 const expected=row.expected===null?'予測待ち':row.expected.toFixed(1)+'番手';
 const refs=(info.refs||[]).map(ref=>
  '<div class="moaMinetaRelation"><small>'+E(ref.label)+'</small>'+
  '<b>'+E(ref.no)+'番 '+E(ref.name)+'</b>'+
  '<p>'+E(ref.relation)+'</p></div>').join('');
 return '<section class="moaMineta" aria-label="みねた式・研究分析">'+
  '<header><span>POSITION STUDY / RESEARCH</span><h4>みねた式｜位置取りと決着形</h4><small>仮説の表示・買い目に非連動</small></header>'+
  '<div class="moaMinetaPosition"><div><small>前走の通過</small><b>'+E(prior)+'</b></div>'+
  '<div><small>今回の予測位置</small><b>'+E(expected)+'</b></div></div>'+
  '<div class="moaMinetaSignals"><h5>前走と枠の並びから見た特徴</h5>'+chips+'</div>'+
  '<div class="moaMinetaRefs"><h5>'+(info.isPair?'Pairの軸を仮定した位置関係':'軸との位置関係')+'</h5>'+
  (refs||'<p class="moaMinetaNone">比較対象を特定できません。</p>')+
  '<p class="moaMinetaUnproven">これは「同時に好走できる確率」ではありません。軸が好走する展開で選択馬の位置取りが成立するかを確認します。</p></div>'+
  '<footer>前走通過確認 '+info.known+'/'+info.field+'頭。抽出条件の一部はアプリ独自の研究用仮閾値。未検証のためAbility・M3・P10・見送り・期待値を変更しません。確定馬番との照合が必要です。</footer>'+
  '</section>';
}
function horseDetail(r,pressure,bias){
 const good=strengths(r,bias),bad=risks(r,pressure,bias),sc=scenarioInfo(r),w=pref(r.no,'wide'),mn=pref(r.no,'min');
 const odds=Number.isFinite(r.winOdds)?r.winOdds.toFixed(1)+'倍':'—';
 return '<section id="moaHorseDetail" class="moaSelectedDetail" aria-label="'+E(r.name)+'の詳細分析">'+
  '<header class="moaDetailHead"><div><small>'+E(r.no)+'番・選択した馬の詳細</small><h3>'+E(r.name)+'</h3></div>'+
  '<button type="button" data-oa-close-horse aria-label="詳細を閉じる">閉じる ×</button></header>'+
  '<div class="moaBody">'+
  '<div class="moaSix">'+
  '<div class="moaLens"><span>市場評価</span><b>'+(Number.isFinite(r.pop)?r.pop+'人気':'—')+' ／ '+E(odds)+'</b></div>'+
  '<div class="moaLens"><span>Ability・3着内参考</span><b>'+rank(r.abilityRank)+' ／ '+pct(r.abilityP3)+'</b></div>'+
  '<div class="moaLens"><span>M3・今回の構造</span><b>'+rank(r.m3Rank)+' ／ '+E(sc.label)+'</b></div>'+
  '<div class="moaLens '+(r.p10>=.5?'risk':'')+'"><span>想定位置・P10</span><b>'+E(r.position||'—')+' ／ '+pct(r.p10)+'</b></div>'+
  '</div><div class="moaDetailM4">'+m4Quick(r.no)+'</div>'+minetaDetail(r)+
  '<div class="moaReason">'+
  '<div class="moaBox moaGood"><b>好走材料</b><p>'+(good.length?good.map(x=>'・'+E(x)).join('<br>'):'強い単独材料は少なめ。複数の指標を確認。')+'</p></div>'+
  '<div class="moaBox moaBad"><b>凡走リスク</b><p>'+(bad.length?bad.map(x=>'・'+E(x)).join('<br>'):'現時点で目立つ単独リスクは少なめ。')+'</p></div>'+
  '<div class="moaBox moaScenario"><b>好走できる展開</b><p>'+E(goodScenario(r,bias))+'</p><b>崩れる展開</b><p>'+E(badScenario(r,pressure,bias))+'</p></div>'+
  '<div class="moaBox moaThink"><b>市場・展開の評価</b><p>'+E(marketView(r))+'。'+E(scenarioText(r))+'</p></div></div>'+
  '<div class="moaPriceBox"><div class="moaPriceHead">ワイド価格の確認<small>価格を満たしても自動購入判断はしません</small></div>'+
  '<div class="moaPriceGrid"><label>現在のワイド<input data-oa-wide="'+E(r.no)+'" inputmode="decimal" placeholder="例 6.5" value="'+E(w)+'"></label>'+
  '<label>自分の最低ライン<input data-oa-min="'+E(r.no)+'" inputmode="decimal" placeholder="例 5.0" value="'+E(mn)+'"></label></div>'+
  '<div class="moaPriceJudge" data-oa-judge="'+E(r.no)+'">'+E(priceJudge(r.no))+'</div></div>'+
  '</div></section>';
}
function canonicalPace(){const t=window.RSAAnalysisTransitionState,c=window.MobileAnalysisCoreState;if(t?.status!=='ready'||!c?.ready||Number(c.generation)!==Number(t.generation))return null;const v=c.analysis?.pred?.p;if(!Array.isArray(v)||v.length!==4)return null;const a=v.map(x=>x===null||x===undefined||x===''?NaN:Number(x));if(!a.every(x=>Number.isFinite(x)&&x>=0))return null;const s=a.reduce((u,v)=>u+v,0);return s>0?a.map(x=>x/s):null}
function paceHtml(){const p=canonicalPace();return`<div class="moaPace">${SCL.map((k,i)=>`<div><span>${k}</span><b>${p?pct(p[i]):'—'}</b></div>`).join('')}</div>`}
function scenarioTop(rows){const labs=['強前傾','前傾','標準','スロー'];const others=rows;return labs.map((lab,i)=>{const usable=others.filter(r=>Number.isFinite(r.sc[i]));const top5=usable.filter(r=>r.sc[i]<=5).length;return `<div class="moaScenarioRow"><span>${lab}</span><b>上位5以内：${top5} / ${usable.length}頭</b></div>`}).join('')}


function axisExtra(rows){if(window.DecisionShellV2State?.structure?.kind==='double')return'';const prod=window.ProductionDecisionPipelineV1State,a=prod?.stages?.axis;if(!a?.no)return'';const r=rows.find(x=>x.no===String(a.no));if(!r)return'';const high=window.AxisReliabilityShadowV1State?.high&&String(window.AxisReliabilityShadowV1State?.axis?.no)===r.no,pressure=window.MobileRaceMapPaceV1State?.pressure||'',bad=risks(r,pressure,false);return`<div class="moaAxisExtra"><h3>${high?'🟢 HIGH｜':''}軸馬の確認ポイント</h3><p>Ability ${rank(r.abilityRank)}・M3 ${rank(r.m3Rank)}・P10 ${pct(r.p10)}。軸の良さだけでなく、崩れる条件を先に確認します。</p><div class="moaAxisBadges">${bad.length?bad.map(x=>`<span class="moaAxisBadge warn">⚠ ${E(x)}</span>`).join(''):'<span class="moaAxisBadge">大きな単独リスクなし</span>'}</div></div>`}
function render(){
 css();
 const sh=shell();if(!sh){schedule(220);return}
 const rows=dataRows(),choice=chosenM4(),prod=window.ProductionDecisionPipelineV1State;
 const pairMode=window.DecisionShellV2State?.structure?.kind==='double';
 const pressure=String(canonicalPace()?window.MobileAnalysisCoreState?.analysis?.pressure||'':'');
 const prefs=loadPrefs(),bias=Boolean(prefs.__frontBias),key=raceKey()+'|'+String($('csvFile')?.files?.[0]?.name||'');
 if(key!==currentRaceKey){currentRaceKey=key;selectedNo='';paceOpen=false;m4Open=false;last=''}
 if(selectedNo&&!rows.some(r=>String(r.no)===selectedNo))selectedNo='';
 const all=[...rows].sort((a,b)=>Number(a.no)-Number(b.no));
 const selIdx=all.findIndex(r=>String(r.no)===selectedNo),selRow=selIdx<0?-1:Math.floor(selIdx/2);
 const sig=JSON.stringify([prod?.at,window.M3PureAbilityState?.at,window.Finish600State?.at,window.ValidatedQueueState?.at,window.PositionRiskState?.at,window.FourAbilityProfileV1State?.at,window.MobileAnalysisCoreState?.at,window.RSAAnalysisTransitionState?.generation,canonicalPace(),pairMode,bias,choice.band,choice.source,m4Filter,selectedNo,paceOpen,m4Open,all.map(r=>[r.no,r.name,r.axis,r.pair,r.pop,r.abilityRank,r.m3Rank,r.p10,r.position,r.winOdds])]);
 if(sig===last&&sh.root.dataset.ready==='1')return;last=sig;
 const biasRows=all.filter(r=>r.expectedRank<=5||r.front>=.55);
 const cards=all.map((r,i)=>{
  const tile=miniCard(r),endOfRow=i%2===1||i===all.length-1;
  return tile+(endOfRow&&selRow===Math.floor(i/2)?horseDetail(all[selIdx],pressure,bias):'');
 }).join('');
 sh.root.innerHTML=`
 <div class="moaHead">
  <small>ALL HORSES / ANALYSIS</small><h2>全頭のバランス比較</h2>
  <p>全${all.length}頭を馬番順に同じ大きさで表示します。${pairMode?'Pairの2頭も他馬と同じサイズです。':'軸馬も含めて全頭を確認できます。'} 気になる馬をタップすると詳細を開けます。</p>
 </div>
 <section class="moaSec moaBalancedSection">
  <div class="moaSecHead"><h3>全馬一覧</h3><span>${all.length}頭 / 馬番順</span></div>
  <p class="moaRule">Ability・M3は順位、P10は後方になる予測確率。カードの位置や色は購入推奨順位ではありません。</p>
  <div class="moaBalancedGrid">${cards||'<div class="moaEmpty">解析データを読み込んでいます。</div>'}</div>
  <p class="moaRule">※TARGET CSV由来の馬番は出走馬の出力順からの仮付番です。確定馬番と照合してください。</p>
 </section>
 <details class="moaOptional" data-oa-section="pace"${paceOpen?' open':''}>
  <summary>展開・先行圧を確認 <span>${E(pressure||'—')} ／ 必要時に開く</span></summary>
  <div class="moaOptionalBody"><p class="moaRule">レース全体の展開参考情報。自動的な相手馬推奨ではありません。</p>${paceHtml()}<div class="moaScenarioRows">${scenarioTop(rows)}</div><div class="moaBiasCtl"><b>前有利バイアスを仮定</b><button type="button" data-oa-bias>${bias?'ON ✓':'OFF'}</button></div>${bias?'<p class="moaRule">前目想定 '+biasRows.length+'頭。各馬の好走・凡走リスクを確認。</p>':'<p class="moaRule">研究用スイッチ。モデルの順位は変更しません。</p>'}</div>
 </details>
 <details class="moaOptional" data-oa-section="m4"${m4Open?' open':''}>
  <summary>展開別M4の詳細を見る <span>4シナリオ ／ 必要時に開く</span></summary>
  <div class="moaOptionalBody">${m4Panel(rows,choice)}</div>
 </details>`;
 sh.root.dataset.ready='1';
 const conclusion=$('mpuConclusion');
 if(conclusion&&!$('moaAxisExtra'))conclusion.insertAdjacentHTML('beforeend',`<div id="moaAxisExtra">${axisExtra(rows)}</div>`);
 else if($('moaAxisExtra'))$('moaAxisExtra').innerHTML=axisExtra(rows);
 window.MobileOpponentAnalysisV1State={ready:true,version:V,build:BUILD,displayOnly:true,productionChanged:false,sixLenses:['市場','能力','今回構造','位置・展開','リスク','価格'],marketNos:[],watchNos:[],analysisNos:all.map(r=>r.no),selectedNo,horseCount:all.length,equalCards:true,frontBiasManual:bias,m4ComparisonDisplayOnly:true,paceSource:'MobileAnalysisCoreState',paceProbabilities:canonicalPace(),m4Filter,selectedM4Band:choice.band,selectedM4Source:choice.source,at:Date.now()};
}
addEventListener('race-progress-scenario-selected',()=>{last='';schedule(70)});
addEventListener('rsa-analysis-start',()=>{m4Filter='all';last='';});
document.addEventListener('toggle',function(e){
 const t=e.target;
 if(t?.matches?.('details[data-oa-section="pace"]'))paceOpen=t.open;
 if(t?.matches?.('details[data-oa-section="m4"]'))m4Open=t.open;
},true);
document.addEventListener('click',function(e){
 const open=e.target.closest?.('[data-oa-open-horse]');
 if(open){
  const no=String(open.dataset.oaOpenHorse||'');selectedNo=selectedNo===no?'':no;last='';schedule();
  if(selectedNo)setTimeout(()=>$('moaHorseDetail')?.scrollIntoView?.({behavior:'smooth',block:'nearest'}),150);
  return;
 }
 if(e.target.closest?.('[data-oa-close-horse]')){selectedNo='';last='';schedule();return}
 const go=e.target.closest?.('[data-oa-open-ledger]');
 if(go){const ledger=$('mobilePredictionLedger');if(ledger){document.querySelector('[data-ims-tab="ticket"]')?.click();ledger.open=true;ledger.scrollIntoView?.({behavior:'smooth',block:'start'})}return}
 const filter=e.target.closest?.('[data-oa-m4-filter]');
 if(filter){setM4Filter(filter.dataset.oaM4Filter);last='';schedule();return}
 if(e.target.closest?.('[data-oa-bias]')){const p=loadPrefs();p.__frontBias=!p.__frontBias;savePrefs(p);last='';schedule();return}
 if(['analyzeBtn','applyOddsBtn','parseCsvBtn','clearOddsBtn'].includes(e.target?.id))schedule(180);
},true);
document.addEventListener('input',e=>{const no=e.target?.dataset?.oaWide||e.target?.dataset?.oaMin;if(no){const k=e.target.dataset.oaWide?'wide':'min';setPref(no,k,e.target.value);const j=document.querySelector(`[data-oa-judge="${CSS.escape(String(no))}"]`);if(j)j.textContent=priceJudge(no);return}if(['raceName','raceDate','venue','surface','distance','grade','going','oddsPaste'].includes(e.target?.id))schedule(120)},true);
['production-decision-pipeline-ready','opponent-candidate-pool-ready','m3-pure-ability-ready','finish600-ready','validated-queue-ready','position-risk-ready','mobile-race-map-pace-ready','axis-reliability-shadow-ready','four-ability-profile-ready','five-ability-profile-v2-ready','rsa-analysis-complete','mobile-analysis-consistency-ready','mineta-position-study-data-ready'].forEach(ev=>addEventListener(ev,()=>{if(ev==='mineta-position-study-data-ready')last='';schedule(70)}));
function start(){schedule(220);setTimeout(()=>schedule(),850)}if(document.readyState==='loading')addEventListener('DOMContentLoaded',start,{once:true});else start();
})();