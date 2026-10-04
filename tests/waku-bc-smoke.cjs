const { chromium, webkit } = require('playwright');

function assert(c,m){ if(!c) throw new Error(m); }
const LOCAL='http://127.0.0.1:4173/waku-bc-converter/';
const ODDS=[3,40,4,45,5,50,6,55,7,60,8,65,9,70,10,75];

function frameMarket(){
  const rows=[]; let o=3.5;
  for(let a=1;a<=8;a++) for(let b=a;b<=8;b++){ rows.push(a+'-'+b+'='+o.toFixed(1)); o+=0.8; }
  return rows.join(' ');
}

async function run(browserType,label){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const page=await context.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(LOCAL,{waitUntil:'networkidle'});
  assert((await page.title())==='枠連BCコンバーター',label+' wrapper title');
  const app=page.frameLocator('#appFrame');
  await app.locator('#runnerCount').waitFor();

  await app.locator('#runnerCount').selectOption('16');
  for(let h=1;h<=16;h++){
    const row=app.locator('.horseRow[data-horse="'+h+'"]');
    await row.locator('select').selectOption(String(Math.ceil(h/2)));
    await row.locator('input').fill(String(ODDS[h-1]));
  }
  const frameRows=frameMarket().split(' ');
  for(const item of frameRows){
    const [pair,odds]=item.split('=');
    await app.locator('.frameOddsInput[data-pair="'+pair+'"]').fill(odds);
  }
  assert((await app.locator('#frameProgress').textContent()).includes('36 / 36'),label+' frame progress');

  await app.locator('#prepareQuinella').click();
  const qInputs=app.locator('.quinellaOddsInput');
  const qCount=await qInputs.count();
  assert(qCount>0,label+' quinella candidates generated');
  for(let i=0;i<qCount;i++){
    const inp=qInputs.nth(i);
    const pair=await inp.getAttribute('data-pair');
    const [a,b]=pair.split('-').map(Number);
    await inp.fill((8+(a+b)*1.7).toFixed(1));
  }
  assert((await app.locator('#quinellaProgress').textContent()).includes(qCount+' / '+qCount),label+' quinella progress');
  await app.locator('#analyze').click();

  assert(await app.locator('#analysisCard').isVisible(),label+' analysis visible');
  assert((await app.locator('#scenarioComparison .scenarioCard').count())===3,label+' three axis scenarios');
  assert((await app.locator('#scenarioComparison .scenarioCard.recommended').count())===1,label+' one recommended scenario');
  const axisCount=await app.locator('#axisCards .axisCard').count();
  assert(axisCount===1||axisCount===2,label+' recommended axis count '+axisCount);
  const rec=await app.locator('#recommendation').textContent();
  assert(rec.includes('1軸')||rec.includes('2軸'),label+' recommendation text '+rec);
  const p=await app.locator('#pText').textContent();
  const price=await app.locator('#priceText').textContent();
  const judge=await app.locator('#judgeText').textContent();
  assert(p.includes('%')&&!p.includes('—'),label+' final p '+p);
  assert(price.includes('倍')&&price.includes('/'),label+' composite and EV '+price);
  assert(!judge.includes('馬連オッズ待ち'),label+' price judgement '+judge);
  assert((await app.locator('.pairCard').count())>0,label+' candidate frame pairs');

  const stakeAmount=Math.max(5000,qCount*500);
  await app.locator('#quinellaStake').fill(String(stakeAmount));
  await app.locator('#calcQuinellaStake').click();
  const stakeRows=app.locator('#stakePlan .stakeRow');
  const stakeCount=await stakeRows.count();
  assert(stakeCount>0&&stakeCount<=qCount,label+' recommended stake rows '+stakeCount+' of '+qCount);
  const firstPair=(await stakeRows.first().locator('b').first().textContent()).trim();
  assert(/^\d+-\d+$/.test(firstPair),label+' first stake pair '+firstPair);
  const stakeTexts=await stakeRows.allTextContents();
  let stakeSum=0;
  for(const txt of stakeTexts){
    const m=txt.match(/([0-9,]+)円.*払戻/);
    assert(m,label+' stake amount row '+txt);
    const v=Number(m[1].replace(/,/g,''));
    assert(v>=100&&v%100===0,label+' stake unit '+v);
    stakeSum+=v;
  }
  assert(stakeSum===stakeAmount,label+' stake total '+stakeSum+' vs '+stakeAmount);

  await app.locator('#saveAnalysis').click();
  assert((await app.locator('#history .history').count())===1,label+' iframe history saved');

  await page.locator('#tabDash').click();
  assert(await page.locator('#dashView').isVisible(),label+' dashboard visible');
  assert((await page.locator('#history .history').count())===1,label+' dashboard sees saved forecast');
  const initialSummary=await page.locator('#summary').textContent();
  assert(initialSummary.includes('発走前保存')&&initialSummary.includes('結果登録'),label+' dashboard summary');

  await page.locator('#history .editResult').first().click();
  const [first,second]=firstPair.split('-');
  const editor=page.locator('#history .editor').first();
  await editor.locator('.first').fill(first);
  await editor.locator('.second').fill(second);
  await editor.locator('.purchased').selectOption('yes');
  await editor.locator('.stake').fill(String(stakeAmount));
  await editor.locator('.ret').fill(String(stakeAmount*2));
  await editor.locator('.saveResult').click();

  assert((await page.locator('#dashBadge').textContent()).includes('1/1'),label+' dashboard badge settled');
  const summary=await page.locator('#summary').textContent();
  assert(summary.includes('1/1'),label+' candidate hit summary '+summary);
  assert(summary.includes('200%'),label+' actual ROI summary '+summary);
  assert((await page.locator('#axisTable .row').count())>=3,label+' axis stats rows');
  assert((await page.locator('#calTable .row').count())>=2,label+' calibration rows');
  assert((await page.locator('#evTable .row').count())===4,label+' EV band rows');
  const historyText=await page.locator('#history').textContent();
  assert(historyText.includes('✅候補内')&&historyText.includes('購入'),label+' settled history status');
  assert(!errs.length,label+' page errors: '+errs.join(' | '));

  await context.close();await browser.close();
  console.log('PASS '+label+' waku BC validation dashboard');
}
(async()=>{await run(chromium,'Chromium');await run(webkit,'WebKit(iPhone Safari相当)')})().catch(e=>{console.error(e);process.exit(1)});