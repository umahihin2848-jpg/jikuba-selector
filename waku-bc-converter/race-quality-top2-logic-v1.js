(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.RaceQualityTop2LogicV1=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const VERSION='race-quality-top2-logic-v1.0.0';
  const N=x=>(x===null||x===undefined||x==='')?NaN:Number(x);
  const known=(v,bad)=>typeof v==='string'&&v!==bad;
  function fit(row,scenario){
    if(!row||row.level==='unknown'||!Number.isFinite(N(row.expectedRank))||!Number.isInteger(N(row.lane)))return null;
    const lane=N(row.lane),inner=lane<=1,outer=lane>=2,front=row.front===true,rear=row.rear===true;
    const notes=[];let score=0;
    const add=(value,positive,negative)=>{score+=value;if(value>0)notes.push('＋'+positive);else if(value<0)notes.push('−'+negative)};
    switch(scenario.lateral){
      case 'outer_loss':add(inner?1:outer?-1:0,'内側で距離ロス軽減','外回しの距離ロス');break;
      case 'inner_slow':add(outer?1:inner?-1:0,'内荒れ回避','内の伸びにくさ');break;
      case 'flat':break;
      default:return null;
    }
    switch(scenario.longitudinal){
      case 'front_holds':add(front?1:rear?-1:0,'前残りに位置が合う','後方から届きにくい');break;
      case 'natural_close':add(rear?1:0,'差を詰めやすい',null);break;
      case 'front_fades':add(rear?1:front?-1:0,'前の失速を利用','先行失速懸念');break;
      case 'even':break;
      default:return null;
    }
    if(scenario.lateral==='inner_slow'&&inner&&rear&&N(row.blockers)>=2){score-=1;notes.push('−内差しの進路確保懸念')}
    if(row.level==='strong'){score-=1;notes.push('−強い複合注意')}
    return{score,notes:notes.length?notes:['明確な適合差なし（市場順位を優先）']};
  }
  function rank(rows,scenario){
    const x=Array.isArray(rows)?rows:[];
    const v=scenario||{};
    if(!known(v.lateral,'unknown')||!known(v.longitudinal,'unknown')||v.confidence==='low')
      return{ready:false,reason:'内外・前後の両判断と確信度（中以上）が必要',top2:null,ranked:[]};
    const eligible=x.filter(r=>Number.isFinite(N(r.pop))&&N(r.pop)<=9&&Number.isFinite(N(r.odds))&&N(r.odds)<40)
      .map(r=>({row:r,fit:fit(r,v)})).filter(x=>x.fit!==null);
    if(eligible.length<2)return{ready:false,reason:'必要な過去走・走行位置・単勝オッズがある候補が2頭未満',top2:null,ranked:[]};
    eligible.sort((a,b)=>b.fit.score-a.fit.score||N(a.row.pop)-N(b.row.pop)||N(a.row.odds)-N(b.row.odds)||N(a.row.no)-N(b.row.no));
    const ranked=eligible.map((x,i)=>({no:String(Number(x.row.no)),score:x.fit.score,rank:i+1,reasons:x.fit.notes,pop:N(x.row.pop)}));
    return{ready:true,version:VERSION,top2:ranked.slice(0,2).map(r=>r.no),ranked,
      reason:'レース質への適合段階→単勝人気の順で相対比較。点数は未較正で好走確率ではない',productionImpact:false};
  }
  return{version:VERSION,fit,rank};
});
