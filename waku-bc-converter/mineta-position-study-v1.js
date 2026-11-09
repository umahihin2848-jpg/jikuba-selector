(function(){
"use strict";
if(window.MinetaPositionStudyV1)return;
const C=window.ShapeCore;
if(!C)return;
const V="mineta-position-study-v1.0-research";
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
  {id:"outside",title:"逃げ馬のすぐ外",hint:"内隣の馬に前走1番手の通過実績があり、外の進路選択肢が増える可能性"},
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
      priorLead:known&&p.corners.includes(1),
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
    if(r.no===axisNo||!r.known)continue;
    const n=Number(r.no),inner=byNo[String(n-1)],outer=byNo[String(n+1)];
    if(inner?.known&&outer?.known&&!r.priorFront&&inner.priorFront&&outer.priorFront){
      r.signals.push("sandwich");
      r.notes.push("両隣 "+inner.no+"番・"+outer.no+"番に前走3番手以内の通過実績");
    }
    if(inner?.known&&inner.priorLead&&!r.priorFront){
      r.signals.push("outside");
      r.notes.push("すぐ内の"+inner.no+"番が前走どこかのコーナーで先頭");
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
  const byGroup=Object.fromEntries(groups.map(g=>[g.id,rows.filter(r=>r.signals.includes(g.id))]));
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
let parsed=null,currentFile=null,fileToken=0,timer=0,lastSig="",lastError="";
async function parseFile(file){
  const token=++fileToken;
  parsed=null;currentFile=file||null;lastError="";lastSig="";
  if(!file){schedule(80);return}
  try{
    const buf=window.RSATargetCsvCache?.arrayBuffer?await window.RSATargetCsvCache.arrayBuffer(file):await file.arrayBuffer();
    const grid=C.parseCSV(C.decode(buf));
    const result=parseGrid(grid);
    if(token!==fileToken)return;
    parsed=result;
  }catch(e){
    if(token!==fileToken)return;
    lastError=String(e?.message||e);
    console.warn("mineta-position-study CSV",e);
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
  "#mpsRoot .mpsLink{display:inline-block;color:#95ddc7;text-decoration:underline;margin-top:8px}"+
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
  html+='<div class="mpsNotice">4つの視点は重複あり。抽出＝推奨ではなく、同時好走や利益率は未検証。前走の通過順位と今回予測隊列から機械的に判定。CSVの出走順と今回の馬番が一致していることを確認してください。</div>'+
    '<a href="#moaRoot" class="mpsLink">全馬分析で能力・馬場・M4を確認</a>';
  return html;
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
    state?.share,state?.known]);
  if(sig===lastSig&&root.innerHTML)return;
  lastSig=sig;root.innerHTML=buildHtml(state,phase);
  window.MinetaPositionStudyV1State=state?.ready?{...state,uiReady:true,productionLogicChanged:false}:{ready:false,reason:phase};
}
function schedule(ms=80){clearTimeout(timer);timer=setTimeout(render,ms)}
function init(){
  const file=$("csvFile");
  file?.addEventListener("change",e=>parseFile(e.target.files?.[0]));
  if(file?.files?.[0])parseFile(file.files[0]);
  document.addEventListener("change",e=>{if(["raceDate","raceName","fieldSize","grade","surface","distance","venue"].includes(e.target?.id))schedule(80)},true);
  document.addEventListener("input",e=>{if(["raceDate","fieldSize","oddsPaste"].includes(e.target?.id))schedule(120)},true);
  for(const event of ["finish600-ready","validated-queue-ready","m3-pure-ability-ready","decision-shell-v2-ready","production-decision-pipeline-ready","rsa-analysis-complete","mobile-opponent-analysis-ready","rsa-addons-ready"])
    window.addEventListener(event,()=>schedule(120));
  schedule(250);setTimeout(()=>schedule(),900);
}
window.MinetaPositionStudyV1={version:V,parseGrid,evaluate,render,schedule};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
