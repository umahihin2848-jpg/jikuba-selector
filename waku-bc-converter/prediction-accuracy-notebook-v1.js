/* Mobile forward-only forecast receipt. No bet recommendations. */
(function(root){'use strict';
const C=root.PredictionAccuracyCoreV1;if(!C||!root.document)return;
const KEY='rsa-forecast-accuracy-v1',$=id=>document.getElementById(id);
const val=id=>String($(id)?.value||'').trim(),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let installed=false;
function list(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x?.key&&x.frozen):[]}catch{return[]}}
function write(a){localStorage.setItem(KEY,JSON.stringify(a))}
function msg(s,bad){const x=$('panStatus');if(x){x.textContent=s;x.style.color=bad?'#ffb6af':'#9de3c9'}}
function nowMeta(){return{date:val('raceDate'),venue:val('venue'),name:val('raceName'),surface:val('surface'),distance:Number(val('distance')),field:Number(val('fieldSize')),grade:val('grade'),going:val('going')}}
function sameAnalysisRace(m){
 const current=root.MobileAnalysisCoreState?.meta||{};
 const norm=x=>String(x??'').normalize('NFKC').trim();
 return root.MobileAnalysisCoreState?.ready===true &&
  ['date','venue','raceName','surface','grade','going'].every((key)=>{
    const inputKey=key==='raceName'?'name':key;
    if(key==='going'&&!current.going)return true;
    return norm(current[key])===norm(m[inputKey]);
  }) && Number(current.distance)===Number(m.distance) &&
     Number(current.fieldSize)===Number(m.field);
}
function makeHorses(){const F=root.Finish600State?.rows||[],A=root.M3PureAbilityState?.byNo||{},Q=root.ValidatedQueueState?.byNo||{},P=root.PositionRiskState?.byNo||{},m=root.DecisionShellV2State?.market||{};
return F.map(f=>{const no=String(f.no),a=A[no]||{},q=Q[no]||{},p=P[no]||{},od=m.complete?m.byNo?.[no]||{}:{};return{no,name:f.name||a.name,abilityRank:a.abilityRank,m3Rank:f.finishRank,expectedCorner:q.expectedRank,lane:q.lane,p10:p.p10,v1Rank:a.v1Rank,pop:od.pop,odds:od.od}})}
function freeze(){
if(root.RSAAnalysisTransitionState?.status!=='ready'||!root.Finish600State?.ready||!root.M3PureAbilityState?.ready||!root.ValidatedQueueState?.ready)return msg('全馬分析が完了してから保存してください。',true);
const m=nowMeta(),s=root.DecisionShellV2State?.structure||{},focus=root.RSAFocusedThreeTabsState||{},ability=root.M3PureAbilityState||{};
if(!sameAnalysisRace(m)||focus.analysisReady!==true)return msg('レース条件を変更したため、発走前の記録には再解析が必要です。',true);
if(!Array.isArray(focus.partnerNos)||!focus.partnerNos.length&&s.axis?.no)return msg('表示中の相手馬候補を取得できません。3タブを再表示して確認してください。',true);
if(['G1','G2','G3'].includes(m.grade)&&ability.activeModel!=='C')return msg('重賞のAbility Cが未成立です。',true);
if($('panNumbersConfirmed')?.checked!==true)return msg('表示馬番はCSVの仮番号の場合があります。公式結果と各馬を照合できることを確認してください。',true);
const pair=s.kind==='pair_v1'?(s.sourcePairCandidates||[]):s.kind==='double'?(s.candidates||[]):[];
const horseSnapshot=makeHorses();
const z=C.freeze({meta:m,startTime:val('panStart'),confirmed:$('panConfirm')?.checked===true,now:Date.now(),
axisNo:s.axis?.no||null,axisKind:s.kind,axisCode:s.code,pairNos:pair.map(x=>x.no),
partners:String(focus.axisNo||'')===String(s.axis?.no||'')?focus.partnerNos||[]:[],partnerMethod:focus.partnerRule,
pace:root.MobileAnalysisCoreState?.analysis?.pred?.p||[],horses:horseSnapshot,
sourceVersions:{ability:ability.version,m3:root.Finish600State?.version,queue:root.ValidatedQueueState?.version,focused:focus.version,numbering:'csv_display_numbers_user_confirmed'}});
if(!z.ok)return msg(z.reason,true);
// Forward-only research receipt: freeze the rank-agreement candidate before the race.
const ec=root.RSAOpponentEvidenceCoreV1;
if(ec&&String(focus.axisNo||'')===String(s.axis?.no||'')&&Array.isArray(focus.partnerNos)&&focus.partnerNos.length===3){
 const chosen=focus.partnerNos.map(no=>horseSnapshot.find(h=>String(h.no)===String(no))).filter(Boolean);
 if(chosen.length===3){
  const pick=ec.mainChoice(chosen),hasTie=chosen.some(h=>horseSnapshot.filter(v=>Number(v.abilityRank)===Number(h.abilityRank)).length>1);
  const kind=hasTie?'tie':pick.kind;
  z.record.frozen.opponentEvidenceV1={version:ec.version,kind,mainNo:kind==='single'?pick.no:null,
   referenceOnly:true,method:'unique_ability_2_3_m3_1_5',comparedPartnerNos:focus.partnerNos.map(String),
   note:'Only agreement rank evidence; not calibrated joint top3 probability or betting guidance'};
 }
}
const a=list();
if(a.some(r=>r.key===z.record.key))return msg('同じレースの予測は固定済みです。上書きできません。',true);
if(a.length>=600)return msg('保存上限です。JSONバックアップを作成してください。',true);
try{a.push(z.record);write(a);$('panConfirm').checked=false;$('panNumbersConfirmed').checked=false;refresh();msg('軸・相手・初角の予測を発走前に固定しました。')}catch{msg('ブラウザの保存領域に書き込めません。',true)}
}
function top3(raw,field){const a=String(raw||'').normalize('NFKC').split(/[\s,、]+/).filter(Boolean);if(a.length!==3||a.some(x=>!/^\d+$/.test(x)))return null;const v=a.map(Number);return new Set(v).size===3&&v.every(x=>x>=1&&x<=field)?v.map(String):null}
function result(){const a=list(),r=a.find(x=>x.key===val('panRace'));if(!r)return msg('レースを選んでください。',true);
if(Date.now()<Date.parse(r.startAt))return msg('発走予定時刻より前は結果を登録できません。',true);
if(r.outcome)return msg('結果は記録済みです。検証値の後付け変更を防ぐため再入力できません。修正が必要な場合はJSONで履歴を保全し、データを監査してください。',true);
const top=top3(val('panTop3'),r.meta.field),corner=C.parsePositions(val('panCorner'),r.meta.field);
if(!top)return msg('確定1〜3着を馬番で入力してください。',true);
if(corner===null)return msg('初角順位は「馬番:順位」の形式で入力してください。',true);
r.outcome={top3:top,corner,recordedAt:new Date().toISOString(),source:'user_entered_unverified'};
try{write(a);refresh();msg('結果を記録しました。事前予測は変更していません。')}catch{msg('結果を保存できません。',true)}
}
const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—',fmt=x=>Number.isFinite(x)?x.toFixed(2):'—';
function refresh(){
const a=list(),z=C.summarize(a),sel=$('panRace'),box=$('panReport');if(!sel||!box)return;
$('panN').textContent=a.length+'R';const keep=sel.value;
sel.innerHTML='<option value="">レースを選択</option>'+a.slice().reverse().map(x=>'<option value="'+safe(x.key)+'">'+safe(x.meta.date+' '+x.meta.venue+' '+x.meta.name+'｜'+(x.outcome?'結果済':'結果待ち'))+'</option>').join('');
if(a.some(x=>x.key===keep))sel.value=keep;
const x=z.axes,y=z.partners,q=z.corner;
box.innerHTML='<div class="panStats"><div><small>軸3着内</small><b>'+x.hits+'/'+x.n+'｜'+pct(x.hits,x.n)+'</b></div><div><small>非1番人気の軸</small><b>'+x.nonfavoriteHits+'/'+x.nonfavoriteN+'｜'+pct(x.nonfavoriteHits,x.nonfavoriteN)+'</b></div><div><small>相手候補3頭中1頭以上</small><b>'+y.hitsAtLeastOne+'/'+y.n+'｜'+pct(y.hitsAtLeastOne,y.n)+'</b></div><div><small>初角平均順位誤差</small><b>'+(q.horses?fmt(q.mae)+'頭':'—')+'</b></div></div>'+

'<p>相手3頭の3着内延べ：'+y.horsesHit+'頭。Ability上位3頭 '+y.abilityHits+'頭、M3上位3頭 '+y.m3Hits+'頭（対応レース数 '+y.abilityN+' / '+y.m3N+'）。</p>'+
'<p>初角比較：'+q.races+'R、'+q.horses+'頭。順位相関 '+fmt(q.meanSpearman)+'。</p>'+
'<p>予測のカバー率：軸候補 '+x.n+'/'+z.completed+'R、相手候補3頭 '+y.n+'/'+z.completed+'R。見送り・データ不足も分母に残します。</p>'+
'<small>結果照合 '+z.completed+'R／結果待ち '+z.pending+'R。同オッズ帯は軸の2/3〜1.5倍。30R未満は探索的結果。発走時刻・確定順位とも利用者入力で公式認証ではありません。</small>';
const g=new Map();for(const r of z.rows){if(r.axisHit===null)continue;const key=r.year+'｜'+(r.axisKind==='pair_v1'?'Pair→v1':r.axisKind==='A1'?'A1':r.axisKind==='A2'?'A2':'その他');if(!g.has(key))g.set(key,{n:0,h:0});const v=g.get(key);v.n++;if(r.axisHit)v.h++;}
if(g.size)box.innerHTML+='<p><b>年別・軸型別（確定結果のみ）</b></p>'+[...g].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>'<div>'+safe(k)+'：'+v.h+'/'+v.n+'（'+pct(v.h,v.n)+'）'+(v.n<30?'｜小標本':'')+'</div>').join('');

