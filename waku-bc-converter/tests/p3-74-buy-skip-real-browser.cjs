'use strict';
/* Synthetic, mocked-model real Chromium UI test for P3-74. No real horse data or betting. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const app=path.resolve(__dirname,'..'),rootDir=path.resolve(__dirname,'../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=http.createServer((req,res)=>{const f=path.resolve(app,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(app+path.sep)){res.writeHead(403);res.end('invalid');return}
 fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);res.end('missing');return}
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)});
});
(async()=>{
 let browser;
 try{
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done)});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const cx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await cx.newPage(),errors=[];
  page.on('pageerror',ex=>errors.push(String(ex)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/v3.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:60000});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('rsaMobileBootCritical'),null,{timeout:60000});
  await page.locator('#rsaPurchaseAudit').waitFor({state:'attached',timeout:12000});
  await page.evaluate(()=>{
   const info={raceDate:'2026-11-29',raceName:'Synthetic OP study',venue:'東京',fieldSize:'12',surface:'芝',grade:'OP',distance:'1600'};
   for(const [id,value]of Object.entries(info)){document.getElementById(id).value=value}
   const names=Array.from({length:12},(_,i)=>'Synthetic'+(i+1)),rank=[1,4,5,2,3,6,7,8,9,10,11,12];
   const A=names.map((name,i)=>({no:String(i+1),name,abilityRank:i+1,abilityTieEnd:i+1,histN:5}));
   const M=rank.map((no,i)=>({no:String(no),name:'Synthetic'+no,finishRank:i+1}));
   const P=names.map((name,i)=>({no:String(i+1),name,p10:i===2?.05:.2+i*.02}));
   window.M3PureAbilityState={ready:true,activeModel:'v1',rows:A,at:Date.now()};
   window.Finish600State={ready:true,rows:M,at:Date.now()};
   window.PositionRiskState={ready:true,rows:P,byNo:Object.fromEntries(P.map(x=>[x.no,x])),at:Date.now()};
   window.RaceSkipLockV1State={status:'skip',reason:'Synthetic official gate remains skip'};
   window.ProductionDecisionPipelineV1State={final:{status:'neutral',label:'Official skip'}};
   document.documentElement.dataset.raceGate='skip';
   document.documentElement.dataset.raceSkipKind='axis';
   document.body.classList.add('rsaFocusedThreeTabs');
   window.RSAPurchaseAuditUIV1.refresh();
  });
  console.log('P374 visibility diagnostics',JSON.stringify(await page.evaluate(()=>{const e=document.getElementById('rsaPurchaseAudit'),s=e.querySelector('summary'),m=document.querySelector('main.view');return{panelCss:getComputedStyle(e).display,summaryCss:getComputedStyle(s).display,mainCss:getComputedStyle(m).display,parent:e.parentElement?.id||e.parentElement?.className,ancestor:[e,e.parentElement,m,document.body,document.documentElement].map(x=>({tag:x?.tagName,id:x?.id,display:x?getComputedStyle(x).display:null,visibility:x?getComputedStyle(x).visibility:null})),gate:document.documentElement.dataset.raceGate,skipKind:document.documentElement.dataset.raceSkipKind,focus:document.body.className}})));
  await page.locator('#rsaPurchaseAudit > summary').click({timeout:6000});
  // The mocked race metadata changes the audit's race signature; allow its reset to finish before entering evidence.
  await page.waitForFunction(()=>document.getElementById('rpaFit4')!==null,null,{timeout:15000});
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#rsaPurchaseAudit').isVisible(),true,'must be visible while official race gate skips');
  await page.locator('#rpaFillRoster').click();
  assert.match(await page.locator('#rpaRoster').inputValue(),/12,Synthetic12/,'synthetic names should be filled from the mocked live model');
  await page.locator('#rpaRosterSource').fill('Synthetic official card verified manually');
  await page.locator('#rpaAttest').check();
  await page.locator('#rpaQuality').selectOption('inner_front');
  await page.locator('#rpaQualitySource').fill('Synthetic preceding race card observations');
  await page.locator('#rpaEvidence').fill('Synthetic pace favors the inside front group');
  await page.locator('#rpaBefore').check();
  await page.waitForFunction(()=>document.getElementById('rpaFit4')!==null,null,{timeout:14000});
  for(const [no,fit]of [[1,'good'],[2,'neutral'],[3,'good'],[4,'neutral']]){
   await page.locator('#rpaFit'+no).selectOption(fit);
   await page.locator('#rpaWhy'+no).fill('Synthetic pre-race running style and track judgement');
  }
  await page.locator('#rpaTicket').selectOption('wide');
  await page.locator('#rpaOdds').fill('8.4');
  await page.locator('#rpaObserved').fill('2026-11-29T15:10');
  const unchanged=await page.evaluate(()=>JSON.stringify({A:window.M3PureAbilityState,F:window.Finish600State,P:window.PositionRiskState}));
  console.log('P374 roster diagnostics',JSON.stringify(await page.evaluate(()=>{const text=document.getElementById('rpaRoster').value,source=document.getElementById('rpaRosterSource').value,checked=document.getElementById('rpaAttest').checked,parsed=window.RSAPurchaseAuditCoreV1.parseRoster(text),a=window.M3PureAbilityState.rows;return{rowCount:parsed.rows.length,issues:parsed.errors,source,checked,textStart:text.slice(0,100),nameMatches:parsed.rows.every(z=>a.some(h=>String(h.no)===z.no&&h.name===z.name)),actualFirst:a[0]}})));
  await page.locator('#rpaEvaluate').click();
  const result=await page.locator('#rpaResult').innerText();
  assert.match(result,/研究候補・記録完了/);assert.match(result,/本番の購入ゲート：skip/);
  assert.match(result,/P10第一候補/);assert.match(result,/自動的な期待値/);
  const pendingDownload=page.waitForEvent('download');
  await page.locator('#rpaDownload').click();const dl=await pendingDownload;
  const saved=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
  assert.equal(saved.decision.status,'research_complete');
  assert.equal(saved.decision.axis.no,'1');assert.equal(saved.decision.preferredOpponent.no,'3');
  assert.equal(saved.decision.selectedOpponent.no,'3');
  assert.equal(saved.decision.automaticPurchase,false);assert.equal(saved.researchOnly,true);
  const after=await page.evaluate(()=>JSON.stringify({A:window.M3PureAbilityState,F:window.Finish600State,P:window.PositionRiskState}));
  assert.equal(unchanged,after,'official models changed while reviewing');
  await page.locator('#rpaFit2').selectOption('good');
  await page.locator('#rpaEvaluate').click();
  const skipped=await page.locator('#rpaResult').innerText();
  assert.match(skipped,/研究上見送り/);assert.match(skipped,/複数/);
  const out=path.join(rootDir,'p3-74-synthetic-research-ui.png');
  await page.screenshot({path:out,fullPage:false});
  const report={schema:saved.schema,onlySynthetic:true,axis:saved.decision.axis.no,partner:saved.decision.selectedOpponent.no,quote:saved.decision.quote,officialUnchanged:true,secondScenario:'multiple good opponents -> skip',pageErrors:errors};
  fs.writeFileSync(path.join(rootDir,'p3-74-synthetic-ui-report.json'),JSON.stringify(report,null,2));
  console.log('P3-74 CHROMIUM MOCK-MODEL UI PASS '+JSON.stringify(report));
  await cx.close();
 }finally{await browser?.close();await new Promise(done=>server.close(done))}
})().catch(err=>{console.error(err.stack||String(err));process.exitCode=1});
