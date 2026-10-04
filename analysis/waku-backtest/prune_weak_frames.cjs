const fs=require('fs'),path=require('path');
const DIR='analysis/waku-backtest/weak-frame-merge', CAP=50, TARGETS=[3.5,4.0,4.5];
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
 const scored=cand.map(h=>{const den=groups[h.frame].reduce((s,x)=>s+x.w,0),rep=den?h.w/den:0;return{...h,frameRep:rep,top2:top2.get(h.horse)||0,axisScore:rep*(top2.get(h.horse)||0)}}).sort((a,b)=>b.axisScore-a.axisScore||a.pop-b.pop);
 if(!scored.length)return{fr,axes:[]};const a1=scored[0],a2=scored.find(x=>x.frame!==a1.frame)||scored[1];return{fr,axes:[a1,a2].filter(Boolean)}
}
function qMap(r){return new Map((r.ur||[]).map(([k,v])=>[k,v]))}
function frameMap(r){return new Map((r.frames||[]).map(x=>[x.pair,x]))}
function buildGroups(r){
 const {fr,axes}=axisSet(r);if(axes.length<2)return{fr,axes,groups:[],tickets:[]};
 const fm=frameMap(r),qm=qMap(r),fieldW=r.horses.reduce((s,h)=>s+h.w,0),axisFrames=new Set(axes.map(a=>a.frame)),byOpp=new Map(),core=[];
 for(const f of r.frames.filter(x=>x.rank>=3&&x.rank<=14)){
   const [fa,fb]=f.pair.split('-').map(Number),links=axes.filter(a=>a.frame===fa||a.frame===fb);if(!links.length)continue;
   const bothAxisFrames=fa!==fb&&axisFrames.has(fa)&&axisFrames.has(fb);
   if(bothAxisFrames){core.push({framePair:f.pair,frameRank:f.rank,frameOdds:f.odds,links});continue}
   for(const ax of links){
     const opp=ax.frame===fa?fb:fa,key=String(opp),g=byOpp.get(key)||{oppFrame:opp,links:[]};
     if(!g.links.some(z=>z.axisHorse===ax.horse&&z.framePair===f.pair))g.links.push({axisHorse:ax.horse,axisFrame:ax.frame,axisScore:ax.axisScore,axisRep:ax.frameRep,framePair:f.pair,frameRank:f.rank,frameOdds:f.odds});
     byOpp.set(key,g);
   }
 }
 const mkTickets=(links,oppFrame)=>{
   const m=new Map();
   for(const l of links){const ax=axes.find(a=>a.horse===l.axisHorse);for(const h of r.horses.filter(x=>x.frame===oppFrame&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)m.set(k,{key:k,odds:q.odds,horse:h.horse,oppFrame,axisHorse:ax.horse})}}
   return [...m.values()]
 };
 const groups=[];
 for(const g of byOpp.values()){
   const hs=r.horses.filter(x=>x.frame===g.oppFrame),den=hs.reduce((s,x)=>s+x.w,0),elig=hs.filter(x=>x.win<CAP),eligibleMass=den?elig.reduce((s,x)=>s+x.w,0)/den:0,oppSupport=fieldW?den/fieldW:0,oppRep=den&&hs.length?Math.max(...hs.map(x=>x.w))/den:0,topOdds=hs.length?Math.min(...hs.map(x=>x.win)):999,tickets=mkTickets(g.links,g.oppFrame),burden=tickets.reduce((s,t)=>s+1/t.odds,0),linkInv=g.links.reduce((s,l)=>s+1/l.frameOdds,0),axisLinkStrength=g.links.reduce((s,l)=>s+l.axisScore/l.frameOdds,0);
   if(!tickets.length)continue;
   groups.push({type:'opp',oppFrame:g.oppFrame,links:g.links,tickets,burden,points:tickets.length,minRank:Math.min(...g.links.map(x=>x.frameRank)),avgRank:g.links.reduce((s,x)=>s+x.frameRank,0)/g.links.length,linkInv,axisLinkStrength,oppSupport,oppRep,eligibleMass,topOdds,linkCount:g.links.length})
 }
 if(core.length){
   const tickets=new Map();for(const c of core){const [fa,fb]=c.framePair.split('-').map(Number);for(const ax of axes.filter(a=>a.frame===fa||a.frame===fb)){const opp=ax.frame===fa?fb:fa;for(const h of r.horses.filter(x=>x.frame===opp&&x.horse!==ax.horse&&x.win<CAP)){const k=pair(ax.horse,h.horse),q=qm.get(k);if(q)tickets.set(k,{key:k,odds:q.odds,horse:h.horse,oppFrame:opp,axisHorse:ax.horse})}}}
   const ts=[...tickets.values()],burden=ts.reduce((s,t)=>s+1/t.odds,0);if(ts.length)groups.push({type:'core',oppFrame:null,links:core.flatMap(x=>x.links.map(l=>({axisHorse:l.horse,axisFrame:l.frame,axisScore:l.axisScore,axisRep:l.frameRep,framePair:x.framePair,frameRank:x.frameRank,frameOdds:x.frameOdds}))),tickets:ts,burden,points:ts.length,minRank:Math.min(...core.map(x=>x.frameRank)),avgRank:core.reduce((s,x)=>s+x.frameRank,0)/core.length,linkInv:core.reduce((s,x)=>s+1/x.frameOdds,0),axisLinkStrength:core.reduce((s,x)=>s+x.links.reduce((q,a)=>q+a.axisScore/x.frameOdds,0),0),oppSupport:0,oppRep:1,eligibleMass:1,topOdds:Math.min(...axes.map(a=>a.win)),linkCount:core.length})
 }
 const actual=pair(r.first.horse,r.second.horse);for(const g of groups)g.hit=g.tickets.some(t=>t.key===actual)?1:0;
 return{fr,axes,groups,actual}
}
const FEATS=['minRank','avgRank','logLinkInv','axisLinkStrength','oppSupport','oppRep','eligibleMass','logTopOdds','points','linkCount'];
function feature(g){return[g.minRank,g.avgRank,Math.log(Math.max(g.linkInv,1e-6)),g.axisLinkStrength,g.oppSupport,g.oppRep,g.eligibleMass,Math.log(Math.max(g.topOdds,1)),g.points,g.linkCount]}
function fitLogistic(rows){
 const X=rows.map(r=>feature(r.g)),y=rows.map(r=>r.g.hit),m=FEATS.length,mean=Array(m).fill(0),sd=Array(m).fill(0);
 for(const x of X)for(let j=0;j<m;j++)mean[j]+=x[j]/X.length;
 for(const x of X)for(let j=0;j<m;j++)sd[j]+=(x[j]-mean[j])**2/X.length;for(let j=0;j<m;j++)sd[j]=Math.sqrt(sd[j])||1;
 const Z=X.map(x=>[1,...x.map((v,j)=>(v-mean[j])/sd[j])]),w=Array(m+1).fill(0),lr=.03,lambda=.8;
 for(let it=0;it<4500;it++){const grad=Array(m+1).fill(0);for(let i=0;i<Z.length;i++){let z=0;for(let j=0;j<w.length;j++)z+=w[j]*Z[i][j];const p=1/(1+Math.exp(-clamp(z,-25,25))),e=p-y[i];for(let j=0;j<w.length;j++)grad[j]+=e*Z[i][j]/Z.length}for(let j=1;j<w.length;j++)grad[j]+=lambda*w[j]/Z.length;for(let j=0;j<w.length;j++)w[j]-=lr*grad[j]}
 return{w,mean,sd,predict(g){const x=feature(g),z=[1,...x.map((v,j)=>(v-mean[j])/sd[j])];let s=0;for(let j=0;j<w.length;j++)s+=w[j]*z[j];return 1/(1+Math.exp(-clamp(s,-25,25)))}}
}
function auc(rows,model){const a=rows.map(r=>({y:r.g.hit,p:model.predict(r.g)})).sort((x,y)=>x.p-y.p);let pos=a.reduce((s,x)=>s+x.y,0),neg=a.length-pos;if(!pos||!neg)return null;let rank=1,sumPos=0;for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&Math.abs(a[j].p-a[i].p)<1e-12)j++;const avg=(rank+(rank+j-i-1))/2;for(let k=i;k<j;k++)if(a[k].y)sumPos+=avg;rank+=j-i;i=j}return(sumPos-pos*(pos+1)/2)/(pos*neg)}
function ticketsOf(gs){const m=new Map();for(const g of gs)for(const t of g.tickets)m.set(t.key,t);return[...m.values()]}
function evalSet(r,gs){const ts=ticketsOf(gs),actual=pair(r.first.horse,r.second.horse),hit=ts.some(t=>t.key===actual),burden=ts.reduce((s,t)=>s+1/t.odds,0),comp=burden?1/burden:null,q=qMap(r).get(actual);return{hit,points:ts.length,burden,comp,eqPay:hit&&q?q.odds:0,dutchPay:hit&&comp?comp:0}}
function selectForTarget(groups,model,target){
 const core=groups.filter(g=>g.type==='core'),opp=groups.filter(g=>g.type==='opp');for(const g of opp){g.pred=model.predict(g);g.eff=g.pred/Math.max(g.burden,1e-9)}
 let kept=core.slice(),burden=ticketsOf(kept).reduce((s,t)=>s+1/t.odds,0),budget=1/target;
 if(burden>budget+1e-12)return{groups:[],skipped:'core_burden'};
 const sorted=opp.slice().sort((a,b)=>b.eff-a.eff||a.minRank-b.minRank);
 for(const g of sorted){const trial=ticketsOf([...kept,g]),b=trial.reduce((s,t)=>s+1/t.odds,0);if(b<=budget+1e-12)kept.push(g)}
 if(!ticketsOf(kept).length)return{groups:[],skipped:'empty'};return{groups:kept,skipped:null}
}
function metrics(races,model,target=null){
 let eligible=0,buy=0,hits=0,pts=0,compSum=0,eqStake=0,eqPay=0,dutch=0,baseHitsLost=0,baseHits=0,skips=0;
 for(const r of races){const b=buildGroups(r);if(b.axes.length<2||b.fr.end>6)continue;eligible++;const base=evalSet(r,b.groups);if(base.hit)baseHits++;
   const sel=target==null?{groups:b.groups}:selectForTarget(b.groups.map(g=>({...g,tickets:g.tickets.map(t=>({...t}))})),model,target);
   if(!sel.groups.length){skips++;if(base.hit)baseHitsLost++;continue}
   const e=evalSet(r,sel.groups);buy++;hits+=e.hit?1:0;pts+=e.points;compSum+=e.comp||0;eqStake+=e.points;eqPay+=e.eqPay;dutch+=e.dutchPay;if(base.hit&&!e.hit)baseHitsLost++;
 }
 return{eligible,buy,purchaseRate:eligible?buy/eligible:null,hits,hitRate:buy?hits/buy:null,coverage:eligible?hits/eligible:null,avgPoints:buy?pts/buy:null,avgComposite:buy?compSum/buy:null,equalStakeROI:eqStake?eqPay/eqStake:null,dutchROI:buy?dutch/buy:null,baseHits,baseHitsLost,retainedBaseHits:baseHits?1-baseHitsLost/baseHits:null,skips}
}
function bucket(rows,key,bounds){
 return bounds.map(([lo,hi,label])=>{const a=rows.filter(x=>key(x.g)>=lo&&key(x.g)<hi),h=a.reduce((s,x)=>s+x.g.hit,0);return{label,n:a.length,hits:h,rate:a.length?h/a.length:null}})
}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}function fmt(x,n=2){return x==null?'—':Number(x).toFixed(n)}
function table(a,cols){let s='|'+cols.map(c=>c.h).join('|')+'|\\n|'+cols.map(()=> '---').join('|')+'|\\n';for(const x of a)s+='|'+cols.map(c=>c.f(x)).join('|')+'|\\n';return s}
const files=fs.readdirSync(DIR).filter(f=>/^races-\d\d-\d\.json$/.test(f)),races=files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))).sort((a,b)=>a.id.localeCompare(b.id)),dev=races.filter(r=>r.year<=2023),test24=races.filter(r=>r.year===2024),test25=races.filter(r=>r.year===2025),test=races.filter(r=>r.year>=2024);
const devRows=[];for(const r of dev){const b=buildGroups(r);if(b.axes.length<2||b.fr.end>6)continue;for(const g of b.groups.filter(x=>x.type==='opp'))devRows.push({r,g})}
const testRows=[];for(const r of test){const b=buildGroups(r);if(b.axes.length<2||b.fr.end>6)continue;for(const g of b.groups.filter(x=>x.type==='opp'))testRows.push({r,g})}
const model=fitLogistic(devRows),grid=[{name:'全相手枠',target:null},{name:'合成3.5倍以上',target:3.5},{name:'合成4.0倍以上',target:4.0},{name:'合成4.5倍以上',target:4.5}].map(x=>({name:x.name,target:x.target,dev:metrics(dev,model,x.target),test24:metrics(test24,model,x.target),test25:metrics(test25,model,x.target),test:metrics(test,model,x.target)}));
const scoreBins=(rows)=>{const ps=rows.map(x=>model.predict(x.g)).sort((a,b)=>a-b),q=t=>ps[Math.floor((ps.length-1)*t)]||0;return bucket(rows,g=>model.predict(g),[[0,q(.25),'下位25%'],[q(.25),q(.5),'25〜50%'],[q(.5),q(.75),'50〜75%'],[q(.75),1.000001,'上位25%']])};
const devBins=scoreBins(devRows),testBins=scoreBins(testRows);
const interpret={
 rank:bucket(devRows,g=>g.minRank,[[3,7,'枠連3〜6位'],[7,11,'7〜10位'],[11,15,'11〜14位']]),
 support:bucket(devRows,g=>g.oppSupport,[[0,.05,'相手枠支持<5%'],[.05,.10,'5〜10%'],[.10,1,'10%以上']]),
 rep:bucket(devRows,g=>g.oppRep,[[0,.6,'代表度<60%'],[.6,.8,'60〜80%'],[.8,1.0001,'80%以上']]),
 points:bucket(devRows,g=>g.points,[[1,2,'1点'],[2,3,'2点'],[3,99,'3点以上']])
};
const report={usable:races.length,devN:dev.length,test24N:test24.length,test25N:test25.length,devGroupN:devRows.length,testGroupN:testRows.length,model:{features:FEATS,weights:model.w,means:model.mean,sds:model.sd,aucDev:auc(devRows,model),aucTest:auc(testRows,model)},grid,devBins,testBins,interpret};
fs.mkdirSync('analysis/waku-backtest/weak-frame-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/weak-frame-out/report.json',JSON.stringify(report,null,2));
let md='# 2軸BC包囲：弱い相手枠の削減検証\\n\\n';
md+='全馬連・全枠連オッズを取得できた '+races.length+'/393R。主分析は現行1着レンジ end<=6。2022–23で相手枠モデルを学習し、2024・2025へ固定適用。相手馬は単勝50倍未満を基本。\\n\\n';
md+='## 相手枠モデル\\n\\n説明変数：枠連順位/オッズ、軸強度、相手枠市場支持、枠内代表度、50倍未満の支持残存率、変換点数、接続軸数。開発AUC '+fmt(report.model.aucDev,3)+'、2024–25 AUC '+fmt(report.model.aucTest,3)+'。\\n\\n';
md+='## 合成オッズ制約（2024–25ホールドアウト）\\n\\n'+table(grid,[{h:'方式',f:x=>x.name},{h:'購入率',f:x=>pct(x.test.purchaseRate)},{h:'的中率/購入',f:x=>pct(x.test.hitRate)},{h:'全対象捕捉',f:x=>pct(x.test.coverage)},{h:'平均点数',f:x=>fmt(x.test.avgPoints,2)},{h:'平均合成',f:x=>fmt(x.test.avgComposite,2)+'倍'},{h:'均等買いROI',f:x=>pct(x.test.equalStakeROI)},{h:'ダッチROI',f:x=>pct(x.test.dutchROI)},{h:'元的中保持',f:x=>pct(x.test.retainedBaseHits)}]);
md+='\\n## 年別固定検証\\n\\n'+table(grid.flatMap(x=>[{name:x.name,year:'2024',m:x.test24},{name:x.name,year:'2025',m:x.test25}]),[{h:'方式',f:x=>x.name},{h:'年',f:x=>x.year},{h:'購入N',f:x=>x.m.buy},{h:'的中率',f:x=>pct(x.m.hitRate)},{h:'平均点',f:x=>fmt(x.m.avgPoints,2)},{h:'平均合成',f:x=>fmt(x.m.avgComposite,2)+'倍'},{h:'均等ROI',f:x=>pct(x.m.equalStakeROI)},{h:'ダッチROI',f:x=>pct(x.m.dutchROI)}]);
md+='\\n## モデルが「弱い」とした相手枠は本当に弱いか\\n\\n'+table(devBins.map((x,i)=>({label:x.label,d:x,t:testBins[i]})),[{h:'予測スコア帯',f:x=>x.label},{h:'2022–23 N',f:x=>x.d.n},{h:'条件付き実的中',f:x=>pct(x.d.rate)},{h:'2024–25 N',f:x=>x.t.n},{h:'条件付き実的中',f:x=>pct(x.t.rate)}]);
md+='\\n## 解釈用：2022–23の単変量傾向\\n\\n';
for(const [k,v] of Object.entries(interpret)){md+='### '+k+'\\n\\n'+table(v,[{h:'帯',f:x=>x.label},{h:'N',f:x=>x.n},{h:'相手枠が実際に捕捉',f:x=>pct(x.rate)}])+'\\n'}
fs.writeFileSync('analysis/waku-backtest/weak-frame-out/report.md',md);console.log(md);