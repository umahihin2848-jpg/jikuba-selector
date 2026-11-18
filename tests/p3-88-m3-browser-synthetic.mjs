import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const browserPaths=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=browserPaths.find(existsSync);
if(!executablePath)throw new Error('Chromium unavailable');

const header=['何走目','馬番','馬名','レースID(新・馬番無16桁)','日付','開催','芝・ダート','距離','クラス名','上り3F','上3F地点差','レースPCI',' PCI','頭数','通過1','通過2','通過3','通過4','着順','確定着順','着差','決手','タイムS','異常コード'];
const past=[
 ['2025.10. 1','2025100105010111'],['2025. 8. 1','2025080105010111'],
 ['2025. 5. 1','2025050105010111'],['2025. 3. 1','2025030105010111'],
 ['2024.12. 1','2024120105010111']
];
const records=[header];
for(let horse=1;horse<=12;horse++){
  const name='検証馬'+String(horse).padStart(2,'0');
  for(let i=0;i<past.length;i++){
    const [date,rid]=past[i],position=(horse+i)%12+1;
    records.push([String(i+1),String(horse),name,rid,date,'東京','芝','1600','G3',(34.1+horse*.07+i*.05).toFixed(2),(0.3+horse*.01).toFixed(2),'50.5',(48+horse*.2+i*.1).toFixed(1),'12',String(position),String(position),String(position),String(position),String(position),String(position),'0.4','差し','1.34.1','0']);
  }
}
const csv=records.map(row=>row.join(',')).join('\r\n');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
const logs=[];
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push('console: '+m.text())});
page.on('pageerror',e=>logs.push('pageerror: '+e.message));
try{
 await page.goto('http://127.0.0.1:8080/waku-bc-converter/v3.html?m3SyntheticP388=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.RSAAddonHealth?.ready,null,{timeout:30000});
 await page.evaluate(()=>{
  const inputs={raceDate:'2026-10-04',venue:'東京',raceName:'M3修復検証',fieldSize:'12',surface:'芝',distance:'1600',grade:'G3',going:'良'};
  for(const [id,value] of Object.entries(inputs)){const el=document.getElementById(id);if(!el)throw Error('Missing '+id);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
 });
 await page.locator('#csvFile').setInputFiles({name:'asof-fixture-p388.csv',mimeType:'text/csv',buffer:Buffer.from(csv,'utf8')});
 await page.waitForFunction(()=>document.getElementById('csvFile')?.files?.length===1,null,{timeout:15000});
 await page.locator('#parseCsvBtn').click();
 await page.waitForFunction(()=>/解析済\s+12頭/.test(document.getElementById('csvState')?.textContent||''),null,{timeout:15000});
 await page.waitForFunction(()=>!document.getElementById('analyzeBtn')?.disabled,null,{timeout:15000});
 await page.locator('#analyzeBtn').click();
 await page.waitForFunction(()=>window.Finish600State?.ready&&window.M3InputReceiptState?.ready&&window.M3PureAbilityState?.ready,null,{timeout:40000});
 const out=await page.evaluate(()=>{
  const a=window.M3InputReceiptState,f=window.Finish600State,ab=window.M3PureAbilityState;
  return {ready:a?.ready&&f?.ready&&ab?.ready,n:a?.rows?.length||0,histCounts:a?.rows?.map(x=>x.history.length),
          uniqueIds:a?.rows?.every(x=>new Set(x.history.map(h=>h.raceId)).size===x.history.length),
          exact19:a?.rows?.every(x=>Object.keys(x.features).length===19),
          noLeaked:a?.rows?.every(x=>x.history.every(h=>h.date<a.raceDate)),
          scoreValid:a?.rows?.every(x=>Math.abs(x.predGap-x.closing-x.score)<1e-9),
          m3Ranks:new Set(f?.rows?.map(r=>r.finishRank)),abilityN:ab?.rows?.length||0,
          conflict:window.RSATargetCsvCache?.getDiagnostic?.(document.getElementById('csvFile')?.files?.[0])?.historyConflictCount};
 });
 if(!out.ready||out.n!==12||out.abilityN!==12||out.histCounts.some(x=>x!==5)||!out.uniqueIds||!out.exact19||!out.noLeaked||!out.scoreValid||out.m3Ranks.size!==12||out.conflict!==0)
  throw Error('P3-88 synthetic browser contract mismatch: '+JSON.stringify(out));
 console.log('PASS P3-88 full browser: 12 runners x 5 distinct previous races; M3+Ability ready; 19 features; receipts; no future leakage');
}catch(e){
 const details=await page.evaluate(()=>({m3:window.Finish600State||null,receipt:window.M3InputReceiptState?.reason||null,ability:window.M3PureAbilityState?.ready||false,addons:window.RSAAddonHealth?.failures||[],state:document.getElementById('csvState')?.textContent||''})).catch(()=>({}));
 console.error('FAIL P3-88 synthetic browser:',e.message,JSON.stringify(details).slice(0,4000),logs.slice(-10));
 process.exitCode=1;
}finally{await browser.close()}
