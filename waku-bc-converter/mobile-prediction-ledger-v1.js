(()=>{
'use strict';
if(!window.RSAMobileLean||window.__MOBILE_PREDICTION_LEDGER_V1)return;
window.__MOBILE_PREDICTION_LEDGER_V1=true;
const V='mobile-prediction-ledger-v1.4',KEY='rsa-mobile-prediction-ledger-v1',MAX=500;
const $=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const val=id=>String($(id)?.value??'').trim();
let timer=0,retries=0,ready=false,lastRace='',lastHistory='',scenarioOrigin='manual-form';
function css(){
 if($('mplCss'))return;
 const s=document.createElement('style');s.id='mplCss';
 s.textContent=[
 '#mobilePredictionLedger{border:1px solid #36576a;border-radius:16px;background:#091b2a;margin:12px 0;overflow:hidden;color:#e5f2f8}',
 '#mobilePredictionLedger>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;list-style:none;padding:13px 12px;min-height:50px;cursor:pointer;font-size:13px;font-weight:850}',
 '#mobilePredictionLedger>summary::-webkit-details-marker{display:none}',
 '#mobilePredictionLedger .mplBody{padding:0 12px 12px}',
 '#mobilePredictionLedger .mplIntro{font-size:11px;line-height:1.6;color:#a0b9c6;margin:5px 0 11px}',
 '#mobilePredictionLedger .mplContext{padding:9px;border-radius:9px;background:#0c2938;font-size:11px;line-height:1.6;color:#c5d9e1;margin-bottom:10px}',
 '#mobilePredictionLedger .mplGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}',
 '#mobilePredictionLedger .mplField{display:grid;gap:5px;min-width:0}',
 '#mobilePredictionLedger .mplField.full{grid-column:1/-1}',
 '#mobilePredictionLedger label{font-size:11px;font-weight:750;color:#c5dbe5}',
 '#mobilePredictionLedger select,#mobilePredictionLedger input:not([type="checkbox"]):not([type="file"]),#mobilePredictionLedger textarea{width:100%;min-width:0;min-height:43px;padding:8px;border:1px solid #416578;border-radius:9px;font:inherit;font-size:14px;color:#eef8fb;background:#0b2635;box-sizing:border-box}',
 '#mobilePredictionLedger textarea{min-height:66px;resize:vertical}',
 '#mobilePredictionLedger option{background:#102635;color:#eef8fb}',
 '#mobilePredictionLedger .mplCheck{display:flex;align-items:flex-start;gap:8px;font-size:11px;line-height:1.5;margin:12px 0;color:#e1ebf1}',
 '#mobilePredictionLedger .mplCheck input{width:19px;height:19px;flex:none}',
 '#mobilePredictionLedger .mplBtns{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}',
 '#mobilePredictionLedger button{border:1px solid #456b7d;border-radius:9px;background:#163c4b;color:#eef9fb;min-height:43px;font-size:12px;font-weight:850;padding:9px 12px}',
 '#mobilePredictionLedger button.mplPrimary{background:#146047;border-color:#338367}',
 '#mobilePredictionLedger .mplStatus{min-height:21px;font-size:11px;line-height:1.6;color:#a8dfbf;margin-top:7px}',
 '#mobilePredictionLedger .mplDivider{border:0;border-top:1px solid #315165;margin:14px 0}',
 '#mobilePredictionLedger .mplRecords{font-size:11px;line-height:1.65;color:#afc7d1;margin-top:10px}',
 '#mobilePredictionLedger .mplRecent{margin-top:6px;padding:7px 0;border-bottom:1px solid #254455}',
 '#mobilePredictionLedger .mplFine{font-size:10px;line-height:1.65;color:#8faab9}',
 '#mobilePredictionLedger .mplResultRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
 '@media(max-width:375px){#mobilePredictionLedger .mplGrid{gap:7px}#mobilePredictionLedger .mplBody{padding:0 9px 9px}}'
 ].join('');document.head.appendChild(s);
}
function html(){
 return [
 '<summary>📝 予想判断を記録 <small id="mplCount" style="font-size:11px;color:#a7c5d2;font-weight:700">端末内保存</small></summary>',
 '<div class="mplBody"><p class="mplIntro">アプリの軸候補と予測データを参照し、実際に選んだ展開・馬場・シナリオを発走前に保存。見送りも記録できます。</p>',
 '<div id="mplContext" class="mplContext">レース分析待ち</div>',
 '<div class="mplGrid">',
 '<div class="mplField"><label for="mplRaceRef">レース識別名（未入力時のみ）</label><input id="mplRaceRef" placeholder="例：東京11R" maxlength="48"></div>',
 '<div class="mplField"><label for="mplStartTime">発走予定時刻（JST）</label><input id="mplStartTime" type="time" step="60"></div><div class="mplField"><label for="mplAxis">採用する軸馬番</label><input id="mplAxis" inputmode="numeric" type="number" min="1" max="18" placeholder="例：6"></div>',
 '<div class="mplField"><label for="mplPace">決め打ちシナリオ</label><select id="mplPace"><option value="">選択してください</option><option value="0">強前傾</option><option value="1">前傾</option><option value="2">標準</option><option value="3">スロー</option><option value="unknown">判断保留</option></select></div>',
 '<div class="mplField full"><small id="mplScenarioSource" style="font-size:11px;color:#a7c7d5">アプリ本線は参考表示。シナリオは手動で決定してください。</small></div><div class="mplField"><label for="mplFront">展開判断</label><select id="mplFront"><option value="">選択してください</option><option value="hold">前残り</option><option value="collapse">前崩れ</option><option value="neutral">中立・読めない</option></select></div>',
 '<div class="mplField"><label for="mplTrack">映像で判断した馬場</label><select id="mplTrack"><option value="">選択してください</option><option value="flat">フラット</option><option value="inside_bad">内が伸びない</option><option value="outside_bad">外を回すと厳しい</option><option value="unknown">未判定</option></select></div>',
 '<div class="mplField"><label for="mplDecision">購入判断</label><select id="mplDecision"><option value="buy">購入する</option><option value="skip">見送る</option><option value="hold">購入保留</option></select></div>',
 '<div class="mplField"><label for="mplPartners">ワイド相手馬番（見送り時は仮想候補）</label><input id="mplPartners" placeholder="例：3, 11" maxlength="80"></div>',
 '<div class="mplField"><label for="mplPrices">想定ワイドオッズ</label><input id="mplPrices" placeholder="例：6-11 8.5倍" maxlength="100"></div>',
 '<div class="mplField full" id="mplHypoBox" style="display:none"><label for="mplHypoStake">見送り時：仮に購入した場合の投資額（円・任意）</label><input id="mplHypoStake" type="number" min="0" step="100" inputmode="numeric" placeholder="例：500"><small style="font-size:11px;color:#a7c7d5">仮想買い目は実購入の収支と区別して保存</small></div><div class="mplField full"><label for="mplMemo">判断理由・映像メモ</label><textarea id="mplMemo" maxlength="500" placeholder="例：前残り予想、内が伸びないので外の先行馬を優遇"></textarea></div>',
 '</div><label class="mplCheck"><input id="mplBeforeStart" type="checkbox"><span>この予想は発走前に入力しました（予想とアプリの分析値を固定保存します）</span></label>',
 '<label class="mplCheck"><input id="mplTimeChecked" type="checkbox"><span>入力した発走予定時刻を公式発表と照合した（未確認ならオフ）</span></label><div class="mplBtns"><button type="button" class="mplPrimary" id="mplSave">発走前の予想を保存</button><button type="button" id="mplCsv">CSV書き出し</button><button type="button" id="mplJson">JSONバックアップ</button><button type="button" id="mplImportBtn">JSONから復元</button><input type="file" id="mplImportFile" accept="application/json,.json" style="display:none"></div>',
 '<div id="mplStatus" class="mplStatus" role="status" aria-live="polite"></div><hr class="mplDivider">',
 '<div class="mplField full"><label for="mplResultSelect">レース後の結果を追記（発走前の選択は書き換えません）</label><select id="mplResultSelect"><option value="">保存済み予想を選択</option></select></div>',
 '<div class="mplResultRow" style="margin-top:8px"><div class="mplField"><label for="mplStake">投資額（円）</label><input id="mplStake" type="number" min="0" step="100" inputmode="numeric"></div>',
 '<div class="mplField"><label for="mplReturn">払戻額（円）</label><input id="mplReturn" type="number" min="0" step="10" inputmode="numeric"></div></div>',
 '<div class="mplField full" style="margin-top:8px"><label for="mplHypoReturn">見送り時のみ：仮想買い目の払戻額（円）</label><input id="mplHypoReturn" type="number" min="0" step="10" inputmode="numeric" placeholder="任意・実払戻には加算しません"></div><div class="mplBtns"><button type="button" id="mplSaveResult">レース結果を追記</button></div>',
 '<div id="mplRecords" class="mplRecords"></div>',
 '<p class="mplFine">保存時刻は端末の時計、発走予定時刻は入力値に基づきます。第三者による時刻証明ではありません。発走時刻未確認の記録は正式な事前検証から除外。見送り時の仮想損益は実購入ROIに含めません。このiPhone/Safariの保存領域に保存します。履歴削除・機種変更で消える可能性があるので、定期的にJSONまたはCSVを保存してください。過去レースを後から「発走前予想」として登録することはできません。</p></div>'
 ].join('');
}
function status(s,bad){
 const x=$('mplStatus');if(x){x.textContent=s;x.style.color=bad?'#ffb7aa':'#a8dfbf'}
}
function records(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(v=>v?.kind==='pre_race'&&typeof v.id==='string'):[]}
 catch(e){status('保存領域の読み込みに失敗。既存データは消していません。',true);return[]}
}
function write(arr){localStorage.setItem(KEY,JSON.stringify(arr))}
function raceDateISO(s){
 const z=String(s||'').normalize('NFKC').trim(),m=z.match(/^(\d{4})[-/.年]?(\d{1,2})[-/.月]?(\d{1,2})日?$/);
 if(!m)return'';
 const y=+m[1],mo=+m[2],d=+m[3],dt=new Date(Date.UTC(y,mo-1,d));
 return y>=2010&&dt.getUTCFullYear()===y&&dt.getUTCMonth()+1===mo&&dt.getUTCDate()===d?y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0'):'';
}
function nowJST(){
 try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
 catch(e){return new Date().toISOString().slice(0,10)}
}
function meta(){
 return{date:raceDateISO(val('raceDate')),venue:val('venue'),name:val('raceName')||val('mplRaceRef'),surface:val('surface'),distance:val('distance'),fieldSize:val('fieldSize'),grade:val('grade'),going:val('going')};
}
function snapshot(){
 const p=window.ProductionDecisionPipelineV1State,f=window.Finish600State,q=window.ValidatedQueueState,r=window.Remaining600ValidatedState;
 const odds=window.ShapeCore?.parseOdds?.(val('oddsPaste'))?.odds||{};
 const p4=window.MobileAnalysisCoreState?.analysis?.pred?.p||window.FourAxisIntegrationState?.p||null;
 const gap=new Map((r?.rows||[]).map(x=>[String(x.no),num(x.pred)]));
 return{
  versions:{pipeline:p?.version||null,finish:f?.version||null,queue:q?.version||null,remaining600:r?.version||null},
  appAxis:p?.stages?.axis?{no:String(p.stages.axis.no||''),name:String(p.stages.axis.name||''),abilityRank:num(p.stages.axis.abilityRank),m3Rank:num(p.stages.axis.m3Rank)}:null,
  appOpponents:(p?.stages?.opponents?.rows||[]).slice(0,18).map(x=>({no:String(x.no),pop:num(x.pop),abilityRank:num(x.abilityRank),m3Rank:num(x.m3Rank)})),
  paceProbabilities:Array.isArray(p4)&&p4.length===4?p4.map(num):null,
  pressure:window.MobileAnalysisCoreState?.analysis?.pressure||null,
  singleOdds:Object.fromEntries(Object.entries(odds).filter(([k,v])=>num(v)>0).map(([k,v])=>[k,num(v)])),
  horses:(f?.rows||[]).slice(0,18).map(x=>({no:String(x.no),name:String(x.name||''),m3Rank:num(x.finishRank),scenarioM4Ranks:(x.sc||[]).slice(0,4).map(z=>num(z.rank)),firstCornerRank:num(q?.byNo?.[String(x.no)]?.expectedRank),remaining600Gap:gap.get(String(x.no))??null}))
 };
}
function partners(text,field,axis){
 const t=String(text).normalize('NFKC').split(/[,\s、，]+/).filter(Boolean);
 if(t.some(x=>!/^\d+$/.test(x)))return null;
 const a=[...new Set(t.map(Number))];
 return a.some(x=>x<1||x>field||x===axis)?null:a;
}
function analysisMatches(){
 const a=window.MobileAnalysisCoreState?.meta;
 if(!a)return false;
 return String(a.date||'')===val('raceDate')&&String(a.venue||'')===val('venue')&&String(a.raceName||'')===val('raceName')&&String(a.surface||'')===val('surface')&&Number(a.distance)===Number(val('distance'))&&Number(a.fieldSize)===Number(val('fieldSize'));
}
function scheduleCheck(day){
 const time=val('mplStartTime'),checked=Boolean($('mplTimeChecked')?.checked);
 if(!time)return checked?{error:'発走予定時刻を入力してから確認してください。'}:{status:'unverified_no_time',timeJst:null,userChecked:false};
 if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time))return{error:'発走予定時刻は時:分で入力してください。'};
 const iso=day+'T'+time+':00+09:00',start=Date.parse(iso);
 if(!Number.isFinite(start))return{error:'発走予定時刻の形式が正しくありません。'};
 if(Date.now()>=start)return{error:'入力した発走予定時刻を過ぎています。発走前予想として保存できません。'};
 return{status:checked?'before_user_confirmed_time':'unverified_time_source',timeJst:iso,userChecked:checked};
}
function savePrediction(){
 const m=meta(),field=Number(m.fieldSize),d=val('mplDecision'),pace=val('mplPace'),front=val('mplFront'),track=val('mplTrack'),axis=Number(val('mplAxis'));
 const shell=window.IOSMobileShellV3State||window.IOSMobileShellV2State;
 if(!shell?.analysisReady||!window.Finish600State?.ready||window.RSAAnalysisTransitionState?.status!=='ready'||!analysisMatches()){status('レース条件の分析が未完了、または入力が変更されています。現在のレースで再分析してください。',true);return}
 if(!m.date||!m.venue||!m.name){status('レース日・競馬場・レース名（または識別名）が必要です。',true);return}
 if(m.date<nowJST()){status('過去日付は「発走前の予想」として保存できません。',true);return}
 const check=scheduleCheck(m.date);if(check.error){status(check.error,true);return}
 if(!$('mplBeforeStart')?.checked){status('発走前のチェックを入れてください。',true);return}
 if(!Number.isInteger(field)||field<2||field>20){status('出走頭数を確認してください。',true);return}
 const pair=partners(val('mplPartners'),field,axis),hypoStake=num(val('mplHypoStake'));
 if(d==='skip'&&hypoStake!==null&&(!Number.isInteger(hypoStake)||hypoStake<0)){status('仮想投資額は0円以上の整数にしてください。',true);return}
 if(d==='skip'&&hypoStake>0&&(!Number.isInteger(axis)||axis<1||axis>field||!pair?.length)){status('見送りの仮想投資には軸馬番と相手馬番が必要です。',true);return}
 if(!['buy','skip','hold'].includes(d)||!pace||!front||!track){status('シナリオ・展開・馬場・購入判断を選択してください。',true);return}
 if(d==='buy'&&(!Number.isInteger(axis)||axis<1||axis>field||!pair?.length)){status('購入する場合は軸と相手の馬番を入力してください。',true);return}
 if(pair===null){status('相手馬番の形式・範囲を確認してください。',true);return}
 const at=new Date().toISOString();
 const rec={kind:'pre_race',version:V,id:[m.date,m.venue,m.name,m.surface,m.distance,at,Math.random().toString(36).slice(2,8)].join('|'),capturedAt:at,meta:m,
  choice:{axisNo:Number.isInteger(axis)&&axis>0&&axis<=field?axis:null,partners:pair,scenario:pace,scenarioOrigin,front,track,decision:d,wideOddsText:val('mplPrices'),memo:val('mplMemo'),hypothetical:d==='skip'&&pair?.length?{stakeYen:hypoStake||null,partners:pair,axisNo:Number.isInteger(axis)?axis:null,wideOddsText:val('mplPrices')}:null},
  timeValidation:{...check,checkedAt:at,method:'local_clock_and_user_supplied_schedule'},
  snapshot:snapshot(),outcome:null
 };
 const all=records();
 if(all.length>=MAX){status('保存件数の上限に達しました。バックアップを保存してから別の記録方法に移してください。',true);return}
 if(all.some(x=>x.meta?.date===m.date&&x.meta?.venue===m.venue&&x.meta?.name===m.name&&JSON.stringify(x.choice)===JSON.stringify(rec.choice))){status('同じレース・同じ選択内容が保存済みです。',true);return}
 all.push(rec);
 try{write(all);$('mplBeforeStart').checked=false;status((check.status==='before_user_confirmed_time'?'時刻照合済（利用者確認）':'発走前未確認')+'｜予想を固定保存しました：'+new Date(at).toLocaleString('ja-JP'));history()}
 catch(e){status('ブラウザの保存領域へ書き込めません。容量やプライベートモードを確認してください。',true)}
}
function saveOutcome(){
 const id=val('mplResultSelect'),all=records(),item=all.find(x=>x.id===id);
 if(!item){status('結果を追記する予想を選んでください。',true);return}
 const skip=item.choice?.decision==='skip',hypoReturned=num(val('mplHypoReturn'));
 let stake=num(val('mplStake')),returned=num(val('mplReturn'));
 if(skip&&stake===null&&returned===null){stake=0;returned=0}
 if(stake===null||returned===null||!Number.isInteger(stake)||!Number.isInteger(returned)||stake<0||returned<0){status('投資額・払戻額は0円以上の整数で入力してください。',true);return}
 if(skip&&(stake>0||returned>0)){status('見送りの投資額・払戻額は0円にしてください。',true);return}
 if(stake===0&&returned>0){status('投資額0円に実払戻を入力できません。',true);return}
 const hs=num(item.choice?.hypothetical?.stakeYen);
 if(hypoReturned!==null&&(!skip||!hs||hs<=0||!Number.isInteger(hypoReturned)||hypoReturned<0)){status('仮想払戻は発走前に仮想投資額を保存した見送り記録にのみ入力できます。',true);return}
 item.outcome={recordedAt:new Date().toISOString(),stakeYen:stake,returnedYen:returned,hypotheticalReturnedYen:skip?hypoReturned:null};
 try{write(all);status('結果を追記しました。実購入と仮想損益は別集計です。');history()}
 catch(e){status('結果の保存に失敗しました。',true)}
}
function csvCell(x){
 let s=String(x??'');if(/^\s*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function csvData(all){
 const keys=['capturedAt','date','venue','race','surface','distance','field','axis','partners','scenario','front','track','decision','wideOdds','memo','appAxis','appAbilityRank','appM3Rank','paceProbabilities','stakeYen','returnedYen','ROI','resultRecordedAt'];
 const lines=[keys.join(',')];
 for(const x of all){
  const c=x.choice||{},o=x.outcome||{},a=x.snapshot?.appAxis||{},st=num(o.stakeYen),ret=num(o.returnedYen);
  const roi=st>0&&ret!==null?(ret/st*100).toFixed(1):null;
  lines.push([x.capturedAt,x.meta?.date,x.meta?.venue,x.meta?.name,x.meta?.surface,x.meta?.distance,x.meta?.fieldSize,c.axisNo,(c.partners||[]).join(' '),c.scenario,c.front,c.track,c.decision,c.wideOddsText,c.memo,a.no,a.abilityRank,a.m3Rank,JSON.stringify(x.snapshot?.paceProbabilities||[]),o.stakeYen,o.returnedYen,roi,o.recordedAt].map(csvCell).join(','));
 }
 return '\ufeff'+lines.join('\r\n');
}
function exportLog(kind){
 const all=records();if(!all.length){status('書き出す記録がありません。',true);return}
 try{
  const json=kind==='json',payload=json?JSON.stringify({schema:V,exportedAt:new Date().toISOString(),records:all},null,2):csvData(all);
  const url=URL.createObjectURL(new Blob([payload],{type:json?'application/json;charset=utf-8':'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='race_predictions_'+nowJST()+(json?'.json':'.csv');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  status((json?'JSON':'CSV')+'を書き出しました。ファイルアプリに保存してください。');
 }catch(e){status('ファイル書き出しに失敗しました。',true)}
}
async function importLog(file){
 if(!file)return;
 if(file.size>4*1024*1024){status('JSONが4MBを超えています。確認してください。',true);return}
 try{
  const obj=JSON.parse(await file.text());
  if(!String(obj?.schema||'').startsWith('mobile-prediction-ledger-v1.')||!Array.isArray(obj.records))throw new Error('JSONの形式が異なります');
  const all=records(),known=new Set(all.map(x=>x.id));let added=0;
  for(const x of obj.records){
   if(!x||x.kind!=='pre_race'||typeof x.id!=='string'||x.id.length>400||!x.meta?.date||!x.meta?.venue||!x.meta?.name||!x.choice||typeof x.capturedAt!=='string')continue;
   if(known.has(x.id))continue;
   if(all.length>=MAX)break;
   all.push({kind:'pre_race',version:String(x.version||obj.schema),id:x.id,capturedAt:x.capturedAt,meta:x.meta,choice:x.choice,snapshot:x.snapshot||null,outcome:x.outcome||null});known.add(x.id);added++;
  }
  all.sort((a,b)=>String(a.capturedAt).localeCompare(String(b.capturedAt)));
  write(all);history();status('JSONから'+added+'件を復元しました（既存記録は上書きしません）。');
 }catch(e){status('JSONの復元に失敗しました：'+String(e?.message||e),true)}
}
function context(){
 const m=meta(),p=window.ProductionDecisionPipelineV1State?.stages?.axis;
 const summary=[m.date||'日付なし',m.venue,m.name||'レース名なし',m.surface,m.distance?m.distance+'m':'','アプリ軸 '+(p?.no?p.no+'番 '+(p.name||''):'未計算')].filter(Boolean).join('｜');
 const el=$('mplContext');if(el&&el.textContent!==summary)el.textContent=summary;
 const key=[m.date,m.venue,m.name,m.surface,m.distance].join('|');
 if(key!==lastRace){lastRace=key;if(!val('mplAxis')&&p?.no)$('mplAxis').value=p.no}
 if(!val('mplAxis')&&p?.no)$('mplAxis').value=p.no;
}
function history(){
 const all=records(),count=$('mplCount'),sel=$('mplResultSelect'),box=$('mplRecords');
 if(count)count.textContent=all.length+'件保存';
 if(!sel||!box)return;
 const old=sel.value;
 const options=['<option value="">保存済み予想を選択</option>'].concat(all.slice().reverse().slice(0,MAX).map(x=>'<option value="'+E(x.id)+'">'+E([x.meta?.date,x.meta?.venue,x.meta?.name,x.choice?.axisNo?'軸'+x.choice.axisNo:'',x.choice?.decision].filter(Boolean).join(' '))+'</option>')).join('');
 if(sel.innerHTML!==options){sel.innerHTML=options;if(all.some(x=>x.id===old))sel.value=old}
 const priced=all.filter(x=>x.choice?.decision==='buy'&&num(x.outcome?.stakeYen)>0);
 const st=priced.reduce((s,x)=>s+x.outcome.stakeYen,0),ret=priced.reduce((s,x)=>s+x.outcome.returnedYen,0),roi=st?Math.round(ret/st*1000)/10:null;
 const recent=all.slice().reverse().slice(0,4).map(x=>'<div class="mplRecent">'+E(x.meta?.date)+' '+E(x.meta?.venue)+' '+E(x.meta?.name)+'｜'+E(x.choice?.decision==='buy'?'購入':x.choice?.decision==='skip'?'見送り':'保留')+(x.outcome?'｜結果記録済み':'｜結果待ち')+'</div>').join('');
 const h='<b>保存 '+all.length+'件</b>｜購入結果 '+priced.length+'件'+(roi!==null?'｜回収率 '+roi.toFixed(1)+'%':'｜回収率 未集計')+(recent||'<div class="mplRecent">まだ保存記録はありません。</div>');
 if(lastHistory!==h){box.innerHTML=h;lastHistory=h}
}
function init(){
 if(ready)return;
 const pane=$('imsTicket'),before=$('imsTicketBody');
 if(!pane){if(++retries<=20)setTimeout(init,250);return}
 css();
 let root=$('mobilePredictionLedger');
 if(!root){root=document.createElement('details');root.id='mobilePredictionLedger';root.innerHTML=html();if(before?.parentNode===pane)pane.insertBefore(root,before);else pane.appendChild(root)}
 root.addEventListener('click',e=>{
  const id=e.target?.id;
  if(id==='mplSave')savePrediction();
  else if(id==='mplSaveResult')saveOutcome();
  else if(id==='mplCsv')exportLog('csv');
  else if(id==='mplJson')exportLog('json');
  else if(id==='mplImportBtn')$('mplImportFile')?.click();
 });
 root.addEventListener('change',e=>{
  if(e.target?.id==='mplImportFile'){const f=e.target.files?.[0];importLog(f);e.target.value='';return;}
  if(e.target?.id==='mplResultSelect'){
   const r=records().find(x=>x.id===e.target.value)?.outcome;
   $('mplStake').value=r?.stakeYen??'';$('mplReturn').value=r?.returnedYen??'';
  }
 });
 ready=true;context();history();
 window.MobilePredictionLedgerV1State={ready:true,version:V,storage:'device',frozenPredictions:true,productionConnected:false};
}
function refresh(){init();if(ready)context()}
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,130)}
['production-decision-pipeline-ready','finish600-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
document.addEventListener('change',e=>{if(['raceDate','venue','raceName','distance','surface','fieldSize'].includes(e.target?.id))schedule()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();