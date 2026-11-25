(function(root){"use strict";
const version="four-model-pattern-v1",norm=v=>String(v??"").normalize("NFKC").trim(),valid=(v,n)=>Number.isInteger(v)&&v>=1&&v<=n;
const names={"0000":"全モデルTOP3圏外","0001":"改良末脚のみ浮上型","0010":"旧末脚のみ上位型","0011":"末脚一致型","0100":"Cのみ上位型","0101":"二重浮上型","0110":"C浮上・末脚低下型","0111":"C浮上・末脚一致型","1000":"V1のみ上位型","1001":"C低下・末脚浮上型","1010":"二重低下型","1011":"C低下・末脚一致型","1100":"基礎能力一致型","1101":"基礎能力一致・末脚浮上型","1110":"末脚低下型","1111":"全モデル一致型"};
function boundaryClear(rows,score,rank,n,eps){
 if(rows.length!==n||rows.some(h=>!Number.isFinite(h[score])||!valid(h[rank],n)))return false;
 const top=rows.filter(h=>h[rank]<=3),rest=rows.filter(h=>h[rank]>3);
 if(top.length!==3||rest.length!==n-3)return false;
 return top.every(a=>rest.every(b=>Math.abs(a[score]-b[score])>eps));
}
function classify(ranks){if(!Array.isArray(ranks)||ranks.length!==4||ranks.some(v=>!valid(v,18)))return null;const code=ranks.map(v=>v<=3?"1":"0").join("");return {code,label:names[code],abilityDelta:ranks[0]-ranks[1],closingDelta:ranks[2]-ranks[3]};}
function compute(roster,ability,closing,meta){
 const n=roster.length,a=ability?.rows||[],b=closing?.rows||[],am=new Map(a.map(h=>[String(h.no),h])),bm=new Map(b.map(h=>[String(h.no),h]));
 const same=(h,x)=>!!x&&norm(x.name)===norm(h.name),fresh=ability?.ready===true&&Number.isFinite(ability.at)&&ability.at>=meta.started;
 const aok=fresh&&a.length===n&&am.size===n&&roster.every(h=>same(h,am.get(String(h.no))));
 const cAvailable=aok&&/^G[123]$/.test(meta.grade)&&ability.activeModel==="C"&&ability.abilityC?.active===true;
 const bok=closing?.ready===true&&b.length===n&&bm.size===n&&roster.every(h=>same(h,bm.get(String(h.no))));
 const full=bok&&closing.eligible===n;
 const vclear=cAvailable&&boundaryClear(a,"v1Logit","v1Rank",n,1e-12),cclear=cAvailable&&!ability.top3BoundaryAmbiguous&&boundaryClear(a,"logit","abilityRank",n,1e-12);
 const bclear=full&&boundaryClear(b,"baseScore","baseRank",n,1e-8),sclear=full&&boundaryClear(b,"shadowScore","shadowRank",n,1e-8);
 const ready=vclear&&cclear&&bclear&&sclear;
 const reason=ready?"":!cAvailable?"Ability Cが有効な重賞のみ分類（V1代用なし）":!full?"参考M3の全頭有効履歴・照合待ち":"TOP3境界の同点またはスコア未確定：分類保留";
 const rows=roster.map(h=>{const ar=am.get(String(h.no)),br=bm.get(String(h.no)),get=(ok,v)=>ok&&valid(v,n)?v:null;
 const ranks=[get(aok,ar?.v1Rank),get(cAvailable,ar?.abilityRank),get(full,br?.baseRank),get(full,br?.shadowRank)];
 const p=ready?classify(ranks):null;
 return {no:String(h.no),name:h.name,ranks,productionM3:get(true,h.mr),code:p?.code??null,label:p?.label??null,abilityDelta:p?.abilityDelta??null,closingDelta:p?.closingDelta??null};});
 return {version,ready,reason,scope:"runtime V1/C + frozen reference base/shadow M3",closingVersion:closing?.version??null,field:n,rows,byNo:Object.fromEntries(rows.map(h=>[h.no,h]))};
}
root.RSAFourModelPatternV1=Object.freeze({version,names:Object.freeze(names),classify,compute});
})(typeof window!=="undefined"?window:globalThis);