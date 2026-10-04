const fs=require('fs'),path=require('path');
const DIR='analysis/waku-backtest/race-select-merge', CAP=50;
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
function marketStats(h){
 const hs=h.slice().sort((a,b)=>a.pop-b.pop),inv=hs.map(x=>1/x.win),tot=inv.reduce((s,x)=>s+x,0),p=inv.map(x=>x/tot),share=k=>p.slice(0,Math.min(k,p.length)).reduce((s,x)=>s+x,0),hhi=p.reduce((s,x)=>s+x*x,0);
 return{top3:share(3),top4:share(4),top6:share(6),neff:hhi?1/hhi:hs.length,fav:hs[0]?.win||999}
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
function buildRace(r){
 const {fr,axes}=axisSet(r);if(axes.length<2)return null;
 const qm=qMap(r),fieldW=r.horses.reduce((s,h)=>s+h.w,0),axisFrames=new Set(axes.map(a=>a.frame)),byOpp=new Map(),core=[],targetFrames=r.frames.filter(x=>x.rank>=3&&x.rank<=14);
 const targetInv=targetFrames.reduce((s,x)=>s+1/x.odds,0),allInv=r.frames.reduce((s,x)=>s+1/x.odds,0);
 for(const f of targetFrames){
  const [fa,fb]=f.pair.split('-').map(Number),links=axes.filter(a=>a.frame===fa||a.frame===fb);if(!links.length)continue;
  const bothAxisFrames=fa!==fb&&axisFrames.has(fa)&&axisFrames.has(fb);
  if(bothAxisFrames){core.push({framePair:f.pair,frameRank:f.rank,frameOdds:f.odds,links});continue}
  for(const ax of links){const opp=ax.frame===fa?fb:fa,key=String(opp),g=byOpp.get(key)||{oppFrame:opp,links:[]};if(!g.links.some(z=>z.axisHorse===ax.horse&&z.framePair===f.pair))g.links.push({axisHorse:ax.horse,axisFrame:ax.frame,axisScore:ax.axisScore,axisRep:ax.frameRep,framePair:f.pair,frameRank:f.rank,frameOdds:f.odds});byOpp.set(key,g)}
 }
 const mkTickets=(links,oppFrame)=>{const m=new Map;for(const l of links){const ax=axes.find(a=>a.horse===l.axisHorse);for(const h of r.horses.filter(x=>x.frame===oppFrame&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)m.set(k,{key:k,odds:q.odds,horse:h.horse,oppFrame,axisHorse:ax.horse})}}return[...m.values()]};
 const groups=[];
 for(const g of byOpp.values()){
  const hs=r.horses.filter(x=>x.frame===g.oppFrame),den=hs.reduce((s,x)=>s+x.w,0),elig=hs.filter(x=>x.win<CAP),eligibleMass=den?elig.reduce((s,x)=>s+x.w,0)/den:0,oppSupport=fieldW?den/fieldW:0,oppRep=den?Math.max(...hs.map(x=>x.w))/den:0,tickets=mkTickets(g.links,g.oppFrame),minRank=Math.min(...g.links.map(x=>x.frameRank));
  if(!tickets.length)continue;
  groups.push({type:'opp',oppFrame:g.oppFrame,links:g.links,tickets,minRank,oppSupport,oppRep,eligibleMass,weak:(minRank>=11||oppSupport<.05),framePairs:[...new Set(g.links.map(x=>x.framePair))]})
 }
 if(core.length){
  const tickets=new Map;for(const c of core){const [fa,fb]=c.framePair.split('-').map(Number);for(const ax of axes.filter(a=>a.frame===fa||a.frame===fb)){const opp=ax.frame===fa?fb:fa;for(const h of r.horses.filter(x=>x.frame===opp&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)tickets.set(k,{key:k,odds:q.odds,horse:h.horse,oppFrame:opp,axisHorse:ax.horse})}}}
  if(tickets.size)groups.push({type:'core',oppFrame:null,links:core.flatMap(x=>x.links),tickets:[...tickets.values()],minRank:Math.min(...core.map(x=>x.frameRank)),oppSupport:0,oppRep:1,eligibleMass:1,weak:false,framePairs:core.map(x=>x.framePair)})
 }
 const kept=groups.filter(g=>!g.weak),removed=groups.filter(g=>g.weak),tickets=ticketsOf(kept);if(!tickets.length)return null;
 const burden=tickets.reduce((s,t)=>s+1/t.odds,0),composite=burden?1/burden:null,actual=pair(r.first.horse,r.second.horse),hit=tickets.some(t=>t.key===actual),q=qm.get(actual),eqReturn=hit&&q?q.odds:0,dutchReturn=hit&&composite?composite:0;
 const linkedPairs=new Set(kept.flatMap(g=>g.framePairs)),rawLinkedPairs=new Set(groups.flatMap(g=>g.framePairs));
 const bcCoverage=targetInv?targetFrames.filter(f=>linkedPairs.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0;
 const bcRawCoverage=targetInv?targetFrames.filter(f=>rawLinkedPairs.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0;
 const m=marketStats(r.horses),b=fr.boundary||{};
 const weakTicketBurden=ticketsOf(removed).reduce((s,t)=>s+1/t.odds,0),allTicketBurden=ticketsOf(groups).reduce((s,t)=>s+1/t.odds,0);
 return{id:r.id,year:r.year,raceNo:r.raceNo,fr,axes,m,groups,kept,removed,tickets,points:tickets.length,composite,hit,eqReturn,dutchReturn,
  features:{
   firstEnd:fr.end,boundaryScore:b.score||0,boundaryShare:b.share||0,boundaryWall:b.wall||1,boundaryProm:b.prom||1,
   top3:m.top3,top4:m.top4,top6:m.top6,neff:m.neff,fav:m.fav,
   axis1Top2:axes[0].top2,axis2Top2:axes[1].top2,axis1Rep:axes[0].frameRep,axis2Rep:axes[1].frameRep,
   axis1Score:axes[0].axisScore,axis2Score:axes[1].axisScore,axisScoreSum:axes[0].axisScore+axes[1].axisScore,
   bcCoverage,bcRawCoverage,weakFrames:removed.length,oppFrames:groups.filter(g=>g.type==='opp').length,
   weakBurdenShare:allTicketBurden?weakTicketBurden/allTicketBurden:0,points:tickets.length,logComposite:Math.log(Math.max(composite||1,1)),
   frameTargetMass:allInv?targetInv/allInv:0,late:r.raceNo>=9?1:0
  }}
}
const FEATS=['firstEnd','boundaryScore','boundaryShare','boundaryWall','boundaryProm','top3','top4','top6','neff','fav','axis1Top2','axis2Top2','axis1Rep','axis2Rep','axis1Score','axis2Score','axisScoreSum','bcCoverage','bcRawCoverage','weakFrames','oppFrames','weakBurdenShare','points','logComposite','frameTargetMass','late'];
function vec(x){return FEATS.map(k=>Number(x.features[k])||0)}
function fitLogistic(rows){
 const X=rows.map(vec),y=rows.map(r=>r.hit?1:0),m=FEATS.length,mean=Array(m).fill(0),sd=Array(m).fill(0);
 for(const x of X)for(let j=0;j<m;j++)mean[j]+=x[j]/X.length;
 for(const x of X)for(let j=0;j<m;j++)sd[j]+=(x[j]-mean[j])**2/X.length;for(let j=0;j<m;j++)sd[j]=Math.sqrt(sd[j])||1;
 const Z=X.map(x=>[1,...x.map((v,j)=>(v-mean[j])/sd[j])]),w=Array(m+1).fill(0),lr=.025,lambda=3;
 for(let it=0;it<5000;it++){const grad=Array(m+1).fill(0);for(let i=0;i<Z.length;i++){let z=0;for(let j=0;j<w.length;j++)z+=w[j]*Z[i][j];const p=1/(1+Math.exp(-clamp(z,-25,25))),e=p-y[i];for(let j=0;j<w.length;j++)grad[j]+=e*Z[i][j]/Z.length}for(let j=1;j<w.length;j++)grad[j]+=lambda*w[j]/Z.length;for(let j=0;j<w.length;j++)w[j]-=lr*grad[j]}
 return{w,mean,sd,predict(r){const x=vec(r),z=[1,...x.map((v,j)=>(v-mean[j])/sd[j])];let s=0;for(let j=0;j<w.length;j++)s+=w[j]*z[j];return 1/(1+Math.exp(-clamp(s,-25,25)))}}
}
function auc(rows){const a=rows.filter(x=>x.pred!=null).slice().sort((x,y)=>x.pred-y.pred),pos=a.filter(x=>x.hit).length,neg=a.length-pos;if(!pos||!neg)return null;let rank=1,sum=0;for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&Math.abs(a[j].pred-a[i].pred)<1e-12)j++;const avg=(rank+(rank+j-i-1))/2;for(let k=i;k<j;k++)if(a[k].hit)sum+=avg;rank+=j-i;i=j}return(sum-pos*(pos+1)/2)/(pos*neg)}
function brier(rows){return rows.length?rows.reduce((s,r)=>s+(r.pred-(r.hit?1:0))**2,0)/rows.length:null}
function metric(rows,filter=()=>true){
 const a=rows.filter(filter),n=a.length,h=a.filter(x=>x.hit).length,pts=a.reduce((s,x)=>s+x.points,0),eq=a.reduce((s,x)=>s+x.eqReturn,0),du=a.reduce((s,x)=>s+x.dutchReturn,0);
 return{n,hits:h,hitRate:n?h/n:null,avgPoints:n?pts/n:null,avgComposite:n?a.reduce((s,x)=>s+x.composite,0)/n:null,equalROI:pts?eq/pts:null,dutchROI:n?du/n:null}
}
function rng(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
function bootstrapROI(rows,filter,mode='dutch',B=4000){
 const a=rows.filter(filter);if(!a.length)return null;const random=rng(20261004+a.length+(mode==='dutch'?17:31)),vals=[];
 for(let b=0;b<B;b++){let num=0,den=0;for(let i=0;i<a.length;i++){const r=a[Math.floor(random()*a.length)];if(mode==='dutch'){num+=r.dutchReturn;den+=1}else{num+=r.eqReturn;den+=r.points}}vals.push(den?num/den:0)}
 vals.sort((x,y)=>x-y);return{low:vals[Math.floor(.025*(B-1))],high:vals[Math.floor(.975*(B-1))]}
}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}function fmt(x,n=2){return x==null?'—':Number(x).toFixed(n)}
function table(a,cols){let s='|'+cols.map(c=>c.h).join('|')+'|\\n|'+cols.map(()=> '---').join('|')+'|\\n';for(const x of a)s+='|'+cols.map(c=>c.f(x)).join('|')+'|\\n';return s}
const files=fs.readdirSync(DIR).filter(f=>/^races-\d\d-\d\.json$/.test(f)),raw=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))).sort((a,b)=>a.id.localeCompare(b.id)),races=raw.map(buildRace).filter(Boolean);
const years=[2023,2024,2025],walk=[];
for(const y of years){
 const train=races.filter(r=>r.year<y),test=races.filter(r=>r.year===y),model=fitLogistic(train);
 for(const r of test){r.pred=model.predict(r);r.modelEV=r.pred*r.composite}
 walk.push({year:y,trainN:train.length,testN:test.length,auc:auc(test),brier:brier(test),rows:test.map(r=>({...r}))})
}
const all=walk.flatMap(x=>x.rows),thresholds=[0.8,0.9,1.0,1.1,1.2,1.3],grid=thresholds.map(t=>{const f=r=>r.modelEV>=t,m=metric(all,f);return{t,m,ci:bootstrapROI(all,f,'dutch')}});
const byYear=thresholds.flatMap(t=>walk.map(w=>{const f=r=>r.modelEV>=t,m=metric(w.rows,f);return{t,year:w.year,m,ci:bootstrapROI(w.rows,f,'dutch',2500)}}));
const pBins=[[0,.18,'<18%'],[.18,.24,'18〜24%'],[.24,.30,'24〜30%'],[.30,.36,'30〜36%'],[.36,1,'36%以上']].map(([lo,hi,label])=>{const a=all.filter(r=>r.pred>=lo&&r.pred<hi),m=metric(a);return{label,n:a.length,pred:a.length?a.reduce((s,x)=>s+x.pred,0)/a.length:null,actual:m.hitRate,roi:m.dutchROI}});
const evBins=[[0,.8,'EV<0.8'],[.8,1,'0.8〜1.0'],[1,1.2,'1.0〜1.2'],[1.2,1.5,'1.2〜1.5'],[1.5,99,'1.5以上']].map(([lo,hi,label])=>{const a=all.filter(r=>r.modelEV>=lo&&r.modelEV<hi),m=metric(a);return{label,n:a.length,hit:m.hitRate,comp:m.avgComposite,roi:m.dutchROI}});
const featureWeights=walk.map(w=>{const model=fitLogistic(races.filter(r=>r.year<w.year));return{year:w.year,weights:FEATS.map((f,i)=>({feature:f,coef:model.w[i+1]})).sort((a,b)=>Math.abs(b.coef)-Math.abs(a.coef)).slice(0,10)}});
const report={rawN:raw.length,usable:races.length,walk:walk.map(w=>({year:w.year,trainN:w.trainN,testN:w.testN,auc:w.auc,brier:w.brier,all:metric(w.rows)})),grid,byYear,pBins,evBins,featureWeights};
fs.mkdirSync('analysis/waku-backtest/race-select-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/race-select-out/report.json',JSON.stringify(report,null,2));
let md='# 2軸BC戦略：買うレース／見送るレース ウォークフォワード検証\\n\\n';
md+='対象 '+races.length+'/393R。弱枠削減（枠連11〜14位 OR 相手枠支持<5%）と相手単勝50倍未満は前回ルールのまま固定。最終オッズを使用。\\n\\n';
md+='## 年ごとの完全前向き検証\\n\\n'+table(report.walk,[{h:'予測年',f:x=>x.year},{h:'学習N',f:x=>x.trainN},{h:'テストN',f:x=>x.testN},{h:'AUC',f:x=>fmt(x.auc,3)},{h:'Brier',f:x=>fmt(x.brier,3)},{h:'全買い的中',f:x=>pct(x.all.hitRate)},{h:'全買い合成',f:x=>fmt(x.all.avgComposite,2)+'倍'},{h:'全買いダッチROI',f:x=>pct(x.all.dutchROI)}]);
md+='\\n## モデルEVで購入選別：2023〜25のウォークフォワード予測を合算\\n\\n';
md+=table(grid,[{h:'購入条件',f:x=>'EV≥'+x.t.toFixed(1)},{h:'N',f:x=>x.m.n},{h:'的中率',f:x=>pct(x.m.hitRate)},{h:'平均点',f:x=>fmt(x.m.avgPoints,2)},{h:'平均合成',f:x=>fmt(x.m.avgComposite,2)+'倍'},{h:'ダッチROI',f:x=>pct(x.m.dutchROI)},{h:'ROI 95% bootstrap',f:x=>x.ci?pct(x.ci.low)+'〜'+pct(x.ci.high):'—'}]);
md+='\\n## 年別再現性\\n\\n'+table(byYear,[{h:'条件',f:x=>'EV≥'+x.t.toFixed(1)},{h:'年',f:x=>x.year},{h:'N',f:x=>x.m.n},{h:'的中率',f:x=>pct(x.m.hitRate)},{h:'平均合成',f:x=>fmt(x.m.avgComposite,2)+'倍'},{h:'ROI',f:x=>pct(x.m.dutchROI)}]);
md+='\\n## 予測確率の校正\\n\\n'+table(pBins,[{h:'予測帯',f:x=>x.label},{h:'N',f:x=>x.n},{h:'平均予測',f:x=>pct(x.pred)},{h:'実的中',f:x=>pct(x.actual)},{h:'ダッチROI',f:x=>pct(x.roi)}]);
md+='\\n## モデルEV帯\\n\\n'+table(evBins,[{h:'EV帯',f:x=>x.label},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hit)},{h:'平均合成',f:x=>fmt(x.comp,2)+'倍'},{h:'ダッチROI',f:x=>pct(x.roi)}]);
md+='\\n## 注意\\n\\nこれは最終オッズによる構造検証であり、T-15運用の検証ではない。EV閾値は未来年を見て再調整せず、年別の再現性と95%CIを優先して判断する。\\n';
fs.writeFileSync('analysis/waku-backtest/race-select-out/report.md',md);console.log(md);