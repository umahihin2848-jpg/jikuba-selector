const fs=require('fs');const cheerio=require('cheerio');
const yy=String(process.env.YY||'');if(!/^(22|23|24|25)$/.test(yy))throw Error('YY');
const ids=JSON.parse(fs.readFileSync('analysis/waku-backtest/race_ids_2022_2025.json','utf8')).filter(id=>id.startsWith(yy));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let e;for(let k=0;k<4;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'},signal:AbortSignal.timeout(9000)});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length<1000)throw Error('short');return t}catch(x){e=x;await sleep([300,800,1600,3000][k])}}throw e}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){const i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
function parse(html,id){
 const $=cheerio.load(html),text=$('body').text().replace(/\s+/g,' ').trim(),title=$('title').text().trim();
 const m=text.match(/(\d{1,2}:\d{2})発走\s+(.+?)\s+(GI{1,3}|G[123]|L)?\s*(芝|ダート)・[^ ]+\s+(\d{3,4})m\s+天気：[^ ]+\s+馬場：[^ ]+\s+(.+?)\s+本賞金：/);
 if(!m)throw Error('header parse');
 const pre=m[2].trim(),gradeRaw=(m[3]||'').trim(),surface=m[4],distance=+m[5],cond=m[6].trim();
 let grade='';
 if(/GIII|G3/.test(gradeRaw))grade='G3';else if(/GII|G2/.test(gradeRaw))grade='G2';else if(/GI|G1/.test(gradeRaw))grade='G1';else if(gradeRaw==='L')grade='L';else grade='OP';
 let age='';for(const a of ['2歳','3歳','4歳以上','3歳以上'])if(cond.includes(a)){age=a;break}
 let weight='';for(const w of ['ハンデ','別定','定量','馬齢'])if(cond.includes(w)){weight=w;break}
 return{id,year:2000+ +id.slice(0,2),raceNo:+id.slice(-2),raceName:pre,grade,surface,distance,age,weight,condition:cond,title}
}
async function one(id,i){try{const h=await get('https://sports.yahoo.co.jp/keiba/race/result/'+id+'/');if((i+1)%20===0)console.log(yy,i+1,'/',ids.length);return parse(h,id)}catch(e){console.error('FAIL',id,e.message);return{id,error:e.message}}}
(async()=>{const raw=await mapLimit(ids,8,one),good=raw.filter(x=>!x.error),bad=raw.filter(x=>x.error);fs.mkdirSync('analysis/waku-backtest/meta-out',{recursive:true});fs.writeFileSync('analysis/waku-backtest/meta-out/meta-'+yy+'.json',JSON.stringify(good));fs.writeFileSync('analysis/waku-backtest/meta-out/fail-'+yy+'.json',JSON.stringify(bad,null,2));console.log('META',yy,good.length,'/',ids.length,'fail',bad.length)})().catch(e=>{console.error(e);process.exit(1)});