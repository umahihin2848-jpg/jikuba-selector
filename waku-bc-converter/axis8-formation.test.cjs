/* Run from repo root: node waku-bc-converter/axis8-formation.test.cjs */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const w={};for(const file of ["axis8-primary-v1.js","mobile-forecast-workflow-v1.js"])new Function("window",fs.readFileSync(path.join(__dirname,file),"utf8"))(w);
const C=w.RSAAxis8Core,F=w.RSAForecastWorkflowCoreV1;
let count=0;function test(name,condition){assert.ok(condition,name);count++}
for(const n of [12,16,18]){
 const rows=Array.from({length:n},(_,i)=>({no:String(i+1),name:"H"+(i+1),abilityRank:i+1,finishRank:i+1}));
 const x=C.compute({grade:"G3",field:n,surface:"芝",name:"test",ability:{ready:true,activeModel:"C",rows},finish:{ready:true,rows},odds:rows.map((h,i)=>h.no+" "+(i+2)).join("\n")});
 test("model",x.ready);
 const q={ready:true,generation:5,at:200,fieldSize:n,rows:rows.map((h,i)=>({...h,expectedRank:i+1,laneIdx:i%4,lane:["内ラチ","内","中","外"][i%4],validated:true,frontness5:.7,pursuitGrade:"A"}))};
 const r={ready:true,at:200,byNo:{[x.axis.no]:{name:x.axis.name,p10:.52}}},core={ready:true,generation:5,analysis:{pred:{p:[.1,.2,.4,.3]},pressure:"高"}},t={status:"ready",generation:5};
 let prev=0;
 for(const target of [.65,.75,.8,.9]){
  const sel=C.coverage(x.others,target,"w").filter(h=>h.selected),m=C.formation(x,sel,q,r,core,t,100),plot=F.formationSVG(m,"right");
  test("candidate sync",m.ready&&m.partners.join()===sel.map(h=>h.no).join()&&sel.length>=prev);
  test("map coloring",plot.known.length===n&&plot.unknown.length===0&&(plot.svg.match(/fill="#7358c5"/g)||[]).length===1&&(plot.svg.match(/fill="#0c968b"/g)||[]).length===sel.length);
  prev=sel.length;
 }
 const sel=C.coverage(x.others,.75).filter(h=>h.selected),qsel=C.coverage(x.others,.75,"q").filter(h=>h.selected);
 test("quinella ordering",C.formation(x,qsel,q,r,core,t,100).partners.join()===qsel.map(h=>h.no).join());
 test("reject generation mismatch",!C.formation(x,sel,{...q,generation:4},r,core,t,100).ready);
 test("reject stale queue",!C.formation(x,sel,{...q,at:99},r,core,t,100).ready);
 test("reject wrong names",!C.formation(x,sel,{...q,rows:q.rows.map((h,i)=>i===0?{...h,name:"別馬"}:h)},r,core,t,100).ready);
 test("reject missing row",!C.formation(x,sel,{...q,rows:q.rows.slice(1)},r,core,t,100).ready);
 test("reject running",!C.formation(x,sel,q,r,core,{...t,status:"running"},100).ready);
 test("do not draw unknown position",F.formationSVG(C.formation(x,sel,{...q,rows:q.rows.map((h,i)=>i===2?{...h,validated:false}:h)},r,core,t,100),"left").unknown.length===1);
 const m=C.formation({...x,tier:"C"},sel,q,r,core,t,100);
 test("C reference only / P10 independent",m.referenceOnly&&m.p10===.52&&x.tier===C.rank(x.calibrated[2]));
 test("hide stale P10",C.formation(x,sel,q,{...r,at:99},core,t,100).p10===null);
}
test("direction",F.turnForVenue("東京","芝",1600,"")==="left"&&F.turnForVenue("中山","芝",1600,"")==="right"&&F.turnForVenue("新潟","芝",1000,"")==="straight");
console.log(count+" formation assertions passed");
