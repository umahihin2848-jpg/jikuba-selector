/* P3-70 experimental 3c/4c four-pack assignment; requires separately verified inputs.
   Research only. Never invokes Ability, official M3, P10 or betting code. */
(function(root){'use strict';
const VERSION='p370-stage-four-pack-shadow-20261123';
const finite=v=>v===null||v===undefined||v===''?NaN:Number(v);
const isNum=Number.isFinite;
const fieldBands=n=>{const cuts=[0,Math.ceil(.25*n),Math.ceil(.5*n),Math.ceil(.8*n),n];return cuts.slice(1).map((x,i)=>x-cuts[i])};
const label=['前方','好位','中団','後方'];
function features(rows,meta){
 const n=rows.length,field=finite(meta.distance),dirt=/^ダ/.test(String(meta.surface||''))?1:0;
 if(!isNum(field)||field<=0)return null;
 const first=rows.map(r=>finite(r.frontness5));
 if(first.some(x=>!isNum(x)||x<0||x>1))return null;
 return rows.map((r,i)=>{
  const no=Number(r.no),others=rows.filter((_,j)=>i!==j),front=first[i];
  const rivals=others.filter(x=>finite(x.frontness5)>front+1e-9);
  const faster=others.filter(x=>finite(x.frontness5)>.64);
  const X={n,distance:field,is_dirt:dirt,gate_frac:(no-1)/(n-1),hist_n:finite(r.hist_n),
   frontness5:front,frontness_std5:finite(r.earlyPosStd5),lead_rate5:finite(r.leadRate5),
   corner3Mean5:finite(r.corner3Mean5),corner4Mean5:finite(r.corner4Mean5),
   corner34DeltaMean5:finite(r.corner34DeltaMean5),corner3N5:finite(r.corner3N5),corner4N5:finite(r.corner4N5),
   peer_stronger:rivals.length,peer_inner_stronger:rivals.filter(x=>Number(x.no)<no).length,
   peer_relative:front-others.reduce((s,x)=>s+finite(x.frontness5),0)/(n-1),
   peer_front_count:faster.length,peer_near_fast:faster.filter(x=>Math.abs(Number(x.no)-no)<=3).length};
  return X;
 });
}
function predict(X,stage){
 const standard=stage.features.map((k,i)=>{
  const v=finite(X[k]),x=isNum(v)?v:Number(stage.median[i]);
  return(x-Number(stage.center[i]))/Number(stage.scale[i]);
 });
 const z=stage.intercept.map((bias,j)=>Number(bias)+stage.weights[j].reduce((s,w,i)=>s+Number(w)*standard[i],0));
 const shift=Math.max(...z),p=z.map(v=>Math.exp(v-shift)),sum=p.reduce((a,b)=>a+b,0);
 return p.map(x=>x/sum);
}
// Full-field constrained maximum-log-probability assignment via dynamic programming.
function assign(probs,seats){
 let states=new Map([['0,0,0,0',{score:0,path:[]}]]);
 for(let i=0;i<probs.length;i++){
  const next=new Map();
  for(const [key,value]of states){
   const counts=key.split(',').map(Number);
   for(let k=0;k<4;k++){
    if(counts[k]>=seats[k])continue;
    const n=counts.slice();n[k]++;const signature=n.join(',');
    const v=value.score+Math.log(Math.max(1e-12,probs[i][k]));
    if(!next.has(signature)||v>next.get(signature).score+1e-12)
      next.set(signature,{score:v,path:value.path.concat(k)});
   }
  }
  states=next;
 }
 return states.get(seats.join(','))?.path||null;
}
function assess(queue,meta,model,options={}){
 if(model?.schema!=='p3-70-corner-group-probability-shadow-v1'||!model.researchOnly)return{ready:false,reason:'model_version_missing'};
 if(options.csvParserVersion!==model.requiresCsvParserVersion)return{ready:false,reason:'deduplicated_history_required'};
 if(options.actualNumbersVerified!==true)return{ready:false,reason:'actual_horse_numbers_not_verified'};
 const rows=Array.isArray(queue?.rows)?queue.rows.slice().sort((a,b)=>Number(a.no)-Number(b.no)):[];
 const n=rows.length;if(!queue.ready||n<12||n>18||n!==Number(queue.fieldSize))return{ready:false,reason:'full_field_required'};
 if(rows.some(r=>!r.validated||finite(r.hist_n)<3||!r.name||!Number.isInteger(Number(r.no))||Number(r.no)<1||Number(r.no)>18))return{ready:false,reason:'history_or_race_number_invalid'};
 if(new Set(rows.map(x=>x.no)).size!==n||new Set(rows.map(x=>x.name)).size!==n)return{ready:false,reason:'duplicate_numbers_or_names'};
 if(meta.distance==null||meta.surface==null)return{ready:false,reason:'race_metadata_missing'};
 const xs=features(rows,meta);if(!xs)return{ready:false,reason:'features_missing'};
 const seatCount=fieldBands(n),out={ready:true,version:VERSION,researchOnly:true,calibratedForLive:false,
  trainingYear:2023,previouslyExploredYears:[2024,2025,2026],
  warning:'3角・4角の4群研究モデル。馬番を正確に照合した場合のみ使用。未知年度への予測較正未完了。GPSレーンや移動経路は表さず、本番M3/馬券には使用しない。',
  fieldSize:n,seats:seatCount,stages:{},rows:rows.map((r,i)=>({no:String(r.no),name:String(r.name),inputFeatures:xs[i]}))};
 for(const stageName of ['c3','c4']){
  const stage=model.stages?.[stageName];if(!stage)return{ready:false,reason:'model_stage_missing'};
  const probs=xs.map(x=>predict(x,stage));
  const chosen=assign(probs,seatCount);if(!chosen)return{ready:false,reason:'group_assignment_failed'};
  out.stages[stageName]={seatCount,rows:rows.map((r,i)=>({no:String(r.no),name:String(r.name),probabilities:probs[i],groupIndex:chosen[i],representativeGroup:label[chosen[i]],representativeShare:probs[i][chosen[i]]}))};
 }
 return out;
}
root.RSACornerGroupShadowV1=Object.freeze({version:VERSION,features,predict,assess,fieldBands,assign,productionImpact:false});
})(typeof window!=='undefined'?window:globalThis);
