/* Race skip gate v1.0 - purchase-scope + strict CORE 1/2 x M3 top3. */
(()=>{"use strict";
if(window.RaceSkipLockV1)return;
const $=id=>document.getElementById(id),d=document.documentElement;
const raceGateDecision=function raceGateDecision(x) {
  const r=x||{}, name=String(r.name||"").normalize("NFKC").trim(), grade=String(r.grade||"").normalize("NFKC").toUpperCase().trim(), field=Number(r.field);
  const excluded=/スプリンターズ|中山記念|スワン(?:ステークス|S)|京都新聞|京成杯(?:オータム|AH|A\.H\.)|函館記念|中山牝馬|フェアリー/.test(name);
  if ((name&&(/障害|ジャンプ|J-G[123]|JG[123]/i.test(name)||excluded))|| (grade&& !/^(G1|G2|G3)$/.test(grade)) || (Number.isInteger(field)&&field>=1&&field<12)) return "skip";
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
 const next=raceGateDecision(read()),card=ensureCard();
 d.dataset.raceGate=next;
 if(card){
  card.hidden=next!=="skip"&&next!=="checking";
  const t=next==="skip"?"見送り":next==="checking"?"判定中…":"";
  if(card.textContent!==t)card.textContent=t;
 }
 status=next;
 window.RaceSkipLockV1State={status:next,blocked:next!=="open",updatedAt:Date.now()};
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
window.RaceSkipLockV1={version:"1.0.0",evaluate:raceGateDecision,refresh:render};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});
else render();
})();