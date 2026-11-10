(function(){
"use strict";
if(window.MinetaPositionStudyV1)return;
const C=window.ShapeCore;
if(!C)return;
const V="mineta-position-study-v1.3-h3-compatibility-research";
const $=id=>document.getElementById(id);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>v==null||String(v).trim()===""?NaN:Number(String(v).normalize("NFKC").trim());
const numberInt=v=>{const n=num(v);return Number.isInteger(n)&&n>0?n:null};
const day=v=>{
  const x=String(v||"").normalize("NFKC").trim();
  const m=x.match(/(20\d\d)\D*(\d{1,2})\D*(\d{1,2})/);
  if(!m)return 0;
  const y=+m[1],mo=+m[2],d=+m[3];
  return mo>=1&&mo<=12&&d>=1&&d<=31?y*10000+mo*100+d:0;
};
const nameOf=v=>String(v||"").normalize("NFKC").trim();
const cleanHead=v=>String(v||"").normalize("NFKC").trim();
const col=(headers,...names)=>headers.find(h=>names.some(n=>cleanHead(h)===cleanHead(n)))||"";
const groups=[
  {id:"sandwich",title:"逃げハサミ",hint:"前走4番手以下の馬の両隣に、前走どこかで3番手以内の馬がいる"},
  {id:"outside",title:"逃げ馬のすぐ外",hint:"内隣の馬が前走最初の通過地点で先頭だった場合、外の進路選択肢が増える可能性"},
  {id:"advance",title:"今回前進する可能性",hint:"前走の最初の有効コーナー6番手以下 → 今回は前方約25%かつ3番手以上前進の予測"},
  {id:"recover",title:"道中後退から巻き返し",hint:"前走途中で位置を下げた後、着順で盛り返した（不利の有無は未確認）"}
];
function parseGrid(grid){
  if(!Array.isArray(grid)||grid.length<2)throw Error("CSVが空です");
  const z=C.rowsToObjects(grid),h=z.headers||[],m={
    name:col(h,"馬名"),date:col(h,"日付","年月日","レース日"),race:col(h,"レース名"),
    finish:col(h,"着順","確定着順"),raceType:col(h,"競走種別コード"),
    c1:col(h,"通過1","1角","１角"),c2:col(h,"通過2","2角","２角"),
    c3:col(h,"通過3","3角","３角"),c4:col(h,"通過4","4角","４角")
  };
  if(!m.name||!m.date||(!m.c1&&!m.c2&&!m.c3&&!m.c4))
    throw Error("TARGETの馬名・日付・通過順位列が足りません");
  const past={};let count=0;
  for(const r of z.rows){
    const name=nameOf(r[m.name]),date=day(r[m.date]);if(!name||!date)continue;
    const corners=[m.c1,m.c2,m.c3,m.c4].map(k=>k?numberInt(r[k]):null).filter(x=>x!==null);
    const raceName=String(r[m.race]||"");
    const code=String(r[m.raceType]||"").normalize("NFKC").trim();
    const obstacle=/障害|ジャンプ|J[- ]?G[123]/i.test(raceName)||code==="18"||code==="19";
    const finishRaw=String(m.finish?r[m.finish]:"").normalize("NFKC").trim();
    const nonFinish=/^(止|中止|取|取消|消|除|除外|外|失|失格)$/.test(finishRaw);
    const finish=numberInt(finishRaw);
    if(!past[name])past[name]=[];
    past[name].push({date,corners,finish,obstacle,nonFinish,raceName});
    count++;
  }
  for(const v of Object.values(past))v.sort((a,b)=>b.date-a.date);
  return{past,count,horses:Object.keys(past).length,headers:h.length};
}
function evaluate(ctx){
  const field=Number(ctx?.field)||0,horses=ctx?.horses||[],past=ctx?.past||{},raceDate=day(ctx?.raceDate),axisNo=String(ctx?.axisNo||"");
  if(field<12||field>18||horses.length!==field||!raceDate||!axisNo)
    return{ready:false,reason:"軸馬・開催日・頭数の確認待ち"};
  const numbers=horses.map(x=>numberInt(x.no));
  if(numbers.some(x=>!x)||new Set(numbers).size!==field||numbers.some(x=>x>field))
    return{ready:false,reason:"今回馬番の対応が不明です。CSV出走順と馬番を確認してください"};
  const q=ctx?.queue||{},a=ctx?.ability||{},m=ctx?.market||{};
  const rows=horses.map(h=>{
    const no=String(Number(h.no)),name=nameOf(h.name),history=past[name]||[];
    const prior=history.find(x=>x.date<raceDate)||null;
    const known=Boolean(prior&&!prior.obstacle&&!prior.nonFinish&&prior.corners.length);
    const p=known?prior:null;
    const qh=q[no]||{},ah=a[no]||{},mh=m[no]||{};
    const expected=num(qh.expectedRank);
    return{
      no,name,prior,known,priorFront:known&&p.corners.some(x=>x<=3),
      priorLead:known&&p.corners[0]===1,
      first:known?p.corners[0]:null,last:known?p.corners[p.corners.length-1]:null,
      corners:known?p.corners:[],finish:known?p.finish:null,
      expected:Number.isFinite(expected)&&qh.validated?expected:null,
      abilityRank:Number.isFinite(num(ah.abilityRank))?num(ah.abilityRank):null,
      m3Rank:Number.isFinite(num(h.finishRank))?num(h.finishRank):null,
      pop:Number.isFinite(num(mh.pop))?num(mh.pop):null,
      odds:Number.isFinite(num(mh.od))?num(mh.od):null,
      signals:[],notes:[]
    };
  }).sort((a,b)=>Number(a.no)-Number(b.no));
  const byNo=Object.fromEntries(rows.map(r=>[r.no,r]));
  const axis=byNo[axisNo]||null;
  if(!axis)return{ready:false,reason:"軸馬の馬番が出走馬と一致しません"};
  const known=rows.filter(r=>r.known).length;
  const front=rows.filter(r=>r.known&&r.priorFront).length;
  for(const r of rows){
    if(!r.known)continue;
    const n=Number(r.no),inner=byNo[String(n-1)],outer=byNo[String(n+1)];
    if(inner?.known&&outer?.known&&!r.priorFront&&inner.priorFront&&outer.priorFront){
      r.signals.push("sandwich");
      r.notes.push("両隣 "+inner.no+"番・"+outer.no+"番に前走3番手以内の通過実績");
    }
    if(inner?.known&&inner.priorLead){
      r.signals.push("outside");
      r.notes.push("すぐ内の"+inner.no+"番が前走最初の通過地点で先頭"+(r.priorFront?"。自身にも先行実績があり競り合いに注意":"。前を取るかは未確定"));
    }
    if(r.first!==null&&r.first>=6&&r.expected!==null&&r.expected<=Math.max(4,Math.ceil(field*.25))&&r.first-r.expected>=3){
      r.signals.push("advance");
      r.notes.push("前走初位置"+r.first+"番手 → 今回予測"+r.expected.toFixed(1)+"番手");
    }
    if(r.corners.length>=2&&r.first!==null&&r.last!==null&&r.finish!==null&&r.last-r.first>=2&&r.last-r.finish>=3&&r.finish<=5){
      r.signals.push("recover");
      r.notes.push("前走の通過 "+r.corners.join("-")+" → "+r.finish+"着（原因は未確認）");
    }
  }
  const byGroup=Object.fromEntries(groups.map(g=>[g.id,rows.filter(r=>r.no!==axisNo&&r.signals.includes(g.id))]));
  const countCandidates=rows.filter(r=>r.signals.length).length;
  const relative=rows.filter(r=>r.signals.length).map(r=>{
    let pair="軸との位置関係は未判定";
    if(axis.expected!==null&&r.expected!==null){
      if(axis.expected<=Math.max(5,field*.35)&&r.expected<=Math.max(5,field*.35))
        pair="軸と前方争いになる可能性";
      else if(r.expected>axis.expected+1)
        pair="軸の後方を進む想定（同時好走は未検証）";
      else if(r.expected<axis.expected-1)
        pair="軸より前を進む想定（同時好走は未検証）";
      else pair="軸と近い位置を進む想定";
    }
    return{...r,pair};
  });
  const paired=Object.fromEntries(relative.map(r=>[r.no,r]));
  for(const g of groups)byGroup[g.id]=byGroup[g.id].map(r=>paired[r.no]);
  return{
    ready:true,version:V,field,raceDate,axis:{no:axis.no,name:axis.name,expected:axis.expected===null?"取得待ち":axis.expected.toFixed(1)+"番手",abilityRank:axis.abilityRank,m3Rank:axis.m3Rank},
    known,front,share:front/field,coverage:known/field,byGroup,candidates:countCandidates,
    rows,warning:"候補は位置取り仮説の一致であり、勝率・回収率・期待値を示しません"
  };
}
// H3: qualitative compatibility only. These are app-defined research scenarios,
// NOT the author's official thresholds, joint probabilities or bet suggestions.
const POSITION_FOUR=["強前傾","前傾","標準","スロー"];
function positionZone(rank,field){
 if(rank==null||!Number.isFinite(rank))return "unknown";
 if(rank<=Math.max(4,Math.ceil(field*.35)))return "front";
 if(rank>=Math.ceil(field*.67))return "rear";
 return "mid";
}
function scenarioM4(selected,reference){
 const F=window.Finish600State?.rows||[];
 const a=F.find(x=>String(x.no)===String(selected.no));
 const b=F.find(x=>String(x.no)===String(reference.no));
 const sc1=Array.isArray(a?.sc)?a.sc:[],sc2=Array.isArray(b?.sc)?b.sc:[];
 const found=[];
 for(let i=0;i<4;i++){
   const x=num(sc1[i]?.rank),y=num(sc2[i]?.rank);
   if(!Number.isInteger(x)||x<1||!Number.isInteger(y)||y<1)continue;
   found.push({scenario:POSITION_FOUR[i],axisRank:y,horseRank:x,bothTop3:x<=3&&y<=3});
 }
 return{evaluated:found.length,bothTop3:found.filter(x=>x.bothTop3).length,
  cases:found,matching:found.filter(x=>x.bothTop3).map(x=>x.scenario)};
}
function synergy(selected,reference,field,frontShare,known){
 const a=positionZone(reference.expected,field),b=positionZone(selected.expected,field);
 const m4=scenarioM4(selected,reference);
 if(a==="unknown"||b==="unknown"){
  return{label:"想定位置の確認待ち",type:"unknown",
   scenario:"軸または相手の有効な初角予測が不足しています。前後関係だけでは判断しません。",
   caution:"位置取りの材料が足りないため、両立可否を判定しません。",m4};
 }
 let label="",scenario="",caution="",type="mixed";
 if(a==="front"&&b==="front"){
  label="前方同士・位置争い",type="competition";
  scenario="両馬が先行する想定。前が残る展開なら両立する余地があります。";
  caution="同じ位置の取り合いや先行馬の多さで消耗し、共倒れになる可能性があります。";
 }else if(a==="rear"&&b==="front"){
  label="差し軸＋前残り相手",type="mixed";
  scenario="軸が後方から届きつつ、相手が前で粘る決着形を想定します。";
  caution="前が総崩れなら相手が残れず、前が止まらなければ軸が届きにくい組み合わせです。";
 }else if(a==="front"&&b==="rear"){
  label="先行軸＋後方からの相手",type="mixed";
  scenario="軸が前で粘り、相手が後方から届く決着形を想定します。";
  caution="極端な前残り・前崩れのどちらかへ寄ると、片方の条件を満たしにくくなります。";
 }else if(a==="rear"&&b==="rear"){
  label="後方同士・前崩れ待ち",type="shared";
  scenario="先行馬が失速し、後方の2頭がともに届く展開を想定します。";
  caution="前残り展開では2頭同時に不利になり得ます。";
 }else if(a==="mid"&&b==="mid"){
  label="中団同士・進路の競合",type="competition";
  scenario="中団からそれぞれ進路を確保して伸びる展開を想定します。";
  caution="直線入口で同じ進路を狙うと両立しない可能性があります。";
 }else{
  label="異なる位置からの組み合わせ",type="mixed";
  scenario="2頭が異なる位置取りから脚を使い、同時に上位へ進む展開を想定します。";
  caution="実際のペース・進路・馬場で片方だけ有利になる可能性があります。";
 }
 const pressureNote=known<field
  ? "前走の位置取り履歴に欠損あり。先行占有率は参考値です。"
  : "先行占有率は前走の先行経験であり、今回の先行ペース確率ではありません。";
 return{label,type,scenario,caution,positionRisk:pressureNote,m4};
}
function raceSummary(){
 const access=String(document.documentElement?.dataset?.axisAccess||"");
 if(!["pass","pair"].includes(access)||window.RaceSkipLockV1State?.status!=="open"||
    window.RSAAnalysisTransitionState?.status!=="ready")return{ready:false,reason:"軸の安全条件が未通過です"};
 const file=$("csvFile")?.files?.[0],horses=window.Finish600State?.rows||[];
 if(!parsed||!file||!currentFile||!sameCsv(file,currentFile))return{ready:false,reason:"TARGET CSVの読み込み待ちです"};
 const field=Number($("fieldSize")?.value)||horses.length;
 const core=window.DecisionShellV2State,axisNo=String(core?.structure?.axis?.no||"");
 if(!core?.ready||!["green","yellow"].includes(core?.structure?.level)||!axisNo)
  return{ready:false,reason:"Ability・M3の構造判定待ちです"};
 const st=evaluate({field,raceDate:$("raceDate")?.value||"",axisNo,horses,past:parsed.past,
   queue:window.ValidatedQueueState?.byNo||{},ability:window.M3PureAbilityState?.byNo||{},
   market:core.market?.complete?core.market.byNo||{}:{}});
 if(!st.ready)return{ready:false,reason:st.reason};
 return{ready:true,version:V,displayOnly:true,field:st.field,front:st.front,known:st.known,
   share:st.share,coverage:st.coverage,rows:st.rows,axisNo,st};
}
function sameCsv(a,b){
 return [["name",""],["size",0],["lastModified",0]].every(([k,d])=>String(a?.[k]??d)===String(b?.[k]??d));
}

// Display-only research access for the new per-horse iPhone detail. Always use the same CSV snapshot.
function relation(selected,reference,field){
 if(selected?.expected==null||reference?.expected==null)return "想定位置のデータ不足で比較できません";
 const front=Math.max(5,field*.35);
 if(selected.expected<=front&&reference.expected<=front)return "両馬が前方で競り合う可能性";
 if(selected.expected>reference.expected+1)return "選択馬は基準馬より後ろから進める想定";
 if(selected.expected<reference.expected-1)return "選択馬は基準馬より前で進める想定";
 return "両馬は近い位置を進める想定";
}
function inspectHorse(no){
 const summary=raceSummary();
 if(!summary.ready)return{ready:false,reason:summary.reason};
 const st=summary.st,row=st.rows.find(r=>r.no===String(Number(no)));
 if(!row)return{ready:false,reason:"選択馬とCSVの馬番を照合できません"};
 const core=window.DecisionShellV2State,structure=core.structure;
 const isPair=String(document.documentElement?.dataset?.axisAccess)==="pair"&&
   structure.kind==="double"&&Array.isArray(structure.candidates)&&structure.candidates.length===2;
 const pair=isPair?structure.candidates.map(r=>String(r.no)):[];
 const axisNo=String(structure.axis.no),refs=[];
 const makeRef=(ref,label)=>({no:ref.no,name:ref.name,label,relation:relation(row,ref,summary.field),
   compatibility:synergy(row,ref,summary.field,st.share,st.known)});
 if(isPair){
   for(const peer of pair){
    if(peer===row.no)continue;
    const ref=st.rows.find(r=>r.no===peer);
    if(ref)refs.push(makeRef(ref,"Pair候補を軸と仮定"));
   }
 }else if(row.no===axisNo){
   refs.push({no:axisNo,name:row.name,label:"この馬が単独軸",
     relation:"ほかの馬との同時好走は各相手馬の詳細で確認",compatibility:null});
 }else{
   const ref=st.rows.find(r=>r.no===axisNo);
   if(ref)refs.push(makeRef(ref,"単独軸を基準"));
 }
 return{ready:true,version:V,productionLogicChanged:false,displayOnly:true,
  raceDate:st.raceDate,field:st.field,known:st.known,coverage:st.coverage,
  front:st.front,frontShare:st.share,isPair,axisConfirmed:!isPair,
  refs,row:{...row},signals:[...row.signals],notes:[...row.notes],
  warning:"過去走・予測位置・M4仮順位から記述した研究仮説です。両馬の同時好走確率・回収率・馬券期待値ではありません"};
}

let parsed=null,currentFile=null,fileToken=0,timer=0,lastSig="",lastError="";
async function parseFile(file){
  const token=++fileToken;
  parsed=null;currentFile=file||null;lastError="";lastSig="";
  window.dispatchEvent(new CustomEvent("mineta-position-study-data-ready",{detail:{ready:false,reason:"csv_changed",at:Date.now()}}));
  if(!file){schedule(80);return}
  try{
    const buf=window.RSATargetCsvCache?.arrayBuffer?await window.RSATargetCsvCache.arrayBuffer(file):await file.arrayBuffer();
    const grid=C.parseCSV(C.decode(buf));
    const result=parseGrid(grid);
    if(token!==fileToken)return;
    parsed=result;
    window.dispatchEvent(new CustomEvent("mineta-position-study-data-ready",{detail:{ready:true,fileName:file.name,at:Date.now()}}));
  }catch(e){
    if(token!==fileToken)return;
    lastError=String(e?.message||e);
    console.warn("mineta-position-study CSV",e);
    window.dispatchEvent(new CustomEvent("mineta-position-study-data-ready",{detail:{ready:false,reason:"csv_error",at:Date.now()}}));
  }
  schedule(40);
}
function css(){
  if($("mps-css"))return;
  const style=document.createElement("style");style.id="mps-css";
  style.textContent="#mpsRoot{border:1px solid #40657b;background:#0b1f2b;border-radius:16px;padding:12px;margin:10px 0 14px;color:#e5f1f8;font-size:12px;line-height:1.6}"+
  "#mpsRoot *{box-sizing:border-box}#mpsRoot h2{font-size:18px;letter-spacing:.03em;margin:2px 0 6px}#mpsRoot h3{font-size:14px;margin:0}"+
  "#mpsRoot .mpsLead{color:#a3c0ce;font-size:11px}#mpsRoot .mpsStatus{color:#b6d9c9;margin-top:8px;font-size:12px}"+
  "#mpsRoot .mpsStat{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin:10px 0;background:#102d3e;border-radius:11px;padding:10px}"+
  "#mpsRoot .mpsBig{font-weight:850;font-size:20px;color:#ecf7fa}#mpsRoot .mpsTiny{font-size:10px;color:#a2b6c2}"+
  "#mpsRoot .mpsGroup{border-top:1px solid #355469;padding-top:10px;margin-top:12px}#mpsRoot .mpsGroupHeader{display:flex;justify-content:space-between;align-items:center;gap:8px}"+
  "#mpsRoot .mpsCount{background:#163f51;border-radius:99px;padding:2px 10px;color:#bbdfeb;font-weight:800}"+
  "#mpsRoot .mpsItem{display:block;border:1px solid #345568;background:#0c2937;border-radius:11px;margin-top:7px;overflow:hidden}"+
  "#mpsRoot .mpsItem summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px}"+
  "#mpsRoot .mpsItem summary::-webkit-details-marker{display:none}#mpsRoot .mpsNo{min-width:32px;text-align:center;border-radius:7px;background:#174459;color:#effffb;font-size:14px;font-weight:900;padding:4px}"+
  "#mpsRoot .mpsName{flex:1;min-width:0;font-weight:800;font-size:13px}#mpsRoot .mpsMeta{font-size:10px;color:#aed4cf}"+
  "#mpsRoot .mpsBody{border-top:1px solid #315163;padding:9px;color:#bcd2de;font-size:11px}#mpsRoot .mpsNotice{margin-top:10px;font-size:10px;color:#b0b9bd}"+
  "#mpsRoot .mpsEmpty{font-size:11px;color:#8ea8b8;margin-top:5px}#mpsRoot .mpsBar{height:6px;background:#1c3c4d;border-radius:99px;overflow:hidden;margin-top:7px}"+
  "#mpsRoot .mpsBar>span{height:100%;display:block;background:#4b9b91;max-width:100%}"+
  "#mpsRoot .mpsLink{display:inline-block;color:#95ddc7;text-decoration:underline;margin-top:8px}#mpsRoot .mpsExport{margin:4px 0 7px;padding:9px 11px;border:1px solid #5c8374;border-radius:10px;color:#d8f4e9;background:#11392f;font-weight:800;font-size:12px}"+
  "@media(max-width:390px){#mpsRoot{padding:9px}#mpsRoot .mpsMeta{font-size:9px}}";
  document.head.appendChild(style);
}
function mount(){
  const area=$("imsAxis")||$("mpuResearch")||$("result");
  if(!area)return null;
  let root=$("mpsRoot");
  if(!root){root=document.createElement("section");root.id="mpsRoot";}
  const anchor=$("moaRoot");
  if(anchor&&anchor.parentElement===area){
    if(root.parentElement!==area||root.nextSibling!==anchor)area.insertBefore(root,anchor);
  }else if(root.parentElement!==area)area.insertBefore(root,area.firstChild);
  return root;
}
function viewItem(r){
  const desc=r.notes.map(x=>"<div>・"+esc(x)+"</div>").join("");
  const odds=r.pop!==null?" ｜ "+r.pop+"人気"+(r.odds!==null?"・単勝"+r.odds+"倍":""):"";
  return '<details class="mpsItem"><summary><span class="mpsNo">'+esc(r.no)+'</span><span class="mpsName">'+esc(r.name)+'</span><span class="mpsMeta">Ability '+(r.abilityRank??"—")+' / M3 '+(r.m3Rank??"—")+'</span></summary>'+
    '<div class="mpsBody"><div>前走有効通過：'+esc(r.corners.join("→"))+' ｜ 今回予測：'+(r.expected===null?"未取得":r.expected.toFixed(1)+"番手")+esc(odds)+'</div>'+desc+'<div>軸との関係：'+esc(r.pair)+'</div></div></details>';
}
function buildHtml(state,phase){
  const head='<div class="mpsTiny">POSITION STUDY / RESEARCH v1</div><h2>位置取りから見る相手馬</h2>'+
    '<div class="mpsLead">みねたさんの公開理論から着想した研究表示。軸馬の選定・買い目・期待値には連動しません。</div>';
  if(phase)return head+'<div class="mpsStatus">'+esc(phase)+'</div>';
  let html=head+'<div class="mpsStat"><div><div class="mpsTiny">軸馬</div><div class="mpsBig">'+esc(state.axis.no)+'番 '+esc(state.axis.name)+'</div><div class="mpsTiny">今回の予測 '+esc(state.axis.expected)+'</div></div>'+
    '<div><div class="mpsTiny">前走先行馬占有率</div><div class="mpsBig">'+state.front+' / '+state.field+'頭（'+(state.share*100).toFixed(1)+'%）</div><div class="mpsTiny">通過順位確認 '+state.known+' / '+state.field+'頭</div></div></div>'+
    '<div class="mpsBar"><span style="width:'+(state.share*100).toFixed(1)+'%"></span></div>'+
    '<div class="mpsStatus">'+(state.known<state.field?'前走履歴未取得の馬がいるため占有率は暫定。':state.share<.30?'先行馬占有率30%未満：前が楽になる可能性。ただしコース・馬場で変わる。':'先行馬占有率30%以上：先行争い・枠の並びを個別に確認。')+'</div>';
  for(const g of groups){
    const rows=state.byGroup[g.id]||[];
    html+='<div class="mpsGroup"><div class="mpsGroupHeader"><h3>'+esc(g.title)+'</h3><span class="mpsCount">'+rows.length+'頭</span></div>'+
      '<div class="mpsTiny">'+esc(g.hint)+'</div>'+
      (rows.length?rows.map(viewItem).join(""):'<div class="mpsEmpty">該当なし（または過去走・予測位置不足）</div>')+'</div>';
  }
  html+='<div class="mpsNotice">4つの視点は重複あり。抽出＝推奨ではなく、同時好走や利益率は未検証。前走の通過順位と今回予測隊列から機械的に判定。CSVの出走順と今回の馬番が一致していることを確認してください。'+
    '出典：<a href="https://note.com/frontrunner/n/nee6e82d0bd14" target="_blank" rel="noopener noreferrer">先行馬占有率</a>・'+
    '<a href="https://www.keiba-salon.com/mineta-quotations-20250129_63441/" target="_blank" rel="noopener noreferrer">逃げハサミ</a>・'+
    '<a href="https://www.keiba-salon.com/mineta-quotations-20230606_6493/" target="_blank" rel="noopener noreferrer">逃げ馬の外</a>。判定閾値の一部はアプリ独自の研究用仮定。</div>'+
    '<a href="#moaRoot" class="mpsLink">全馬分析で能力・馬場・M4を確認</a>';
  html+='<div class="mpsNotice"><button type="button" data-mps-export="1" class="mpsExport">発走前の研究データをCSV保存</button>'+
    '<div>今回の全出走馬（抽出されなかった馬も含む）と、抽出条件・モデル版・記録時刻を保存します。必ず発走前に保存してください。これは実馬番との対応や発走前保存を自動保証する機能ではありません。</div></div>';
  return html;
}
function snapshotRows(state,meta,at){
 if(!state?.ready||!Array.isArray(state.rows))return [];
 const t=String(at||new Date().toISOString()),m=meta||{},axis=String(state.axis?.no||'');
 const core=window.DecisionShellV2State?.structure||{};
 const pair=(core.kind==='double'&&Array.isArray(core.candidates)&&core.candidates.length===2)
  ?core.candidates.map(x=>String(x.no)):[];
 const anchors=pair.length===2?pair:[axis],byNo=Object.fromEntries(state.rows.map(r=>[String(r.no),r]));
 const layer=(r,no)=>{
  const ref=byNo[no];
  if(!ref||!no)return {ref:'',shape:'',zone:'',m4_top3:'',m4_evaluated:''};
  if(String(r.no)===String(no))return{ref:no,shape:'self_axis',zone:positionZone(r.expected,state.field),m4_top3:'',m4_evaluated:''};
  const c=synergy(r,ref,state.field,state.share,state.known);
  return{ref:no,shape:c.label,zone:positionZone(r.expected,state.field),
   m4_top3:c.m4.bothTop3,m4_evaluated:c.m4.evaluated};
 };
 return state.rows.map(r=>{
  const h1=layer(r,anchors[0]),h2=anchors.length>1?layer(r,anchors[1]):layer(r,'');
  return{
    snapshot_utc:t,model_build:String(m.build||''),signal_version:V,
    race_date:String(m.raceDate||''),race_name:String(m.raceName||''),venue:String(m.venue||''),
    grade:String(m.grade||''),surface:String(m.surface||''),distance:String(m.distance||''),
    field_size:state.field,source_csv:String(m.csv||''),
    horse_no:r.no,horse_name:r.name,axis_no:axis,axis_candidate:r.no===axis?1:0,
    pair_research:pair.length===2?1:0,pair_ref_nos:pair.join('|'),
    prior_date:r.prior?.date||'',prior_known:r.known?1:0,
    prior_front_any_corner:r.known&&r.priorFront?1:0,
    prior_initial_lead:r.known&&r.priorLead?1:0,
    prior_first_corner:r.first??'',prior_last_corner:r.last??'',
    previous_finish:r.finish??'',prior_corners:(r.corners||[]).join('-'),
    expected_first_turn_rank:r.expected??'',front_share:state.share,
    prior_coverage:state.coverage,ability_rank:r.abilityRank??'',m3_rank:r.m3Rank??'',
    popularity_at_snapshot:r.pop??'',win_odds_at_snapshot:r.odds??'',
    signal_sandwich:r.signals.includes('sandwich')?1:0,
    signal_outside:r.signals.includes('outside')?1:0,
    signal_advance:r.signals.includes('advance')?1:0,
    signal_recover:r.signals.includes('recover')?1:0,
    h3_reference1_no:h1.ref,h3_reference1_shape:h1.shape,h3_reference1_zone:h1.zone,
    h3_reference1_m4_both_top3:h1.m4_top3,h3_reference1_m4_evaluated:h1.m4_evaluated,
    h3_reference2_no:h2.ref,h3_reference2_shape:h2.shape,h3_reference2_zone:h2.zone,
    h3_reference2_m4_both_top3:h2.m4_top3,h3_reference2_m4_evaluated:h2.m4_evaluated
  };
 });
}

function snapshotCsv(rows){
  if(!rows?.length)return '';
  const keys=Object.keys(rows[0]),q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  return '\uFEFF'+[keys.map(q).join(','),...rows.map(r=>keys.map(k=>q(r[k])).join(','))].join('\r\n');
}
function exportSnapshot(){
  const state=window.MinetaPositionStudyV1State;
  if(!state?.ready)return;
  const meta={build:String(window.RSA_BUILD||''),raceDate:$('raceDate')?.value||'',raceName:$('raceName')?.value||'',
    venue:$('venue')?.value||'',grade:$('grade')?.value||'',surface:$('surface')?.value||'',
    distance:$('distance')?.value||'',csv:currentFile?.name||''};
  const rows=snapshotRows(state,meta);
  if(!rows.length)return;
  const csv=snapshotCsv(rows),blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  const safe=String(meta.raceName||'race').replace(/[^a-zA-Z0-9\u3040-\u30ff\u3400-\u9fff_-]/g,'_').slice(0,35);
  a.href=url;a.download='mineta-research-'+String(meta.raceDate||'undated')+'-'+safe+'.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function render(){
  css();const root=mount();if(!root)return;
  const core=window.DecisionShellV2State;
  const structure=core?.structure;
  const gate=window.RaceSkipLockV1State;
  let phase="";
  if(gate?.status!=="open")phase="軸の信頼条件を通過したレースだけで表示します。現在は見送り・判定待ちです。";
  else if(!core?.ready||!["green","yellow"].includes(structure?.level)||!structure?.axis?.no)
    phase="Ability×M3の軸判定待ちです。オッズ入力なしでも位置取り分析はできます。";
  else if(lastError)phase="CSV読取エラー："+lastError;
  else if(!parsed)phase="TARGET CSVを読み込んで過去走を確認してください。";
  const F=window.Finish600State?.rows||[],field=Number($("fieldSize")?.value)||F.length;
  const date=$("raceDate")?.value||"",axis=String(structure?.axis?.no||"");
  let state=null;
  if(!phase){
    state=evaluate({field,raceDate:date,axisNo:axis,horses:F,past:parsed.past,
      queue:window.ValidatedQueueState?.byNo||{},ability:window.M3PureAbilityState?.byNo||{},market:window.DecisionShellV2State?.market?.byNo||{}});
    if(!state.ready)phase=state.reason;
  }
  const sig=JSON.stringify([phase,field,date,axis,structure?.level,structure?.code,parsed?.count,
    window.ValidatedQueueState?.at,window.M3PureAbilityState?.at,
    window.DecisionShellV2State?.at,
    state?.byGroup&&groups.map(g=>state.byGroup[g.id].map(r=>r.no+":"+r.notes.join("|"))),
    state?.share,state?.known,window.PositionRiskState?.byNo?.[axis]?.p10]);
  if(sig===lastSig&&root.innerHTML)return;
  lastSig=sig;root.innerHTML=buildHtml(state,phase);
  if(state?.ready){
    const p10=num(window.PositionRiskState?.byNo?.[axis]?.p10);
    const warning=Number.isFinite(p10)&&p10>=.65
      ?'<div class="mpsStatus">軸馬のP10が'+Math.round(p10*100)+'%：過去の近似検証では高リスク帯。相手馬の抽出は参考として表示し、軸の自動判定は変更しません。</div>':'';
    if(warning)root.innerHTML+=warning;
  }
  window.MinetaPositionStudyV1State=state?.ready?{...state,uiReady:true,productionLogicChanged:false}:{ready:false,reason:phase};
}
function schedule(ms=80){clearTimeout(timer);timer=setTimeout(render,ms)}
function init(){
  const file=$("csvFile");
  document.addEventListener("click",e=>{if(e.target?.closest?.("[data-mps-export]"))exportSnapshot()});
  file?.addEventListener("change",e=>parseFile(e.target.files?.[0]));
  if(file?.files?.[0])parseFile(file.files[0]);
  document.addEventListener("change",e=>{if(["raceDate","raceName","fieldSize","grade","surface","distance","venue"].includes(e.target?.id))schedule(80)},true);
  document.addEventListener("input",e=>{if(["raceDate","fieldSize","oddsPaste"].includes(e.target?.id))schedule(120)},true);
  for(const event of ["finish600-ready","validated-queue-ready","m3-pure-ability-ready","decision-shell-v2-ready","production-decision-pipeline-ready","rsa-analysis-complete","mobile-opponent-analysis-ready","rsa-addons-ready"])
    window.addEventListener(event,()=>schedule(120));
  schedule(250);setTimeout(()=>schedule(),900);
}
window.MinetaPositionStudyV1={version:V,parseGrid,evaluate,inspectHorse,raceSummary,synergy,scenarioM4,render,schedule,snapshotRows,snapshotCsv};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
