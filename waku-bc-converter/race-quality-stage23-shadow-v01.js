(function stage23(){
"use strict";
if(window.RaceQualityStage23V01)return;
const VERSION="race-quality-stage23-shadow-v0.1";
const STORE="rq_stage23_pre_race_snapshots_v01";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>v===null||v===undefined||v===""?NaN:Number(v);
const TURF=[["unknown","未判定"],["ultrafast","超高速"],["fast","高速"],["flat","フラット"],["innerworn","内荒れ"],["worn","荒れ"],["innerempty","内空け"]];
const DIRT=[["unknown","未判定"],["flat","フラット"],["front","先行馬場"],["closer","差し馬場"],["wet","雨馬場"]];
const CHAR=[["unknown","未判定"],["unreached","差して届かない"],["steady","伸びずバテず"],["escape","逃げれば止まらない"],["pursuit","追走力特化"]];
let raceKey="",draft={track:"unknown",pace:"unknown",character:{}},latest=null,signature="",lastMessage="",timer=0;
function info(){return {date:$("raceDate")?.value||"",name:$("raceName")?.value||"",venue:$("venue")?.value||"",surface:$("surface")?.value||"",distance:$("distance")?.value||"",field:Number($("fieldSize")?.value)||0,grade:$("grade")?.value||"",csv:$("csvFile")?.files?.[0]?.name||"",csvModified:$("csvFile")?.files?.[0]?.lastModified||0}}
function raceId(x){return JSON.stringify([x.date,x.name,x.venue,x.surface,x.distance,x.field,x.grade,x.csv,x.csvModified])}
function options(set,current){return set.map(([v,t])=>`<option value="${v}" ${current===v?"selected":""}>${esc(t)}</option>`).join("")}
function derive(info,queue,market,base,input){
 if(!queue?.ready||!Array.isArray(queue.rows)||queue.rows.length!==info.field||info.field<12||!market?.complete||!Array.isArray(market.rows)||market.rows.length!==info.field)return{ready:false,reason:"隊列モデルか全頭オッズが未準備"};
 const surface=String(info.surface).startsWith("ダ")?"ダ":String(info.surface).startsWith("芝")?"芝":"unknown";
 const regime=(base?.leader&&base?.leader!=="auto")?base.leader:(base?.autoLeader||"unknown");
 const rowsByNo=Object.fromEntries(queue.rows.map(r=>[Number(r.no),r]));
 const axis=String(window.DecisionShellV2State?.structure?.axis?.no||"");
 const sorted=market.rows.filter(x=>String(x.no)!==axis).sort((a,b)=>num(a.pop)-num(b.pop)||num(a.od)-num(b.od));
 const result=[];
 for(const m of sorted){
  const no=Number(m.no),r=rowsByNo[no],p=num(r?.expectedRank),f=num(r?.frontness5),lead=num(r?.leadRate5),valid=Boolean(r?.validated)&&Number(r?.hist_n)>=2&&Number.isFinite(p)&&Number.isFinite(f);
  const inner=no<=info.field/2, front=valid&&(p<=Math.max(5,info.field*.43)||f>=.64),rear=valid&&p>=info.field*.52&&f<=.52;
  const blocking=valid?queue.rows.filter(x=>Number(x.no)!==no&&Number(x.no)>no&&Number(x.no)<=info.field&&x.validated&&Number.isFinite(num(x.expectedRank))&&Math.abs(num(x.expectedRank)-p)<=2.2&&Number(x.no)>info.field/2).length:0;
  let path="対象外",why="内の差し馬ではないため閉塞判定の対象外";
  if(!valid){path="データ不足";why="過去走・隊列履歴不足"}
  else if(inner&&rear){
   if(regime==="outer"&&blocking>=2&&["innerworn","worn"].includes(input.track)){path="進路閉塞に注意";why=`後方付近の外側に${blocking}頭の進路競合候補。馬場も内側不利の想定`}
   else if(regime==="outer"&&blocking<=1){path="進路開放の余地";why="外枠主導で後方の馬群が薄くなるなら、内から外へ出せる可能性"}
   else if(blocking>=2){path="経路確認";why=`外側に同順位帯の馬が${blocking}頭。実際の隊列形成次第`}
   else{path="経路確認";why="内で脚をためられる一方、外へ出す瞬間の混雑は未確定"}
  }
  let fit="未判定",basis="当日の馬場分類を入力すると仮説的な適合を表示";
  const manual=input.character?.[String(no)]||"unknown";
  if(valid&&input.track!=="unknown"){
   if(surface==="芝"){
    if(input.track==="flat"){fit="コース優先";basis="馬場バイアスはフラット。コースDBと隊列を優先"}
    else if(input.track==="ultrafast"){fit=inner&&!front?"適合仮説":front?"慎重仮説":"条件付き";basis="超高速では内で速い上がりを使えるかが鍵（資料由来の仮説）"}
    else if(input.track==="fast"){fit=inner&&front?"適合仮説":!inner&&!front?"距離ロス注意":"条件付き";basis="高速・内先行基本型。外差しは進路と直線で補正"}
    else if(input.track==="innerworn"){fit=!inner&&!front?"適合仮説":inner&&front?"進路不利仮説":inner&&!front?"隊列次第":"条件付き";basis="内荒れ・外差し基本型。内差しが外へ出せる例外を残す"}
    else if(input.track==="worn"){fit=!inner&&front?"適合仮説":inner&&front?"先行位置注意":"条件付き";basis="荒れ・外先行基本型。競合での失速を別評価"}
    else if(input.track==="innerempty"){fit=inner&&front?"適合仮説":!inner&&!front?"距離ロス注意":"条件付き";basis="内空け・内先行基本型。進路取りにより逆転あり"}
   }else if(surface==="ダ"){
    if(input.track==="flat"){fit="コース優先";basis="ダートフラット。コース固有の先行差し差を利用"}
    else if(input.track==="front"){fit=front?"適合仮説":"差し届かない懸念";basis="先行馬場。後方からの直線追い込みが届くか検討"}
    else if(input.track==="closer"){fit=!front?"適合仮説":"先行失速に注意";basis="差し馬場。4角で射程圏にいるか確認"}
    else if(input.track==="wet"){fit=front?"適合仮説":"前方追走力の確認";basis="雨馬場は先行・延長の基本型。湿り方によって変化"}
   }
  }
  if(manual==="unreached"&&surface==="芝"&&input.track==="innerworn"&&!inner){basis+="。映像評価：差して届かない型の条件好転候補"}
  if(manual==="escape"&&inner&&regime==="outer"){basis+="。映像評価：逃げ型が先手を奪われる危険"}
  if(manual==="pursuit"&&input.pace==="fast"){basis+="。映像評価：追走型×速いペースを確認"}
  if(manual==="steady"&&input.pace==="slow"){basis+="。映像評価：伸びずバテず型には瞬発力要求を確認"}
  result.push({no,name:String(r?.name||m.name||""),pop:num(m.pop),frontness5:valid?f:null,expectedRank:valid?p:null,validated:valid,stage2:path,stage2Reason:why,stage3:fit,stage3Reason:basis,manualCharacter:manual,blockingN:blocking,front,rear,inner,pursuitGrade:r?.pursuitGrade||null});
 }
 return{ready:true,version:VERSION,surface,regime,track:input.track,pace:input.pace,axis,rows:result,calibrated:false,productionImpact:false,betsChanged:false};
}
function css(){if($("rq23-css"))return;const e=document.createElement("style");e.id="rq23-css";e.textContent=`
#rq23-root{margin:12px 0;padding:13px;border-radius:14px;border:1px solid #426478;background:#0b2230;color:#e7f1f5;line-height:1.5}
#rq23-root h3{font-size:16px;margin:0 0 8px}#rq23-root p.rq23-note{font-size:11px;color:#a6c2cd;margin:7px 0}
#rq23-root .rq23-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:10px 0}
#rq23-root label{font-size:11px;display:block;color:#b8ced6}
#rq23-root select{width:100%;min-height:38px;background:#133748;color:#f0f7fa;border:1px solid #5b8595;border-radius:7px;padding:7px;font-size:13px}
#rq23-root .rq23-runner{border:1px solid #365668;border-radius:9px;margin:8px 0;padding:9px}
#rq23-root .rq23-runner b{font-size:13px}
#rq23-root .rq23-tag{display:inline-block;border:1px solid #50788c;border-radius:6px;padding:2px 5px;margin-left:6px;font-size:11px}
#rq23-root .rq23-tag.warn{border-color:#be896c}
#rq23-root .rq23-runner small{display:block;font-size:11px;color:#a6c2cd;margin:5px 0}
#rq23-root button{background:#1a4b60;border:1px solid #5c8798;color:#eff8fb;padding:9px 12px;border-radius:8px;font-size:12px}
html[data-race-gate]:not([data-race-gate="open"]) #rq23-root{display:none!important}
`;document.head.appendChild(e)}
function setup(){const parent=$("rqfr-root")?.parentElement||$("result");if(!parent)return null;let e=$("rq23-root");if(!e){e=document.createElement("section");e.id="rq23-root";e.setAttribute("aria-label","相手馬・進路リスクと馬場適合の研究");parent.appendChild(e)}return e}
function getSaved(){try{const z=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(z)?z:[]}catch{return[]}}
function render(){
 css();const x=info(),k=raceId(x);if(k!==raceKey){raceKey=k;draft={track:"unknown",pace:"unknown",character:{}};signature="";lastMessage=""}
 const el=setup();if(!el)return;const gate=document.documentElement.dataset.raceGate;const transition=window.RSAAnalysisTransitionState;
 if(gate!=="open"||transition?.status!=="ready"){el.hidden=true;latest=null;window.RaceQualityStage23V01State={ready:false,blocked:true};return}
 const surface=String(x.surface).startsWith("ダ")?"ダ":"芝";
 if((surface==="ダ"&&!DIRT.some(o=>o[0]===draft.track))||(surface==="芝"&&!TURF.some(o=>o[0]===draft.track)))draft.track="unknown";
 el.hidden=false;
 const base=window.RaceQualityFrontRiskShadowV1State,market=window.DecisionShellV2State?.market;
 const y=derive(x,window.ValidatedQueueState,market,base,draft);latest={race:x,key:k,result:y,inputs:JSON.parse(JSON.stringify(draft))};
 const sig=JSON.stringify([k,draft,base?.at,window.ValidatedQueueState?.version,y.rows?.map(r=>[r.no,r.stage2,r.stage3]),lastMessage,getSaved().some(a=>a.key===k)]);
 if(sig===signature)return;signature=sig;
 const controls=`<div class="rq23-controls"><label>${esc(surface)}馬場の事前判定<select data-rq23="track">${options(surface==="ダ"?DIRT:TURF,draft.track)}</select></label><label>想定ペース<select data-rq23="pace">${options([["unknown","不明"],["slow","緩い"],["normal","標準"],["fast","速い"]],draft.pace)}</select></label></div>`;
 const list=y.ready?y.rows.map(r=>`<div class="rq23-runner"><b>${esc(r.no)}番 ${esc(r.name)} ${Number.isFinite(r.pop)?esc(r.pop)+"人気":""}</b><span class="rq23-tag ${r.stage2==="進路閉塞に注意"?"warn":""}">${esc(r.stage2)}</span><span class="rq23-tag">${esc(r.stage3)}</span><small>${esc(r.stage2Reason)}</small><small>${esc(r.stage3Reason)}</small><label>映像・馬キャラ（人間の判断）<select data-rq23-character="${r.no}">${options(CHAR,draft.character[String(r.no)]||"unknown")}</select></label></div>`).join(""):`<p class="rq23-note">${esc(y.reason)}。全頭の履歴とオッズを確認してください。</p>`;
 const saved=getSaved().some(a=>a.key===k);
 el.innerHTML=`<h3>相手馬AI｜進路・馬場適合（検証版）</h3><p class="rq23-note">STEP2：内差しの閉塞と進路開放を両方確認。STEP3：芝6／ダート4分類 × 馬キャラ。レース前に入力した条件を保存します。</p>${controls}<p class="rq23-note">主導：${esc(y.regime||"未確定")}／軸：${esc(y.axis||"未確定")}番／警告は参考。馬券購入・CORE・M3は変更しません。</p>${list}<button data-rq23-action="save" ${!y.ready||saved?"disabled":""}>${saved?"予想記録済み":"予想を保存"}</button> <button data-rq23-action="export">JSON記録を出力</button>${lastMessage?`<p class="rq23-note">${esc(lastMessage)}</p>`:""}<p class="rq23-note">馬キャラは手入力の観察ラベル。適合度と閉塞判定は未較正の仮説で、実際の進路取りは映像で確認する必要があります。</p>`;
 window.RaceQualityStage23V01State={...y,updatedAt:Date.now()};
}
function save(){
 if(!latest?.result.ready||document.documentElement.dataset.raceGate!=="open")return;
 const records=getSaved();if(records.some(v=>v.key===latest.key)){lastMessage="既に保存済み（上書きはしません）";signature="";render();return}
 const raceDay=/^\d{4}-\d{2}-\d{2}$/.test(latest.race.date)?latest.race.date:null;
 const afterRacePossible=!!raceDay&&new Date(raceDay+"T00:00:00").getTime()<new Date().setHours(0,0,0,0);
 records.push({key:latest.key,version:VERSION,savedAt:new Date().toISOString(),race:latest.race,inputs:latest.inputs,result:latest.result,mayBeRetrospective:afterRacePossible,preRaceVerified:false});
 try{localStorage.setItem(STORE,JSON.stringify(records));lastMessage=`保存完了（${records.length}レース）。入力時刻・レース日を後で検証してください。`}catch(e){lastMessage="保存に失敗。ブラウザの容量を確認してください"}
 signature="";render();
}
function exportData(){
 const json=JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),records:getSaved()},null,2),blob=new Blob([json],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="race_quality_stage23_snapshots.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function schedule(ms=160){clearTimeout(timer);timer=setTimeout(render,ms)}
document.addEventListener("change",e=>{
 const target=e.target;if(target?.dataset?.rq23){draft[target.dataset.rq23]=target.value;signature="";schedule(0)}
 else if(target?.dataset?.rq23Character){draft.character[target.dataset.rq23Character]=target.value;signature="";schedule(0)}
 else if(target?.id==="csvFile")schedule();
},true);
document.addEventListener("input",e=>{if(["raceName","raceDate","venue","surface","distance","fieldSize","grade","oddsPaste"].includes(e.target?.id))schedule()},true);
document.addEventListener("click",e=>{
 const action=e.target?.closest?.("[data-rq23-action]")?.dataset?.rq23Action;
 if(action==="save")save();else if(action==="export")exportData();
 else if(["analyzeBtn","applyOddsBtn","parseCsvBtn","clearOddsBtn"].includes(e.target?.id))schedule(300);
},true);
["rsa-analysis-start","rsa-analysis-complete","rsa-analysis-error","validated-queue-ready","decision-shell-v2-ready","rsa-addons-ready"].forEach(evt=>addEventListener(evt,()=>schedule(180)));
window.RaceQualityStage23V01={version:VERSION,derive,render,exportData};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>schedule(300),{once:true});else schedule(250);
})();