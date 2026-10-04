const fs=require('fs');const cheerio=require('cheerio');
const yy=String(process.env.YY||'');if(!/^(22|23|24|25)$/.test(yy))throw Error('YY required');
const ids=JSON.parse(fs.readFileSync('analysis/waku-backtest/race_ids_2022_2025.json','utf8')).filter(id=>id.startsWith(yy));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function money(s){const m=String(s||'').replace(/,/g,'').match(/([\d.]+)円?/);return m?+m[1]:null}
async function get(url){let e;for(let k=0;k<4;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length<1000)throw Error('short');return t}catch(x){e=x;await sleep([500,1500,3500,6000][k])}}throw e}
function cells($,tr){return $(tr).find('th,td').map((_,x)=>$(x).text().replace(/\s+/g,' ').trim()).get()}
function parse(html,id){
 const $=cheerio.load(html),horses=[],p={};
 $('tr').each((_,tr)=>{
   const c=cells($,tr);if(c.length<3)return;
   if(c[0]==='枠連'&&/^[1-8]\s*-\s*[1-8]$/.test(c[1]||'')){p.framePair=c[1].replace(/\s/g,'');p.framePay=money(c[2]);p.frameRank=Number(String(c[3]||'').match(/\d+/)?.[0]||0)}
   if(c[0]==='馬連'&&/^\d{1,2}\s*-\s*\d{1,2}$/.test(c[1]||'')){p.qPair=c[1].replace(/\s/g,'');p.qPay=money(c[2]);p.qRank=Number(String(c[3]||'').match(/\d+/)?.[0]||0)}
   if((/^\d+$/.test(c[0]||'')||c[0]==='中止'||c[0]==='除外')&&/^\d+$/.test(c[1]||'')&&/^\d+$/.test(c[2]||'')&&+c[1]<=8&&+c[2]<=18){
     let pop=null,odds=null;for(const z of c){const m=z.match(/^(\d+)\(([\d.]+)\)$/);if(m){pop=+m[1];odds=+m[2];break}}
     if(odds)horses.push({finish:/^\d+$/.test(c[0])?+c[0]:null,frame:+c[1],horse:+c[2],pop,odds,w:1/odds});
   }
 });
 const first=horses.find(x=>x.finish===1),second=horses.find(x=>x.finish===2);
 if(!first||!second||!p.frameRank||!p.qPay||horses.length<5)throw Error('parse '+JSON.stringify({h:horses.length,p,first:!!first,second:!!second}));
 return{id,year:2000+ +id.slice(0,2),raceNo:+id.slice(-2),horses,first,second,frameRank:p.frameRank,framePair:p.framePair,qPay:p.qPay,qOdds:p.qPay/100};
}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){const i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
async function one(id,i){try{const h=await get('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/');if((i+1)%20===0)console.log(yy,'fetched',i+1,'/',ids.length);await sleep(80);return parse(h,id)}catch(e){console.error('FAIL',id,e.message);return{id,error:e.message}}}
(async()=>{const raw=await mapLimit(ids,5,one),good=raw.filter(x=>!x.error),bad=raw.filter(x=>x.error);fs.mkdirSync('analysis/waku-backtest/year-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/year-out/races-'+yy+'.json',JSON.stringify(good));fs.writeFileSync('analysis/waku-backtest/year-out/failures-'+yy+'.json',JSON.stringify(bad,null,2));console.log('YEAR',yy,'usable',good.length,'/',ids.length,'fail',bad.length)})().catch(e=>{console.error(e);process.exit(1)});