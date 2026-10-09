const { chromium, webkit } = require('playwright');
const assert = require('assert');

const BASE = 'http://127.0.0.1:4173/waku-bc-converter/v3q.html?test=q5';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function makeCsv(){
  const head = ['馬番','馬名','RPCI','PCI','Ave-3F','上3F地点差','脚質','日付','距離','場所','着順','クラス名'];
  const rows = [head.join(',')];
  for(let h=1; h<=16; h++){
    for(let k=0; k<3; k++){
      const style = h<=2 ? '逃げ' : h<=7 ? '先行' : h<=12 ? '差し' : '追込';
      const rpci = 43 + ((h+k)%13);
      const pci = 45 + ((h*2+k)%14);
      const ave = (34.0 + ((h+k)%9)*0.2).toFixed(1);
      const gap = (0.2 + ((h+k)%10)*0.25).toFixed(2);
      const day = String(10-k).padStart(2,'0');
      rows.push([h,`TestHorse${h}`,rpci,pci,ave,gap,style,`2026.09.${day}`,1800,'阪神',((h+k)%12)+1,'Ｇ３'].join(','));
    }
  }
  return rows.join('\n');
}

function oddsText(){
  const vals=[2.8,4.1,5.6,7.4,9.8,12.5,16.0,20.5,26,33,41,52,65,80,100,130];
  return vals.map((v,i)=>`${i+1} ${v}`).join('\n');
}

async function run(browserType,name){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    userAgent:IPHONE_UA,
    isMobile:true,
    hasTouch:true
  });
  const page=await context.newPage();
  const pageErrors=[];
  const requests=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('request',r=>requests.push(r.url()));

  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,{timeout:20000});

  assert((await page.title()).includes('Race Scenario Analyzer'),`${name}: title`);
  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.rsaBuild),'20261009q5',`${name}: Q5 build marker`);
  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.rsaAutoResume),'off',`${name}: auto resume disabled`);
  assert(!requests.some(u=>u.includes('/v2.html')),`${name}: standalone page must not fetch v2 wrapper`);
  assert(!requests.some(u=>u.includes('ios-resume-v1.js')),`${name}: old iOS auto-resume must not load`);
  const addonFailures=await page.evaluate(()=>window.RSAAddonHealth?.failures||[]);
  assert.deepStrictEqual(addonFailures,[],`${name}: addon load failures ${addonFailures.join(', ')}`);

  await page.fill('#raceName','Q5 Smoke Stakes');
  await page.selectOption('#venue','阪神');
  await page.fill('#fieldSize','16');
  await page.selectOption('#surface','ダート');
  await page.fill('#distance','2000');
  await page.selectOption('#grade','G3');
  await page.selectOption('#going','良');

  await page.locator('#csvFile').setInputFiles({name:'q5-smoke.csv',mimeType:'text/csv',buffer:Buffer.from(makeCsv(),'utf8')});
  await page.waitForFunction(()=>/^解析済\s+16頭$/.test(document.querySelector('#csvState')?.textContent||''),{timeout:12000});
  await page.waitForTimeout(250);

  assert.strictEqual(await page.locator('#mappingGrid select').count(),0,`${name}: mapping selects must be released after auto parse`);
  assert(await page.locator('#mappingBox').evaluate(el=>getComputedStyle(el).display==='none'),`${name}: mapping fallback stays hidden`);
  const csvPosition=await page.locator('#csvCard').evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,scrollY:scrollY,max:document.documentElement.scrollHeight-innerHeight}});
  assert(csvPosition.scrollY>=0 && csvPosition.scrollY<=csvPosition.max+2,`${name}: valid scroll position after CSV`);
  assert(csvPosition.bottom>0 && csvPosition.top<844,`${name}: CSV card remains paintable after parse`);

  await page.selectOption('#venue','東京');
  assert.strictEqual(await page.inputValue('#venue'),'東京',`${name}: controls remain interactive after CSV`);
  await page.selectOption('#venue','阪神');
  await page.fill('#oddsPaste',oddsText());
  await page.click('#applyOddsBtn');
  await page.waitForFunction(()=>document.querySelector('#oddsInfo')?.textContent.includes('16頭を反映'));

  await page.click('#analyzeBtn');
  await page.waitForSelector('#result:not(.hidden)',{timeout:15000});
  await page.waitForSelector('#finalDecisionCard',{state:'visible',timeout:15000});
  await page.waitForSelector('#turbulenceStructureBox',{state:'visible',timeout:15000});

  const decisionText=await page.locator('#finalDecisionCard').innerText();
  assert(decisionText.length>20,`${name}: final decision has content`);
  const waveText=await page.locator('#turbulenceStructureBox').innerText();
  assert(waveText.includes('波乱構造'),`${name}: turbulence structure rendered`);

  await page.locator('#finalDecisionCard').scrollIntoViewIfNeeded();
  assert(await page.locator('#finalDecisionCard').isVisible(),`${name}: final decision visible after scroll`);
  await page.locator('#savedList').scrollIntoViewIfNeeded();
  const bottomLayout=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight,h:document.body.getBoundingClientRect().height}));
  assert(bottomLayout.y>=0 && bottomLayout.y<=bottomLayout.max+3,`${name}: bottom scroll position valid`);
  assert(bottomLayout.h>844,`${name}: document has expected content height`);

  assert.deepStrictEqual(pageErrors,[],`${name}: page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log(`PASS Race Scenario Q5 ${name}: load -> CSV auto parse -> interaction -> analysis -> scroll`);
}

(async()=>{
  await run(chromium,'chromium iPhone');
  await run(webkit,'webkit iPhone');
})().catch(err=>{console.error(err);process.exit(1)});
