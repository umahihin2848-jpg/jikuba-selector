const fs=require('fs'),cheerio=require('cheerio');
const year=Number(process.env.YEAR||2022);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){let e;for(let k=0;k<4;k++){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 historical-racing-research'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}catch(x){e=x;await sleep([300,800,1600,3000][k])}}throw e}
function norm(s){return String(s||'').replace(/\s+/g,' ').trim()}
async function monthly(){
 const map=new Map();
 for(let m=1;m<=12;m++){
  const html=await get('https://sports.yahoo.co.jp/keiba/schedule/monthly/?month='+m+'&year='+year),$=cheerio.load(html);
  $('a[href*="/keiba/race/result/"]').each((_,a)=>{
    const href=$(a).attr('href')||'',mm=href.match(/\/keiba\/race\/result\/(\d{10})/);if(!mm)return;
    const id=mm[1]; if(!id.startsWith(String(year).slice(-2)))return;
    const tr=$(a).closest('tr'),row=norm(tr.text()),name=norm($(a).text());
    map.set(id,{id,row,name,month:m});
  });
  await sleep(100);
 }
 return [...map.values()];
}
function parseResult(html,id){
 const $=cheerio.load(html),body=norm($('body').text()),horses=[];
 $('tr').each((_,tr)=>{const c=$(tr).find('th,td').map((_,x)=>norm($(x).text())).get();if(c.length<3)return;if((/^\d+$/.test(c[0]||'')||c[0]==='中止'||c[0]==='除外')&&/^\d+$/.test(c[1]||'')&&/^\d+$/.test(c[2]||'')&&+c[1]<=8&&+c[2]<=18){let odds=null;for(const z of c){const m=z.match(/^(\d+)\(([\d.]+)\)$/);if(m){odds=+m[2];break}}if(odds)horses.push({frame:+c[1],horse:+c[2]})}});
 const open=/オープン/.test(body),jump=/障害/.test(body.slice(0,1500)),two=/\b2歳/.test(body.slice(0,1500))||/2歳/.test(body.slice(0,1500));
 return{id,runnerCount:horses.length,open,jump,two,header:body.slice(0,900)};
}
async function mapLimit(a,n,fn){let q=0,o=new Array(a.length);async function w(){while(true){const i=q++;if(i>=a.length)return;o[i]=await fn(a[i],i)}}await Promise.all(Array.from({length:n},w));return o}
(async()=>{
 const sched=await monthly(),openSched=sched.filter(x=>/オープン/.test(x.row)&&!/障害/.test(x.row));
 console.log('schedule links',sched.length,'open-ish',openSched.length);
 const details=await mapLimit(openSched,6,async(x,i)=>{try{const h=await get('https://sports.yahoo.co.jp/keiba/race/result/'+x.id+'/');if((i+1)%25===0)console.log('fetched',i+1,'/',openSched.length);return{...x,...parseResult(h,x.id)}}catch(e){return{...x,error:e.message}}});
 const good=details.filter(x=>!x.error&&x.open&&!x.jump&&x.runnerCount>=12);
 fs.mkdirSync('analysis/waku-backtest/discover-out',{recursive:true});
 fs.writeFileSync('analysis/waku-backtest/discover-out/discovered-'+year+'.json',JSON.stringify(good,null,2));
 if(year===2022){
   const base=JSON.parse(fs.readFileSync('analysis/waku-backtest/race_ids_2022_2025.json','utf8')).filter(x=>x.startsWith('22'));
   const found=new Set(good.map(x=>x.id)),bs=new Set(base),missing=base.filter(x=>!found.has(x)),extra=good.filter(x=>!bs.has(x)).map(x=>x.id);
   console.log('BASE',base.length,'DISCOVER',good.length,'MATCH',base.filter(x=>found.has(x)).length,'MISSING',missing.length,'EXTRA',extra.length);
   console.log('MISSING_IDS',JSON.stringify(missing));console.log('EXTRA_IDS',JSON.stringify(extra));
 }
 console.log('YEAR',year,'usable',good.length);
})().catch(e=>{console.error(e);process.exit(1)});