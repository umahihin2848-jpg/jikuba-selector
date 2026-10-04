const { chromium, webkit } = require('playwright');

function assert(c,m){ if(!c) throw new Error(m); }
const LOCAL='http://127.0.0.1:4173/waku-bc-converter/';
const ODDS=[3,40,4,45,5,50,6,55,7,60,8,65,9,70,10,75];

function frameMarket(){
  const rows=[]; let o=3.5;
  for(let a=1;a<=8;a++) for(let b=a;b<=8;b++){ rows.push(a+'-'+b+'='+o.toFixed(1)); o+=0.8; }
  return rows.join(' ');
}
function quinellaMarket(){
  const rows=[];
  for(let a=1;a<=16;a++) for(let b=a+1;b<=16;b++) rows.push(a+'-'+b+'='+(8+(a+b)*1.7).toFixed(1));
  return rows.join(' ');
}

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
    await row.locator('select').selectOption(String(Math.ceil(h/2)));
    await row.locator('input').fill(String(ODDS[h-1]));
  }
  const frameRows=frameMarket().split(' ');
  for(const item of frameRows){
    const [pair,odds]=item.split('=');
    await page.locator('.frameOddsInput[data-pair="'+pair+'"]').fill(odds);
  }
  assert((await page.locator('#frameProgress').textContent()).includes('36 / 36'),label+' frame progress');

  await page.click('#prepareQuinella');
  const qInputs=page.locator('.quinellaOddsInput');
  const qCount=await qInputs.count();
  assert(qCount>0,label+' quinella candidates generated');
  for(let i=0;i<qCount;i++){
    const inp=qInputs.nth(i);
    const pair=await inp.getAttribute('data-pair');
    const [a,b]=pair.split('-').map(Number);
    await inp.fill((8+(a+b)*1.7).toFixed(1));
  }
  assert((await page.locator('#quinellaProgress').textContent()).includes(qCount+' / '+qCount),label+' quinella progress');
  await page.click('#analyze');

  assert(await page.locator('#analysisCard').isVisible(),label+' analysis visible');
  assert((await page.locator('#axisCards .axisCard').count())===2,label+' two axes');
  assert((await page.locator('#pA').textContent()).includes('%'),label+' pA');
  assert((await page.locator('#pB').textContent()).includes('%'),label+' pB');
  assert((await page.locator('#pC').textContent()).includes('%'),label+' pC');
  const p=await page.locator('#pText').textContent();
  const price=await page.locator('#priceText').textContent();
  const judge=await page.locator('#judgeText').textContent();
  assert(p.includes('%')&&!p.includes('—'),label+' final p '+p);
  assert(price.includes('倍')&&price.includes('/'),label+' composite and EV '+price);
  assert(!judge.includes('馬連オッズ待ち'),label+' price judgement '+judge);
  assert((await page.locator('.pairCard').count())>0,label+' candidate frame pairs');
  assert((await page.locator('#warnings > div').count())>0,label+' warning/ok output');

  const stakeAmount=Math.max(3000,qCount*500);
  await page.fill('#quinellaStake',String(stakeAmount));
  await page.click('#calcQuinellaStake');
  const stakeRows=page.locator('#stakePlan .stakeRow');
  assert((await stakeRows.count())===qCount,label+' stake rows');
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
  const stakePlanText=await page.locator('#stakePlan').textContent();
  assert(stakePlanText.includes('理論均等払戻')&&stakePlanText.includes('100円丸め後'),label+' equal payout summary');
  assert(!errs.length,label+' page errors: '+errs.join(' | '));

  await page.click('#saveAnalysis');
  assert((await page.locator('#history .history').count())===1,label+' history saved');
  const htxt=await page.locator('#history').textContent();
  assert(htxt.includes('p ')&&htxt.includes('EV '),label+' history contains translated metrics');

  await context.close();await browser.close();
  console.log('PASS '+label+' waku BC odds translator');
}
(async()=>{await run(chromium,'Chromium');await run(webkit,'WebKit(iPhone Safari相当)')})().catch(e=>{console.error(e);process.exit(1)});