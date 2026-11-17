/* P3-27 experimental Ability V3 research panel.
 * Isolated from production decision and betting state; never mutates them.
 * V3 features must be the pre-race P4-2b network h730 / Peak730, NOT proxies.
 * Frozen 2024-26 model, no automatic 2027 extrapolation. */
(function(root){'use strict';
const VERSION='ability-v3-research-mode-v1-20261117';
const DATA_MODEL='data/ability_v3_research_models_2026.json';
const DATA_ARCHIVE='data/research_v3_reference_271.json';
const NUMBER=x=>x===null||x===undefined||String(x).trim()===''?NaN:Number(x);
const NORMAL=x=>String(x??'').normalize('NFKC').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const pFmt=v=>Number.isFinite(v)?(v*100).toFixed(1)+'%':'—';
const nFmt=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';
const integerNo=v=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=18?String(n):'';};
const canonicalDate=x=>{const s=NORMAL(x).replace(/[^0-9]/g,'');return s.length===8?s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8):'';};
const normSurface=x=>{const s=NORMAL(x);return s==='ダート'?'ダ':s;};
const matchName=(a,b)=>NORMAL(a)===NORMAL(b);
const strictField=card=>Number.isInteger(card.field)&&card.field>=12&&card.field<=18;
function modelScore(input,params){if(!params||!Array.isArray(params.features))return NaN;
  let z=Number(params.intercept);
  for(let i=0;i<params.features.length;i++){
    const v=NUMBER(input[params.features[i]]), mu=NUMBER(params.mean[i]), sd=NUMBER(params.std[i]), b=NUMBER(params.coef[i]);
    if(![v,mu,sd,b].every(Number.isFinite)||sd<=0)return NaN;
    z+=b*((v-mu)/sd);
  }return z;
}
function projected(rows,key='z'){
  if(!rows.length||rows.some(r=>!Number.isFinite(r[key])))return null;
  const target=Math.min(3,rows.length);let lo=-100,hi=100;
  for(let i=0;i<80;i++){const mid=(lo+hi)/2,s=rows.reduce((t,r)=>t+sigmoid(r[key]+mid),0);if(s>target)hi=mid;else lo=mid;}
  const offset=(lo+hi)/2;return rows.map(r=>({...r,p3:sigmoid(r[key]+offset)}));
}
function marketStructure(market,params){if(!market?.complete||market.rows.length<12||!params)return null;
  const ordered=[...market.rows].sort((a,b)=>a.od-b.od||Number(a.no)-Number(b.no));
  const q=ordered.map(r=>1/r.od),s=q.reduce((a,b)=>a+b,0);if(!(s>0))return null;
  const w=q.map(v=>v/s), n=w.length;
  const x={log_o:Math.log(ordered[0].od),q1:w[0],q4:w.slice(0,4).reduce((a,b)=>a+b,0),entropy:-w.reduce((a,b)=>a+b*Math.log(b),0)/Math.log(n),log_ratio:Math.log(ordered[1].od/ordered[0].od)};
  const z=modelScore(x,params);return Number.isFinite(z)?sigmoid(z):null;
}
function buildMarket(raw,roster){const rows=[],taken=new Set();
  for(const l of String(raw||'').split(/\r?\n/)){
    const line=NORMAL(l),m=line.match(/^(\d{1,2})\s*[,\t ]+\s*([0-9]+(?:\.[0-9]+)?)/);
    if(!m)continue;const no=integerNo(m[1]),od=Number(m[2]);if(!no||!Number.isFinite(od)||od<1||taken.has(no))return{complete:false,rows:[],reason:'単勝オッズの重複・不正値'};
    taken.add(no);rows.push({no,od});
  }
  rows.sort((a,b)=>a.od-b.od||Number(a.no)-Number(b.no));rows.forEach((r,i)=>r.pop=i+1);
  const required=new Set(roster.map(r=>String(r.no))),complete=rows.length===required.size&&required.size>=12&&rows.every(r=>required.has(r.no));
  return{complete,rows,byNo:Object.fromEntries(rows.map(r=>[r.no,r])),reason:complete?'':'全頭分の単勝オッズ未入力'};
}
function raceMeta(dom){const g=id=>dom.getElementById(id)?.value;
  return{date:canonicalDate(g('raceDate')),venue:NORMAL(g('venue')),surface:normSurface(g('surface')),distance:Number(g('distance')),grade:NORMAL(g('grade')),field:Number(g('fieldSize'))};
}
function validateCard(card,meta,roster){
  if(!card||!strictField(card))return{ok:false,reason:'V3特徴量がありません'};
  if(card.date!==meta.date||NORMAL(card.venue)!==meta.venue||normSurface(card.surface)!==meta.surface||Number(card.distance)!==meta.distance)return{ok:false,reason:'開催日・競馬場・芝ダート・距離が一致しません'};
  if(card.field!==roster.length||Number(meta.field)!==roster.length||card.horses?.length!==roster.length)return{ok:false,reason:'出走頭数が一致しません'};
  const hs=new Map();for(const h of card.horses){const no=integerNo(h.no);if(!no||hs.has(no)||!Number.isFinite(NUMBER(h.h730))||h.peak!==null&&h.peak!==undefined&&!Number.isFinite(NUMBER(h.peak)))return{ok:false,reason:'V3馬番の重複・能力値不正'};hs.set(no,h);}
  for(const r of roster){const h=hs.get(String(r.no));if(!h||!matchName(h.name,r.name))return{ok:false,reason:`馬番・馬名の不一致（${r.no}番 ${r.name}）。別レースのV3を使用しません`};}
  return{ok:true,reason:'全馬・全条件一致'};
}
function matchReference(reference,meta,roster){const matches=(reference?.races||[]).filter(c=>c.date===meta.date&&NORMAL(c.venue)===meta.venue&&normSurface(c.surface)===meta.surface&&Number(c.distance)===meta.distance&&c.field===roster.length&&validateCard(c,meta,roster).ok);return matches.length===1?matches[0]:null;}
function rowsFromCsv(csvText,parser){
  if(!parser?.parseCSV||!parser?.rowsToObjects)throw new Error('TARGET CSV処理を利用できません');
  const parsed=parser.rowsToObjects(parser.parseCSV(String(csvText).replace(/^\uFEFF/,'')));const H=parsed.headers;
  const spec=['date','venue','surface','distance','no','name','h730','h730_peak','h730_n','h730_gap','h730_peak_n'];
  for(const h of spec)if(!H.includes(h))throw new Error('必要列不足: '+h+'（サンプルCSVの形式で読み込んでください）');
  if(!parsed.rows.length||parsed.rows.length>18)throw new Error('V3 CSVは1レース分の12〜18頭が必要です');
  const cards=[];let race=null;
  for(const r of parsed.rows){const mt={date:canonicalDate(r.date),venue:NORMAL(r.venue),surface:normSurface(r.surface),distance:Number(r.distance),rid:NORMAL(r.rid),no:integerNo(r.no),name:NORMAL(r.name)};
    if(!mt.date||!mt.venue||!mt.no||!mt.name||!Number.isInteger(mt.distance)||!Number.isFinite(NUMBER(r.h730)))throw new Error('必須値が空白または不正です');
    const key=[mt.date,mt.venue,mt.surface,mt.distance,mt.rid].join('|');if(race&&race!==key)throw new Error('複数レースが混在しています');race=key;
    cards.push({no:Number(mt.no),name:mt.name,h730:Number(r.h730),peak:r.h730_peak===undefined||r.h730_peak===null||String(r.h730_peak).trim()===''?null:NUMBER(r.h730_peak),n:NUMBER(r.h730_n),gap:NUMBER(r.h730_gap),peakN:NUMBER(r.h730_peak_n)});
  }
  const r=parsed.rows[0];return{date:canonicalDate(r.date),venue:NORMAL(r.venue),surface:normSurface(r.surface),distance:Number(r.distance),rid:NORMAL(r.rid),field:cards.length,horses:cards};
}
function analyze(data){const {meta,roster,cState,decision,oddsText,v3Card,models}=data;
  if(!meta.date||!meta.venue||!meta.surface||!(meta.distance>600)||!Number.isInteger(meta.field))return{ready:false,reason:'レース日・競馬場・芝ダート・距離・頭数を入力してください'};
  if(!(roster?.length>=12&&roster.length<=18))return{ready:false,reason:'M3の出走馬一覧を解析してから開いてください'};
  if(!['G1','G2','G3'].includes(meta.grade.toUpperCase()))return{ready:false,reason:'G1〜G3重賞の研究対象外です'};
  const year=Number(meta.date.slice(0,4)),fit=models?.models?.[year],structureFit=models?.market_structure_P4_1?.[year];
  if(!fit||!structureFit)return{ready:false,reason:`${year}年の凍結研究モデルがありません。未学習年度へ流用しません`};
  const check=validateCard(v3Card,meta,roster);
  if(!check.ok)return{ready:false,reason:check.reason};
  const market=buildMarket(oddsText,roster),ms=market.complete?marketStructure(market,structureFit):null;
  const cValid=Boolean(cState?.ready&&cState.activeModel==='C'&&cState.rows?.length===roster.length&&roster.every(r=>{const c=cState.byNo?.[String(r.no)];return c&&matchName(r.name,c.name)&&Number.isFinite(NUMBER(c.logit));}));
  const cBy=cValid?cState.byNo:{};
  const fBy=Object.fromEntries(roster.map(r=>[String(r.no),r]));
  const rows=v3Card.horses.map(h=>{const no=String(h.no),c=cBy?.[no],mk=market.byNo?.[no];return{
    no,name:h.name,h730:Number(h.h730),peak:h.peak===null||h.peak===undefined?Number(h.h730):Number(h.peak),miss:h.peak===null||h.peak===undefined?1:0,
    histN:Number(h.n)||0,gap:Number(h.gap),C:cValid?Number(c.logit):NaN,cRank:cValid?Number(c.abilityRank):NaN,
    m3:Number(fBy[no]?.finishRank),odds:mk?.od,pop:mk?.pop,market:mk?-Math.log(mk.od):NaN,
  };});
  function calc(key){const prm=fit[key];if(!prm)return null;const scored=rows.map(r=>({...r,z:modelScore({...r,c_exact:r.C},prm)}));return projected(scored);}
  const v3Ability=calc('V3A');if(!v3Ability)return{ready:false,reason:'V3スコアを計算できません'};
  const v3AbilityRank=[...v3Ability].sort((a,b)=>b.p3-a.p3||Number(a.no)-Number(b.no));const ranks=Object.fromEntries(v3AbilityRank.map((r,i)=>[r.no,i+1]));
  rows.forEach(r=>r.v3Rank=ranks[r.no]);
  const computed={V3A:v3Ability};
  if(market.complete){computed.V3W=calc('V3W');if(cValid){computed.CW=calc('CW');computed.CWV3=calc('CWV3');}}
  const byModel=key=>Object.fromEntries((computed[key]||[]).map(r=>[r.no,r.p3]));
  const cProb=byModel('CW'),v3Prob=byModel('V3W'),mixProb=byModel('CWV3');
  for(const r of rows){r.CW=cProb[r.no];r.V3W=v3Prob[r.no];r.CWV3=mixProb[r.no];r.V3A=byModel('V3A')[r.no];}
  function pick(key,axisNo=null,k=4){const z=computed[key];if(!z)return null;const ordered=[...z].sort((a,b)=>b.p3-a.p3||Number(a.no)-Number(b.no));const axis=axisNo?ordered.find(r=>r.no===String(axisNo)):ordered[0];if(!axis)return null;return{axis,partners:ordered.filter(r=>r.no!==axis.no).slice(0,k)};}
  const cPick=pick('CW'),vPick=pick('V3W'),cMix=cPick?pick('CWV3',cPick.axis.no):null;
  const productionAxis=decision?.structure?.axis||null;
  const prodCode=String(decision?.final?.code||decision?.structure?.code||'unknown');
  const recheck=market.complete&&ms!==null&&ms>=.60&&['no_auto_axis','ability_rank_tie'].includes(prodCode);
  return{ready:true,version:VERSION,year,modelTrainThrough:year-1,meta,cValid,market,marketP:ms,recheck,prodCode,productionAxis,rows,abilityRanking:v3AbilityRank,cPick,vPick,cMix,hasMarket:market.complete,cardRid:v3Card.rid||'',notes:'歴史データは研究凍結特徴量。現行C＋M3および購入ロックは無変更。全推定確率は研究値・未較正。'};
}
// Pure interface for independent Node regression tests.
root.AbilityV3ResearchCoreV1={version:VERSION,modelScore,projected,marketStructure,buildMarket,validateCard,matchReference,rowsFromCsv,analyze};
if(!root.document||typeof root.addEventListener!=='function')return;
let models=null,archive=null,manual=null,initialized=false,opened=false,fetching=false,lastState=null,raf=0,lastSignature='',lastSource='';
const $=id=>document.getElementById(id);
function renderError(reason){lastSource='';const out=$('av3Result');if(out)out.innerHTML=`<div class="av3-notice">${esc(reason)}</div>`;lastState=null;}
const htmlNames=a=>a.map(r=>`<span class="av3-chip">${esc(r.no)} ${esc(r.name)}</span>`).join(' ');
function draw(res,source){lastSource=source;const o=$('av3Result');if(!o)return;lastState=res;
  const tags=res.rows.map(r=>`<tr><td>${esc(r.no)}</td><td>${esc(r.name)}</td><td>${Number.isFinite(r.cRank)?r.cRank:'—'}</td><td><b>${r.v3Rank}</b></td><td>${nFmt(r.h730,3)}</td><td>${r.miss?'—':nFmt(r.peak,3)}</td><td>${Number.isFinite(r.m3)?r.m3:'—'}</td><td>${Number.isFinite(r.pop)?r.pop:'—'}</td><td>${pFmt(r.CW)}</td><td>${pFmt(r.V3W)}</td></tr>`).join('');
  const fmtAxis=p=>p?`<b>${esc(p.axis.no)} ${esc(p.axis.name)}</b> <small>推定3着内 ${pFmt(p.axis.p3)}</small>`:'<span>必要データ不足</span>';
  const f=res.productionAxis,mode=res.recheck?'<span class="av3-caution">再点検対象（購入ロック維持）</span>':res.prodCode==='unknown'?'<span>本番判定待ち</span>':`<span>現行判定：${esc(res.prodCode)}</span>`;
  o.innerHTML=`<div class="av3-note"><b>V3データ：${esc(source)}</b> ｜モデル：${res.year}年用（${res.modelTrainThrough}年まで学習）</div>
    <div class="av3-metrics"><div><small>市場構造：1番人気3着内推定</small><b>${pFmt(res.marketP)}</b></div><div><small>現行構造軸</small><b>${f?esc(f.no)+' '+esc(f.name):'なし'}</b></div><div><small>見送り再点検</small><b>${mode}</b></div></div>
    <div class="av3-columns"><div class="av3-tile"><small>市場＋C 研究軸</small>${fmtAxis(res.cPick)}</div><div class="av3-tile"><small>市場＋V3 研究軸</small>${fmtAxis(res.vPick)}</div></div>
    <div class="av3-tile"><b>相手4頭｜市場＋C</b><div class="av3-chips">${res.cPick?htmlNames(res.cPick.partners):'Cまたは全頭単勝オッズ待ち'}</div><small>研究用。現行の市場Top2相手は維持</small></div>
    <div class="av3-tile"><b>相手4頭｜C軸＋C/V3混合</b><div class="av3-chips">${res.cMix?htmlNames(res.cMix.partners):'Cまたは全頭単勝オッズ待ち'}</div><small>以前のP3-14使い分け研究との比較用</small></div>
    <div class="av3-tile"><b>V3単独の能力番付 上位5頭</b><div class="av3-chips">${htmlNames(res.abilityRanking.slice(0,5))}</div><small>単勝オッズを含めない能力評価</small></div>
    <div class="av3-scroll"><table class="av3-table"><thead><tr><th>番</th><th>馬名</th><th>C位</th><th>V3位</th><th>Dynamic</th><th>Peak</th><th>M3位</th><th>人気</th><th>C＋市場</th><th>V3＋市場</th></tr></thead><tbody>${tags}</tbody></table></div>
    <p class="av3-footnote">${esc(res.notes)} 市場構造の0.60は探索済み研究閾値で、馬券期待値・軸＋相手の同時好走確率ではありません。C/V3の3着内推定にも較正ずれがあります。発走前の実績検証前に本番の見送りを解除しません。</p>`;
}
function roster(){const F=root.Finish600State;return F?.ready?(F.rows||[]).map(r=>({no:integerNo(r.no),name:NORMAL(r.name),finishRank:r.finishRank})).filter(r=>r.no):[];}
function stateSignature(){const m=raceMeta(document),a=root.M3PureAbilityState,d=root.DecisionShellV2State;
 return JSON.stringify([m,roster().map(r=>[r.no,r.name,r.finishRank]),a?.at,a?.activeModel,d?.at,$('oddsPaste')?.value,manual?.rid]);}
