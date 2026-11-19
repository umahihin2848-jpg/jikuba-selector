/* Race skip gate: JRA flat 3-win+ 12-18 runners; 3-win/OP/L one Ability Top3 x M3 Top3 match only, without extra popularity/frontness gates. */
(()=>{"use strict";
if(window.RaceSkipLockV1)return;
const $=id=>document.getElementById(id),d=document.documentElement;
const raceGateDecision=function raceGateDecision(x) {
  const r=x||{}, name=String(r.name||"").normalize("NFKC").trim(), grade=String(r.grade||"").normalize("NFKC").toUpperCase().trim(), surface=String(r.surface||"").normalize("NFKC").trim(), field=Number(r.field);
  // Model scope and visible scope are intentionally identical.
  // Do not hard-exclude named graded races: let the verified axis gate decide.
  const isObstacle=/障害|ジャンプ|J[- ]?G[123]/i.test(name);
  const eligibleGrade=/^(3勝|OP|L|G1|G2|G3)$/.test(grade);
  // Incomplete form state must not be counted as a race skipped for poor axis quality.
  if (!grade||!r.venue||!Number.isInteger(field)||field<1||!surface)return "idle";
  // A known invalid field/class/obstacle/surface is out of scope and must fail closed.
  const flat=/^(芝|ダ|ダート)$/.test(surface);
  if (isObstacle||!eligibleGrade||!flat||field<12||field>18)return "skip";
  if (!r.requested) return "idle";
  const a=r.ability,f=r.finish,at=Number(r.requestedAt)||0;
  if (!a?.ready||!f?.ready||!a.at||!f.at||Number(a.at)<at||Number(f.at)<at) return "checking";
  if (!Array.isArray(a.rows)||!Array.isArray(f.rows)||a.rows.length!==field||f.rows.length!==field) return "checking";
  if (['G1','G2','G3'].includes(grade) && a.activeModel!=='C') return "checking";
  const core=a.rows.filter(h=>Number(h.abilityRank)===1||Number(h.abilityRank)===2);
  if (core.length!==2||a.leaderAmbiguous||core.some(h=>Number(h.abilityTieStart)<=2&&Number(h.abilityTieEnd)>2)) return "skip";
  const m3=new Set(f.rows.filter(h=>Number(h.finishRank)>=1&&Number(h.finishRank)<=3).map(h=>String(Number(h.no))));
  if(m3.size!==3||core.some(h=>!Number.isInteger(Number(h.no)))) return "checking";
  // 3-win/OP/L use one structural overlap only; Pair remains a research/skip condition.
  if(['3勝','OP','L'].includes(grade)){
    const overlaps=a.rows.filter(h=>Number(h.abilityRank)>=1&&Number(h.abilityRank)<=3&&m3.has(String(Number(h.no))));
    if(overlaps.length!==1||Number(overlaps[0].abilityRank)>2)return "skip";
  }
  return core.some(h=>m3.has(String(Number(h.no))))?"open":"skip";
};
let requested=false,requestedAt=0,status="",dirty=false;
function diagnose(r,next){
  if(next!=="skip")return{kind:"",reason:next==="checking"?"AbilityとM3を照合中です":""};
  const name=String(r.name||"").normalize("NFKC"),grade=String(r.grade||"").normalize("NFKC").toUpperCase().trim(),field=Number(r.field);
  if(/障害|ジャンプ|J[- ]?G[123]/i.test(name))return{kind:"scope",reason:"障害レースは対象外です"};
  if(!/^(3勝|OP|L|G1|G2|G3)$/.test(grade)||field<12||field>18)return{kind:"scope",reason:"平地・3勝以上・12〜18頭という対象条件外です"};
  const a=r.ability||{},f=r.finish||{};
  if(a.leaderAmbiguous)return{kind:"axis",reason:"Ability首位が同点のため軸の信頼性を確定できません"};
  const core=(a.rows||[]).filter(h=>Number(h.abilityRank)===1||Number(h.abilityRank)===2);
  if(core.length!==2||core.some(h=>Number(h.abilityTieStart)<=2&&Number(h.abilityTieEnd)>2))
    return{kind:"axis",reason:"Ability上位2頭の境界が同点などで不明確なため軸なし"};
  const top3=new Set((f.rows||[]).filter(h=>Number(h.finishRank)>=1&&Number(h.finishRank)<=3).map(h=>String(Number(h.no))));
  if(['3勝','OP','L'].includes(grade)){
    const overlaps=(a.rows||[]).filter(h=>Number(h.abilityRank)>=1&&Number(h.abilityRank)<=3&&top3.has(String(Number(h.no))));
    if(overlaps.length!==1)return{kind:'axis',reason:(grade==='3勝'?'3勝クラス':'OP・L')+'は単独軸のみ購入候補。Ability上位3頭×M3上位3頭の一致が'+overlaps.length+'頭のため見送り'};
    if(Number(overlaps[0].abilityRank)>2)return{kind:'axis',reason:(grade==='3勝'?'3勝クラス':'OP・L')+'の単独一致がAbility3位のため見送り'};
  }
  const hit=core.filter(h=>top3.has(String(Number(h.no))));
  return{kind:"axis",reason:hit.length?"軸の安全条件を確認できませんでした":"Ability上位2頭とM3上位3頭が一致しないため、購入軸は見送り"};
}
function ensureCard(){
 let el=$("raceSkipCard");if(el)return el;
 const b=$("analyzeBtn");if(!b)return null;
 el=document.createElement("section");el.id="raceSkipCard";el.className="raceSkipCard";el.setAttribute("aria-live","polite");
 el.hidden=true;b.insertAdjacentElement("afterend",el);return el;
}
function read(){
 return {name:$("raceName")?.value,venue:$("venue")?.value,grade:$("grade")?.value,surface:$("surface")?.value,field:$("fieldSize")?.value,
 requested:requested||(!dirty&&window.RSAAnalysisTransitionState?.status==="ready"),
 requestedAt:requestedAt||(!dirty?Number(window.RSAAnalysisTransitionState?.startedWall)||0:0),
 ability:window.M3PureAbilityState,finish:window.Finish600State};
}
function render(){
 const r=read(),next=raceGateDecision(r),diagnostic=diagnose(r,next),card=ensureCard();
 d.dataset.raceGate=next;
 d.dataset.raceSkipKind=diagnostic.kind;
 if(card){
  card.hidden=next!=="skip"&&next!=="checking";
  const t=next==="skip"?((diagnostic.kind==="scope"?"対象外｜":"軸は見送り｜")+diagnostic.reason+(diagnostic.kind==="axis"?"。買い目・全馬分析は表示しません。":"")):next==="checking"?(/^(G1|G2|G3)$/.test(String(r.grade||"").toUpperCase())&&r.ability?.ready&&r.ability?.activeModel!=="C"?"Ability C未成立｜本番◎を保留中":"判定中…"):"";
  if(card.textContent!==t)card.textContent=t;
 }
 status=next;
 window.RaceSkipLockV1State={status:next,blocked:next!=="open",kind:diagnostic.kind,reason:diagnostic.reason,updatedAt:Date.now()};
}
function invalidate(){requested=false;requestedAt=0;dirty=true;render()}
document.addEventListener("input",e=>{
 if(["raceName","raceDate","venue","fieldSize","surface","distance","grade","going"].includes(e.target?.id))invalidate();
},true);
document.addEventListener("change",e=>{
 if(["raceName","raceDate","venue","fieldSize","surface","distance","grade","going","csvFile"].includes(e.target?.id))invalidate();
},true);
document.addEventListener("click",e=>{
 if(e.target?.id!=="analyzeBtn")return;
 requested=true;dirty=false;requestedAt=Number(window.RSAAnalysisTransitionState?.startedWall)||Date.now();render();
},true);
addEventListener("rsa-analysis-start",()=>{
 requested=true;dirty=false;requestedAt=Number(window.RSAAnalysisTransitionState?.startedWall)||Date.now();render();
});
["rsa-analysis-complete","m3-pure-ability-ready","finish600-ready","decision-shell-v2-ready","rsa-addons-ready"].forEach(ev=>addEventListener(ev,render));
window.RaceSkipLockV1={version:"1.4.0-input-scope-safe",evaluate:raceGateDecision,refresh:render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});
else render();
})();