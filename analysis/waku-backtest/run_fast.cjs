const fs=require('fs');const cheerio=require('cheerio');
const ids=JSON.parse(fs.readFileSync('analysis/waku-backtest/race_ids_2022_2025.json','utf8'));
const CUTS=[10,12,14,16],RETS=[.70,.80,.85,.90,.95],CAPS=[30,40,50,100];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pair=(a,b)=>{a=+a;b=+b;return a<b?a+'-'+b:b+'-'+a};
function money(s){const m=String(s||'').replace(/,/g,'').match(/([\d.]+)円?/);return m?+m[1]:null}
async function get(url){let e;for(let k=0;k<3;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}catch(x){e=x;await sleep(300*(k+1))}}throw e}
function cells($,tr){return $(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get()}
function parse(html,id){
 const $=cheerio.load(html),horses=[],payout={};
 $('tr').each((_,tr)=>{
  const c=cells($,tr);if(c.length<3)return;
  if(c[0]==='枠連'&&/^[1-8]\s*-\s*[1-8]$/.test(c[1]||'')){payout.framePair=c[1].replace(/\s/g,'');payout.framePay=money(c[2]);payout.frameRank=Number(String(c[3]||'').match(/\d+/)?.[0]||0)}
  if(c[0]==='馬連'&&/^\d{1,2}\s*-\s*\d{1,2}$/.test(c[1]||'')){payout.qPair=c[1].replace(/\s/g,'');payout.qPay=money(c[2]);payout.qRank=Number(String(c[3]||'').match(/\d+/)?.[0]||0)}
  if((/^\d+$/.test(c[0]||'')||c[0]==='中止'||c[0]==='除外')&&/^\d+$/.test(c[1]||'')&&/^\d+$/.test(c[2]||'')&&+c[1]<=8&&+c[2]<=18){
    let pop=null,odds=null;
    for(const z of c){const m=z.match(/^(\d+)\(([\d.]+)\)$/);if(m){pop=+m[1];odds=+m[2];break}}
    if(odds)horses.push({finish:/^\d+$/.test(c[0])?+c[0]:null,frame:+c[1],horse:+c[2],pop,odds,w:1/odds})
  }
 });
 const first=horses.find(x=>x.finish===1),second=horses.find(x=>x.finish===2);
 if(!first||!second||!payout.frameRank||!payout.qPay||horses.length<5)throw Error('parse '+JSON.stringify({h:horses.length,payout,first:!!first,second:!!second}));
 return{id,year:2000+ +id.slice(0,2),raceNo:+id.slice(-2),horses,first,second,frameRank:payout.frameRank,framePair:payout.framePair,qPay:payout.qPay,qOdds:payout.qPay/100};
}
function combos(r){
 const [fa,fb]=r.framePair.split('-').map(Number),A=r.horses.filter(x=>x.frame===fa),B=r.horses.filter(x=>x.frame===fb),o=[];
 if(fa===fb){for(let i=0;i<A.length;i++)for(let j=i+1;j<A.length;j++)o.push({key:pair(A[i].horse,A[j].horse),raw:A[i].w*A[j].w,a:A[i],b:A[j]})}
 else for(const a of A)for(const b of B)o.push({key:pair(a.horse,b.horse),raw:a.w*b.w,a,b});
 const tot=o.reduce((s,x)=>s+x.raw,0);o.forEach(x=>x.p=x.raw/tot);o.sort((a,b)=>b.p-a.p);return o
}
function retained(r,ret){const o=combos(r),out=[];let s=0;for(const x of o){out.push(x);s+=x.p;if(s+1e-12>=ret)break}return out}
function zone(k){if(k===1||(k>=13&&k<=18))return'A';if(k===2||k===3||(k>=10&&k<=12))return'B';if(k>=4&&k<=9)return'C';return'D'}
function wilson(h,n,z=1.96){if(!n)return null;const p=h/n,z2=z*z,d=1+z2/n,c=(p+z2/(2*n))/d,m=z*Math.sqrt((p*(1-p)+z2/(4*n))/n)/d;return{low:Math.max(0,c-m),high:Math.min(1,c+m)}}
function pct(x){return x==null?'—':(100*x).toFixed(1)+'%'}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){let i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
async function fetchRace(id,i){try{const h=await get('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/');if((i+1)%50===0)console.log('fetched',i+1);return parse(h,id)}catch(e){console.error('FAIL',id,e.message);return{id,error:e.message}}}
function stat(rows,cut,ret){
 let fh=0,ch=0,pts=0;for(const r of rows){const f=r.frameRank>=3&&r.frameRank<=cut;if(f)fh++;const k=retained(r,ret);pts+=f?k.length:0;if(f&&k.some(x=>x.key===pair(r.first.horse,r.second.horse)))ch++}
 return{n:rows.length,cut,ret,frameHits:fh,frameRate:fh/rows.length,convertedHits:ch,convertedRate:ch/rows.length,conversionGivenFrame:fh?ch/fh:null,avgPointsWhenFrameTargeted:fh?pts/fh:null,frameCI:wilson(fh,rows.length),convertedCI:wilson(ch,rows.length)}
}
function capStat(rows,cut,cap){let fh=0,h=0,pts=0;for(const r of rows){if(!(r.frameRank>=3&&r.frameRank<=cut))continue;fh++;const k=combos(r).filter(x=>x.a.odds<cap&&x.b.odds<cap);pts+=k.length;if(k.some(x=>x.key===pair(r.first.horse,r.second.horse)))h++}return{n:rows.length,cut,cap,frameHits:fh,hit:h,conversionGivenFrame:fh?h/fh:null,avgPoints:fh?pts/fh:null}}
function zones(rows){const z={A:0,B:0,C:0,D:0};rows.forEach(r=>z[zone(r.frameRank)]++);return Object.fromEntries(Object.entries(z).map(([k,n])=>[k,{n,rate:n/rows.length}]))}
function marginal(rows,a,b,ret){let addFrame=0,addConv=0,extraPts=0;for(const r of rows){const A=r.frameRank>=3&&r.frameRank<=a,B=r.frameRank>=3&&r.frameRank<=b;if(B&&!A){addFrame++;const k=retained(r,ret);extraPts+=k.length;if(k.some(x=>x.key===pair(r.first.horse,r.second.horse)))addConv++}}return{from:a,to:b,ret,n:rows.length,addFrame,addConv,extraPts,pointsPerAddedConverted:addConv?extraPts/addConv:null}}
function winningPairMass(rows){const thresholds=[.5,.6,.7,.8,.85,.9,.95,1],out=Object.fromEntries(thresholds.map(t=>[t,0]));let avgRank=0;for(const r of rows){const cs=combos(r),act=pair(r.first.horse,r.second.horse);let cum=0,found=1;for(let i=0;i<cs.length;i++){cum+=cs[i].p;if(cs[i].key===act){found=cum;avgRank+=i+1;break}}for(const t of thresholds)if(found<=t+1e-12)out[t]++}return{n:rows.length,avgActualPairRank:avgRank/rows.length,capture:Object.fromEntries(thresholds.map(t=>[t,{n:out[t],rate:out[t]/rows.length}]))}}
function mdTable(a,cols){let s='|'+cols.map(c=>c.h).join('|')+'|\\n|'+cols.map(()=> '---').join('|')+'|\\n';for(const x of a)s+='|'+cols.map(c=>c.f(x)).join('|')+'|\\n';return s}
(async()=>{
 fs.mkdirSync('analysis/waku-backtest/fast-out',{recursive:true});
 const raw=await mapLimit(ids,12,fetchRace),good=raw.filter(x=>!x.error),bad=raw.filter(x=>x.error),dev=good.filter(x=>x.year<=2023),test=good.filter(x=>x.year>=2024);
 const grid=[];for(const c of CUTS)for(const r of RETS)grid.push({dev:stat(dev,c,r),test:stat(test,c,r),all:stat(good,c,r)});
 const report={requested:ids.length,usable:good.length,failures:bad,devN:dev.length,testN:test.length,zonesAll:zones(good),zonesDev:zones(dev),zonesTest:zones(test),grid,marginal12to14:RETS.map(r=>({dev:marginal(dev,12,14,r),test:marginal(test,12,14,r)})),caps14:CAPS.map(c=>({dev:capStat(dev,14,c),test:capStat(test,14,c)})),winningPairMassDev:winningPairMass(dev),winningPairMassTest:winningPairMass(test)};
 fs.writeFileSync('analysis/waku-backtest/fast-out/report.json',JSON.stringify(report,null,2));
 let md='# 枠連BC思想・高速過去検証\\n\\n利用可能 '+good.length+'/'+ids.length+'R。2022–23 '+dev.length+'R / 2024–25 '+test.length+'R。確定オッズ。\\n\\n## 実枠連区画\\n\\n';
 md+=mdTable(['A','B','C','D'].map(k=>({k,a:report.zonesAll[k],d:report.zonesDev[k],t:report.zonesTest[k]})),[{h:'区画',f:x=>x.k},{h:'全体',f:x=>pct(x.a.rate)},{h:'2022-23',f:x=>pct(x.d.rate)},{h:'2024-25',f:x=>pct(x.t.rate)}]);
 md+='\\n## 枠連3〜K捕捉 → 正解枠内を単勝支持で削った場合\\n\\n';
 md+=mdTable(grid.map(x=>x.test),[{h:'枠連帯',f:x=>'3〜'+x.cut},{h:'保持率',f:x=>Math.round(x.ret*100)+'%'},{h:'枠捕捉',f:x=>pct(x.frameRate)},{h:'最終捕捉',f:x=>pct(x.convertedRate)},{h:'枠的中時の馬変換成功',f:x=>pct(x.conversionGivenFrame)},{h:'正解枠内の平均残し点数',f:x=>x.avgPointsWhenFrameTargeted?.toFixed(2)||'—'}]);
 md+='\\n## 12→14位を足す限界効率（2024–25）\\n\\n';
 md+=mdTable(report.marginal12to14.map(x=>x.test),[{h:'保持率',f:x=>Math.round(x.ret*100)+'%'},{h:'追加枠捕捉',f:x=>x.addFrame},{h:'追加最終捕捉',f:x=>x.addConv},{h:'追加正解枠内点数',f:x=>x.extraPts},{h:'追加1捕捉あたり点数',f:x=>x.pointsPerAddedConverted?.toFixed(2)||'—'}]);
 md+='\\n## 正解枠内の固定単勝カット（3〜14・2024–25）\\n\\n';
 md+=mdTable(report.caps14.map(x=>x.test),[{h:'単勝上限',f:x=>'<'+x.cap+'倍'},{h:'枠的中時の変換成功',f:x=>pct(x.conversionGivenFrame)},{h:'正解枠内平均点',f:x=>x.avgPoints?.toFixed(2)||'—'}]);
 md+='\\n## 正解枠内で実際の馬連がどの支持位置にいたか（2024–25）\\n\\n';
 md+='平均順位 '+report.winningPairMassTest.avgActualPairRank.toFixed(2)+'位。\\n\\n';
 md+=mdTable(Object.entries(report.winningPairMassTest.capture).map(([t,v])=>({t:+t,v})),[{h:'枠内累積支持まで残す',f:x=>Math.round(x.t*100)+'%'},{h:'実馬連捕捉',f:x=>pct(x.v.rate)}]);
 if(bad.length)md+='\\n取得失敗 '+bad.length+'R。report.jsonに明記。\\n';
 fs.writeFileSync('analysis/waku-backtest/fast-out/report.md',md);console.log(md);
})().catch(e=>{console.error(e);process.exit(1)});