function compute(){if(!opened||!models||!archive)return;const sig=stateSignature();if(sig===lastSignature&&lastState)return;lastSignature=sig;
 const r=roster(),meta=raceMeta(document),card=(manual&&validateCard(manual,meta,r).ok)?manual:matchReference(archive,meta,r);
 if(!card){renderError(manual?'持込V3データは現在の出走馬・レース条件に一致しません。過去271レース内にも一致なし。':'このレースのV3特徴量がありません。実証済みデータを読み込むまでV3能力を推定しません。');return;}
 const result=analyze({meta,roster:r,cState:root.M3PureAbilityState,decision:root.DecisionShellV2State,oddsText:$('oddsPaste')?.value,v3Card:card,models});
 if(!result.ready){renderError(result.reason);return;}draw(result,card===manual?'手動インポート（全馬照合済み）':'保存済み271レースの凍結研究データ');
}
function schedule(){if(!opened||raf)return;raf=(root.requestAnimationFrame||((f)=>setTimeout(f,0)))(()=>{raf=0;compute()});}
async function prepare(){if(models&&archive)return true;if(fetching)return false;fetching=true;renderError('研究モデル・過去V3特徴量を読み込み中');try{
 const [mr,ar]=await Promise.all([fetch(DATA_MODEL,{cache:'no-store'}),fetch(DATA_ARCHIVE,{cache:'no-store'})]);if(!mr.ok||!ar.ok)throw new Error('HTTP '+mr.status+'/'+ar.status);
 const [m,a]=await Promise.all([mr.json(),ar.json()]);if(m.version!=='P3-27-v1'||a.version!=='P3-27-v1'||a.races?.length!==271)throw new Error('研究モデルのバージョン不一致');
 models=m;archive=a;fetching=false;return true;
 }catch(e){fetching=false;renderError('研究データの取得に失敗：'+e.message+'。ZIPを展開してHTTPサーバーで開いてください（file://直開き非対応）。');return false;}}
