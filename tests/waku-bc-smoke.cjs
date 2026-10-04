const { chromium, webkit } = require('playwright');

function assert(c,m){ if(!c) throw new Error(m); }
const LOCAL='http://127.0.0.1:4173/waku-bc-converter/';
const FRAME_MARKET='1-2 1-3 1-4 1-5 2-3 1-6 2-4 1-7 2-5 3-4 1-8 2-6 3-5 2-7 3-6 4-5 2-8 3-7';
const ODDS=[10,100,8,80,9,90,11,110,12,120,13,130,14,140,15,150];

async function run(browserType,label){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const page=await context.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(LOCAL,{waitUntil:'networkidle'});
  assert((await page.title())==='枠連BCコンバーター',label+' title');

  await page.selectOption('#runnerCount','16');
  for(let h=1;h<=16;h++){
    const row=page.locator('.horseRow[data-horse="'+h+'"]');
    const frame=Math.ceil(h/2);
    await row.locator('select').selectOption(String(frame));
    await row.locator('input').fill(String(ODDS[h-1]));
  }
  await page.fill('#frameMarket',FRAME_MARKET);
  await page.fill('#axisHorse','1');
  await page.selectOption('#upperCutoff','14');
  await page.selectOption('#retention','0.85');
  await page.click('#analyze');

  assert(await page.locator('#analysisCard').isVisible(),label+' analysis visible');
  const axis=await page.locator('#axisText').textContent();
  const target=await page.locator('#targetSub').textContent();
  const points=await page.locator('#pointsText').textContent();
  assert(axis.includes('90.9%'),label+' axis representative '+axis);
  assert(target.includes('5組'),label+' target pairs '+target);
  assert(points==='5点',label+' converted points '+points);
  assert((await page.locator('.pairCard').count())===5,label+' pair cards');

  await page.click('#saveAnalysis');
  assert((await page.locator('#history .history').count())===1,label+' history saved');
  const hist=page.locator('#history .history').first();
  await hist.locator('input[id^="rf"]').fill('1');
  await hist.locator('input[id^="rs"]').fill('7');
  await hist.locator('button').filter({hasText:'結果を保存'}).click();

  const htxt=await page.locator('#history').textContent();
  assert(htxt.includes('枠連1-4 B（3位）'),label+' result frame rank '+htxt);
  assert(htxt.includes('変換馬連：✅'),label+' converted hit');
  const vtxt=await page.locator('#validationBody').textContent();
  assert(vtxt.includes('100.0%'),label+' validation updated '+vtxt);
  assert(!errs.length,label+' page errors: '+errs.join(' | '));

  await context.close();await browser.close();
  console.log('PASS '+label+' waku BC converter');
}
(async()=>{await run(chromium,'Chromium');await run(webkit,'WebKit(iPhone Safari相当)')})().catch(e=>{console.error(e);process.exit(1)});