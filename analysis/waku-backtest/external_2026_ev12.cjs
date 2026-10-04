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

const HIST='analysis/waku-backtest/ext-eval-hist',EXT='analysis/waku-backtest/ext-eval-2026';
function loadDir(dir,re){return fs.readdirSync(dir).filter(f=>re.test(f)).flatMap(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))).sort((a,b)=>a.id.localeCompare(b.id))}
const histRaw=loadDir(HIST,/^races-(22|23|24|25)-\d\.json$/),extRaw=loadDir(EXT,/^races-26-\d\.json$/);
const train=histRaw.map(build).filter(Boolean),test=extRaw.map(build).filter(Boolean),model=fitLogistic(train);
for(const r of test){r.p=model.predict(r);r.ev=r.p*r.composite}
const all=metric(test),selectedRows=test.filter(r=>r.ev>=1.2),selected=metric(selectedRows),ci=bootROI(selectedRows);
const cal=calibBins(test),auc26=auc(test),brier26=brier(test),ll26=logloss(test);
function streak(rows){let cur=0,max=0;for(const r of rows){if(r.hit)cur=0;else{cur++;max=Math.max(max,cur)}}return max}
function drawdown(rows){let equity=0,peak=0,maxDD=0;for(const r of rows){equity+=r.dutchReturn-1;peak=Math.max(peak,equity);maxDD=Math.max(maxDD,peak-equity)}return maxDD}
const selSorted=selectedRows.slice().sort((a,b)=>a.id.localeCompare(b.id));
const report={rule:'EV>=1.2 frozen',trainRawN:histRaw.length,trainUsableN:train.length,externalRawN:extRaw.length,externalUsableN:test.length,auc26,brier26,logloss26:ll26,all,selected:{...selected,ci,maxLosingStreak:streak(selSorted),maxDrawdownUnits:drawdown(selSorted)},calibration:cal,selectedRaces:selectedRows.map(r=>({id:r.id,p:r.p,composite:r.composite,ev:r.ev,hit:r.hit,dutchReturn:r.dutchReturn,points:r.points}))};
fs.mkdirSync('analysis/waku-backtest/external-eval-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/external-eval-out/report.json',JSON.stringify(report,null,2));
let md='# EV>=1.2 固定・2026完全外部検証\n\n';
md+='母集団は既存2022年96Rと96/96一致した抽出条件（芝・OP以上・12頭以上・2/3歳限定戦除外・障害除外）を2026へそのまま適用。モデルは2022〜25だけで再学習し、閾値EV>=1.2は変更していない。2026結果は学習・閾値設定に不使用。\n\n';
md+='## データ\n\n- 学習元 '+histRaw.length+'R / モデル利用 '+train.length+'R\n- 2026外部候補 '+extRaw.length+'R / モデル利用 '+test.length+'R\n\n';
md+='## 全2026候補\n\n- 的中率 '+pct(all.hitRate)+'\n- 平均推定p '+pct(all.avgP)+'\n- 平均合成 '+fmt(all.avgO,2)+'倍\n- ダッチROI '+pct(all.dutchROI)+'\n- AUC '+fmt(auc26,3)+' / Brier '+fmt(brier26,3)+'\n\n';
md+='## 固定ルール EV>=1.2\n\n- N='+selected.n+'\n- 的中 '+selected.hits+'/'+selected.n+' = '+pct(selected.hitRate)+'\n- 平均p '+pct(selected.avgP)+'\n- 平均合成 '+fmt(selected.avgO,2)+'倍\n- 平均EV '+fmt(selected.avgEV,2)+'\n- **ダッチROI '+pct(selected.dutchROI)+'**\n- bootstrap 95%CI '+(ci?pct(ci.low)+'〜'+pct(ci.high):'—')+'\n- 最大連敗 '+streak(selSorted)+'\n- 最大DD 約'+fmt(drawdown(selSorted),2)+'単位\n\n';
md+='## 判定\n\n';
if(selected.n>=10&&selected.dutchROI>1)md+='外部データでもROI>100%を維持。ただし95%CI・Nを見て本格採用可否を判断する。\n';
else md+='外部データで十分な再現を確認できず。閾値は動かさず、この仮説は未確定または棄却寄りとして扱う。\n';
fs.writeFileSync('analysis/waku-backtest/external-eval-out/report.md',md);console.log(md);
