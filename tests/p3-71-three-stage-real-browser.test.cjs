'use strict';
/* P3-71 synthetic-only Chromium UI test: full race upload -> manual roster -> stage visual -> export.
   No real horse names, no personal JRA history stored in public repo. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const repo=path.resolve(__dirname,'..'),app=path.join(repo,'waku-bc-converter');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),f=path.resolve(app,'.'+decodeURIComponent(u.pathname));
 if(!f.startsWith(app+path.sep)){res.writeHead(403);res.end('invalid path');return}
 fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
});
const head=['何走目','馬番','馬名','レースID(新・馬番無16桁)','日付','開催','場所','レース名','クラス名','頭数','距離','芝・ダート','通過1','通過2','通過3','通過4','レースPCI','PCI','上3F地点差','上り3F','決手','着順'];
const dates=['2026. 9. 1','2026. 8. 1','2026. 7. 1','2026. 6. 1','2026. 5. 1'],ids=['2026090108010111','2026080108010111','2026070108010111','2026060108010111','2026050108010111'];
const names=Array.from({length:12},(_,i)=>'SyntheticH'+String(i+1).padStart(2,'0'));
function fixture(){
 const data=[head.join(',')];
 names.forEach((name,i)=>{
  dates.forEach((date,j)=>{
   const rank=1+(i*2+j*3)%12,kind=(i+j)%5===0?'ダート':'芝';
   const row=[j+1,1,name,ids[j],date,'4東2','東京','SyntheticG3','Ｇ３',12,1400+j%3*200,kind,0,0,rank,
    Math.min(12,rank+(j%2)),52-j,49+i%7+j*.4,(i*.18+j*.12).toFixed(2),(34+i*.15+j*.18).toFixed(2),
    rank<=2?'逃げ':rank<=6?'先行':'差し',1+(i+j)%12].join(',');
   data.push(row,row);
  });
 });
 return Buffer.from(data.join('\r\n'));
}
const file=fixture(),roster=names.map((name,i)=>(i===11?13:i+1)+','+name).join('\n');
(async()=>{
 let browser;
 try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const p=await ctx.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:'+server.address().port+'/v3.html',{waitUntil:'domcontentloaded',timeout:45000});
 await p.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:60000});
 await p.waitForFunction(()=>document.getElementById('modelState')?.textContent?.includes('モデル準備済'),null,{timeout:20000});
 await p.evaluate(()=>{
  for(const [k,v] of Object.entries({raceDate:'2026-10-25',venue:'東京',raceName:'SyntheticStudyG3',fieldSize:'12',surface:'芝',distance:'1600',grade:'G3'})){
   const e=document.getElementById(k);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));
  }
 });
 await p.locator('#csvFile').setInputFiles({name:'synthetic_private_test.csv',mimeType:'text/csv',buffer:file});
 await p.waitForFunction(()=>/^\d+行$/.test(document.getElementById('csvState')?.textContent?.trim()||''),null,{timeout:30000});
 await p.evaluate(()=>{
  document.getElementById('parseCsvBtn').click();
  document.getElementById('oddsPaste').value=Array.from({length:12},(_,i)=>(i+1)+' '+(3+i*.6).toFixed(1)).join('\n');
  document.getElementById('applyOddsBtn').click();
 });
 await p.waitForFunction(()=>document.getElementById('csvState')?.textContent?.includes('解析済 12頭'),null,{timeout:12000});
 await p.evaluate(()=>document.getElementById('analyzeBtn').click());
 await p.waitForFunction(()=>window.ValidatedQueueState?.ready&&window.Finish600State?.ready&&window.Finish600State?.rows?.length===12,null,{timeout:50000});
 await p.locator('[data-rsaf-tab="formation"]').click({timeout:15000});
 await p.locator('#p371StagePreview').waitFor({state:'attached',timeout:25000});
 await p.locator('#p371StagePreview > summary').click();
 const before=await p.evaluate(()=>JSON.stringify({q:window.ValidatedQueueState,r:window.Remaining600ValidatedState,m:window.Finish600State}));
 await p.locator('#p371Source').fill('架空の出走表・全頭確認');
 await p.locator('#p371Roster').fill(roster.replace('1,'+names[0],'1,MissingHorse'));
 await p.locator('#p371Confirmed').check();
 await p.locator('#p371Run').click();
 await p.waitForFunction(()=>document.getElementById('p371Status')?.textContent?.includes('照合不可'),null,{timeout:12000});
 assert.equal(await p.locator('#p371Output').isVisible(),false,'bad roster must fail closed');
 await p.locator('#p371Roster').fill(roster);
 await p.locator('#p371Confirmed').check();
 await p.locator('#p371Run').click();
 await p.waitForFunction(()=>window.RSACornerStagePreviewV1?.getSnapshot()?.stagePredictions?.c4,null,{timeout:20000});
 assert.equal(await p.locator('#p371Output').isVisible(),true,'valid roster should show research output');
 await p.locator('[data-p371-stage="c3"]').click();
 assert.match(await p.locator('#p371Stage').innerText(),/3コーナー/);
 await p.locator('[data-p371-stage="c4"]').click();
 assert.match(await p.locator('#p371Stage').innerText(),/4コーナー/);
 const download=p.waitForEvent('download');
 await p.locator('#p371Export').click();const d=await download,fn=await d.path(),saved=JSON.parse(fs.readFileSync(fn,'utf8'));
 assert.deepEqual(saved.missingHorseNumbers,['12']);
 assert.equal(saved.virtualToActual.at(-1).actualNo,'13');
 assert.equal(saved.virtualToActual.at(-1).virtualNo,'12');
 assert.equal(saved.stagePredictions.c3.rows.length,12);
 for(const stage of ['c3','c4']){
  const rows=saved.stagePredictions[stage].rows;
  assert.equal(rows.length,12);
  assert.equal(rows.reduce((acc,x)=>acc+x.probabilities.reduce((a,b)=>a+b,0),0),12);
  for(let k=0;k<4;k++)assert.equal(rows.filter(x=>x.groupIndex===k).length,saved.groupSeats[k]);
 }
 const after=await p.evaluate(()=>JSON.stringify({q:window.ValidatedQueueState,r:window.Remaining600ValidatedState,m:window.Finish600State}));
 assert.equal(before,after,'Preview must not mutate official stage states');
 const out=path.join(repo,'p3-71-synthetic-three-stage-preview.png');
 await p.screenshot({path:out,fullPage:false});
 fs.writeFileSync(path.join(repo,'p3-71-synthetic-stage-summary.json'),JSON.stringify({schema:saved.schema,
  syntheticOnly:true,mapped:saved.virtualToActual.length,scratchedNos:saved.missingHorseNumbers,
  stageSeats:saved.groupSeats,untouchedOfficialStates:true,pageErrors:errors},null,2));
 assert.deepEqual(errors,[],'all browser errors must be fixed');
 console.log('P3-71 PLAYWRIGHT REAL CHROMIUM PASS',JSON.stringify({field:12,missing:saved.missingHorseNumbers,
  output:saved.schema,seats:saved.groupSeats,pageErrors:errors}));
 await ctx.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
