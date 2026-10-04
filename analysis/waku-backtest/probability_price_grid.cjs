const fs=require('fs'),path=require('path');
const DIR='analysis/waku-backtest/prob-price-merge',CAP=50;
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
function marketStats(h){const hs=h.slice().sort((a,b)=>a.pop-b.pop),inv=hs.map(x=>1/x.win),tot=inv.reduce((s,x)=>s+x,0),p=inv.map(x=>x/tot),share=k=>p.slice(0,Math.min(k,p.length)).reduce((s,x)=>s+x,0),hhi=p.reduce((s,x)=>s+x*x,0);return{top3:share(3),top4:share(4),top6:share(6),neff:hhi?1/hhi:hs.length,fav:hs[0]?.win||999}}
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
   if(!tickets.length)continue;
   const frameMass=targetInv?g.links.reduce((s,l)=>s+1/l.frameOdds,0)/targetInv:0;
   groups.push({type:'opp',oppFrame:g.oppFrame,tickets,minRank,oppSupport,oppRep,frameMass,weak:(minRank>=11||oppSupport<.05),framePairs:[...new Set(g.links.map(x=>x.framePair))]})
 }
 if(core.length){
   const tickets=new Map;for(const c of core){const [fa,fb]=c.framePair.split('-').map(Number);for(const ax of axes.filter(a=>a.frame===fa||a.frame===fb)){const opp=ax.frame===fa?fb:fa;for(const h of r.horses.filter(x=>x.frame===opp&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)tickets.set(k,{key:k,odds:q.odds,axisHorse:ax.horse,oppFrame:opp})}}}
   if(tickets.size)groups.push({type:'core',oppFrame:null,tickets:[...tickets.values()],minRank:Math.min(...core.map(x=>x.frameRank)),oppSupport:0,oppRep:1,frameMass:core.reduce((s,c)=>s+1/c.frameOdds,0)/(targetInv||1),weak:false,framePairs:core.map(x=>x.framePair)})
 }
 const kept=groups.filter(g=>!g.weak),removed=groups.filter(g=>g.weak),tickets=ticketsOf(kept);if(!tickets.length)return null;
 const burden=tickets.reduce((s,t)=>s+1/t.odds,0),composite=burden?1/burden:null,actual=pair(r.first.horse,r.second.horse),hit=tickets.some(t=>t.key===actual),q=qm.get(actual);
 const linked=new Set(kept.flatMap(g=>g.framePairs)),rawLinked=new Set(groups.flatMap(g=>g.framePairs));
 const bcCoverage=targetInv?target.filter(f=>linked.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0,bcRawCoverage=targetInv?target.filter(f=>rawLinked.has(f.pair)).reduce((s,f)=>s+1/f.odds,0)/targetInv:0;
 const weakFrameMass=removed.reduce((s,g)=>s+g.frameMass,0),zoneMass=allFrameInv?targetInv/allFrameInv:0,m=marketStats(r.horses),b=fr.boundary||{};
 const axisMinRep=Math.min(axes[0].frameRep,axes[1].frameRep),axisQuality=Math.sqrt(Math.max(axes[0].axisScore,0)*Math.max(axes[1].axisScore,0));
 return{id:r.id,year:r.year,raceNo:r.raceNo,hit,points:tickets.length,composite,eqReturn:hit&&q?q.odds:0,dutchReturn:hit&&composite?composite:0,
  x:{firstEnd:fr.end,boundaryScore:b.score||0,boundaryShare:b.share||0,boundaryWall:b.wall||1,boundaryProm:b.prom||1,
     top3:m.top3,top4:m.top4,top6:m.top6,neff:m.neff,fav:m.fav,
     axis1Top2:axes[0].top2,axis2Top2:axes[1].top2,axisMinRep,axisQuality,
     zoneMass,bcCoverage,bcRawCoverage,weakFrameFrac:groups.length?removed.length/groups.length:0,weakFrameMass,
     oppFrames:groups.filter(g=>g.type==='opp').length,points:tickets.length,late:r.raceNo>=9?1:0}}
}
/* IMPORTANT: probability features contain no horse-quinella odds and no composite odds. */
const FEATS=['firstEnd','boundaryScore','boundaryShare','boundaryWall','boundaryProm','top3','top4','top6','neff','fav','axis1Top2','axis2Top2','axisMinRep','axisQuality','zoneMass','bcCoverage','bcRawCoverage','weakFrameFrac','weakFrameMass','oppFrames','points','late'];
function vec(r){return FEATS.map(k=>Number(r.x[k])||0)}
function fitLogistic(train){
 const X=train.map(vec),y=train.map(r=>r.hit?1:0),m=FEATS.length,mean=Array(m).fill(0),sd=Array(m).fill(0);
 for(const x of X)for(let j=0;j<m;j++)mean[j]+=x[j]/X.length;
 for(const x of X)for(let j=0;j<m;j++)sd[j]+=(x[j]-mean[j])**2/X.length;for(let j=0;j<m;j++)sd[j]=Math.sqrt(sd[j])||1;
 const Z=X.map(x=>[1,...x.map((v,j)=>(v-mean[j])/sd[j])]),w=Array(m+1).fill(0),lr=.025,lambda=4;
 for(let it=0;it<5000;it++){const g=Array(m+1).fill(0);for(let i=0;i<Z.length;i++){let z=0;for(let j=0;j<w.length;j++)z+=w[j]*Z[i][j];const p=1/(1+Math.exp(-clamp(z,-25,25))),e=p-y[i];for(let j=0;j<w.length;j++)g[j]+=e*Z[i][j]/Z.length}for(let j=1;j<w.length;j++)g[j]+=lambda*w[j]/Z.length;for(let j=0;j<w.length;j++)w[j]-=lr*g[j]}
 return{w,mean,sd,predict(r){const x=vec(r),z=[1,...x.map((v,j)=>(v-mean[j])/sd[j])];let s=0;for(let j=0;j<w.length;j++)s+=w[j]*z[j];return 1/(1+Math.exp(-clamp(s,-25,25)))}}
}
function metric(a){const n=a.length,h=a.filter(x=>x.hit).length,pts=a.reduce((s,x)=>s+x.points,0),eq=a.reduce((s,x)=>s+x.eqReturn,0),du=a.reduce((s,x)=>s+x.dutchReturn,0);return{n,hits:h,hitRate:n?h/n:null,avgP:n?a.reduce((s,x)=>s+x.p,0)/n:null,avgO:n?a.reduce((s,x)=>s+x.composite,0)/n:null,avgEV:n?a.reduce((s,x)=>s+x.ev,0)/n:null,avgPoints:n?pts/n:null,equalROI:pts?eq/pts:null,dutchROI:n?du/n:null}}
function brier(a){return a.length?a.reduce((s,r)=>s+(r.p-(r.hit?1:0))**2,0)/a.length:null}
function logloss(a){return a.length?-a.reduce((s,r)=>s+(r.hit?Math.log(clamp(r.p,1e-6,1-1e-6)):Math.log(clamp(1-r.p,1e-6,1-1e-6))),0)/a.length:null}
function auc(a){const z=a.slice().sort((x,y)=>x.p-y.p),pos=z.filter(x=>x.hit).length,neg=z.length-pos;if(!pos||!neg)return null;let rank=1,sum=0;for(let i=0;i<z.length;){let j=i+1;while(j<z.length&&Math.abs(z[j].p-z[i].p)<1e-12)j++;const avg=(rank+(rank+j-i-1))/2;for(let k=i;k<j;k++)if(z[k].hit)sum+=avg;rank+=j-i;i=j}return(sum-pos*(pos+1)/2)/(pos*neg)}
function calibBins(rows){
 const bins=[[0,.20,'<20%'],[.20,.25,'20〜25%'],[.25,.30,'25〜30%'],[.30,.35,'30〜35%'],[.35,.40,'35〜40%'],[.40,1.001,'40%以上']];
 return bins.map(([lo,hi,label])=>{const a=rows.filter(r=>r.p>=lo&&r.p<hi),m=metric(a);return{label,...m,calError:m.hitRate==null?null:m.hitRate-m.avgP}})
}
const P_BINS=[[0,.25,'<25%'],[.25,.30,'25〜30%'],[.30,.35,'30〜35%'],[.35,.40,'35〜40%'],[.40,1.001,'40%以上']];
const O_BINS=[[0,2.5,'<2.5'],[2.5,3.0,'2.5〜3.0'],[3.0,3.5,'3.0〜3.5'],[3.5,4.0,'3.5〜4.0'],[4.0,5.0,'4.0〜5.0'],[5.0,999,'5.0以上']];
function cells(rows){
 const out=[];for(const [plo,phi,pl] of P_BINS)for(const [olo,ohi,ol] of O_BINS){const a=rows.filter(r=>r.p>=plo&&r.p<phi&&r.composite>=olo&&r.composite<ohi),m=metric(a);out.push({pBin:pl,oBin:ol,...m,years:Object.fromEntries([2023,2024,2025].map(y=>{const yy=a.filter(r=>r.year===y);return[y,metric(yy)]}))})}return out
}
function rng(seed){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296}}
function bootROI(a,B=4000){if(!a.length)return null;const rnd=rng(99117+a.length),v=[];for(let b=0;b<B;b++){let s=0;for(let i=0;i<a.length;i++)s+=a[Math.floor(rnd()*a.length)].dutchReturn;v.push(s/a.length)}v.sort((x,y)=>x-y);return{low:v[Math.floor(.025*(B-1))],high:v[Math.floor(.975*(B-1))]}}
function evGrid(rows){return[.7,.8,.9,1.0,1.1,1.2,1.3,1.4].map(t=>{const a=rows.filter(r=>r.ev>=t),m=metric(a);return{threshold:t,...m,ci:bootROI(a),years:Object.fromEntries([2023,2024,2025].map(y=>[y,metric(a.filter(r=>r.year===y))]))}})}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}function fmt(x,n=2){return x==null?'—':Number(x).toFixed(n)}
function table(a,c){let s='|'+c.map(x=>x.h).join('|')+'|\\n|'+c.map(()=> '---').join('|')+'|\\n';for(const x of a)s+='|'+c.map(z=>z.f(x)).join('|')+'|\\n';return s}
const files=fs.readdirSync(DIR).filter(f=>/^races-\d\d-\d\.json$/.test(f)),raw=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))).sort((a,b)=>a.id.localeCompare(b.id)),races=raw.map(build).filter(Boolean),folds=[];
for(const y of [2023,2024,2025]){
 const train=races.filter(r=>r.year<y),test=races.filter(r=>r.year===y),model=fitLogistic(train);
 for(const r of test){r.p=model.predict(r);r.ev=r.p*r.composite}
 folds.push({year:y,trainN:train.length,testN:test.length,auc:auc(test),brier:brier(test),logloss:logloss(test),weights:FEATS.map((f,i)=>({feature:f,coef:model.w[i+1]})).sort((a,b)=>Math.abs(b.coef)-Math.abs(a.coef)).slice(0,12)})
}
const oos=folds.flatMap(f=>races.filter(r=>r.year===f.year)),cal=calibBins(oos),grid=cells(oos),ev=evGrid(oos);
const stableCells=grid.filter(c=>c.n>=12&&c.dutchROI!=null&&c.dutchROI>=1&&[2023,2024,2025].filter(y=>c.years[y].n>=3).every(y=>c.years[y].dutchROI>=.9));
const report={rawN:raw.length,usable:races.length,oosN:oos.length,features:FEATS,folds:folds.map(f=>({year:f.year,trainN:f.trainN,testN:f.testN,auc:f.auc,brier:f.brier,logloss:f.logloss,weights:f.weights,all:metric(oos.filter(r=>r.year===f.year))})),calibration:cal,cells:grid,evGrid:ev,stableCells};
fs.mkdirSync('analysis/waku-backtest/prob-price-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/prob-price-out/report.json',JSON.stringify(report,null,2));
let md='# BC的中確率 p × 合成オッズ O：分離ウォークフォワード検証\\n\\n';
md+='的中確率モデルには馬連オッズ・合成オッズを一切入力していない。確率pは枠連3〜14市場量、2軸包囲率、軸代表度/生存推定、弱枠比率、変換点数等の構造のみ。Oはモデル学習後に別軸として使用。2022→2023、2022–23→2024、2022–24→2025。\\n\\n';
md+='## ① 確率モデルの年別性能\\n\\n'+table(report.folds,[{h:'予測年',f:x=>x.year},{h:'学習N',f:x=>x.trainN},{h:'テストN',f:x=>x.testN},{h:'AUC',f:x=>fmt(x.auc,3)},{h:'Brier',f:x=>fmt(x.brier,3)},{h:'実的中',f:x=>pct(x.all.hitRate)},{h:'平均予測p',f:x=>pct(x.all.avgP)}]);
md+='\\n## ② 確率校正（2023〜25 OOS合算）\\n\\n'+table(cal,[{h:'予測p帯',f:x=>x.label},{h:'N',f:x=>x.n},{h:'平均予測p',f:x=>pct(x.avgP)},{h:'実的中率',f:x=>pct(x.hitRate)},{h:'差',f:x=>x.calError==null?'—':((x.calError>=0?'+':'')+(100*x.calError).toFixed(1)+'pt')}]);
md+='\\n## ③ p×O = モデルEV\\n\\n'+table(ev,[{h:'購入条件',f:x=>'p×O ≥ '+x.threshold.toFixed(1)},{h:'N',f:x=>x.n},{h:'的中率',f:x=>pct(x.hitRate)},{h:'平均p',f:x=>pct(x.avgP)},{h:'平均O',f:x=>fmt(x.avgO,2)+'倍'},{h:'平均EV',f:x=>fmt(x.avgEV,2)},{h:'ダッチROI',f:x=>pct(x.dutchROI)},{h:'ROI95%CI',f:x=>x.ci?pct(x.ci.low)+'〜'+pct(x.ci.high):'—'}]);
md+='\\n## ④ 年別EV再現性\\n\\n';
for(const x of ev.filter(x=>x.threshold>=.9&&x.threshold<=1.3)){md+='### EV≥'+x.threshold.toFixed(1)+'\\n\\n'+table([2023,2024,2025].map(y=>({year:y,...x.years[y]})),[{h:'年',f:z=>z.year},{h:'N',f:z=>z.n},{h:'的中率',f:z=>pct(z.hitRate)},{h:'平均O',f:z=>fmt(z.avgO,2)+'倍'},{h:'ROI',f:z=>pct(z.dutchROI)}])+'\\n'}
md+='\\n## ⑤ p×Oの2次元セル（N>=5のみ）\\n\\n'+table(grid.filter(x=>x.n>=5),[{h:'p帯',f:x=>x.pBin},{h:'合成O',f:x=>x.oBin},{h:'N',f:x=>x.n},{h:'実的中',f:x=>pct(x.hitRate)},{h:'平均p',f:x=>pct(x.avgP)},{h:'平均O',f:x=>fmt(x.avgO,2)},{h:'ROI',f:x=>pct(x.dutchROI)},{h:'23/24/25 N',f:x=>[2023,2024,2025].map(y=>x.years[y].n).join('/')},{h:'23/24/25 ROI',f:x=>[2023,2024,2025].map(y=>pct(x.years[y].dutchROI)).join(' / ')}]);
md+='\\n## 年を跨いで残った候補セル\\n\\n'+(stableCells.length?table(stableCells,[{h:'p帯',f:x=>x.pBin},{h:'O帯',f:x=>x.oBin},{h:'N',f:x=>x.n},{h:'ROI',f:x=>pct(x.dutchROI)},{h:'年別ROI',f:x=>[2023,2024,2025].map(y=>pct(x.years[y].dutchROI)).join(' / ')}]):'条件を満たすセルなし。')+'\\n';
fs.writeFileSync('analysis/waku-backtest/prob-price-out/report.md',md);console.log(md);