/* P3-31. Three-tab production presentation. Read-only view of the existing
   C×M3 purchase gate and separately trained C+market / V3 models.
   Never reassigns the official axis or overrides stop decisions. */
(function(root){'use strict';
const VERSION='P3-33-skip-explanation-v1';
const $=id=>document.getElementById(id);
const H=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
const F=(v,unit='',digits=0)=>Number.isFinite(N(v))?Number(v).toFixed(digits)+unit:'—';
const P=v=>Number.isFinite(N(v))?(100*Number(v)).toFixed(1)+'%':'—';
const same=(a,b)=>String(a??'').normalize('NFKC').trim()===String(b??'').normalize('NFKC').trim();
const isMobile=()=>Boolean(root.RSAMobileLean||document.body?.classList.contains('iosMobileShellV2'));
const CORE=()=>root.AbilityV3ResearchCoreV1;
function roster(){const st=root.Finish600State;return st?.ready&&Array.isArray(st.rows)?st.rows.map(x=>({no:String(Number(x.no)),name:String(x.name||''),finishRank:N(x.finishRank)})).filter(x=>/^[1-9][0-9]*$/.test(x.no)):[];}
function parseMarket(r,raw){const c=CORE();if(!c?.buildMarket)return{complete:false,reason:'市場モデルの読込待ち',rows:[]};return c.buildMarket(raw,r);}
function cMarketRank(r,market,cState,model){
 if(!market?.complete||!model?.CW||!CORE()?.modelScore||!CORE()?.projected)return{ready:false,reason:'市場モデル・全頭単勝オッズが必要です'};
 if(!cState?.ready||cState.activeModel!=='C'||!cState.byNo)return{ready:false,reason:'Ability Cの計算待ち（v1代替時は使用しません）'};
 if(r.length!==market.rows.length||r.length<12)return{ready:false,reason:'出走頭数が不一致です'};
 const m=market.byNo||Object.fromEntries(market.rows.map(x=>[String(x.no),x]));
 const inputs=[];
 for(const x of r){const c=cState.byNo[x.no],od=m[x.no];if(!c||!same(x.name,c.name)||!Number.isFinite(N(c.logit))||!od||!(od.od>0))return{ready:false,reason:'Ability Cの馬番・馬名・能力値が不足しています'};
  const z=CORE().modelScore({market:-Math.log(od.od),c_exact:N(c.logit)},model.CW);
  if(!Number.isFinite(z))return{ready:false,reason:'C＋市場モデルの計算に失敗'};
  inputs.push({...x,od:od.od,pop:od.pop,cRank:c.abilityRank,cIndex:c.index,z});
 }
 const projection=CORE().projected(inputs);
 if(!projection)return{ready:false,reason:'推定3着内率の射影に失敗'};
 return{ready:true,rows:projection.sort((a,b)=>b.p3-a.p3||Number(a.no)-Number(b.no))};
}
function selectVisiblePartners(ranked,officialAxis,k=4){
 if(!officialAxis||!ranked?.ready)return[];
 return ranked.rows.filter(r=>r.no!==String(officialAxis.no)).slice(0,k);
}
function partnerRankLabels(roster,no,v3){
 const m3=roster.find(r=>String(r.no)===String(no));
 return {m3:Number.isFinite(N(m3?.finishRank))&&N(m3.finishRank)>0?F(m3.finishRank,'位'):'評価待ち',
  v3:Number.isFinite(N(v3?.v3Rank))&&N(v3.v3Rank)>0?F(v3.v3Rank,'位'):'更新待ち'};
}
// A diagnostic overlay only. Production betting/axis gates remain authoritative.
function skipDiagnosis(input={}){
 const analyzed=input.analyzed===true, code=String(input.code||''), finalCode=String(input.finalCode||'');
 const complete=input.marketComplete===true;
 const p=typeof input.marketP==='number'&&Number.isFinite(input.marketP)?input.marketP:null;
 const note=p===null?'市場構造指標は未計算':'市場構造参考値 '+(100*p).toFixed(1)+'%（1番人気の3着内推定）';
 const common='研究用の0.60基準は、購入の期待値や同時好走確率ではありません。';
 if(!analyzed)return{state:'pending',label:'判定待ち',reason:'CSVの解析が完了していません。',marketNote:note,betEligible:false};
 if(input.scope===true||code==='scope_out'||finalCode==='scope_out')return{state:'skip',label:'対象レース外',reason:'平地3勝以上・12〜18頭などの対象条件を満たしません。',marketNote:note,betEligible:false};
 if(['no_auto_axis','ability_rank_tie'].includes(code)){
  if(!complete)return{state:'pending',label:'軸未確定・市場待ち',reason:'C×M3で単独軸が決まりません。再点検には全頭の単勝オッズが必要です。',marketNote:note,betEligible:false};
  if(p===null)return{state:'pending',label:'軸未確定・研究モデル待ち',reason:'市場構造の年次モデルを照合できません。見送りロックは維持します。',marketNote:note,betEligible:false};
  if(p>=0.60)return{state:'review',label:'軸未確定・再点検',reason:'C×M3では単独軸なし。ただし市場構造の参考値が探索基準0.60以上です。'+common,marketNote:note,betEligible:false};
  return{state:'skip',label:'見送り（軸未確定）',reason:'C×M3で軸が決まらず、市場構造の参考値も探索基準0.60未満です。'+common,marketNote:note,betEligible:false};
 }
 if(code==='double'||input.pair===true)return{state:'pair',label:'Pair構造・単独軸なし',reason:'2頭構造は単独軸の購入条件とは分けて扱います。',marketNote:note,betEligible:false};
 if(code==='validated_stop'||code==='A3'||input.unsafe===true)return{state:'skip',label:'見送り（能力・M3）',reason:'軸馬がC×M3の安全条件を満たしていません。',marketNote:note,betEligible:false};
 if(finalCode==='market_range')return{state:'skip',label:'見送り（人気条件外）',reason:'構造軸が検証対象の1〜6番人気から外れています。',marketNote:note,betEligible:false};
 if(!complete)return{state:'pending',label:'市場判定待ち',reason:'最終判定には全頭の単勝オッズが必要です。',marketNote:note,betEligible:false};
 if(input.betEligible===true&&input.officialAxis===true)return{state:'pass',label:'購入条件通過',reason:'現在の本番軸ゲートを通過しています。購入の期待値は別途確認してください。',marketNote:note,betEligible:true};
 return{state:'pending',label:'本番判定の確認待ち',reason:'C×M3・市場・購入ロックの最終状態を確認しています。',marketNote:note,betEligible:false};
}
function modelState(){try{const a=root.AbilityV3ResearchPanelBridgeV1?.getCurrent();return a?.ok?a:{ok:false,reason:a?.reason||''};}catch(e){return{ok:false,reason:String(e?.message||e)}}}
function decisionContext(){
 const r=roster(),d=root.DecisionShellV2State||{},pipeline=root.ProductionDecisionPipelineV1State||{},s=d.structure||{},final=d.final||{},a=pipeline.stages?.axis;
 const official=s.axis?{no:String(s.axis.no),name:String(s.axis.name||r.find(x=>x.no===String(s.axis.no))?.name||'')}:a?.no?{no:String(a.no),name:String(a.label||'').replace(/^\d+番\s*/, '')}:null;
 const odds=String($('oddsPaste')?.value||'');const mk=parseMarket(r,odds);
 const o=official?mk.byNo?.[official.no]:null;
 const year=String($('raceDate')?.value||'').slice(0,4);
 const cFit=root.RSAFocusedThreeTabsV1?.frozen?.models?.[year];
 const ranked=cMarketRank(r,mk,root.M3PureAbilityState,cFit);
 const v=modelState(),v3=v?.ok?v.analysis:null;
 const partners=mk.complete&&official&&ranked.ready?selectVisiblePartners(ranked,official,4):[];
 const sc=official?root.M3PureAbilityState?.byNo?.[official.no]:null;
 const q=official?root.ValidatedQueueState?.byNo?.[official.no]:null;
 const risk=official?root.PositionRiskState?.byNo?.[official.no]:null;
 const v3Horse=v3?.rows?.find(x=>String(x.no)===official?.no);
 const m3=official?r.find(x=>x.no===official.no)?.finishRank:NaN;
 const afterStart=root.RSAAnalysisTransitionState?.status==='running';
 const analyzed=Boolean(r.length>=12&&!afterStart&&root.M3PureAbilityState?.ready&&d.ready);
 const marketFit=STORE.frozen?.market_structure_P4_1?.[year];
 const marketP=mk.complete&&marketFit&&CORE()?.marketStructure?CORE().marketStructure(mk,marketFit):null;
 const access=root.AxisAccessGateV1State||{};
 const skipDiag=skipDiagnosis({analyzed,code:s.code,finalCode:final.code,scope:root.RaceSkipLockV1State?.kind==='scope',marketComplete:mk.complete,marketP,pair:s.kind==='double',unsafe:s.kind==='A3',officialAxis:Boolean(official),betEligible:access.betEligible===true});
 return{r,official,odds:mk,m:o,ranked,partners,sc,q,risk,v3,v3Horse,m3,decision:d,pipeline,structure:s,final,analyzed,year,marketP,skipDiag};
}
// Exposed for deterministic Node tests; no betting or production writes.
root.RSAFocusedThreeTabsCoreV1=Object.freeze({version:VERSION,cMarketRank,selectVisiblePartners,partnerRankLabels,skipDiagnosis});
if(!root.document?.createElement||typeof root.addEventListener!=='function')return;
const STORE={active:'axis',frozen:null,last:'',timer:0,dirty:false};
root.RSAFocusedThreeTabsV1=STORE;
let fetchPending=false;
function loadModel(){if(STORE.frozen||fetchPending)return;fetchPending=true;fetch('data/ability_v3_research_models_2026.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(x=>{if(x.version!=='P3-27-v1')throw Error('モデルバージョン違い');STORE.frozen=x;fetchPending=false;schedule(0)}).catch(e=>{STORE.error='C＋市場モデル読込失敗：'+e.message;fetchPending=false;schedule(300)});}
function ensure(){if(!isMobile())return null;let x=$('rsaFocusedView');if(x)return x;const shell=$('iosMobileShellV2'),a=$('analyzeBtn');if(!shell||!a)return null;
 x=document.createElement('section');x.id='rsaFocusedView';x.className='rsa-focused';
 x.innerHTML='<header class="rsaf-head"><div><small>RACE ANALYZER</small><h2 id="rsafRaceName">レース解析</h2><p id="rsafRaceMeta"></p></div><span class="rsaf-status" id="rsafStatus">入力待ち</span></header><nav id="rsafTabs" role="tablist" aria-label="レース分析の切替"><button type="button" role="tab" data-rsaf-tab="axis" aria-selected="true">軸馬情報</button><button type="button" role="tab" data-rsaf-tab="partners" aria-selected="false">相手馬情報</button><button type="button" role="tab" data-rsaf-tab="formation" aria-selected="false">展開隊列</button></nav><div id="rsafAxis" role="tabpanel"></div><div id="rsafPartners" role="tabpanel" hidden></div><div id="rsafFormation" role="tabpanel" hidden></div><details id="rsafReceiptTools"><summary>予想記録・結果照合</summary><div id="rsafReceiptMount"></div></details>';
 shell.insertAdjacentElement('afterend',x);document.body.classList.add('rsaFocusedThreeTabs');x.querySelectorAll('[data-rsaf-tab]').forEach(btn=>btn.addEventListener('click',()=>{STORE.active=btn.dataset.rsafTab;render(true)}));loadModel();return x;
}
function alert(txt){return '<div class="rsaf-alert">'+H(txt)+'</div>'}
function badge(txt,kind='neutral'){return '<span class="rsaf-badge '+kind+'">'+H(txt)+'</span>'}
function fact(label,value){return '<div class="rsaf-fact"><small>'+H(label)+'</small><strong>'+H(value)+'</strong></div>'}
function cRank(c){return Number.isFinite(N(c?.abilityRank))?F(c.abilityRank,'位'): '—';}
function axisHtml(x){const d=x.decision,s=x.structure,f=x.final,m=x.odds;
 if(!x.analyzed)return alert('過去走CSVを読み込み「レース構造を解析」を押してください。');
 const kind=s.kind||'—';const verdict=f.level==='red'?'stop':f.level==='green'?'go':'wait';
 const status=badge((f.label||s.label||'構造判定中'),verdict);
 const diag=x.skipDiag||{state:'pending',label:'確認待ち',reason:'判定を確認中',marketNote:''};
 const dgKind=diag.state==='pass'?'go':diag.state==='skip'?'stop':'neutral';
 const diagnostic='<div class="rsaf-skip-diagnostic rsaf-skip-'+H(diag.state)+'">'+badge(diag.label,dgKind)+'<p>'+H(diag.reason)+'</p>'+(diag.marketNote?'<small>'+H(diag.marketNote)+'</small>':'')+'</div>';
 if(!x.official){return diagnostic+alert('本番では軸馬が未確定です。再点検と表示されても自動購入や見送りロックの解除は行いません。');}
 const a=x.official,c=x.sc,q=x.q,r=x.risk,p=x.m;
 const marketMissing=!m.complete;
 const label=s.kind==='A2'?'A2 条件付き':s.kind==='A1'?'A1 単独軸':'構造候補';
 const v3=x.v3Horse?'V3 '+F(x.v3Horse.v3Rank,'位')+'／Dynamic '+F(x.v3Horse.h730,'',3)+'／Peak '+(x.v3Horse.miss?'履歴不足':F(x.v3Horse.peak,'',3)):'V3: 能力DB更新待ち・比較保留';
 return diagnostic+'<div class="rsaf-decision">'+status+'<p>'+H(f.reason||s.reason||'')+'</p></div>'+
 '<article class="rsaf-horse rsaf-axis"><div class="rsaf-horse-main"><b class="rsaf-horse-no">'+H(a.no)+'</b><div><small>'+H(label)+'</small><h3>'+H(a.name)+'</h3></div></div><div class="rsaf-grid">'+
 fact('Ability C',cRank(c))+fact('M3',F(x.m3,'位'))+fact('P10',P(r?.p10))+fact('先行力',P(q?.frontness5))+
 fact('想定位置',q?.position||'—')+fact('単勝',p?F(p.od,'倍',1):'未入力')+'</div><p class="rsaf-inline">'+H(v3)+'</p></article>'+
 (marketMissing?alert('市場判定待ち：全'+x.r.length+'頭の単勝オッズ入力で、最終軸・相手候補を更新します。'):badge('全頭オッズを反映済み','go'))+
 '<p class="rsaf-foot">馬番はTARGET CSVの出走馬並びに付けた仮番号です。確定枠順と照合してください。C×M3の軸判定を維持し、V3未更新時にはV3の数値を代用表示しません。</p>';
}
function partnerHtml(x){if(!x.analyzed)return alert('レース構造の解析後に表示します。');
 if(!x.official)return alert('単独軸が確定していないため、相手馬の推薦を保留します。');
 if(!x.odds.complete)return alert('相手馬を計算するには、今回の確定馬番と全'+x.r.length+'頭の単勝オッズが必要です（現在'+x.odds.rows.length+'/'+x.r.length+'頭）。');
 if(!x.ranked.ready)return alert(x.ranked.reason||STORE.error||'Ability C＋市場の計算待ちです。');
 if(x.partners.length!==4)return alert('相手4頭を確定できません。再解析してください。');
 const byNo=Object.fromEntries((x.v3?.rows||[]).map(o=>[String(o.no),o]));
 const cards=x.partners.map((r,i)=>{const ranks=partnerRankLabels(x.r,r.no,byNo[r.no]);
 return '<article class="rsaf-horse"><div class="rsaf-horse-main"><b class="rsaf-horse-no">'+H(r.no)+'</b><div><small>'+(i<2?'相手候補 '+(i+1):'追加候補 '+(i+1))+'</small><h3>'+H(r.name)+'</h3></div>'+badge(i<2?'本線候補':'追加候補',i<2?'go':'neutral')+'</div><div class="rsaf-grid">'+fact('推定3着内',P(r.p3))+fact('Ability C',F(r.cRank,'位'))+fact('人気',F(r.pop,'人気'))+fact('単勝',F(r.od,'倍',1))+'</div>'+'<div class="rsaf-rankline"><span><b>M3展開順位</b><strong>'+H(ranks.m3)+'</strong></span><span><b>V3能力順位</b><strong>'+H(ranks.v3)+'</strong></span></div></article>';}).join('');
 return '<div class="rsaf-intro"><b>相手馬｜C＋単勝市場で選定</b><p>軸の馬を除いて推定3着内率順に上位4頭だけ表示。M3は展開順位として併記し、相手選定のスコアには加えていません。'+(x.v3?'':' V3の能力DBは更新待ちのため、この選定には使用していません。')+'</p></div>'+cards+'<p class="rsaf-foot">上位2頭が優先候補、3・4頭目は追加候補。馬券の期待値・購入推奨は別判定です。馬番はCSVの並びからの仮番号なので確定枠順との照合が必要です。</p>';
}
function formationHtml(x){if(!x.analyzed)return alert('隊列は過去走CSV解析後に表示します。');
 const q=root.ValidatedQueueState||{},byNo=q.byNo||{},total=x.r.length;
 const items=x.r.map(h=>{const p=byNo[h.no]||{};return {...h,one:N(p.expectedRank),q:p}});
 if(items.some(v=>!Number.isFinite(v.one)))return alert('初角の位置取り予測が不足しています。過去走データと解析状態を確認してください。');
 items.sort((a,b)=>a.one-b.one||Number(a.no)-Number(b.no));
 const breaks=[Math.max(1,Math.round(total/3)),Math.max(2,Math.round(total*2/3))];
 const axis=x.official?.no,pt=new Set(x.partners.map(p=>p.no));
 const lane=(group,title,why)=>'<div class="rsaf-lane"><div class="rsaf-lane-title"><strong>'+H(title)+'</strong><small>'+H(why)+'</small></div><div class="rsaf-lane-horses">'+group.map(v=>'<span class="rsaf-runner'+(v.no===axis?' axis':pt.has(v.no)?' partner':'')+'"><b>'+H(v.no)+'</b>'+H(v.name)+'<small>'+F(v.one,'番手',1)+'</small></span>').join('')+'</div></div>';
 const a=items.slice(0,breaks[0]),b=items.slice(breaks[0],breaks[1]),c=items.slice(breaks[1]);
 const rpci=String($('rpciText')?.textContent||'').trim();
 return '<div class="rsaf-intro"><b>スタート → 初角の隊列予測</b><p>過去走からの予測番手順。実際の内外位置や着順を保証するものではありません。</p></div>'+
 lane(a,'前方','先行グループ')+lane(b,'中団','中位グループ')+lane(c,'後方','差し・追い込みグループ')+
 '<div class="rsaf-legend"><span>● 軸馬</span><span>● 相手候補</span><span>● その他</span></div>'+(rpci?'<p class="rsaf-inline">'+H(rpci.slice(0,240))+'</p>':'');
}
function render(force=false){const panel=ensure();if(!panel)return;
 const receipt=$('av3ForwardPanel'),mount=$('rsafReceiptMount');if(receipt&&mount&&!mount.contains(receipt))mount.appendChild(receipt);
 const receiptDetails=$('rsafReceiptTools');if(receiptDetails){receiptDetails.hidden=STORE.active!=='axis';if(STORE.active!=='axis')receiptDetails.open=false;}
 const r=decisionContext();const n=$('raceName')?.value||'レース分析',v=$('venue')?.value||'',d=$('distance')?.value||'',g=$('grade')?.value||'',sf=$('surface')?.value||'';
 const header=[v,sf+(d?d+'m':''),g].filter(Boolean).join(' ｜ ');
 $('rsafRaceName').textContent=n;$('rsafRaceMeta').textContent=header;
 const status=STORE.dirty?'再解析が必要':!r.analyzed?'分析待ち':!r.odds.complete?'市場待ち':'市場入力済み';$('rsafStatus').textContent=status;
 const sig=JSON.stringify([STORE.active,STORE.dirty,r.year,r.analyzed,r.r.map(o=>[o.no,o.name,o.finishRank]),r.official,r.decision?.at,r.pipeline?.at,r.ranked?.rows?.map?.(z=>[z.no,z.p3]),r.odds?.rows?.map?.(z=>[z.no,z.od]),r.v3?.version,r.v3?.rows?.map?.(z=>[z.no,z.v3Rank]),r.marketP,r.skipDiag?.state,root.AxisAccessGateV1State?.at,root.ValidatedQueueState?.at,$('rpciText')?.textContent,header,n]);
 if(force||sig!==STORE.last){STORE.last=sig;
  for(const [tab,id] of [['axis','rsafAxis'],['partners','rsafPartners'],['formation','rsafFormation']]){
   const el=$(id),show=STORE.active===tab;el.hidden=!show;
   panel.querySelector('[data-rsaf-tab="'+tab+'"]').setAttribute('aria-selected',String(show));
   if(show)el.innerHTML=STORE.dirty?alert('レース条件・CSVが変更されています。「レース構造を解析」を押して再計算してください。'):tab==='axis'?axisHtml(r):tab==='partners'?partnerHtml(r):formationHtml(r);
  }
 }
 root.RSAFocusedThreeTabsState={ready:true,version:VERSION,active:STORE.active,axisNo:r.official?.no||null,partnerNos:r.partners.map(o=>o.no),v3Ready:Boolean(r.v3),marketReady:Boolean(r.odds.complete),analysisReady:r.analyzed,at:Date.now()};
}
function schedule(ms=55){clearTimeout(STORE.timer);STORE.timer=setTimeout(()=>render(),ms);}
const inputs=['raceDate','venue','surface','distance','grade','going','fieldSize','raceName','csvFile'];
root.addEventListener('rsa-analysis-start',()=>{STORE.dirty=false;STORE.last='';schedule(10)});
root.addEventListener('rsa-analysis-complete',()=>{STORE.dirty=false;schedule(90)});
['finish600-ready','m3-pure-ability-ready','validated-queue-ready','position-risk-ready','decision-shell-v2-ready','production-decision-pipeline-ready','mobile-analysis-consistency-ready'].forEach(ev=>root.addEventListener(ev,()=>schedule(80)));
document.addEventListener('change',e=>{if(inputs.includes(e.target?.id)){STORE.dirty=true;schedule(50)}},true);
document.addEventListener('input',e=>{if(e.target?.id==='oddsPaste')schedule(90);else if(inputs.includes(e.target?.id)){STORE.dirty=true;schedule(80)}},true);
document.addEventListener('click',e=>{if(['analyzeBtn','parseCsvBtn'].includes(e.target?.id)){STORE.dirty=false;STORE.last='';schedule(140)}else if(['applyOddsBtn','clearOddsBtn'].includes(e.target?.id))schedule(120)},true);
if(document.readyState==='loading')root.addEventListener('DOMContentLoaded',()=>{ensure();render(true);schedule(170);setTimeout(()=>schedule(0),1100)},{once:true});else{ensure();render(true);schedule(170)}
})(typeof window!=='undefined'?window:globalThis);
