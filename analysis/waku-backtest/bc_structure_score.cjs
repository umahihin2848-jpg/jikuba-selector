const fs=require('fs'),path=require('path');
const DIR='analysis/waku-backtest/bc-score-merge',CAP=50;
const pair=(a,b)=>{a=+a;b=+b;return a<=b?a+'-'+b:b+'-'+a};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function median(a){const x=a.filter(Number.isFinite).slice().sort((p,q)=>p-q);if(!x.length)return 1;const m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2}
function boundary(runners){
 const rs=runners.slice().sort((a,b)=>a.pop-b.pop),n=rs.length;if(n<2)return{end:Math.min(10,n),boundary:null};
 const inv=rs.map(x=>1/x.win),tot=inv.reduce((s,x)=>s+x,0),p=inv.map(x=>x/tot),share=k=>p.slice(0,Math.min(k,n)).reduce((s,x)=>s+x,0),wall=k=>k>=1&&k<n?rs[k].win/rs[k-1].win:null;
 const cand=[];for(let k=3;k<=Math.min(8,n-1);k++){const ratio=wall(k),near=[];for(let j=Math.max(1,k-2);j<=Math.min(n-1,k+2);j++)if(j!==k)near.push(wall(j));const base=median(near),prom=base>0?ratio/base:1,cum=share(k);
  const ss=clamp((cum-.55)/(.88-.55),0,1),ws=clamp((ratio-1.04)/(1.58-1.04),0,1),ps=clamp((prom-1)/(1.4-1),0,1),cs=clamp(1-(k-3)/(8-3),0,1),score=100*(.4*ss+.3*ws+.2*ps+.1*cs),eligible=cum>=.55&&score>=57&&(ratio>=1.10||prom>=1.08);cand.push({k,score,eligible,share:cum,wall:ratio,prom})}
 const ok=cand.filter(x=>x.eligible).sort((a,b)=>b.score-a.score||a.k-b.k);return{end:ok[0]?.k||Math.min(10,n),boundary:ok[0]||null}
}
function plTop2(horses){
 const W=horses.reduce((s,h)=>s+h.w,0),out=new Map;
 for(let i=0;i<horses.length;i++){const wi=horses[i].w;let p=wi/W;for(let j=0;j<horses.length;j++)if(j!==i){const wj=horses[j].w;p+=(wj/W)*(wi/(W-wj))}out.set(horses[i].horse,p)}
 return out
}
function axisSet(r){
 const fr=boundary(r.horses),cand=r.horses.filter(h=>h.pop<=fr.end),top2=plTop2(r.horses),groups={};for(const h of r.horses)(groups[h.frame]??=[]).push(h);
 const scored=cand.map(h=>{const den=groups[h.frame].reduce((s,x)=>s+x.w,0),rep=den?h.w/den:0,t2=top2.get(h.horse)||0;return{...h,frameRep:rep,top2:t2,axisScore:rep*t2}}).sort((a,b)=>b.axisScore-a.axisScore||a.pop-b.pop);
 if(!scored.length)return{fr,axes:[]};const a1=scored[0],a2=scored.find(x=>x.frame!==a1.frame)||scored[1];return{fr,axes:[a1,a2].filter(Boolean)}
}
function qMap(r){return new Map((r.ur||[]).map(([k,v])=>[k,v]))}
function ticketsOf(gs){const m=new Map;for(const g of gs)for(const t of g.tickets)m.set(t.key,t);return[...m.values()]}
function build(r){
 const {fr,axes}=axisSet(r);if(axes.length<2)return null;
 const qm=qMap(r),fieldW=r.horses.reduce((s,h)=>s+h.w,0),axisFrames=new Set(axes.map(a=>a.frame)),byOpp=new Map(),core=[],target=r.frames.filter(x=>x.rank>=3&&x.rank<=14);
 const targetInv=target.reduce((s,x)=>s+1/x.odds,0),allFrameInv=r.frames.reduce((s,x)=>s+1/x.odds,0);
 for(const f of target){
   const [fa,fb]=f.pair.split('-').map(Number),links=axes.filter(a=>a.frame===fa||a.frame===fb);if(!links.length)continue;
   if(fa!==fb&&axisFrames.has(fa)&&axisFrames.has(fb)){core.push({framePair:f.pair,frameRank:f.rank,frameOdds:f.odds,links});continue}
   for(const ax of links){const opp=ax.frame===fa?fb:fa,key=String(opp),g=byOpp.get(key)||{oppFrame:opp,links:[]};if(!g.links.some(z=>z.axisHorse===ax.horse&&z.framePair===f.pair))g.links.push({axisHorse:ax.horse,axisFrame:ax.frame,framePair:f.pair,frameRank:f.rank,frameOdds:f.odds});byOpp.set(key,g)}
 }
 const mkTickets=(links,oppFrame)=>{const m=new Map;for(const l of links){const ax=axes.find(a=>a.horse===l.axisHorse);for(const h of r.horses.filter(x=>x.frame===oppFrame&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)m.set(k,{key:k,odds:q.odds,axisHorse:ax.horse,oppFrame})}}return[...m.values()]};
 const groups=[];
 for(const g of byOpp.values()){
   const hs=r.horses.filter(x=>x.frame===g.oppFrame),den=hs.reduce((s,x)=>s+x.w,0),oppSupport=fieldW?den/fieldW:0,oppRep=den?Math.max(...hs.map(x=>x.w))/den:0,tickets=mkTickets(g.links,g.oppFrame),minRank=Math.min(...g.links.map(x=>x.frameRank));
   if(!tickets.length)continue;groups.push({type:'opp',oppFrame:g.oppFrame,tickets,minRank,oppSupport,oppRep,weak:(minRank>=11||oppSupport<.05),framePairs:[...new Set(g.links.map(x=>x.framePair))]})
 }
 if(core.length){
   const tickets=new Map;for(const c of core){const [fa,fb]=c.framePair.split('-').map(Number);for(const ax of axes.filter(a=>a.frame===fa||a.frame===fb)){const opp=ax.frame===fa?fb:fa;for(const h of r.horses.filter(x=>x.frame===opp&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)tickets.set(k,{key:k,odds:q.odds,axisHorse:ax.horse,oppFrame:opp})}}}
   if(tickets.size)groups.push({type:'core',oppFrame:null,tickets:[...tickets.values()],minRank:Math.min(...core.map(x=>x.frameRank)),oppSupport:0,oppRep:1,weak:false,framePairs:core.map(x=>x.framePair)})
 }
 const kept=groups.filter(g=>!g.weak),removed=groups.filter(g=>g.weak),tickets=ticketsOf(kept);if(!tickets.length)return null;
 const burden=tickets.reduce((s,t)=>s+1/t.odds,0),composite=burden?1/burden:null,actual=pair(r.first.horse,r.second.horse),hit=tickets.some(t=>t.key===actual),q=qm.get(actual);
 const linked=new Set(kept.flatMap(g=>g.framePairs)),rawLinked=new Set(groups.flatMap(g=>g.framePairs));
 const bcCoverage=targetInv?target.filter(f=>linked.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0,bcRawCoverage=targetInv?target.filter(f=>rawLinked.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0;
 const removedBurden=ticketsOf(removed).reduce((s,t)=>s+1/t.odds,0),allBurden=ticketsOf(groups).reduce((s,t)=>s+1/t.odds,0);
 const zoneMass=allFrameInv?targetInv/allFrameInv:0,axisQuality=Math.sqrt(Math.max(axes[0].axisScore,0)*Math.max(axes[1].axisScore,0));
 return{id:r.id,year:r.year,raceNo:r.raceNo,fr,axes,groups,kept,removed,tickets,hit,points:tickets.length,composite,eqReturn:hit&&q?q.odds:0,dutchReturn:hit&&composite?composite:0,
  c:{zoneMass,bcCoverage,bcRawCoverage,axisQuality,axis1Rep:axes[0].frameRep,axis2Rep:axes[1].frameRep,weakBurdenShare:allBurden?removedBurden/allBurden:0,points:tickets.length,composite}}
}
function percentile(sorted,v){if(!sorted.length)return .5;let lo=0,hi=sorted.length;while(lo<hi){const m=(lo+hi)>>1;if(sorted[m]<=v)lo=m+1;else hi=m}return lo/sorted.length}
function transparentScorer(train){
 const keys=['zoneMass','bcCoverage','axisQuality','axisRep','weakBurdenShare','points','composite'],d={};
 d.zoneMass=train.map(r=>r.c.zoneMass).sort((a,b)=>a-b);d.bcCoverage=train.map(r=>r.c.bcCoverage).sort((a,b)=>a-b);d.axisQuality=train.map(r=>r.c.axisQuality).sort((a,b)=>a-b);
 d.axisRep=train.map(r=>Math.min(r.c.axis1Rep,r.c.axis2Rep)).sort((a,b)=>a-b);d.weakBurdenShare=train.map(r=>r.c.weakBurdenShare).sort((a,b)=>a-b);d.points=train.map(r=>r.c.points).sort((a,b)=>a-b);d.composite=train.map(r=>r.c.composite).sort((a,b)=>a-b);
 return r=>{
   const parts={
    zone:percentile(d.zoneMass,r.c.zoneMass),
    coverage:percentile(d.bcCoverage,r.c.bcCoverage),
    axis:percentile(d.axisQuality,r.c.axisQuality),
    representative:percentile(d.axisRep,Math.min(r.c.axis1Rep,r.c.axis2Rep)),
    weak:1-percentile(d.weakBurdenShare,r.c.weakBurdenShare),
    cost:1-percentile(d.points,r.c.points),
    price:percentile(d.composite,r.c.composite)
   };
   const score=100*Object.values(parts).reduce((s,x)=>s+x,0)/Object.keys(parts).length;return{score,parts}
 }
}
const LF=['zoneMass','bcCoverage','axisQuality','axis1Rep','axis2Rep','weakBurdenShare','points','logComposite'];
function lv(r){return[r.c.zoneMass,r.c.bcCoverage,r.c.axisQuality,r.c.axis1Rep,r.c.axis2Rep,r.c.weakBurdenShare,r.c.points,Math.log(Math.max(r.c.composite,1))]}
function fitLogistic(train){
 const X=train.map(lv),y=train.map(r=>r.hit?1:0),m=LF.length,mean=Array(m).fill(0),sd=Array(m).fill(0);
 for(const x of X)for(let j=0;j<m;j++)mean[j]+=x[j]/X.length;
 for(const x of X)for(let j=0;j<m;j++)sd[j]+=(x[j]-mean[j])**2/X.length;for(let j=0;j<m;j++)sd[j]=Math.sqrt(sd[j])||1;
 const Z=X.map(x=>[1,...x.map((v,j)=>(v-mean[j])/sd[j])]),w=Array(m+1).fill(0),lr=.03,lambda=2;
 for(let it=0;it<4000;it++){const g=Array(m+1).fill(0);for(let i=0;i<Z.length;i++){let z=0;for(let j=0;j<w.length;j++)z+=w[j]*Z[i][j];const p=1/(1+Math.exp(-clamp(z,-25,25))),e=p-y[i];for(let j=0;j<w.length;j++)g[j]+=e*Z[i][j]/Z.length}for(let j=1;j<w.length;j++)g[j]+=lambda*w[j]/Z.length;for(let j=0;j<w.length;j++)w[j]-=lr*g[j]}
 const pred=r=>{const x=lv(r),z=[1,...x.map((v,j)=>(v-mean[j])/sd[j])];let s=0;for(let j=0;j<w.length;j++)s+=w[j]*z[j];return 1/(1+Math.exp(-clamp(s,-25,25)))};
 const trainPred=train.map(pred).sort((a,b)=>a-b);return{w,mean,sd,pred,score:r=>100*percentile(trainPred,pred(r))}
}
function metric(a){const n=a.length,h=a.filter(x=>x.hit).length,pts=a.reduce((s,x)=>s+x.points,0),eq=a.reduce((s,x)=>s+x.eqReturn,0),du=a.reduce((s,x)=>s+x.dutchReturn,0);return{n,hits:h,hitRate:n?h/n:null,avgPoints:n?pts/n:null,avgComposite:n?a.reduce((s,x)=>s+x.composite,0)/n:null,equalROI:pts?eq/pts:null,dutchROI:n?du/n:null}}
function bandRows(rows,key){return[[0,20],[20,40],[40,60],[60,80],[80,101]].map(([lo,hi])=>{const a=rows.filter(r=>r[key]>=lo&&r[key]<hi);return{band:lo+'〜'+(hi===101?'100':hi),...metric(a),avgScore:a.length?a.reduce((s,x)=>s+x[key],0)/a.length:null}})}
function cutRows(rows,key){return[50,60,70,80,90].map(c=>{const a=rows.filter(r=>r[key]>=c);return{cut:c,...metric(a)}})}
function spearmanBins(bins,field){const a=bins.filter(x=>x.n>0&&x[field]!=null);if(a.length<3)return null;const x=a.map((_,i)=>i+1),y=a.map(z=>z[field]);function ranks(v){const ord=v.map((z,i)=>({z,i})).sort((a,b)=>a.z-b.z),r=Array(v.length);for(let i=0;i<ord.length;){let j=i+1;while(j<ord.length&&ord[j].z===ord[i].z)j++;const avg=(i+1+j)/2;for(let k=i;k<j;k++)r[ord[k].i]=avg;i=j}return r}const rx=ranks(x),ry=ranks(y),mx=rx.reduce((s,z)=>s+z,0)/rx.length,my=ry.reduce((s,z)=>s+z,0)/ry.length;let num=0,dx=0,dy=0;for(let i=0;i<rx.length;i++){num+=(rx[i]-mx)*(ry[i]-my);dx+=(rx[i]-mx)**2;dy+=(ry[i]-my)**2}return num/Math.sqrt(dx*dy)}
function rng(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
function boot(rows,key,cut,B=4000){const a=rows.filter(r=>r[key]>=cut);if(!a.length)return null;const random=rng(88421+cut+a.length),vals=[];for(let b=0;b<B;b++){let p=0;for(let i=0;i<a.length;i++)p+=a[Math.floor(random()*a.length)].dutchReturn;vals.push(p/a.length)}vals.sort((x,y)=>x-y);return{low:vals[Math.floor(.025*(B-1))],high:vals[Math.floor(.975*(B-1))]}}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}function fmt(x,n=2){return x==null?'—':Number(x).toFixed(n)}
function table(a,c){let s='|'+c.map(x=>x.h).join('|')+'|\\n|'+c.map(()=> '---').join('|')+'|\\n';for(const x of a)s+='|'+c.map(z=>z.f(x)).join('|')+'|\\n';return s}
const files=fs.readdirSync(DIR).filter(f=>/^races-\d\d-\d\.json$/.test(f)),raw=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))).sort((a,b)=>a.id.localeCompare(b.id)),races=raw.map(build).filter(Boolean),folds=[];
for(const y of [2023,2024,2025]){
 const train=races.filter(r=>r.year<y),test=races.filter(r=>r.year===y),ts=transparentScorer(train),lm=fitLogistic(train);
 for(const r of test){const t=ts(r);r.transparentScore=t.score;r.scoreParts=t.parts;r.learnedScore=lm.score(r);r.learnedProb=lm.pred(r);r.valueScore=r.learnedProb*r.composite}
 folds.push({year:y,trainN:train.length,testN:test.length,transparent:bandRows(test,'transparentScore'),learned:bandRows(test,'learnedScore'),transparentCuts:cutRows(test,'transparentScore'),learnedCuts:cutRows(test,'learnedScore'),weights:LF.map((f,i)=>({feature:f,coef:lm.w[i+1]}))})
}
const oos=folds.flatMap(f=>races.filter(r=>r.year===f.year)),tb=bandRows(oos,'transparentScore'),lb=bandRows(oos,'learnedScore'),tc=cutRows(oos,'transparentScore').map(x=>({...x,ci:boot(oos,'transparentScore',x.cut)})),lc=cutRows(oos,'learnedScore').map(x=>({...x,ci:boot(oos,'learnedScore',x.cut)}));
const byYearCuts=[60,70,80].flatMap(c=>[2023,2024,2025].map(y=>{const a=oos.filter(r=>r.year===y&&r.transparentScore>=c);return{score:'transparent',cut:c,year:y,...metric(a)}}).concat([2023,2024,2025].map(y=>{const a=oos.filter(r=>r.year===y&&r.learnedScore>=c);return{score:'learned',cut:c,year:y,...metric(a)}})));
const report={rawN:raw.length,usable:races.length,oosN:oos.length,folds:folds.map(f=>({year:f.year,trainN:f.trainN,testN:f.testN,weights:f.weights})),transparentBands:tb,learnedBands:lb,transparentCuts:tc,learnedCuts:lc,byYearCuts,monotonic:{transparentHit:spearmanBins(tb,'hitRate'),transparentROI:spearmanBins(tb,'dutchROI'),learnedHit:spearmanBins(lb,'hitRate'),learnedROI:spearmanBins(lb,'dutchROI')}};
fs.mkdirSync('analysis/waku-backtest/bc-score-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/bc-score-out/report.json',JSON.stringify(report,null,2));
let md='# BC構造スコア：オッズ構造のみウォークフォワード検証\\n\\n';
md+='G/G距離/年齢/重量などのレース属性は一切不使用。構成要素は①枠連3〜14市場量 ②2軸BC市場包囲率 ③軸枠代表度/軸強度 ④弱枠負担 ⑤馬連変換点数 ⑥合成オッズ。弱枠削減と相手50倍未満は固定。\\n\\n';
md+='透明スコア＝各構成要素をその時点までの過去分布で0〜100パーセンタイル化し等ウェイト平均。学習スコア＝同じ構成要素だけのL2ロジスティック回帰を過去年で学習し、予測順位を0〜100化。\\n\\n';
md+='## 完全アウト・オブ・サンプル合算（2023〜25）\\n\\n### 透明BC構造スコア\\n\\n'+table(tb,[{h:'スコア',f:x=>x.band},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'平均点',f:x=>fmt(x.avgPoints,2)},{h:'平均合成',f:x=>fmt(x.avgComposite,2)+'倍'},{h:'ダッチROI',f:x=>pct(x.dutchROI)}]);
md+='\\n的中率の単調性Spearman '+fmt(report.monotonic.transparentHit,3)+' / ROI '+fmt(report.monotonic.transparentROI,3)+'。\\n\\n';
md+='### 学習BC構造スコア\\n\\n'+table(lb,[{h:'スコア',f:x=>x.band},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'平均点',f:x=>fmt(x.avgPoints,2)},{h:'平均合成',f:x=>fmt(x.avgComposite,2)+'倍'},{h:'ダッチROI',f:x=>pct(x.dutchROI)}]);
md+='\\n的中率の単調性Spearman '+fmt(report.monotonic.learnedHit,3)+' / ROI '+fmt(report.monotonic.learnedROI,3)+'。\\n\\n';
md+='## 購入ライン候補\\n\\n### 透明スコア\\n\\n'+table(tc,[{h:'条件',f:x=>'Score≥'+x.cut},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'平均合成',f:x=>fmt(x.avgComposite,2)+'倍'},{h:'ROI',f:x=>pct(x.dutchROI)},{h:'ROI95%CI',f:x=>x.ci?pct(x.ci.low)+'〜'+pct(x.ci.high):'—'}]);
md+='\\n### 学習スコア\\n\\n'+table(lc,[{h:'条件',f:x=>'Score≥'+x.cut},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'平均合成',f:x=>fmt(x.avgComposite,2)+'倍'},{h:'ROI',f:x=>pct(x.dutchROI)},{h:'ROI95%CI',f:x=>x.ci?pct(x.ci.low)+'〜'+pct(x.ci.high):'—'}]);
md+='\\n## 年別再現性（60/70/80点以上）\\n\\n'+table(byYearCuts,[{h:'方式',f:x=>x.score},{h:'条件',f:x=>'≥'+x.cut},{h:'年',f:x=>x.year},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'ROI',f:x=>pct(x.dutchROI)}]);
md+='\\n## 判定基準\\n\\n理想はスコア帯が上がるほど的中率とROIが概ね単調上昇し、高スコア帯が2023/24/25の各年で同方向に再現すること。単年だけ強い場合は本番ルール化しない。\\n';
fs.writeFileSync('analysis/waku-backtest/bc-score-out/report.md',md);console.log(md);