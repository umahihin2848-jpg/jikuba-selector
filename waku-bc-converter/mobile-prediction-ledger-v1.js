(()=>{
'use strict';
if(!window.RSAMobileLean||window.__MOBILE_PREDICTION_LEDGER_V1)return;
window.__MOBILE_PREDICTION_LEDGER_V1=true;
const V='mobile-prediction-ledger-v1.5-results',KEY='rsa-mobile-prediction-ledger-v1',MAX=500;
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
 '<div class="mplField full" style="margin-top:8px"><label for="mplTop3Finish">確定1〜3着馬番（軸・相手の精度検証用）</label><input id="mplTop3Finish" placeholder="例：1, 4, 7" inputmode="text" maxlength="30"><small class="mplFine">成績検証に使います。任意入力／同じレースの3頭を入力</small></div>',
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
 const p=window.ProductionDecisionPipelineV1State,f=window.Finish600State,q=window.ValidatedQueueState,r=window.Remaining600ValidatedState,market=window.DecisionShellV2State?.market;
 const odds=window.ShapeCore?.parseOdds?.(val('oddsPaste'))?.odds||{};
 const p4=window.MobileAnalysisCoreState?.analysis?.pred?.p||window.FourAxisIntegrationState?.p||null;
 const gap=new Map((r?.rows||[]).map(x=>[String(x.no),num(x.pred)]));
 return{
  versions:{pipeline:p?.version||null,finish:f?.version||null,queue:q?.version||null,remaining600:r?.version||null},
  appAxis:p?.stages?.axis?{no:String(p.stages.axis.no||''),name:String(p.stages.axis.name||''),status:String(p.stages.axis.status||''),abilityRank:num(p.stages.axis.abilityRank),m3Rank:num(p.stages.axis.m3Rank),popularity:num(p.stages.price?.axisPopularity)}:null,
  marketRows:market?.complete&&Array.isArray(market.rows)&&market.rows.length===Number(val('fieldSize'))?market.rows.map(x=>({no:String(x.no),pop:num(x.pop),winOdds:num(x.od)})):[],
  marketCapturedAs:'win_odds_popularity_before_race',
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
function finishTop3(text,field){
 const a=String(text??'').normalize('NFKC').trim();
 if(!a)return[];
 const tokens=a.split(/[\s,、，]+/).filter(Boolean);
 if(tokens.length!==3||tokens.some(x=>!/^[0-9]+$/.test(x)))return null;
 const nos=tokens.map(Number);
 return new Set(nos).size===3&&nos.every(x=>Number.isInteger(x)&&x>=1&&x<=field)?nos:null;
}
function saveOutcome(){
 const id=val('mplResultSelect'),all=records(),item=all.find(x=>x.id===id);
 if(!item){status('結果を追記する予想を選んでください。',true);return}
 const skip=item.choice?.decision==='skip',hypoReturned=num(val('mplHypoReturn'));
 const top3=finishTop3(val('mplTop3Finish'),Number(item.meta?.fieldSize));
 if(top3===null){status('確定1〜3着の馬番を、重複なしで3頭入力してください（または空欄）。',true);return}
 let stake=num(val('mplStake')),returned=num(val('mplReturn'));
 const prev=item.outcome||{},priorTop3=Array.isArray(prev.top3Nos)&&prev.top3Nos.length===3?prev.top3Nos:null;
 if(stake===null&&returned===null){
  if(skip){stake=0;returned=0}
  else if(num(prev.stakeYen)!==null&&num(prev.returnedYen)!==null){stake=num(prev.stakeYen);returned=num(prev.returnedYen)}
  else if(top3.length===3||priorTop3){stake=null;returned=null}
  else{status('結果の着順、または投資額と払戻額を入力してください。',true);return}
 }
 if((stake===null)!==(returned===null)||stake!==null&&(!Number.isInteger(stake)||!Number.isInteger(returned)||stake<0||returned<0)){status('投資額・払戻額は両方とも0円以上の整数で入力してください。',true);return}
 if(skip&&(stake>0||returned>0)){status('見送りの投資額・払戻額は0円にしてください。',true);return}
 if(stake===0&&returned>0){status('投資額0円に実払戻を入力できません。',true);return}
 const hs=num(item.choice?.hypothetical?.stakeYen);
 if(hypoReturned!==null&&(!skip||!hs||hs<=0||!Number.isInteger(hypoReturned)||hypoReturned<0)){status('仮想払戻は発走前に仮想投資額を保存した見送り記録にのみ入力できます。',true);return}
 item.outcome={recordedAt:new Date().toISOString(),stakeYen:stake,returnedYen:returned,hypotheticalReturnedYen:skip?hypoReturned:null,top3Nos:top3.length===3?top3:priorTop3};
 try{write(all);status('結果を追記しました。実購入と仮想損益は別集計です。');history()}
 catch(e){status('結果の保存に失敗しました。',true)}
}
function csvCell(x){
 let s=String(x??'');if(/^\s*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
function csvData(all){
 const keys=['capturedAt','date','venue','race','surface','distance','field','axis','partners','scenario','front','track','decision','wideOdds','memo','appAxis','appAbilityRank','appM3Rank','paceProbabilities','stakeYen','returnedYen','ROI','resultRecordedAt','startTimeJST','timeStatus','userCheckedStart','scenarioOrigin','hypotheticalStake','hypotheticalPayout','hypotheticalROI','finishTop3Nos'];
 const lines=[keys.join(',')];
 for(const x of all){
  const c=x.choice||{},o=x.outcome||{},a=x.snapshot?.appAxis||{},st=num(o.stakeYen),ret=num(o.returnedYen);
  const roi=st>0&&ret!==null?(ret/st*100).toFixed(1):null;
  lines.push([x.capturedAt,x.meta?.date,x.meta?.venue,x.meta?.name,x.meta?.surface,x.meta?.distance,x.meta?.fieldSize,c.axisNo,(c.partners||[]).join(' '),c.scenario,c.front,c.track,c.decision,c.wideOddsText,c.memo,a.no,a.abilityRank,a.m3Rank,JSON.stringify(x.snapshot?.paceProbabilities||[]),o.stakeYen,o.returnedYen,roi,o.recordedAt,x.timeValidation?.timeJst||'',x.timeValidation?.status||'legacy_unverified',x.timeValidation?.userChecked??false,c.scenarioOrigin||'legacy_unverified',c.hypothetical?.stakeYen??'',o.hypotheticalReturnedYen??'',num(c.hypothetical?.stakeYen)>0&&num(o.hypotheticalReturnedYen)!==null?(num(o.hypotheticalReturnedYen)/num(c.hypothetical.stakeYen)*100).toFixed(1):'',Array.isArray(o.top3Nos)?o.top3Nos.join(' '):''].map(csvCell).join(','));
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
 if(key!==lastRace){
  if(lastRace){
   for(const id of ['mplAxis','mplPartners','mplPrices','mplMemo','mplPace','mplFront','mplTrack','mplHypoStake','mplStartTime'])if($(id))$(id).value='';
   if($('mplTimeChecked'))$('mplTimeChecked').checked=false;
   if($('mplBeforeStart'))$('mplBeforeStart').checked=false;
   if($('mplDecision'))$('mplDecision').value='buy';
   if($('mplHypoBox'))$('mplHypoBox').style.display='none';
   scenarioOrigin='manual-form';
   if($('mplScenarioSource'))$('mplScenarioSource').textContent='アプリ本線は参考。シナリオは手動で決定してください。';
  }
  lastRace=key;
 }
 if(!val('mplAxis')&&p?.no&&analysisMatches()&&window.RSAAnalysisTransitionState?.status==='ready')$('mplAxis').value=p.no;
}
function comparisonSummary(all){
 // Research only: a pre-race record with confirmed user-entered start time and an entered official top3 is required.
 const latest=new Map(),results=new Map(),conflicts=new Set();
 for(const rec of all){
  if(rec.timeValidation?.status!=='before_user_confirmed_time')continue;
  const id=[rec.meta?.date,rec.meta?.venue,rec.meta?.name,rec.meta?.surface,rec.meta?.distance,rec.meta?.fieldSize].join('|');
  if(!latest.has(id)||String(rec.capturedAt)>String(latest.get(id).capturedAt))latest.set(id,rec);
  if(Array.isArray(rec.outcome?.top3Nos)&&rec.outcome.top3Nos.length===3){
   const placed=rec.outcome.top3Nos.map(Number).sort((x,y)=>x-y);
   if(placed.some(x=>!Number.isInteger(x)||x<1||x>Number(rec.meta?.fieldSize))||new Set(placed).size!==3)continue;
   if(results.has(id)&&JSON.stringify(results.get(id))!==JSON.stringify(placed))conflicts.add(id);
   else results.set(id,placed);
  }
 }
 let axisN=0,axisHit=0,bandN=0,bandAxisHit=0,peerExpected=0,partnerN=0,axisPlaced=0,manHit=0,m3Hit=0,m4Hit=0,tieSkip=0,missingPeer=0,alternateAxis=0;
 const band=p=>p>=1&&p<=4?'1-4':p>=5&&p<=8?'5-8':p>=9?'9+':null;
 for(const [id,rec] of latest){
  if(conflicts.has(id)||!results.has(id))continue;
  const winners=new Set(results.get(id)),field=Number(rec.meta?.fieldSize),snap=rec.snapshot||{},appNo=Number(snap.appAxis?.no);
  const validAxis=Number.isInteger(appNo)&&appNo>=1&&appNo<=field&&(!snap.appAxis?.status||['ready','conditional'].includes(snap.appAxis.status));
  if(validAxis){axisN++;if(winners.has(appNo))axisHit++;}
  const market=snap.marketRows;
  if(validAxis&&Array.isArray(market)&&market.length===field&&new Set(market.map(x=>String(x.no))).size===field){
   const pop=Number(market.find(x=>Number(x.no)===appNo)?.pop),b=band(pop);
   const peers=market.filter(x=>Number(x.no)!==appNo&&band(Number(x.pop))===b);
   if(b&&peers.length){
    bandN++;if(winners.has(appNo))bandAxisHit++;
    peerExpected+=peers.filter(x=>winners.has(Number(x.no))).length/peers.length;
   }else missingPeer++;
  }else if(validAxis)missingPeer++;
  // Same chosen axis + same number of opponent selections; only the ranking method changes.
  const c=rec.choice||{},ax=Number(c.axisNo),ks=Array.isArray(c.partners)?c.partners.map(Number):[],k=ks.length,scenario=Number(c.scenario),hs=snap.horses||[];
  if(c.decision!=='buy'||!Number.isInteger(ax)||ax<1||ax>field||!k||k>5||!Number.isInteger(scenario)||scenario<0||scenario>3)continue;
  if(hs.length!==field||new Set(hs.map(x=>Number(x.no))).size!==field||new Set(ks).size!==k||ks.some(x=>x===ax||!Number.isInteger(x)||x<1||x>field))continue;
  const peers=hs.filter(x=>Number(x.no)!==ax);
  if(peers.length!==field-1||ks.some(no=>!peers.some(x=>Number(x.no)===no)))continue;
  if(peers.some(x=>!Number.isInteger(Number(x.m3Rank))||Number(x.m3Rank)<1||!Number.isInteger(Number(x.scenarioM4Ranks?.[scenario]))||Number(x.scenarioM4Ranks?.[scenario])<1))continue;
  const order=fn=>peers.slice().sort((x,y)=>Number(fn(x))-Number(fn(y))||Number(x.no)-Number(y.no));
  const om=order(x=>x.m3Rank),os=order(x=>x.scenarioM4Ranks[scenario]);
  // Do not pick the better horse by arbitrary horse-number order at a tied cutoff.
  if(k<peers.length&&(Number(om[k-1].m3Rank)===Number(om[k].m3Rank)||Number(os[k-1].scenarioM4Ranks[scenario])===Number(os[k].scenarioM4Ranks[scenario]))){tieSkip++;continue;}
  partnerN++;if(validAxis&&ax!==appNo)alternateAxis++;
  if(winners.has(ax)){
   axisPlaced++;
   if(ks.some(no=>winners.has(no)))manHit++;
   if(om.slice(0,k).some(x=>winners.has(Number(x.no))))m3Hit++;
   if(os.slice(0,k).some(x=>winners.has(Number(x.no))))m4Hit++;
  }
 }
 const pct=(n,d)=>d?(100*n/d).toFixed(1)+'%':'未集計';
 const n=[...latest.keys()].filter(id=>!conflicts.has(id)&&results.has(id)).length;
 const axisComparison=bandN?'同人気帯・同レースの他馬平均 '+pct(peerExpected,bandN)+'／アプリ軸 '+pct(bandAxisHit,bandN)+'（比較 '+bandN+'R）':'同人気帯比較は未集計（事前市場人気の保存が必要）';
 return '<div class="mplRecent"><b>① アプリ軸の3着内精度</b>'+
 '<div>アプリ軸 '+axisHit+'/'+axisN+'（'+pct(axisHit,axisN)+'）｜結果入力 '+n+'R</div>'+
 '<div>'+axisComparison+'</div>'+
 '<small class="mplFine">人気帯：1〜4／5〜8／9番人気以下。比較は各レースでアプリ軸以外の同人気帯馬の平均3着内率（レースごと等重み）。未保存の市場データは後付けしません。新旧記録を混在させないでください。</small></div>'+
 '<div class="mplRecent"><b>② ワイド相手の選び方を比較</b>'+
 '<div>比較可能 '+partnerN+'R／採用軸が3着内 '+axisPlaced+'R'+(alternateAxis?'（アプリ軸と採用軸が異なる '+alternateAxis+'R）':'')+'</div>'+
 '<div>採用軸を固定・相手は同点数で比較：手動 '+manHit+'/'+partnerN+'（'+pct(manHit,partnerN)+'）｜通常M3 '+m3Hit+'/'+partnerN+'（'+pct(m3Hit,partnerN)+'）｜選択M4 '+m4Hit+'/'+partnerN+'（'+pct(m4Hit,partnerN)+'）</div>'+
 '<div>軸が3着内に入った場合：手動 '+pct(manHit,axisPlaced)+'／M3 '+pct(m3Hit,axisPlaced)+'／M4 '+pct(m4Hit,axisPlaced)+'</div>'+
 '<small class="mplFine">手動は購入予定の相手。M3/M4は事前に保存された全頭順位から、同じ軸を除いて上位K頭を比較する参考対照。結果の上位3頭に相手が1頭以上含まれる率であり、実際のワイド払戻・期待値ではありません。</small></div>'+
 '<small class="mplFine">同レースの複数記録は発走前の最新案のみを採用し、確定着順はそのレースの結果入力から照合（最終確定の代理）。確定1〜3着が相違するレース '+conflicts.size+'件は除外。順位の境界同着 '+tieSkip+'件を除外。標本数が少ない間は順位差を結論としません。</small>';
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
 const checked=priced.filter(x=>x.timeValidation?.status==='before_user_confirmed_time');
 const checkedStake=checked.reduce((sum,x)=>sum+x.outcome.stakeYen,0),checkedPayout=checked.reduce((sum,x)=>sum+x.outcome.returnedYen,0),checkedRoi=checkedStake?Math.round(checkedPayout/checkedStake*1000)/10:null;
 const hypothetical=all.filter(x=>x.choice?.decision==='skip'&&num(x.choice?.hypothetical?.stakeYen)>0&&num(x.outcome?.hypotheticalReturnedYen)!==null);
 const hStake=hypothetical.reduce((sum,x)=>sum+num(x.choice.hypothetical.stakeYen),0),hPayout=hypothetical.reduce((sum,x)=>sum+num(x.outcome.hypotheticalReturnedYen),0),hRoi=hStake?Math.round(hPayout/hStake*1000)/10:null;
 const recent=all.slice().reverse().slice(0,4).map(x=>'<div class="mplRecent">'+E(x.meta?.date)+' '+E(x.meta?.venue)+' '+E(x.meta?.name)+'｜'+E(x.choice?.decision==='buy'?'購入':x.choice?.decision==='skip'?'見送り':'保留')+(x.timeValidation?.status==='before_user_confirmed_time'?'｜時刻照合済（利用者確認）':'｜発走前未確認')+(x.outcome?'｜結果記録済み':'｜結果待ち')+'</div>').join('');
 const h='<b>保存 '+all.length+'件</b>｜実購入参考 '+priced.length+'件'+(roi!==null?' ROI '+roi.toFixed(1)+'%':' ROI未集計')+'<div>入力発走時刻と照合済（利用者確認）'+checked.length+'件'+(checkedRoi!==null?' ROI '+checkedRoi.toFixed(1)+'%':' ROI未集計')+'｜仮想見送り '+hypothetical.length+'件'+(hRoi!==null?' 仮想ROI '+hRoi.toFixed(1)+'%':' 仮想ROI未集計')+'</div><div class="mplFine">未確認・旧記録は照合済集計に含めません。異なる予想を同一レースに複数保存した場合、最終的な戦略検証では重複整理が必要です。</div>'+comparisonSummary(all)+(recent||'<div class="mplRecent">まだ保存記録はありません。</div>');
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
  if(e.target?.id==='mplDecision'){
   const box=$('mplHypoBox');if(box)box.style.display=e.target.value==='skip'?'grid':'none';
   return;
  }
  if(e.target?.id==='mplPace'){scenarioOrigin='manual-form';const label=$('mplScenarioSource');if(label)label.textContent='選択方法：記録画面で手動指定';return}
  if(e.target?.id==='mplResultSelect'){
   const r=records().find(x=>x.id===e.target.value)?.outcome;
   $('mplStake').value=r?.stakeYen??'';$('mplReturn').value=r?.returnedYen??'';
   $('mplHypoReturn').value=r?.hypotheticalReturnedYen??'';
   $('mplTop3Finish').value=Array.isArray(r?.top3Nos)?r.top3Nos.join(', '):'';
  }
 });
 ready=true;context();history();
 window.MobilePredictionLedgerV1State={ready:true,version:V,storage:'device',frozenPredictions:true,productionConnected:false};
}
function refresh(){init();if(ready)context()}
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,130)}
['production-decision-pipeline-ready','finish600-ready','rsa-analysis-complete','rsa-addons-ready'].forEach(ev=>addEventListener(ev,schedule));
addEventListener('race-progress-scenario-selected',e=>{const z=e.detail||{},m=window.MobileAnalysisCoreState?.meta||{};if(z.source!=='manual'||window.RSAAnalysisTransitionState?.status!=='ready'||String(z.date)!==String(m.date)||String(z.venue)!==String(m.venue)||String(z.raceName)!==String(m.raceName)||Number(z.distance)!==Number(m.distance)||Number(z.fieldSize)!==Number(m.fieldSize)||!Number.isInteger(z.band)||z.band<0||z.band>3)return;const sel=$('mplPace');if(sel){sel.value=String(z.band);scenarioOrigin='manual-timeline';const label=$('mplScenarioSource');if(label)label.textContent='選択方法：レース推移タブで手動指定（アプリ本線とは独立）'}});
document.addEventListener('change',e=>{if(['raceDate','venue','raceName','distance','surface','fieldSize'].includes(e.target?.id))schedule()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();