/* Graded Pair -> one research-only Ability v1 axis candidate.
 * Never mutates DecisionShell / ProductionDecisionPipeline purchase gates.
 * Use the frozen v1 logit on the original C rows (not the C-adjusted logit).
 */
(function(root){'use strict';
const VERSION='grade-pair-v1-axis-v1.0',TIE_EPS=1e-12,MIN_HISTORY=3;
const numeric=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
const grade=v=>String(v??'').normalize('NFKC').trim().toUpperCase();
const blank=(status,reason,applicable=false)=>({ready:true,version:VERSION,applicable,status,reason,axis:null,other:null,betEligible:false,productionApplied:false,researchOnly:true});
function select(structure,ability,gradeValue){
 const s=structure||{},g=grade(gradeValue);
 if(!['G1','G2','G3'].includes(g)||s.kind!=='double'||s.code!=='double')return blank('not_applicable','重賞のC1位を含むPair型のみ対象');
 if(!ability?.ready||ability.activeModel!=='C')return blank('hold','Ability Cが未成立です',true);
 const cs=s.candidates||[];
 if(cs.length!==2||new Set(cs.map(c=>String(c.no))).size!==2||!cs.some(c=>numeric(c.ar)===1))
   return blank('hold','C1位を含む2頭のPair構造を確認できません',true);
 const byNo=ability.byNo||Object.fromEntries((ability.rows||[]).map(r=>[String(r.no),r]));
 const pair=cs.map(c=>{
   const row=byNo[String(c.no)];
   return row?{no:String(c.no),name:String(row.name||c.name||''),cRank:numeric(c.ar),m3Rank:numeric(c.m3),
     v1Rank:numeric(row.v1Rank),v1Score:numeric(row.v1Logit),histN:numeric(row.jraHistN??row.histN)}:null;
 });
 if(pair.some(r=>!r||!Number.isFinite(r.v1Score)||!Number.isFinite(r.histN)))
   return blank('hold','v1スコアまたは過去走が不足しています',true);
 if(pair.some(r=>r.histN<MIN_HISTORY))
   return blank('hold','Pair2頭のいずれかがJRA対象過去走3走未満のため、v1で軸を確定しません',true);
 const gap=pair[0].v1Score-pair[1].v1Score;
 if(Math.abs(gap)<=TIE_EPS)return blank('hold','Ability v1の2頭が同点のため軸を確定しません',true);
 const axis=gap>0?pair[0]:pair[1],other=gap>0?pair[1]:pair[0];
 return{ready:true,version:VERSION,applicable:true,status:'selected',reason:'Pair2頭のAbility v1スコアで1頭を選択（研究専用）',
   axis,other,scoreGap:Math.abs(gap),minHistory:MIN_HISTORY,betEligible:false,productionApplied:false,researchOnly:true};
}
root.GradePairV1AxisV1=Object.freeze({version:VERSION,select});
})(typeof window!=='undefined'?window:globalThis);
