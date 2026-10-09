const { chromium, webkit } = require('playwright');
const assert = require('assert');

const BASE = 'http://127.0.0.1:4173/waku-bc-converter/v3q.html?test=q10';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function makeTargetCsv(){
  const head=['何走目','馬番','馬名','レースPCI','PCI','Ave-3F','上3F地点差','決手','日付','距離','開催','着順','クラス名','頭数','芝・ダ','上り3F','通過1','通過2','通過3','通過4'];
  const rows=[head.join(',')];
  for(let h=1;h<=16;h++)for(let k=0;k<3;k++){
    const style=h<=2?'逃げ':h<=7?'先行':h<=12?'差し':'追込';
    const rpci=43+((h+k)%13),pci=45+((h*2+k)%14),ave=(34+((h+k)%9)*.2).toFixed(1),gap=(.2+((h+k)%10)*.25).toFixed(2),last3=(34+((h*2+k)%10)*.18).toFixed(2),day=String(10-k).padStart(2,'0');
    const p1=Math.min(16,Math.max(1,h<=7?h:8+((h+k)%8))),p4=Math.min(16,Math.max(1,p1+(style==='差し'||style==='追込'?-2:1)));
    rows.push([k+1,h,`TestHorse${h}`,rpci,pci,ave,gap,style,`2026.09.${day}`,1800,'阪神',((h+k)%12)+1,'Ｇ３',16,'ダ',last3,p1,p1,p4,p4].join(','));
  }
  return rows.join('\n');
}
function oddsText(){const vals=[2.8,4.1,5.6,7.4,9.8,12.5,16,20.5,26,33,41,52,65,80,100,130];return vals.map((v,i)=>`${i+1} ${v}`).join('\n')}

async function analyze(page){
  await page.click('#analyzeBtn');
  // On repeated analysis the previous transition can still read "ready" for a few ms.
  // Give the new cycle time to enter its calculation state before waiting for completion.
  await page.waitForTimeout(250);
  await page.waitForSelector('#result:not(.hidden)',{timeout:15000});
  await page.waitForFunction(()=>['ready','error'].includes(window.RSAAnalysisTransitionState?.status),null,{timeout:15000});
  const transition=await page.evaluate(()=>window.RSAAnalysisTransitionState);
  assert.strictEqual(transition.status,'ready',`analysis failed; missing=${(transition.missing||[]).join(',')}`);
  await page.waitForFunction(()=>{
    const ids=['finalDecisionCard','turbulenceStructureBox','scenarioView'];
    return ids.every(id=>{
      const el=document.getElementById(id);if(!el)return false;
      const st=getComputedStyle(el),r=el.getBoundingClientRect();
      return st.display!=='none'&&st.visibility!=='hidden'&&st.opacity!=='0'&&r.width>0&&r.height>0;
    });
  },null,{timeout:8000});
  await page.waitForTimeout(500);
}