async function importFile(file){if(!file)return;try{
 const buff=await file.arrayBuffer(),decode=root.ShapeCore?.decode?.(buff)||new TextDecoder('utf-8').decode(buff),card=rowsFromCsv(decode,root.ShapeCore);
 if(!strictField(card))throw new Error('1レース12〜18頭にしてください');manual=card;lastSignature='';$('av3ImportStatus').textContent=`読込済み：${file.name}（${card.field}頭）。一致した出走表のみ適用`;
 if(await prepare())schedule();
 }catch(e){manual=null;lastSignature='';$('av3ImportStatus').textContent='読込失敗：'+e.message;renderError('V3 CSVの形式または内容が正しくありません：'+e.message);}}
// Read-only, current-race-only bridge for P3-28 prospective receipt export.
// This does not modify any production gate, axis or betting state.
root.AbilityV3ResearchPanelBridgeV1=Object.freeze({
  getCurrent(){
    if(!opened)return{ok:false,reason:'研究パネルを開いて解析結果を表示してください'};
    if(!models||!archive)return{ok:false,reason:'研究モデルの読み込みが完了していません'};
    compute();
    if(!lastState?.ready||lastSignature!==stateSignature())return{ok:false,reason:'現在のレースの解析結果が有効ではありません。再解析してください'};
    const res=lastState;
    if(!res.cValid||!res.hasMarket||!res.cPick||!res.vPick||!res.cMix)return{ok:false,reason:'C・V3と全頭単勝オッズがそろった解析が必要です'};
    return{ok:true,source:lastSource,analysis:JSON.parse(JSON.stringify(res))};
  }
});
function init(){if(initialized)return;initialized=true;const odds=$('oddsCard');if(!odds)return;
 const details=document.createElement('details');details.id='av3ResearchPanel';details.className='av3-research';
 details.innerHTML=`<summary><span>Ability C × V3 研究モード</span><small>能力番付・軸比較・相手4頭・見送り再点検</small></summary>
 <div class="av3-body"><div class="av3-notice">本番とは完全に別の比較表示です。Ability C・M3・購入ロック・市場Top2相手は変更しません。研究用V3は730日Dynamic＋Peakを使用します。</div>
 <label class="av3-label" for="av3FeatureFile">追加V3特徴量 CSV（任意・現在の出走表と全馬一致した場合のみ）</label><input id="av3FeatureFile" type="file" accept=".csv,text/csv" />
 <div id="av3ImportStatus" class="av3-hint">保存済み2024〜2026年271レースは自動照合。新規レースはV3特徴量CSVが必要です。</div>
 <button type="button" id="av3Refresh" class="secondary">研究比較を更新</button><div id="av3Result" aria-live="polite" class="av3-result"><div class="av3-notice">開くとモデルを読み込み、出走馬を照合します。</div></div></div>`;
 odds.appendChild(details);
 details.addEventListener('toggle',async()=>{opened=details.open;if(opened&&await prepare()){lastSignature='';compute();}});
 $('av3FeatureFile').addEventListener('change',e=>importFile(e.target.files?.[0]));
 $('av3Refresh').addEventListener('click',()=>{lastSignature='';schedule()});
 ['m3-pure-ability-ready','finish600-ready','decision-shell-v2-ready','rsa-analysis-complete'].forEach(ev=>root.addEventListener(ev,schedule));
 document.addEventListener('input',e=>{if(['oddsPaste','raceDate','venue','surface','distance','fieldSize','grade'].includes(e.target?.id))schedule()},true);
}
if(document.readyState==='loading')root.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window!=='undefined'?window:globalThis);
