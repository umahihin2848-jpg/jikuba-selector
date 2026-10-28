(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.VNextAxisCoreV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
  const VERSION='vnext-axis-core-v1.0';
  const finite=v=>Number.isFinite(Number(v));
  const num=v=>{const x=Number(v);return Number.isFinite(x)?x:NaN};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
  const normSurface=s=>String(s||'').includes('ダ')?'ダ':'芝';
  const normGrade=g=>{const s=String(g||'').toUpperCase().trim();return ['G1','G2','G3'].includes(s)?s:s;};
  function marketShares(odds, horseNos){
    const nos=(horseNos||Object.keys(odds||{})).map(String);
    const inv=[];
    for(const no of nos){const o=num(odds?.[no]??odds?.[Number(no)]);if(!(o>0))return{ready:false,error:`missing odds ${no}`};inv.push([no,1/o]);}
    const sum=inv.reduce((s,x)=>s+x[1],0);if(!(sum>0))return{ready:false,error:'invalid odds sum'};
    const byNo={};for(const [no,v] of inv){const p=v/sum;byNo[no]={share:p,logit:Math.log(p/(1-p))};}
    return{ready:true,byNo,sum:1};
  }
  function rankPct(rank, field){const r=num(rank),N=num(field);return Number.isFinite(r)&&N>1?clamp((N-r)/(N-1),0,1):NaN;}
  function makeFeatures(row){
    const N=num(row.field),share=num(row.market_share);
    return{
      abp3_wf:num(row.abp3_wf),
      ab_rank_pct:finite(row.ab_rank_pct)?num(row.ab_rank_pct):rankPct(row.abRank_wf,N),
      m3_rank_pct:finite(row.m3_rank_pct)?num(row.m3_rank_pct):rankPct(row.m3Rank_wf,N),
      m3score_wf:num(row.m3score_wf),
      market_logit:finite(row.market_logit)?num(row.market_logit):(share>0&&share<1?Math.log(share/(1-share)):NaN),
      pred_front:num(row.pred_front),
      hist_n:num(row.hist_n),
      field:N,
      distance:num(row.distance),
      grade:normGrade(row.grade),
      surface:normSurface(row.surface)
    };
  }
  function scoreFeatures(f, model){
    if(!model)return{ready:false,error:'model missing'};
    let z=num(model.intercept);if(!Number.isFinite(z))return{ready:false,error:'bad intercept'};
    for(const k of model.numeric_features||[]){
      const v=num(f[k]);if(!Number.isFinite(v))return{ready:false,error:`missing ${k}`};
      const mu=num(model.numeric_scaler?.mean?.[k]),sc=num(model.numeric_scaler?.scale?.[k]),b=num(model.coefficients?.[`num__${k}`]);
      if(!Number.isFinite(mu)||!(sc>0)||!Number.isFinite(b))return{ready:false,error:`bad model ${k}`};
      z+=b*((v-mu)/sc);
    }
    for(const k of model.categorical_features||[]){
      const val=String(f[k]??'');
      const b=num(model.coefficients?.[`cat__${k}_${val}`]);if(Number.isFinite(b))z+=b;
    }
    return{ready:true,logit:z,score:sigmoid(z)};
  }
  function tier(score, model){
    const s=num(score),t=model?.tier_thresholds||{};if(!Number.isFinite(s))return null;
    if(s>=num(t.B_A))return'A';if(s>=num(t.C_B))return'B';if(s>=num(t.D_C))return'C';return'D';
  }
  function scoreRow(row, model){const features=makeFeatures(row);const r=scoreFeatures(features,model);return{...r,features,tier:r.ready?tier(r.score,model):null};}
  function scoreRace(rows, model){
    const scored=(rows||[]).map(r=>({...r,_axis:scoreRow(r,model)}));
    const valid=scored.filter(r=>r._axis.ready);if(!valid.length)return{ready:false,rows:scored,error:'no scorable runners'};
    valid.sort((a,b)=>b._axis.score-a._axis.score||Number(a.horse_no)-Number(b.horse_no));
    const best=valid[0];return{ready:true,rows:scored,axis:{no:String(best.horse_no),name:String(best.horse||''),score:best._axis.score,tier:best._axis.tier,features:best._axis.features}};
  }
  function chooseModel(models, queueComplete){return queueComplete?models?.full_reference:models?.fallback_reference;}
  return{VERSION,marketShares,rankPct,makeFeatures,scoreFeatures,tier,scoreRow,scoreRace,chooseModel,normSurface,normGrade};
});
