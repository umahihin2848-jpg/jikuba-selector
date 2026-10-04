const fs=require('fs');
const cheerio=require('cheerio');

const ids=JSON.parse(fs.readFileSync('analysis/waku-backtest/race_ids_2022_2025.json','utf8'));
const CUTS=[10,12,14,16], RETS=[0.70,0.80,0.85,0.90,0.95], CAPS=[30,40,50,100];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pair=(a,b)=>{a=Number(a);b=Number(b);return a<b?a+'-'+b:b+'-'+a};
function num(s){const x=Number(String(s).replace(/,/g,'').replace(/倍/g,''));return Number.isFinite(x)?x:null}
async function fetchHtml(url){
  let last;
  for(let k=0;k<4;k++){
    try{
      const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; historical-racing-research/1.0)','accept-language':'ja,en-US;q=0.7'},signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const t=await r.text();if(t.length<1000)throw new Error('short html');
      return t;
    }catch(e){last=e;await sleep(500*(k+1))}
  }
  throw last;
}
function cells($,tr){return $(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get()}
function parseTfw(html){
  const $=cheerio.load(html), horses=[], frames=[];
  $('tr').each((_,tr)=>{
    const c=cells($,tr);
    if(c.length>=5){
      // ninki=1: popularity, frame, horse, name, win, place
      if(/^\d+$/.test(c[0]||'')&&/^\d+$/.test(c[1]||'')&&/^\d+$/.test(c[2]||'')&&Number(c[1])<=8&&Number(c[2])<=18){
        const o=num(c[4]);
        if(o&&o<1000)horses.push({pop:Number(c[0]),frame:Number(c[1]),horse:Number(c[2]),name:c[3],win:o,w:1/o});
      }
    }
    if(c.length>=3&&/^\d+$/.test(c[0]||'')&&/^[1-8]\s*-\s*[1-8]$/.test(c[1]||'')){
      const o=num(c[2]); if(o)frames.push({rank:Number(c[0]),pair:c[1].replace(/\s/g,''),odds:o});
    }
  });
  const hu=[...new Map(horses.map(x=>[x.horse,x])).values()].sort((a,b)=>a.horse-b.horse);
  const fu=[...new Map(frames.map(x=>[x.rank,x])).values()].sort((a,b)=>a.rank-b.rank);
  if(hu.length<5||fu.length<10)throw new Error('parse tfw horses='+hu.length+' frames='+fu.length);
  return{horses:hu,frames:fu};
}
function parseResult(html){
  const $=cheerio.load(html), rows=[];
  $('tr').each((_,tr)=>{
    const c=cells($,tr); if(c.length<3)return;
    if((c[0]==='1'||c[0]==='2')&&/^\d+$/.test(c[1]||'')&&/^\d+$/.test(c[2]||'')&&Number(c[1])<=8&&Number(c[2])<=18){
      rows.push({finish:Number(c[0]),frame:Number(c[1]),horse:Number(c[2])});
    }
  });
  const f=rows.find(x=>x.finish===1),s=rows.find(x=>x.finish===2);
  if(!f||!s)throw new Error('parse result');
  return{first:f,second:s};
}
function parseUr(html){
  const $=cheerio.load(html), out=new Map();
  $('tr').each((_,tr)=>{
    const c=cells($,tr);if(c.length<3)return;
    if(/^\d+$/.test(c[0]||'')&&/^\d{1,2}\s*-\s*\d{1,2}$/.test(c[1]||'')){
      const o=num(c[2]);if(o)out.set(c[1].replace(/\s/g,''),{rank:Number(c[0]),odds:o});
    }
  });
  if(out.size<10)throw new Error('parse ur '+out.size);
  return out;
}
function frameCombos(horses,fp){
  const [fa,fb]=fp.split('-').map(Number), A=horses.filter(h=>h.frame===fa),B=horses.filter(h=>h.frame===fb),out=[];
  if(fa===fb){
    for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++)out.push({key:pair(A[i].horse,A[j].horse),a:A[i],b:A[j],raw:A[i].w*A[j].w});
  }else{
    for(const a of A)for(const b of B)out.push({key:pair(a.horse,b.horse),a,b,raw:a.w*b.w});
  }
  const total=out.reduce((s,x)=>s+x.raw,0);out.forEach(x=>x.p=total?x.raw/total:0);out.sort((a,b)=>b.p-a.p);
  let cum=0;out.forEach(x=>{cum+=x.p;x.cum=cum});
  return out;
}
function keepByRetention(combos,r){
  if(!combos.length)return[];const out=[];let c=0;
  for(const x of combos){out.push(x);c+=x.p;if(c+1e-12>=r)break}
  return out;
}
function zone(rank){if(rank===1||(rank>=13&&rank<=18))return'A';if(rank===2||rank===3||(rank>=10&&rank<=12))return'B';if(rank>=4&&rank<=9)return'C';return'D'}
function wilson(h,n,z=1.96){if(!n)return null;const p=h/n,z2=z*z,d=1+z2/n,c=(p+z2/(2*n))/d,m=z*Math.sqrt((p*(1-p)+z2/(4*n))/n)/d;return{low:Math.max(0,c-m),high:Math.min(1,c+m)}}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}
async function mapLimit(arr,limit,fn){
  const out=new Array(arr.length);let next=0;
  async function worker(){while(true){const i=next++;if(i>=arr.length)return;out[i]=await fn(arr[i],i)}}
  await Promise.all(Array.from({length:limit},worker));return out;
}
async function getRace(id,i){
  try{
    const base='https://sports.yahoo.co.jp/keiba/race/';
    const [tfw,res,ur]=await Promise.all([
      fetchHtml(base+'odds/tfw/'+id+'?ninki=1'),
      fetchHtml(base+'result/'+id+'/'),
      fetchHtml(base+'odds/ur/'+id+'?ninki=1')
    ]);
    const a=parseTfw(tfw),b=parseResult(res),u=parseUr(ur);
    const actualFrame=pair(b.first.frame,b.second.frame),fm=a.frames.find(x=>x.pair===actualFrame);
    if(!fm)throw new Error('actual frame rank missing '+actualFrame);
    if(!u.get(pair(b.first.horse,b.second.horse)))throw new Error('actual quinella missing');
    if((i+1)%20===0)console.log('fetched',i+1,'/',ids.length);
    await sleep(50);
    return{id,year:2000+Number(id.slice(0,2)),raceNo:Number(id.slice(-2)),horses:a.horses,frames:a.frames,ur:[...u.entries()],first:b.first,second:b.second,actualFrame,actualFrameRank:fm.rank,zone:zone(fm.rank)};
  }catch(e){console.error('FAIL',id,e.message);return{id,error:e.message}}
}
function evalRace(r,cut,ret){
  const target=r.frames.filter(x=>x.rank>=3&&x.rank<=cut),candidate=new Map();
  for(const f of target){
    const combos=keepByRetention(frameCombos(r.horses,f.pair),ret);
    for(const c of combos)candidate.set(c.key,c);
  }
  const actual=pair(r.first.horse,r.second.horse),frameHit=r.actualFrameRank>=3&&r.actualFrameRank<=cut,hit=candidate.has(actual),points=candidate.size,ur=new Map(r.ur),q=ur.get(actual);
  const payout=hit&&q?q.odds*100:0,stake=points*100;
  return{frameHit,hit,points,stake,payout,roi:stake?payout/stake:null};
}
function evalCap(r,cut,cap){
  const target=r.frames.filter(x=>x.rank>=3&&x.rank<=cut),candidate=new Set();
  for(const f of target){
    for(const c of frameCombos(r.horses,f.pair))if(c.a.win<cap&&c.b.win<cap)candidate.add(c.key);
  }
  const actual=pair(r.first.horse,r.second.horse),points=candidate.size,ur=new Map(r.ur),q=ur.get(actual),hit=candidate.has(actual);
  return{hit,frameHit:r.actualFrameRank>=3&&r.actualFrameRank<=cut,points,stake:points*100,payout:hit&&q?q.odds*100:0};
}
function summary(rows,cut,ret){
  const xs=rows.map(r=>evalRace(r,cut,ret)),n=xs.length,fh=xs.filter(x=>x.frameHit).length,h=xs.filter(x=>x.hit).length,pts=xs.reduce((s,x)=>s+x.points,0),stake=xs.reduce((s,x)=>s+x.stake,0),pay=xs.reduce((s,x)=>s+x.payout,0);
  return{n,cut,ret,frameHits:fh,frameRate:fh/n,hits:h,hitRate:h/n,conversionGivenFrame:fh?h/fh:null,avgPoints:pts/n,pointEfficiency:pts?h/pts:null,stake,payout:pay,roi:stake?pay/stake:null,frameCI:wilson(fh,n),hitCI:wilson(h,n)};
}
function capSummary(rows,cut,cap){
  const xs=rows.map(r=>evalCap(r,cut,cap)),n=xs.length,fh=xs.filter(x=>x.frameHit).length,h=xs.filter(x=>x.hit).length,pts=xs.reduce((s,x)=>s+x.points,0),stake=xs.reduce((s,x)=>s+x.stake,0),pay=xs.reduce((s,x)=>s+x.payout,0);
  return{n,cut,cap,frameRate:fh/n,hitRate:h/n,conversionGivenFrame:fh?h/fh:null,avgPoints:pts/n,roi:stake?pay/stake:null};
}
function zoneStats(rows){const z={A:0,B:0,C:0,D:0};for(const r of rows)z[r.zone]++;return Object.fromEntries(Object.entries(z).map(([k,v])=>[k,{n:v,rate:v/rows.length}]))}
function axisHorseStats(rows,cut=14){
  const bins=[{k:'<3',lo:0,hi:3},{k:'3-5',lo:3,hi:5},{k:'5-10',lo:5,hi:10},{k:'10-20',lo:10,hi:20},{k:'20-40',lo:20,hi:40},{k:'40+',lo:40,hi:1e9}];
  const acc=Object.fromEntries(bins.map(b=>[b.k,{n:0,top2:0,repSum:0}]));
  for(const r of rows){
    const groups={};for(const h of r.horses){(groups[h.frame]??=[]).push(h)}
    const activeFrames=new Set(r.frames.filter(x=>x.rank>=3&&x.rank<=cut).flatMap(x=>x.pair.split('-').map(Number)));
    for(const h of r.horses){
      if(!activeFrames.has(h.frame))continue;
      const bin=bins.find(b=>h.win>=b.lo&&h.win<b.hi);if(!bin)continue;
      const denom=groups[h.frame].reduce((s,x)=>s+x.w,0),rep=denom?h.w/denom:0;
      const a=acc[bin.k];a.n++;a.repSum+=rep;if(h.horse===r.first.horse||h.horse===r.second.horse)a.top2++;
    }
  }
  for(const a of Object.values(acc)){a.top2Rate=a.n?a.top2/a.n:null;a.avgFrameRep=a.n?a.repSum/a.n:null}
  return acc;
}
function mdTable(arr,cols){
  let s='|'+cols.map(c=>c.h).join('|')+'|\\n|'+cols.map(()=> '---').join('|')+'|\\n';
  for(const x of arr)s+='|'+cols.map(c=>c.f(x)).join('|')+'|\\n';return s;
}
(async()=>{
  fs.mkdirSync('analysis/waku-backtest/out',{recursive:true});
  const raw=await mapLimit(ids,6,getRace),good=raw.filter(x=>!x.error),bad=raw.filter(x=>x.error);
  fs.writeFileSync('analysis/waku-backtest/out/races.json',JSON.stringify(good));
  const dev=good.filter(r=>r.year<=2023),test=good.filter(r=>r.year>=2024);
  const grid=[];for(const cut of CUTS)for(const ret of RETS)grid.push({dev:summary(dev,cut,ret),test:summary(test,cut,ret),all:summary(good,cut,ret)});
  const caps=[];for(const cut of CUTS)for(const cap of CAPS)caps.push({test:capSummary(test,cut,cap),all:capSummary(good,cut,cap)});
  const bestDev=[...grid].sort((a,b)=>(b.dev.roi-a.dev.roi)||((b.dev.hitRate-b.dev.hitRate)))[0];
  const zoneAll=zoneStats(good),zoneDev=zoneStats(dev),zoneTest=zoneStats(test);
  const report={generatedAt:new Date().toISOString(),requested:ids.length,usable:good.length,failures:bad,devN:dev.length,testN:test.length,zoneAll,zoneDev,zoneTest,grid,caps,bestDevKey:{cut:bestDev.dev.cut,ret:bestDev.dev.ret},bestDevValidation:bestDev.test,axisHorseBins14:{dev:axisHorseStats(dev,14),test:axisHorseStats(test,14)}};
  fs.writeFileSync('analysis/waku-backtest/out/report.json',JSON.stringify(report,null,2));
  const rows=grid.map(g=>({cut:g.test.cut,ret:g.test.ret,dev:g.dev,test:g.test}));
  let md='# 枠連BCコンバーター 過去検証 2022–2025\\n\\n';
  md+='対象：既存393レース（2022–2025）。2022–23を条件設定、2024–25をホールドアウト。利用可能 '+good.length+'、取得失敗 '+bad.length+'。確定単勝・枠連・馬連オッズを使用。\\n\\n';
  md+='## 実際の枠連決着区画\\n\\n'+mdTable(['A','B','C','D'].map(k=>({k,a:zoneAll[k],d:zoneDev[k],t:zoneTest[k]})),[
    {h:'区画',f:x=>x.k},{h:'全体',f:x=>x.a.n+'/'+good.length+' ('+pct(x.a.rate)+')'},{h:'2022-23',f:x=>x.d.n+'/'+dev.length+' ('+pct(x.d.rate)+')'},{h:'2024-25',f:x=>x.t.n+'/'+test.length+' ('+pct(x.t.rate)+')'}
  ]);
  md+='\\n## 3〜K枠連 → 枠内単勝支持で馬連へ変換\\n\\n';
  md+=mdTable(rows,[
    {h:'枠連帯',f:x=>'3〜'+x.cut},{h:'保持率',f:x=>Math.round(x.ret*100)+'%'},{h:'開発 枠捕捉',f:x=>pct(x.dev.frameRate)},{h:'開発 最終捕捉',f:x=>pct(x.dev.hitRate)},{h:'検証 枠捕捉',f:x=>pct(x.test.frameRate)},{h:'検証 最終捕捉',f:x=>pct(x.test.hitRate)},{h:'検証 変換成功/枠的中',f:x=>pct(x.test.conversionGivenFrame)},{h:'検証 平均点',f:x=>x.test.avgPoints.toFixed(1)},{h:'検証 ROI',f:x=>pct(x.test.roi)}
  ]);
  md+='\\n## 開発期間で最良ROIだった設定を2024–25へ固定適用\\n\\n';
  md+='開発上の選択：**3〜'+bestDev.dev.cut+'位 × '+Math.round(bestDev.dev.ret*100)+'%保持**。\\n\\n';
  md+='2024–25：枠捕捉 '+pct(bestDev.test.frameRate)+'、最終馬連捕捉 '+pct(bestDev.test.hitRate)+'、枠的中時の変換成功 '+pct(bestDev.test.conversionGivenFrame)+'、平均 '+bestDev.test.avgPoints.toFixed(1)+'点、均等買いROI '+pct(bestDev.test.roi)+'。\\n\\n';
  md+='## 単勝オッズ固定上限（参考）\\n\\n'+mdTable(caps.filter(x=>x.test.cut===14).map(x=>x.test),[
    {h:'3〜14位＋単勝上限',f:x=>x.cap+'倍未満'},{h:'最終捕捉',f:x=>pct(x.hitRate)},{h:'枠的中時変換成功',f:x=>pct(x.conversionGivenFrame)},{h:'平均点',f:x=>x.avgPoints.toFixed(1)},{h:'ROI',f:x=>pct(x.roi)}
  ]);
  md+='\\n## 軸候補の単勝オッズ帯（3〜14位に関係する枠の全馬・馬単位）\\n\\n';
  const ab=report.axisHorseBins14;
  md+=mdTable(Object.keys(ab.test).map(k=>({k,d:ab.dev[k],t:ab.test[k]})),[
    {h:'単勝帯',f:x=>x.k},{h:'開発N',f:x=>x.d.n},{h:'開発2着内',f:x=>pct(x.d.top2Rate)},{h:'検証N',f:x=>x.t.n},{h:'検証2着内',f:x=>pct(x.t.top2Rate)},{h:'検証 枠内代表度平均',f:x=>pct(x.t.avgFrameRep)}
  ]);
  if(bad.length)md+='\\n## 取得失敗\\n\\n'+bad.map(x=>'- '+x.id+': '+x.error).join('\\n')+'\\n';
  fs.writeFileSync('analysis/waku-backtest/out/report.md',md);
  console.log(md);
})().catch(e=>{console.error(e);process.exit(1)});