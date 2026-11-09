/* Race skip gate v1.1 - JRA flat 3-win+ (including OP/L/G1-G3), 12+ runners, strict CORE 1/2 x M3 top3. */
(()=>{"use strict";
if(window.RaceSkipLockV1)return;
const $=id=>document.getElementById(id),d=document.documentElement;
const raceGateDecision=function raceGateDecision(x) {
  const r=x||{}, name=String(r.name||"").normalize("NFKC").trim(), grade=String(r.grade||"").normalize("NFKC").toUpperCase().trim(), field=Number(r.field);
  // Model scope and visible scope are intentionally identical.
  // Do not hard-exclude named graded races: let the verified axis gate decide.
  const isObstacle=/障害|ジャンプ|J[- ]?G[123]/i.test(name);
  const eligibleGrade=/^(3勝|OP|L|G1|G2|G3)$/.test(grade);
  if (isObstacle || (grade && !eligibleGrade) || (Number.isInteger(field)&&field>=1&&field<12)) return "skip";
  if (!name||!r.venue||!Number.isInteger(field)||field<1||field>18) return "idle";
  if (!r.requested) return "idle";
  const a=r.ability,f=r.finish,at=Number(r.requestedAt)||0;
  if (!a?.ready||!f?.ready||!a.at||!f.at||Number(a.at)<at||Number(f.at)<at) return "checking";
  if (!Array.isArray(a.rows)||!Array.isArray(f.rows)||a.rows.length!==field||f.rows.length!==field) return "checking";
  const core=a.rows.filter(h=>Number(h.abilityRank)===1||Number(h.abilityRank)===2);
  if (core.length!==2||a.leaderAmbiguous||core.some(h=>Number(h.abilityTieStart)<=2&&Number(h.abilityTieEnd)>2)) return "skip";
  const m3=new Set(f.rows.filter(h=>Number(h.finishRank)>=1&&Number(h.finishRank)<=3).map(h=>String(Number(h.no))));
  if(m3.size!==3||core.some(h=>!Number.isInteger(Number(h.no)))) return "checking";
  return core.some(h=>m3.has(String(Number(h.no))))?"open":"skip";
};
let requested=false,requestedAt=0,status="";
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
 return {name:$("raceName")?.value,venue:$("venue")?.value,grade:$("grade")?.value,field:$("fieldSize")?.value,
 requested,requestedAt,ability:window.M3PureAbilityState,finish:window.Finish600State};
}
function render(){
 const r=read(),next=raceGateDecision(r),diagnostic=diagnose(r,next),card=ensureCard();
 d.dataset.raceGate=next;
 d.dataset.raceSkipKind=diagnostic.kind;
 if(card){
  card.hidden=next!=="skip"&&next!=="checking";
  const t=next==="skip"?((diagnostic.kind==="scope"?"対象外｜":"軸は見送り｜")+diagnostic.reason+(diagnostic.kind==="axis"?"。診断結果は閲覧できますが、自動軸は採用しません。":"")):next==="checking"?"判定中…":"";
  if(card.textContent!==t)card.textContent=t;
 }
 status=next;
 window.RaceSkipLockV1State={status:next,blocked:next!=="open",kind:diagnostic.kind,reason:diagnostic.reason,updatedAt:Date.now()};
}
function invalidate(){requested=false;requestedAt=0;render()}
document.addEventListener("input",e=>{
 if(["raceName","raceDate","venue","fieldSize","surface","distance","grade","going"].includes(e.target?.id))invalidate();
},true);
document.addEventListener("change",e=>{
 if(["raceName","raceDate","venue","fieldSize","surface","distance","grade","going","csvFile"].includes(e.target?.id))invalidate();
},true);
document.addEventListener("click",e=>{
 if(e.target?.id!=="analyzeBtn")return;
 requested=true;requestedAt=Date.now();render();
},true);
["rsa-analysis-complete","m3-pure-ability-ready","finish600-ready","decision-shell-v2-ready","rsa-addons-ready"].forEach(ev=>addEventListener(ev,render));
window.RaceSkipLockV1={version:"1.2.0-skip-diagnostics",evaluate:raceGateDecision,refresh:render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});
else render();
})();