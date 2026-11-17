/* P3-55: user-initiated PRE-RACE RESEARCH snapshot. No purchase/deployment actions. */
(function(root){'use strict';
 if(root.P355ProspectiveAxisSnapshotV1)return;
 const V='p355-pre-race-snapshot-v1-20261118';
 const jq=id=>typeof document!=='undefined'?document.getElementById(id):null;
 const str=x=>String(x===undefined||x===null?'':x).normalize('NFKC').trim();
 const n=x=>x===null||x===undefined||str(x)===''?null:Number.isFinite(Number(x))?Number(x):null;
 const clean=x=>x===undefined||x===null?null:String(x);
 const required=(condition,message)=>{if(!condition)throw Error(message);};
 const mapped=state=>state&&state.byNo||Object.fromEntries(((state&&state.rows)||[]).map(x=>[str(Number(x.no)),x]));
 const horseNo=x=>{const q=n(x);return Number.isInteger(q)&&q>=1&&q<=18?q:null};
 function oddsTextMap(t){
  const rows=new Map();
  for(const line of str(t).split(/\r?\n/)){
   if(!line.trim())continue;
   const m=line.trim().match(/^(\d+)\s*[,\t ]+\s*([\d.]+)/);
   required(!!m,'オッズ欄に読み取れない行があります');
   const no=horseNo(m[1]),od=n(m[2]);
   required(no!==null&&od!==null&&od>0&&!rows.has(no),'オッズ欄の馬番・単勝オッズが不正または重複しています');
   rows.set(no,od);
  }return rows;
 }
 function build(state, now){
  const at=new Date(now),U=state||{},meta=U.meta||{},d=U.decision||{},A=U.ability||{},F=U.m3||{},Q=U.queue||{},P=U.position||{},market=d.market||{};
  required(Number.isFinite(at.getTime()),'保存時刻が不正です');
  const date=str(meta.date),venue=str(meta.venue),grade=str(meta.grade).toUpperCase(),field=n(meta.fieldSize),rn=n(U.raceNumber);
  required(/^\d{4}-\d{2}-\d{2}$/.test(date)&&venue&&str(meta.raceName),'レース日付・競馬場・レース名が必要です');
  required(['G1','G2','G3'].includes(grade)&&Number.isInteger(field)&&field>=12&&field<=18,'G1〜G3・12〜18頭の研究対象のみ保存できます');
  required(Number.isInteger(rn)&&rn>=1&&rn<=12,'レース番号を1〜12Rで入力してください');
  required(A.ready&&A.activeModel==='C'&&F.ready&&Q.ready&&P.ready&&d.ready,'Ability C・M3・先行度・P10・最終判定の完了が必要です');
  required(market.complete&&Array.isArray(market.rows)&&market.rows.length===field,'全頭単勝オッズが揃っていません');
  required(U.confirmOdds===true,'オッズを現在確認したことをチェックしてください');
  const am=mapped(A),fm=mapped(F),qm=mapped(Q),pm=mapped(P),mm=mapped(market);
  const ids=(F.rows||[]).map(r=>horseNo(r.no));
  required(ids.length===field&&ids.every(x=>x!==null)&&new Set(ids).size===field,'M3の出走馬番号が不完全または重複しています');
  const marketIds=(market.rows||[]).map(r=>horseNo(r.no));
  required(marketIds.length===field&&marketIds.every(x=>ids.includes(x))&&new Set(marketIds).size===field,'M3と市場の馬番号が一致しません');
  const inputOdds=oddsTextMap(U.oddsText);
  required(inputOdds.size===field,'オッズ入力欄に全頭分がありません');
  for(const no of ids) {
   const m=mm[String(no)];
   required(m&&n(m.od)!==null&&m.od>0&&Math.abs(m.od-inputOdds.get(no))<1e-9,'オッズ反映前に入力欄が変わっています。再解析してください');
   required(am[String(no)]&&fm[String(no)]&&qm[String(no)]&&pm[String(no)],'全頭のAbility/M3/P10/先行度が揃っていません');
  }
  const start=U.startLocal?new Date(U.startLocal):null;
  required(!U.startLocal||Number.isFinite(start.getTime()),'発走予定時刻の入力形式が不正です');
  required(!U.startLocal||String(U.startLocal).slice(0,10)===date,'レース日付と発走予定日時の日付が一致しません');
  if(start)required(start.getTime()>at.getTime(),'発走予定時刻以降の記録を発走前扱いにできません');
  const minutes=start?(start.getTime()-at.getTime())/60000:null;
  const windowTag=!start?'START_TIME_NOT_ENTERED':minutes>=12&&minutes<=18?'T15_APPROX_USER_ENTERED':'OTHER_PRE_RACE_TIME';
  const rows=ids.slice().sort((a,b)=>a-b).map(no=>{
   const a=am[String(no)],f=fm[String(no)],q=qm[String(no)],p=pm[String(no)],m=mm[String(no)];
   required(n(a.abilityRank)!==null&&n(a.logit)!==null&&n(f.finishRank)!==null&&n(f.score)!==null,'Ability/M3順位・スコアが欠けています');
   required(n(p.p10)!==null&&p.p10>=0&&p.p10<=1&&n(q.frontness5)!==null&&q.frontness5>=0&&q.frontness5<=1,'P10/先行度が欠けているか範囲外です');
   return {no,name:str(f.name||a.name),ability_c_rank:n(a.abilityRank),ability_c_logit:n(a.logit),ability_top3_probability:n(a.top3),m3_rank:n(f.finishRank),m3_score:n(f.score),p10:n(p.p10),p10_history_count:n(p.historyN),frontness5:n(q.frontness5),queue_validated:Boolean(q.validated),market_win_odds:n(m.od),market_popularity:n(m.pop),market_share:n(m.share)};
  });
  const s=d.originalStructure||d.structure||{},f=d.final||{},sel=d.axisSelection||{};
  const snapshot={schema:V,kind:'RESEARCH_ONLY_PRE_RACE',captured_at_utc:at.toISOString(),race:{
    date,venue,race_number:rn,race_name:str(meta.raceName),grade,surface:str(meta.surface),distance_m:n(meta.distance),field_size:field,
    start_time_user_entered_utc:start?start.toISOString():null,minutes_until_user_entered_start:minutes,time_window:windowTag,
    official_start_independently_verified:false
   },
   market_provenance:{source:'USER_MANUAL_WIN_ODDS',odds_checked_confirmation:true,odds_time_assumed_capture_utc:at.toISOString(),provider_timestamp_verified:false,executable_odds_unverified:true},
   model_versions:{ability:str(A.version),ability_active_model:str(A.activeModel),m3:str(F.version),p10:str(P.version),queue:str(Q.version),decision:str(d.version),axis_selection:clean(sel.version)},
   axis:{structure_kind:clean(s.kind),structure_code:clean(s.code),structure_level:clean(s.level),structure_no:horseNo(s.axis&&s.axis.no),structure_candidates:(s.candidates||[]).map(x=>({no:horseNo(x.no),ability_rank:n(x.ar),m3_rank:n(x.m3)})),selection_active:Boolean(sel.active),selection_changed:Boolean(sel.changed),selection_no:horseNo(sel.chosen&&sel.chosen.no),final_axis_no:horseNo(d.structure&&d.structure.axis&&d.structure.axis.no),final_code:clean(f.code),final_level:clean(f.level),final_reason:clean(f.reason),gate_status:clean(U.gate&&U.gate.status),gate_kind:clean(U.gate&&U.gate.kind)},
   horses:rows,validation:{all_runners_complete:true,outcomes_not_included:true,algorithm_provenance_unverified:false,betting_evidence:false}
  };
  required(rows.length===field,'馬のデータ不足');
  return snapshot;
 }
 function userState(){
  const meta={date:jq('raceDate')?.value,venue:jq('venue')?.value,raceName:jq('raceName')?.value,grade:jq('grade')?.value,surface:jq('surface')?.value,distance:jq('distance')?.value,fieldSize:jq('fieldSize')?.value};
  const computed=root.MobileAnalysisCoreState&&root.MobileAnalysisCoreState.meta||{};
  for(const k of ['date','venue','grade','fieldSize','surface','distance']){
   if(computed[k]!==undefined&&computed[k]!==null&&str(computed[k])!==''&&str(computed[k])!==str(meta[k]))
    throw Error('解析後にレース条件（'+k+'）が変更されました。再解析してください');
  }
  return {meta,raceNumber:jq('p355RaceNo')?.value,startLocal:jq('p355Start')?.value,confirmOdds:jq('p355OddsConfirmed')?.checked,oddsText:jq('oddsPaste')?.value,decision:root.DecisionShellV2State,ability:root.M3PureAbilityState,m3:root.Finish600State,queue:root.ValidatedQueueState,position:root.PositionRiskState,gate:root.RaceSkipLockV1State};
 }
 function exportClick(){
  const msg=jq('p355Status');
  try{
   const snap=build(userState(),new Date());
   const s=JSON.stringify(snap,null,2);
   const blob=new Blob([s],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;a.download='P355_'+snap.race.date.replace(/-/g,'')+'_'+snap.race.venue+'_R'+snap.race.race_number+'_'+snap.captured_at_utc.replace(/[^0-9]/g,'').slice(0,14)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
   if(msg)msg.textContent='研究用JSONを書き出しました。'+snap.race.time_window+'。保存先を確認してください。';
  }catch(e){if(msg)msg.textContent='保存不可：'+(e.message||e);}
 }
 function install(){
  if(jq('p355Capture')||!jq('analyzeBtn'))return;
  const panel=document.createElement('section');panel.className='card';panel.id='p355ResearchSnapshot';panel.style.cssText='margin-top:10px;border:1px dashed #607d8b;padding:12px';
  panel.innerHTML='<h3 style="font-size:13px;margin:0 0 7px">P3-55 研究用｜発走前の予想を保存</h3>'+
   '<p style="font-size:11px">本番購入判定は変更しません。全頭オッズを今確認し、解析後にJSONを端末へ保存します。発走予定時刻・オッズ取得先は手動申告であり、T-15の公式時刻検証ではありません。</p>'+
   '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">'+
   '<label style="font-size:11px">R番号 <input id="p355RaceNo" type="number" min="1" max="12" inputmode="numeric" style="max-width:65px"></label>'+
   '<label style="font-size:11px">発走予定日時 <input id="p355Start" type="datetime-local"></label>'+
   '<label style="font-size:11px"><input id="p355OddsConfirmed" type="checkbox">入力オッズを今確認した</label>'+
   '<button id="p355Capture" type="button" class="secondary">発走前JSONを保存</button></div>'+
   '<p id="p355Status" role="status" style="font-size:11px;margin-top:5px"></p>';
  jq('analyzeBtn').insertAdjacentElement('afterend',panel);
  jq('p355Capture').addEventListener('click',exportClick);
 }
 root.P355ProspectiveAxisSnapshotV1={version:V,build,oddsTextMap,install};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
 }
})(typeof window!=='undefined'?window:globalThis);
