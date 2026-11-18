/* Prediction reliability audit (research only).
 * Uses actual live Ability C / M3 / Queue / M4 sources, not synthetic replacements.
 * NO writes to bet, axis, ranking, probability, or purchase-gate states.
 */
(function(root){'use strict';
const VERSION='prediction-reliability-shadow-v1-20261119',SCHEMA='rsa-prediction-reliability-snapshot-v1';
const RANK_LABELS=['強前傾','前傾','標準','スロー'];
const N=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
const finite=v=>Number.isFinite(N(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\"':'&quot;',"'":'&#39;'}[c]));
const cleanNo=v=>Number.isInteger(N(v))&&N(v)>0?String(Number(v)):'';
const byNo=st=>st?.byNo||Object.fromEntries((st?.rows||[]).filter(r=>cleanNo(r.no)).map(r=>[cleanNo(r.no),r]));
const pct=v=>finite(v)?(100*N(v)).toFixed(1)+'%':'—';
const fmt=(v,d=2)=>finite(v)?N(v).toFixed(d):'—';
function normalizeP(values){
 if(!Array.isArray(values)||values.length!==4||values.some(x=>!finite(x)||N(x)<0))return null;
 const sum=values.reduce((a,b)=>a+N(b),0);return sum>0?values.map(v=>N(v)/sum):null;
}
function compareRoster(reference,actual){
 if(!Array.isArray(actual)||reference.length!==actual.length)return false;
 const ref=Object.fromEntries(reference.map(x=>[cleanNo(x.no),String(x.name||'').normalize('NFKC').trim()]));
 return actual.every(x=>cleanNo(x.no)&&Object.prototype.hasOwnProperty.call(ref,cleanNo(x.no))&&ref[cleanNo(x.no)]===String(x.name||'').normalize('NFKC').trim());
}
function evaluate(state){
 const F=state.finish||{},A=state.ability||{},Q=state.queue||{},P=state.position||{},D=state.decision||{},C=state.analysis||{},T=state.transition||{};
 const m=state.meta||{},field=N(m.fieldSize),grade=String(m.grade||'').toUpperCase();
 const eligible=['G1','G2','G3'].includes(grade)&&field>=12&&field<=18;
 const generation=N(T.generation),sourceGeneration=N(F.generation),analysisGeneration=N(C.generation);
 const roster=Array.isArray(F.rows)?F.rows:[];
 const generationOk=T.status==='ready'&&finite(generation)&&generation>0&&finite(sourceGeneration)&&sourceGeneration===generation&&finite(analysisGeneration)&&analysisGeneration===generation;
 const metaFieldOk=roster.length===field&&new Set(roster.map(x=>cleanNo(x.no))).size===field;
 const base={ready:false,version:VERSION,schema:SCHEMA,eligible,reason:'',race:{date:String(m.date||''),venue:String(m.venue||''),name:String(m.raceName||''),grade,field:Number.isFinite(field)?field:null,surface:String(m.surface||''),distance:finite(m.distance)?N(m.distance):null},generation:finite(generation)?generation:null,versions:{ability:String(A.version||''),m3:String(F.version||''),queue:String(Q.version||''),position:String(P.version||'')},features:{},horses:[],officialAxisNo:cleanNo(D.structure?.axis?.no),marketComplete:Boolean(D.market?.complete),calibratedProbabilities:false,productionImpact:false,automaticBet:false};
 if(!eligible){base.reason='G1〜G3・12〜18頭の対象外';return base;}
 if(!generationOk||!F.ready||!metaFieldOk){base.reason='解析完了・最新M3の照合待ち';return base;}
 const abilityRosterOk=Boolean(A.ready&&A.activeModel==='C'&&compareRoster(roster,A.rows));
 const queueRosterOk=Boolean(Q.ready&&Q.fieldSize===field&&compareRoster(roster,Q.rows));
 const abilityByNo=abilityRosterOk?byNo(A):{},queueByNo=queueRosterOk?byNo(Q):{},positionByNo=byNo(P);
 const p=normalizeP(C.analysis?.pred?.p);
 const axisNo=base.officialAxisNo;
 const rows=roster.map(fr=>{
  const no=cleanNo(fr.no),a=abilityByNo[no],q=queueByNo[no],pos=positionByNo[no];
  const sc=Array.isArray(fr.sc)&&fr.sc.length===4?fr.sc.map(v=>finite(v?.rank)&&N(v.rank)>=1&&N(v.rank)<=field?N(v.rank):null):[null,null,null,null];
  const m4Ready=sc.every(x=>x!==null);
  return {no,name:String(fr.name||''),abilityLogit:finite(a?.logit)?N(a.logit):null,abilityRank:finite(a?.abilityRank)?N(a.abilityRank):null,abilityTop3Probability:finite(a?.top3)?N(a.top3):null,abilityHistory:finite(a?.histN)?N(a.histN):null,m3Rank:finite(fr.finishRank)?N(fr.finishRank):null,m3Score:finite(fr.score)?N(fr.score):null,m4Ranks:sc,m4Complete:m4Ready,m4RankRange:m4Ready?Math.max(...sc)-Math.min(...sc):null,m4Top3Count:m4Ready?sc.filter(v=>v<=3).length:null,queueValidated:Boolean(q?.validated&&finite(q?.hist_n)&&N(q.hist_n)>=2),queueHistory:finite(q?.hist_n)?N(q.hist_n):null,firstCornerExpected:finite(q?.expectedRank)?N(q.expectedRank):null,frontness5:finite(q?.frontness5)?N(q.frontness5):null,p10:finite(pos?.p10)?N(pos.p10):null,odds:finite(D.market?.byNo?.[no]?.od)?N(D.market.byNo[no].od):null,pop:finite(D.market?.byNo?.[no]?.pop)?N(D.market.byNo[no].pop):null};
 });
 const ab=abilityRosterOk&&rows.every(r=>r.abilityLogit!==null&&r.abilityRank!==null);
 const qr=queueRosterOk;
 const m4=rows.every(r=>r.m4Complete);
 const abilitySorted=ab?[...rows].sort((a,b)=>b.abilityLogit-a.abilityLogit||Number(a.no)-Number(b.no)):[];
 const m3Sorted=[...rows].sort((a,b)=>a.m3Score-b.m3Score||Number(a.no)-Number(b.no));
 const queueCount=qr?rows.filter(r=>r.queueValidated).length:0;
 const axis=rows.find(r=>r.no===axisNo)||null;
 const maxP=p?Math.max(...p):null;
 const entropy=p?-p.reduce((s,x)=>s+(x>0?x*Math.log(x):0),0)/Math.log(4):null;
 const defaultBand=p?p.indexOf(maxP):null;
 const top3M3=m3Sorted.slice(0,3).map(r=>r.no);
 const top3Default=m4&&defaultBand!==null?[...rows].sort((a,b)=>a.m4Ranks[defaultBand]-b.m4Ranks[defaultBand]).slice(0,3).map(r=>r.no):null;
 const top3Overlap=top3Default?top3Default.filter(no=>top3M3.includes(no)).length:null;
 const data={ability:{available:ab,model:String(A.activeModel||''),top2RawGap:ab?abilitySorted[0].abilityLogit-abilitySorted[1].abilityLogit:null,top2StandardizedGap:null,topAbilityNo:ab?abilitySorted[0].no:null,leaderTie:Boolean(A.leaderAmbiguous),top3BoundaryTie:Boolean(A.top3BoundaryAmbiguous)},queue:{available:qr,validated:queueCount,total:field,missing:qr?field-queueCount:null,label:qr?(queueCount===field?'履歴全頭充足':queueCount>0?'一部履歴不足':'材料不足'):'未照合',evidence:'2024–2026 actual-position MAE: full history lower than partial history; no betting ROI gate validated'},pace:{available:Boolean(p),bandProbabilities:p,topBand:defaultBand,topBandLabel:defaultBand===null?null:RANK_LABELS[defaultBand],topBandProbability:maxP,normalizedEntropy:entropy,source:'analysis.pred.p; descriptive only'},m3:{available:true,top2ScoreGap:m3Sorted[1].m3Score-m3Sorted[0].m3Score,top3Nos:top3M3,axisRank:axis?.m3Rank??null},m4:{available:m4,mainBand:defaultBand,mainTop3Nos:top3Default,m3ToMainTop3Overlap:top3Overlap,axisRankRange:axis?.m4RankRange??null,axisTop3BandCount:axis?.m4Top3Count??null,completeHorses:rows.filter(r=>r.m4Complete).length,meaning:'four counterfactual pace scenarios; not an observed future pace or validated betting gate'}};
 if(ab){const values=abilitySorted.map(x=>x.abilityLogit),avg=values.reduce((a,b)=>a+b,0)/values.length,sd=Math.sqrt(values.reduce((s,x)=>s+(x-avg)**2,0)/values.length);data.ability.top2StandardizedGap=sd>0?data.ability.top2RawGap/sd:null;data.ability.m3Top3Overlap=abilitySorted.slice(0,3).filter(r=>top3M3.includes(r.no)).length;}
 base.ready=true;base.reason='';base.features=data;base.horses=rows;return base;
}
root.PredictionReliabilityShadowV1=Object.freeze({version:VERSION,schema:SCHEMA,evaluate,normalizeP,compareRoster});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const $=id=>root.document.getElementById(id);
let last='',timer=0,dirty=false,latest=null;
function getMeta(){const core=root.MobileAnalysisCoreState?.meta||{};const read=id=>$(id)?.value||'';return{date:read('raceDate'),venue:read('venue'),raceName:read('raceName'),grade:read('grade'),fieldSize:Number(read('fieldSize'))||Number(core.fieldSize)||0,surface:read('surface'),distance:Number(read('distance'))||Number(core.distance)||0};}
function live(){return evaluate({meta:getMeta(),finish:root.Finish600State,ability:root.M3PureAbilityState,queue:root.ValidatedQueueState,position:root.PositionRiskState,decision:root.DecisionShellV2State,analysis:root.MobileAnalysisCoreState,transition:root.RSAAnalysisTransitionState});}
function mount(){const focus=$('rsaFocusedView'),card=$('raceDifficultyDiagnosticV1'),desktop=$('result');let el=$('rsaPredictionReliability');if(!el){el=root.document.createElement('section');el.id='rsaPredictionReliability';el.className='prsv-card';}const host=focus||card||desktop;if(!host)return null;if(el.previousElementSibling!==host||el.parentElement!==host.parentElement)host.insertAdjacentElement('afterend',el);return el;}
function style(){if($('prsv-css'))return;const s=root.document.createElement('style');s.id='prsv-css';s.textContent=`.prsv-card{margin:8px 0 12px;border:1px solid #315565;border-radius:14px;background:#091b26;color:#e9f5fb;padding:11px;font-size:12px}.prsv-card summary{cursor:pointer;font-weight:800;list-style:revert;font-size:13px}.prsv-card .psub{color:#96b0c0;font-size:10px;line-height:1.5;margin:6px 0 10px}.prsv-card .plist{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.prsv-card .pitem{padding:9px;border:1px solid #294756;border-radius:10px;background:#0e2532;min-width:0}.prsv-card .pitem b{font-size:11px;display:block}.prsv-card .pitem small{font-size:9px;line-height:1.5;color:#a3c0cc;display:block;margin-top:4px}.prsv-card .pitem.alert{border-color:#9f7944}.prsv-card .pitem.missing{border-color:#705a65}.prsv-card .pfooter{font-size:9px;line-height:1.6;color:#a1b4bf;margin-top:10px}.prsv-card button{font-size:11px;border:1px solid #668c9e;color:#e8f7ff;padding:9px 13px;border-radius:9px;background:#244356;margin-top:9px}.prsv-card button:disabled{opacity:.45;cursor:not-allowed}.prsv-card [data-prsv-status]{font-size:10px;color:#b5d1e0}.prsv-card .pnote{font-size:10px;color:#d0bb96}@media(max-width:420px){.prsv-card .plist{grid-template-columns:1fr}}`;root.document.head.appendChild(s);}
function card(label,headline,note,kind=''){return`<div class="pitem ${kind}"><b>${esc(label)}｜${esc(headline)}</b><small>${esc(note)}</small></div>`;}
function view(d){
 if(!d.ready)return `<div class="psub">${esc(d.reason||'解析待ち')}。本番判定とは無関係の研究表示です。</div>`;
 const f=d.features,ax=d.horses.find(x=>x.no===d.officialAxisNo),m=f.m3,ab=f.ability,q=f.queue,p=f.pace,m4=f.m4;
 const items=[];
 items.push(card('① 馬の能力',ab.available&&ax?`軸C順位 ${fmt(ax.abilityRank,0)}位`:'Ability C未照合',ab.available?`能力首位 ${ab.topAbilityNo}番。${ax?`軸 ${ax.no}番の能力値 ${fmt(ax.abilityLogit,3)}・履歴 ${ax.abilityHistory===null?'—':ax.abilityHistory}走。`:''}Cの本体評価を表示しています。`:'Cモデル不使用または馬番・馬名不一致。v1をAbility Cとして代用しません。',ab.available?'':'missing'));
 items.push(card('② メンバー比較',ab.available?`能力首位差 ${fmt(ab.top2StandardizedGap,2)}σ`:'能力差は算出保留',ab.available?`Ability上位3頭とM3上位3頭の一致 ${ab.m3Top3Overlap}/3頭。${ab.leaderTie||ab.top3BoundaryTie?'Ability同順位を含むため判定保留。':'差や一致数だけで難レース・見送りとは決めません。'}`:'同じレース・同じ馬番でAbility Cが照合できた場合のみ相手能力差を計算。',ab.available?'':'missing'));
 items.push(card('③ ポジション',ax&&ax.p10!==null?`軸P10 ${pct(ax.p10)}`:'軸・P10未取得',ax?`軸 ${ax.no}番｜初角予測 ${fmt(ax.firstCornerExpected,1)}番手。前方位置の取りやすさはP10・隊列情報と併読。`:'本番軸が未確定なら、軸の位置取り警戒は表示保留。'));
 items.push(card('④ 隊列・展開',q.available?q.label:'隊列未照合',q.available?`Queue有効 ${q.validated}/${q.total}頭。${q.missing?`不足 ${q.missing}頭で初角の予測精度低下が過去年に再現。`:'全頭の有効な位置取り履歴を確認。'}${p.available?`ペース本命 ${p.topBandLabel} ${pct(p.topBandProbability)}。`:'ペース予測未取得。'}馬券ROIの見送り条件とは未検証。`:'隊列の馬番・馬名が一致しません。ペース予測も独立検証が必要。',q.available&&q.missing>0?'alert':!q.available?'missing':''));
 items.push(card('⑤ 通常M3',`上位差 ${fmt(m.top2ScoreGap,3)}`,`M3上位馬番 ${m.top3Nos.join('・')}。${ax?'軸 '+ax.no+'番のM3順位 '+fmt(ax.m3Rank,0)+'位。':''}小差を理由に見送りません。`));
 items.push(card('⑥ 展開別M4',m4.available&&m4.mainTop3Nos?`通常との上位一致 ${m4.m3ToMainTop3Overlap}/3`:'一部未算出',m4.available?`想定 ${p.topBandLabel||'未確定'}｜軸の4帯順位レンジ ${m4.axisRankRange===null?'—':m4.axisRankRange}。シナリオの順位変動は研究指標、収益効果は未検証。`:`4帯の全馬順位 ${m4.completeHorses}/${d.horses.length}頭。欠損を安定とは扱いません。`,m4.available?'':'missing'));
 return `<div class="psub">6項目を独立表示。過去検証で裏付けがあるのは「一部隊列履歴不足による初角予測誤差」。能力差・M3差・M4変動は研究候補です。</div><div class="plist">${items.join('')}</div><div class="pfooter">本番の◎・○、確率、購入／見送り判定は変更しません。モデル版と全馬の値を記録して、将来の年別・配当込み検証に使います。レース後の情報を予測値に混入しないよう、発走前の保存を推奨します。</div><button type="button" data-prsv="export">研究データをJSON保存</button><div data-prsv-status role="status"></div>`;
}
function render(){style();const node=mount();if(!node)return;const d=live();if(dirty){d.ready=false;d.reason='入力を変更しました。再解析してください';}root.PredictionReliabilityShadowState={...d,stale:dirty,at:Date.now()};latest=d;
 const sig=JSON.stringify([dirty,d.ready,d.reason,d.generation,d.officialAxisNo,d.marketComplete,d.features,d.horses,root.RSAFocusedThreeTabsState?.selectedPartnerNo]);if(sig===last)return;last=sig;let details=node.querySelector('details');const open=details?.open||false;node.innerHTML=`<details ${open?'open':''}><summary>分析信頼性チェック（研究用）${d.ready&&d.features.queue?.missing?'｜隊列履歴に不足あり':''}</summary>${view(d)}</details>`;
}
function download(){const d=latest;if(!d?.ready||dirty)return;const val={...d,schema:SCHEMA,capturedAt:new Date().toISOString(),clockSource:'device_clock_untrusted',preRaceVerified:false,officialResultVerified:false,selectedPartnerNo:cleanNo(root.RSAFocusedThreeTabsState?.selectedPartnerNo),productionDecision:root.DecisionShellV2State?.final?.code||'',betEligible:root.AxisAccessGateV1State?.betEligible===true,exportNote:'Current runtime values only; raceDate / odds / temporary horse numbers must be checked before any prospective evaluation.'};
 const txt=JSON.stringify(val,null,2)+'\n',url=URL.createObjectURL(new Blob([txt],{type:'application/json;charset=utf-8'})),a=root.document.createElement('a');a.href=url;a.download=`reliability_${String(d.race.date||'race').replace(/[^\d-]/g,'')}_${Date.now()}.json`;root.document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000);
}
function schedule(ms=70){clearTimeout(timer);timer=setTimeout(render,ms)}
const inputs=new Set(['raceDate','venue','raceName','fieldSize','surface','distance','grade','going','csvFile']);
root.addEventListener('rsa-analysis-start',()=>{dirty=false;last='';latest=null;schedule(40)});
root.addEventListener('rsa-analysis-complete',()=>{dirty=false;last='';schedule(100)});
['m3-pure-ability-ready','finish600-ready','validated-queue-ready','position-risk-ready','decision-shell-v2-ready','mobile-analysis-core-ready','rsa-addons-ready'].forEach(ev=>root.addEventListener(ev,()=>schedule(100)));
root.document.addEventListener('change',e=>{if(inputs.has(e.target?.id)){dirty=true;last='';schedule(60)}},true);
root.document.addEventListener('input',e=>{if(inputs.has(e.target?.id)){dirty=true;last='';schedule(120)}else if(e.target?.id==='oddsPaste'){schedule(140)}},true);
root.document.addEventListener('click',e=>{if(e.target?.closest?.('[data-prsv="export"]')){download();return;}if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id)){last='';schedule(170)}},true);
if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>schedule(200),{once:true});else schedule(200);
})(typeof window!=='undefined'?window:globalThis);