async function run(browserType,name){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const pageErrors=[],requests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));page.on('request',r=>requests.push(r.url()));

  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,{timeout:20000});
  assert((await page.title()).includes('Race Scenario Analyzer'),`${name}: title`);
  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.rsaBuild),'20261009q10',`${name}: Q10 build marker`);
  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.rsaAutoResume),'off',`${name}: auto resume disabled`);
  assert(!requests.some(u=>u.includes('/v2.html')),`${name}: standalone page must not fetch v2 wrapper`);
  assert(!requests.some(u=>u.includes('ios-resume-v1.js')),`${name}: old iOS auto-resume must not load`);
  assert(!requests.some(u=>u.includes('scenario-ui-v1.js')),`${name}: old repeated-render scenario UI must not load`);
  const addonFailures=await page.evaluate(()=>window.RSAAddonHealth?.failures||[]);assert.deepStrictEqual(addonFailures,[],`${name}: addon load failures ${addonFailures.join(', ')}`);

  await page.fill('#raceName','Q10 Smoke Stakes');await page.selectOption('#venue','阪神');await page.fill('#fieldSize','16');await page.selectOption('#surface','ダート');await page.fill('#distance','2000');await page.selectOption('#grade','G3');await page.selectOption('#going','良');
  await page.locator('#csvFile').setInputFiles({name:'target-style.csv',mimeType:'text/csv',buffer:Buffer.from(makeTargetCsv(),'utf8')});
  await page.waitForFunction(()=>/^解析済\s+16頭$/.test(document.querySelector('#csvState')?.textContent||''),{timeout:12000});await page.waitForTimeout(300);
  assert.strictEqual(await page.locator('#mappingGrid select').count(),0,`${name}: mapping selects released after auto parse`);
  assert(await page.locator('#mappingBox').evaluate(el=>getComputedStyle(el).display==='none'),`${name}: mapping fallback hidden`);
  const afterCsv=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,y:scrollY,max:document.documentElement.scrollHeight-innerHeight}));
  assert(afterCsv.nodes<900,`${name}: CSV parse DOM bounded (${afterCsv.nodes})`);assert(afterCsv.y>=0&&afterCsv.y<=afterCsv.max+2,`${name}: valid scroll after CSV`);
  const csvPosition=await page.locator('#csvCard').evaluate(el=>{const r=el.getBoundingClientRect();return{top:r.top,bottom:r.bottom}});assert(csvPosition.bottom>0&&csvPosition.top<844,`${name}: CSV card paintable`);

  await page.selectOption('#venue','東京');assert.strictEqual(await page.inputValue('#venue'),'東京',`${name}: controls interactive after CSV`);await page.selectOption('#venue','阪神');
  await page.fill('#oddsPaste',oddsText());await page.click('#applyOddsBtn');await page.waitForFunction(()=>document.querySelector('#oddsInfo')?.textContent.includes('16頭を反映'));
  await analyze(page);
  assert((await page.locator('.brand .badge').textContent()).includes('Q10'),`${name}: Q10 badge remains`);
  assert(!(await page.locator('#finalDecisionCard').evaluate(el=>el.classList.contains('legacy'))),`${name}: final decision visible production card`);
  assert((await page.locator('#turbulenceStructureBox').innerText()).includes('波乱構造'),`${name}: validated turbulence rendered`);
  const structureLabels=await page.locator('#s1 .bx span').allTextContents();
  assert(!structureLabels.some(x=>x.trim()==='荒れる余地'),`${name}: obsolete heuristic turbulence card removed`);
  assert(structureLabels.some(x=>x.includes('波乱構造')),`${name}: scenario summary uses validated turbulence`);
  assert.strictEqual(await page.locator('#s3 .horse').count(),16,`${name}: all 16 horses shown once`);
  const scenarioText=await page.locator('#s3').innerText();assert(scenarioText.includes('M3末脚'),`${name}: M3 visible in all-horse view`);assert(!scenarioText.includes('コース ◎'),`${name}: weak fit scoring not promoted in production all-horse view`);
  const afterAnalysis=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,y:scrollY,max:document.documentElement.scrollHeight-innerHeight,headerDisplay:getComputedStyle(document.querySelector('header.top')).display}));assert(afterAnalysis.nodes<2600,`${name}: analysis DOM remains bounded (${afterAnalysis.nodes})`);assert(afterAnalysis.headerDisplay!=='none',`${name}: header remains visible after scenario render`);

  await page.selectOption('#going','重');
  await analyze(page);
  assert((await page.locator('#s2').innerText()).includes('重'),`${name}: scenario summary refreshed after going change`);

  await page.locator('#finalDecisionCard').scrollIntoViewIfNeeded();assert(await page.locator('#finalDecisionCard').isVisible(),`${name}: final decision visible after scroll`);await page.locator('#savedList').scrollIntoViewIfNeeded();
  const bottom=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight,h:document.body.getBoundingClientRect().height}));assert(bottom.y>=0&&bottom.y<=bottom.max+3,`${name}: bottom scroll valid`);assert(bottom.h>844,`${name}: expected page height`);
  assert.deepStrictEqual(pageErrors,[],`${name}: page errors ${pageErrors.join(' | ')}`);
  await browser.close();console.log(`PASS Race Scenario Q10 ${name}: TARGET CSV -> stable DOM -> analysis -> refresh -> validated summary -> scroll`);
}
(async()=>{await run(chromium,'chromium iPhone');await run(webkit,'webkit iPhone')})().catch(err=>{console.error(err);process.exit(1)});
