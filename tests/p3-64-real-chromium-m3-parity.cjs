'use strict';
// P3-64: Real Chromium same-race main vs P3-63 comparison. Synthetic 12 horses only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const cp=require('node:child_process');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),app=path.join(repo,'waku-bc-converter');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'p364-'));
for(const v of ['old','shadow'])fs.cpSync(app,path.join(scratch,v),{recursive:true});
for(const file of ['target-csv-compat-v1.js','shape-core-v2.js']){
 const old=cp.execFileSync('git',['show','origin/main:waku-bc-converter/'+file],{cwd:repo,encoding:'utf8'});
 fs.writeFileSync(path.join(scratch,'old',file),old,'utf8');
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(scratch,'.'+pathname);
 if(!file.startsWith(scratch+path.sep)){res.writeHead(403);res.end('forbidden');return;}
 fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404);res.end('missing '+pathname);return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(buf);});
});
const columns=['何走目','馬番','馬名','レースID(新・馬番無16桁)','日付','開催','場所','レース名','クラス名','頭数','距離','芝・ダート','通過1','通過2','通過3','通過4','レースPCI','PCI','上3F地点差','上り3F','決手','着順'];
const dates=['2026. 9. 1','2026. 8. 1','2026. 7. 1','2026. 6. 1','2026. 5. 1'];
const ids=['2026090108010111','2026080108010111','2026070108010111','2026060108010111','2026050108010111'];
function fixture(){
 const lines=[columns.join(',')];
 for(let i=0;i<12;i++){
  const name='SyntheticH'+String(i+1).padStart(2,'0');
  const make=(j,date,id)=>{
   const pos=1+(i*3+j*2)%12;
   const surface=(i+j)%5===0?'ダート':'芝';
   const style=pos<=2?'逃げ':pos<=5?'先行':pos<=9?'差し':'追込';
   return [j+1,1,name,id,date,'4東2','東京','SyntheticG3','Ｇ３',12,1400+(j%3)*200,surface,0,0,pos,Math.min(12,pos+(j%3)-1),52-j,(i%7)+49+j*.4,(.18*i+.13*j).toFixed(2),(33.8+i*.27+j*.18).toFixed(2),style,1+(i+j)%12].join(',');
  };
  lines.push(make(0,'2026.11. 1','2026110108010111'));
  for(let j=0;j<5;j++){const r=make(j+1,dates[j],ids[j]);lines.push(r,r);}
 }
 return Buffer.from(lines.join('\r\n'),'utf8');
}
const csv=fixture(),odds=Array.from({length:12},(_,i)=>String(i+1)+' '+(2.9+1.8*i).toFixed(1)).join('\n');
async function capture(browser,name,port){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'});
 const page=await ctx.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>{if(errors.length<12)errors.push(String(e));});
 page.on('response',r=>{if(r.status()>=400&&bad.length<15)bad.push({code:r.status(),file:r.url().split('/').pop()});});
 await page.goto('http://127.0.0.1:'+port+'/'+name+'/v3.html',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:55000});
 await page.waitForFunction(()=>document.getElementById('modelState')?.textContent?.includes('モデル準備済'),null,{timeout:20000});
 await page.evaluate(()=>{
  const values={raceDate:'2026-10-25',venue:'東京',raceName:'P364Synthetic',fieldSize:'12',surface:'芝',distance:'1600',grade:'G3'};
  for(const [id,v] of Object.entries(values)){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}
 });
 await page.locator('#csvFile').setInputFiles({name:'synthetic_race.csv',mimeType:'text/csv',buffer:csv});
 await page.waitForFunction(()=>/^\d+行$/.test(document.getElementById('csvState')?.textContent?.trim()||''),null,{timeout:30000});
 await page.evaluate(v=>{document.getElementById('parseCsvBtn').click();document.getElementById('oddsPaste').value=v;document.getElementById('applyOddsBtn').click();},odds);
 await page.waitForFunction(()=>document.getElementById('csvState')?.textContent?.includes('解析済 12頭'),null,{timeout:10000});
 await page.evaluate(()=>document.getElementById('analyzeBtn').click());
 await page.waitForFunction(()=>window.ValidatedQueueState?.ready===true&&window.Remaining600ValidatedState?.ready===true&&window.Finish600State?.ready===true&&window.Finish600State?.rows?.length===12,null,{timeout:40000});
 await page.waitForTimeout(800);
 const state=await page.evaluate(()=>{
  const q=window.ValidatedQueueState,r=window.Remaining600ValidatedState,m=window.Finish600State;
  const finite=v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v))?null:Number(v);
  const map=new Map(r.rows.map(x=>[String(x.no),x]));
  const horses=m.rows.map(x=>{
   const n=String(x.no),a=q.byNo[n],b=map.get(n);
   return {no:n,name:String(x.name),firstRank:finite(a?.expectedRank),frontness5:finite(a?.frontness5),queueHistN:finite(a?.hist_n5),remaining600:finite(b?.pred),m3PredGap:finite(x.predGap),m3Score:finite(x.score),m3Rank:finite(x.finishRank),m3HistN:finite(x.x?.hist_n),uniqueHistory:finite(x.x?.hist_unique_races5)};
  }).sort((a,b)=>Number(a.no)-Number(b.no));
  return{models:{q:q.version,r:r.version,m:m.version},csvCount:document.getElementById('csvState').textContent,loaded:window.RSAAddonHealth?.loaded?.length,addonFailures:window.RSAAddonHealth?.failures,horses};
 });
 state.name=name;state.pageErrors=errors;state.httpErrors=bad;
 await ctx.close();return state;
}
(async()=>{
 let browser;
 try{
 await new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',res);});
 const port=server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const old=await capture(browser,'old',port),shadow=await capture(browser,'shadow',port);
 assert.equal(old.horses.length,12);assert.equal(shadow.horses.length,12);
 const byNo=new Map(shadow.horses.map(x=>[x.no,x]));
 const diff=old.horses.map(a=>{
  const b=byNo.get(a.no);assert(b);assert.equal(a.name,b.name);
  return{no:a.no,name:a.name,old:a,shadow:b,firstDelta:b.firstRank-a.firstRank,delta600:b.remaining600-a.remaining600,deltaM3:b.m3Score-a.m3Score,rankChanged:b.m3Rank!==a.m3Rank};
 });
 const count=k=>diff.filter(x=>Number.isFinite(x[k])&&Math.abs(x[k])>1e-9).length;
 const summary={schema:'p3-64-real-chromium-parity-v1',input:'synthetic_only_not_real_horse_results',date:new Date().toISOString(),oldCsv:old.csvCount,shadowCsv:shadow.csvCount,
   firstChanged:count('firstDelta'),remain600Changed:count('delta600'),m3ScoreChanged:count('deltaM3'),m3RankChanged:diff.filter(x=>x.rankChanged).length,
   meanAbsolute600Delta:diff.reduce((s,x)=>s+Math.abs(x.delta600||0),0)/12,models:{old:old.models,shadow:shadow.models},errors:{old:old.pageErrors,shadow:shadow.pageErrors},badResponses:{old:old.httpErrors,shadow:shadow.httpErrors},comparisons:diff};
 assert.equal(summary.oldCsv,'132行');assert.equal(summary.shadowCsv,'72行');
 assert(summary.firstChanged>0,'early position does not change');
 assert(summary.remain600Changed>0,'600m forecast does not change');
 assert(summary.m3ScoreChanged>0,'M3 score does not change');
 fs.writeFileSync(path.join(repo,'p3-64-real-chromium-results.json'),JSON.stringify(summary,null,2));
 console.log('P3-64 REAL CHROMIUM PARITY PASS');
 console.log(JSON.stringify({oldCsv:summary.oldCsv,shadowCsv:summary.shadowCsv,firstChanged:summary.firstChanged,remain600Changed:summary.remain600Changed,m3ScoreChanged:summary.m3ScoreChanged,m3RankChanged:summary.m3RankChanged,meanAbsolute600Delta:summary.meanAbsolute600Delta,errors:summary.errors,badResponses:summary.badResponses},null,2));
 }finally{await browser?.close();await new Promise(res=>server.close(res));fs.rmSync(scratch,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
