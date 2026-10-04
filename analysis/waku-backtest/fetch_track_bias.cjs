const fs=require('fs'), cheerio=require('cheerio');
const yy=String(process.env.YY||''), chunk=Number(process.env.CHUNK||0), chunks=4;
if(!/^(22|23|24|25|26)$/.test(yy)||!Number.isInteger(chunk)||chunk<0||chunk>=chunks) throw Error('YY/CHUNK');
const source=yy==='26'?'analysis/waku-backtest/race_ids_2026_external.json':'analysis/waku-backtest/race_ids_2022_2025.json';
const all=JSON.parse(fs.readFileSync(source,'utf8')).map(String).filter(id=>id.startsWith(yy));
const ids=all.filter((_,i)=>i%chunks===chunk);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let e;for(let k=0;k<4;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research','accept-language':'ja,en-US;q=.7'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length<1000)throw Error('short');return t}catch(x){e=x;await sleep([300,800,1600,3000][k])}}throw e}
function norm(s){return String(s||'').replace(/\s+/g,' ').trim()}
function parse(html,id){
 const $=cheerio.load(html),body=norm($('body').text());
 const hm=body.match(/(\d{1,2}:\d{2})発走\s+(.+?)\s+(?:GI{1,3}|G[123]|L)?\s*(芝|ダート)・[^ ]+\s+(\d{3,4})m/);
 const surface=hm?hm[3]:null, distance=hm?+hm[4]:null, rows=[];
 $('tr').each((_,tr)=>{
   const c=$(tr).find('th,td').map((_,x)=>norm($(x).text())).get();
   if(!/^\d+$/.test(c[0]||'')||!/^\d+$/.test(c[1]||'')||!/^\d+$/.test(c[2]||''))return;
   const finish=+c[0],frame=+c[1],horse=+c[2]; if(finish<1||finish>30||frame<1||frame>8||horse<1||horse>18)return;
   let firstPos=null,lastPos=null;
   const s=c[5]||'',m=s.match(/^([0-9-]+?)(\d{2}\.\d)$/);
   if(m){const ps=m[1].split('-').filter(Boolean).map(Number).filter(Number.isFinite);if(ps.length){firstPos=ps[0];lastPos=ps[ps.length-1]}}
   rows.push({finish,frame,horse,firstPos,lastPos});
 });
 return{id,raceNo:+id.slice(-2),surface,distance,rows};
}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){const i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
function smRate(win,n){return (win+1)/(n+2)}
function compute(prior,targetNo){
 const turf=prior.filter(r=>r.surface==='芝'&&r.raceNo<targetNo&&r.rows.length>=5);
 let innerN=0,outerN=0,innerTop=0,outerTop=0,frontN=0,backN=0,frontTop=0,backTop=0;
 let winInner=0,winOuter=0,winFront=0,winBack=0;
 let wInnerN=0,wOuterN=0,wInnerTop=0,wOuterTop=0,wFrontN=0,wBackN=0,wFrontTop=0,wBackTop=0;
 for(const r of turf){
   const rec=Math.exp(-0.25*(targetNo-r.raceNo));
   for(const x of r.rows){
     const top=x.finish<=3,inn=x.frame<=4;
     if(inn){innerN++;if(top)innerTop++;wInnerN+=rec;if(top)wInnerTop+=rec}else{outerN++;if(top)outerTop++;wOuterN+=rec;if(top)wOuterTop+=rec}
     if(x.finish===1){if(inn)winInner++;else winOuter++}
     if(x.firstPos!=null){const front=x.firstPos<=3;if(front){frontN++;if(top)frontTop++;wFrontN+=rec;if(top)wFrontTop+=rec;if(x.finish===1)winFront++}else{backN++;if(top)backTop++;wBackN+=rec;if(top)wBackTop+=rec;if(x.finish===1)winBack++}}
   }
 }
 const innerRate=smRate(innerTop,innerN),outerRate=smRate(outerTop,outerN),frontRate=smRate(frontTop,frontN),backRate=smRate(backTop,backN);
 const wInnerRate=(wInnerTop+1)/(wInnerN+2),wOuterRate=(wOuterTop+1)/(wOuterN+2),wFrontRate=(wFrontTop+1)/(wFrontN+2),wBackRate=(wBackTop+1)/(wBackN+2);
 return{priorTurfRaces:turf.length,priorTurfRunners:innerN+outerN,innerLift:innerRate-outerRate,frontLift:frontRate-backRate,recentInnerLift:wInnerRate-wOuterRate,recentFrontLift:wFrontRate-wBackRate,innerTopRate:innerRate,outerTopRate:outerRate,frontTopRate:frontRate,backTopRate:backRate,winInner,winOuter,winFront,winBack};
}
(async()=>{
 const days=new Map();
 for(const id of ids){const prefix=id.slice(0,8),rn=+id.slice(-2),z=days.get(prefix)||{prefix,maxRn:rn,targets:[]};z.maxRn=Math.max(z.maxRn,rn);z.targets.push(id);days.set(prefix,z)}
 const dayList=[...days.values()];
 const results=await mapLimit(dayList,6,async(d,di)=>{
   const prior=[];
   for(let rn=1;rn<d.maxRn;rn++){
     const id=d.prefix+String(rn).padStart(2,'0');
     try{const h=await get('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/');prior.push(parse(h,id))}catch(e){/* races not held / 404 are ignored */}
     await sleep(15);
   }
   if((di+1)%10===0)console.log(yy,chunk,'days',di+1,'/',dayList.length);
   return d.targets.map(id=>({id,year:2000+ +id.slice(0,2),raceNo:+id.slice(-2),...compute(prior,+id.slice(-2))}));
 });
 const flat=results.flat();
 fs.mkdirSync('analysis/waku-backtest/track-bias-out',{recursive:true});
 fs.writeFileSync('analysis/waku-backtest/track-bias-out/bias-'+yy+'-'+chunk+'.json',JSON.stringify(flat));
 console.log('BIAS',yy,chunk,'targets',flat.length,'days',dayList.length,'withPriorTurf',flat.filter(x=>x.priorTurfRaces>0).length);
})().catch(e=>{console.error(e);process.exit(1)});