const audit=root.PredictionBenchmarkAuditV1?.assess(a);
if(audit){
 const formatRate=(v)=>Number.isFinite(v)?(100*v).toFixed(1)+'%':'—';
 const interval=(v)=>v?'（95%区間 '+formatRate(v.lower)+'〜'+formatRate(v.upper)+'）':'';
 const same=(v)=>v.n?'軸 '+formatRate(v.axisRate)+'／同オッズ帯 '+formatRate(v.peerRate)+'（差 '+(v.gap>=0?'+':'')+formatRate(v.gap)+'）'+(v.n>=30&&v.gapCI95Approx?'［差の95%近似区間 '+formatRate(v.gapCI95Approx.lower)+'〜'+formatRate(v.gapCI95Approx.upper)+'］':'［探索的・小標本］'):'比較可能レースなし';
 const categories=(obj)=>Object.entries(obj).map(([name,v])=>'<div>'+safe(name)+'：'+v.hits+'/'+v.n+'（'+formatRate(v.rate)+'）'+(v.n>=20?interval(v.ci95):'｜小標本')+'</div>').join('');
 box.innerHTML+='<hr><p><b>市場に対する軸の精度（同一レース比較）</b></p>'+
  '<div>全軸：'+audit.all.hits+'/'+audit.all.n+'（'+formatRate(audit.all.rate)+'）'+interval(audit.all.ci95)+'</div>'+
  '<div>非1番人気の軸：'+audit.nonfavorite.hits+'/'+audit.nonfavorite.n+'（'+formatRate(audit.nonfavorite.rate)+'）'+interval(audit.nonfavorite.ci95)+'</div>'+
  '<div>同オッズ帯の馬2頭以上：'+same(audit.matched)+'｜'+audit.matched.n+'R</div>'+
  '<div>非1番人気だけの同オッズ帯比較：'+same(audit.nonfavoriteMatched)+'｜'+audit.nonfavoriteMatched.n+'R</div>'+
  '<details><summary>人気帯・オッズ帯別の実績</summary><b>人気帯</b>'+categories(audit.popularity)+'<b>単勝オッズ帯</b>'+categories(audit.odds)+'</details>'+
  '<small>市場データが揃う軸 '+audit.marketComplete+'/'+audit.completed+'R。比較不能 '+(audit.marketMissing+audit.ignored.peerUnavailable)+'R（市場欠損 '+audit.marketMissing+'、近いオッズの他馬が2頭未満 '+audit.ignored.peerUnavailable+'）。'+safe(audit.disclosure)+' 95%区間は標本不確実性の目安で、過学習や選択バイアスを除去するものではありません。</small>';
}

const evRecords=a.filter(rec=>rec?.outcome?.top3?.length===3&&rec?.frozen?.opponentEvidenceV1?.kind==='single'&&rec?.frozen?.opponentEvidenceV1?.mainNo&&rec?.frozen?.axisNo);
const evWide=evRecords.filter(rec=>rec.outcome.top3.map(String).includes(String(rec.frozen.axisNo))&&rec.outcome.top3.map(String).includes(String(rec.frozen.opponentEvidenceV1.mainNo))).length;
const evAxis=evRecords.filter(rec=>rec.outcome.top3.map(String).includes(String(rec.frozen.axisNo))).length;
box.innerHTML+='<hr><p><b>相手本線候補の発走前検証（研究）</b></p>'+
 '<div>順位一致の比較優先1頭と軸のワイド成立：'+evWide+'/'+evRecords.length+'R（'+pct(evWide,evRecords.length)+'）</div>'+
 '<div>うち軸3着以内：'+evAxis+'/'+evRecords.length+'R。順位一致候補が複数・不在・同点のレースは本線未確定として扱い、上記の分母に含めません。</div>'+
 '<small>2026-11-22版以降に発走前固定した記録のみが対象です。小標本・未較正であり、購入オッズの判断に使える精度ではありません。</small>';
const diagnosis=C.summarizeDiagnosis(a),counts=diagnosis.counts;
box.innerHTML+='<hr><p><b>外れ方の分類（重複あり）</b></p>'+
 '<div>軸馬が圏外：'+counts.axisMiss+'/'+diagnosis.n+'R。このうちAbility上位3頭が全滅：'+counts.abilityShortlistMiss+'R／Ability上位に好走馬がいた：'+counts.axisChoiceMiss+'R。</div>'+
 '<div>軸が好走・相手3頭が全滅：'+counts.opponentMissWithGoodAxis+'R。軸が圏外・相手は好走：'+counts.axisMissWithGoodPartners+'R。両方圏外：'+counts.bothAxisAndOpponentMiss+'R。</div>'+
 '<div>軸の初角が3頭以上ずれた：'+counts.largeAxisPositionError+'/'+diagnosis.axisPositionN+'R。レース全体の初角平均誤差が3頭以上：'+counts.fieldPositionError+'/'+diagnosis.cornerN+'R。</div>'+
 '<small>これは原因の断定ではなく、観測された誤差の分類です。隊列の結果未入力は精度不明として分母から除外します。複数項目が重なる場合があります。</small>'+
 (diagnosis.rows.some(r=>r.messages.length)?'<details><summary>レース別の外れ方を確認</summary>'+diagnosis.rows.filter(r=>r.messages.length).slice(-30).map(r=>
  '<div class="panMiss"><strong>'+safe(r.key.split('|').slice(0,3).join(' '))+'</strong><small>'+safe(r.messages.join('／'))+'</small></div>').join('')+'</details>':'');

}
function exportData(){const blob=new Blob([JSON.stringify({schema:'rsa-accuracy-v1',createdAt:new Date().toISOString(),records:list()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='競馬予測精度_事前記録.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function init(){if(installed)return;const target=$('rsafReceiptMount');if(!target)return;installed=true;
const rootEl=document.createElement('section');rootEl.id='panAccuracy';rootEl.innerHTML='<header><b>予測精度ノート</b><small id="panN"></small></header>'+
'<p>買い目不要。発走前に軸・相手・初角予測を保存し、後から結果だけを追記します。</p>'+
'<label>公式発走時刻（JST）<input id="panStart" type="time"></label><label class="panCheck"><input id="panConfirm" type="checkbox">公式発走時刻を確認済み</label>'+ 
'<label class="panCheck"><input id="panNumbersConfirmed" type="checkbox">CSV上の表示番号と実際の出走馬を照合できる</label>'+ 
'<button id="panFreeze" type="button">いまの予測を固定保存</button><hr>'+
'<label>結果を記録するレース<select id="panRace"></select></label>'+
'<label>確定1〜3着（CSVの表示番号で入力）<input id="panTop3" placeholder="例：3, 7, 11"></label><small>公式馬番とCSV表示番号が異なる場合は、CSV表示番号に読み替えて入力。例：公式1着馬がCSVの5番なら「5」を入力。</small>'+ 
'<label>初角通過順位（任意、CSV表示番号:実際の順位）<textarea id="panCorner" placeholder="例：1:3 2:1 3:8"></textarea></label>'+ 
'<button id="panResult" type="button">結果を追記</button><button id="panExport" type="button">JSONバックアップ</button>'+
'<p role="status" id="panStatus"></p><div id="panReport"></div>';
target.appendChild(rootEl);const st=document.createElement('style');st.textContent='#panAccuracy{border:1px solid #345d70;padding:11px;border-radius:12px;margin-top:10px;color:#d6eaf0;font-size:12px}#panAccuracy header{display:flex;justify-content:space-between}#panAccuracy p{line-height:1.6}#panAccuracy label{display:block;margin:8px 0}#panAccuracy input:not([type=checkbox]),#panAccuracy select,#panAccuracy textarea{width:100%;box-sizing:border-box;display:block;background:#0a2435;border:1px solid #476579;border-radius:8px;padding:9px;color:#fff;font-size:14px}#panAccuracy .panCheck{display:flex;gap:7px;align-items:center}#panAccuracy button{padding:10px;background:#154d3b;border:1px solid #398469;border-radius:9px;color:#eafff3;margin:5px 6px 5px 0;min-height:42px}#panAccuracy .panStats{display:grid;grid-template-columns:1fr 1fr;gap:7px}#panAccuracy .panStats div{padding:8px;border:1px solid #355366;border-radius:7px}#panAccuracy .panStats small{display:block;font-size:10px;color:#a1b6c4}#panAccuracy #panReport>small{font-size:10px;color:#a2b4bf}';document.head.appendChild(st);
$('panFreeze').addEventListener('click',freeze);$('panResult').addEventListener('click',result);$('panExport').addEventListener('click',exportData);
$('panRace').addEventListener('change',()=>{const rec=list().find(x=>x.key===val('panRace'));$('panTop3').value=rec?.outcome?.top3?.join(', ')||'';$('panCorner').value=rec?.outcome?Object.entries(rec.outcome.corner||{}).map(([no,p])=>no+':'+p).join(' '):''});refresh();
}
const schedule=()=>setTimeout(init,150);
['rsa-focused-partner-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>root.addEventListener?.(ev,schedule));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
root.PredictionAccuracyNotebookV1={ready:true,version:'prediction-accuracy-notebook-v1.0',refresh};
})(typeof window!=='undefined'?window:globalThis);