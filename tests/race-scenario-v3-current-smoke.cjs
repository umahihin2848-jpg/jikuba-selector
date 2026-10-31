const { chromium, webkit } = require('playwright');
const assert = require('assert');

const EXPECTED_BUILD='20261031cleanup1';
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=current-production';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function mockProductionState(){
  const marketRows=Array.from({length:16},(_,i)=>({no:String(i+1),od:2.5+i*1.7,pop:i+1,share:1/16}));
  const byNo=Object.fromEntries(marketRows.map(r=>[r.no,r]));
  const abilityRows=Array.from({length:16},(_,i)=>({no:String(i+1),name:`Horse${i+1}`,abilityRank:i+1,histN:5,features:{mean3_finish_pct:16-i,mean5_finish_pct:16-i}}));
  return {marketRows,byNo,abilityRows};
}

async function commonAssertions(page,name){
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:30000});
  const health=await page.evaluate(()=>window.RSAAddonHealth);
  assert.strictEqual(await page.evaluate(()=>window.RSA_BUILD),EXPECTED_BUILD,`${name}: RSA_BUILD mismatch`);
  assert.strictEqual(await page.evaluate(()=>document.documentElement.dataset.rsaBuild),EXPECTED_BUILD,`${name}: dataset build mismatch`);
  assert.strictEqual(health.build,EXPECTED_BUILD,`${name}: loader build mismatch`);
  assert.deepStrictEqual(health.failures,[],`${name}: addon failures ${health.failures.join(',')}`);
  assert.strictEqual(await page.getAttribute('#fieldSize','min'),'12',`${name}: fieldSize minimum must be 12`);
  const header=await page.locator('.brand').innerText();
  assert(header.includes('Ability × M3 × P10/隊列 × 市場'),`${name}: four-layer header missing`);
  assert(!header.includes('M3を核に'),`${name}: stale M3-core wording remains`);
  const flow=await page.locator('.q5flow').innerText();
  assert(flow.includes('市場照合'),`${name}: market comparison step missing`);
  assert(!flow.includes('市場Edge'),`${name}: stale market Edge step remains`);
}

async function seedState(page){
  await page.evaluate(({marketRows,byNo,abilityRows})=>{
    window.M3PureAbilityState={ready:true,rows:abilityRows,byNo:Object.fromEntries(abilityRows.map(r=>[r.no,r]))};
    window.DecisionShellV2State={ready:true,structure:{level:'yellow',code:'A1_conditional',label:'A1条件付き',axis:{no:'1',name:'Horse1',abilityRank:1,m3Rank:1},ar:1,m3:1,p10:.25,front:.6,kind:'A1',winRiskStop:false},final:{level:'yellow',code:'A1_conditional',label:'条件付き',reason:'test'},market:{complete:true,field:16,rows:marketRows,byNo,shape:'中間'},tickets:{win:{level:'yellow',label:'単勝慎重',reason:'test'},quinella:{level:'yellow',label:'手動選択',reason:'test'},wide:{level:'yellow',label:'手動選択',reason:'test'}}};
    dispatchEvent(new CustomEvent('decision-shell-v2-ready',{detail:window.DecisionShellV2State}));
  },mockProductionState());
}

async function runMobile(browserType,name){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await commonAssertions(page,name);
  assert.strictEqual(await page.evaluate(()=>Boolean(window.RSAMobileLean)),true,`${name}: mobile lean not active`);
  await seedState(page);
  await page.evaluate(()=>window.MobileOpponentCoreV1?.render());
  await page.waitForFunction(()=>window.OpponentCandidatePoolState?.rows?.length===2,null,{timeout:5000});
  const opp=await page.evaluate(()=>window.OpponentCandidatePoolState);
  assert.strictEqual(opp.selectionMethod,'market_top2_excluding_axis',`${name}: wrong opponent method`);
  assert.deepStrictEqual(opp.rows.map(r=>r.no),['2','3'],`${name}: market Top2 excluding axis mismatch`);
  assert.strictEqual(opp.structuralRescueMax,0,`${name}: structural rescue must be disabled`);
  assert.strictEqual(opp.autoDrop,false,`${name}: automatic drop must be disabled`);
  assert.strictEqual(opp.noReplacement,true,`${name}: replacement must be disabled`);
  assert.strictEqual(opp.warningEvidence?.productionDropTested,true,`${name}: drop-test evidence missing`);
  assert.strictEqual(opp.warningEvidence?.productionDropImproved,false,`${name}: failed drop improvement must be explicit`);
  await page.waitForFunction(()=>window.ProductionDecisionPipelineV1State?.ready===true,null,{timeout:5000});
  const prod=await page.evaluate(()=>window.ProductionDecisionPipelineV1State);
  assert.strictEqual(prod.stages.opponents.selectionMethod,'market_top2_excluding_axis',`${name}: production pipeline opponent method mismatch`);
  assert(prod.stages.opponents.rows.length<=2,`${name}: production opponents exceeded two`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,{build:EXPECTED_BUILD,opponents:opp.rows.map(r=>r.no)});
  await browser.close();
}

async function runDesktop(){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await commonAssertions(page,'desktop chromium');
  await page.waitForFunction(()=>window.OpponentCandidatePoolV1?.ready===true,null,{timeout:30000});
  await seedState(page);
  await page.evaluate(()=>window.OpponentCandidatePoolV1.schedule());
  await page.waitForFunction(()=>window.OpponentCandidatePoolState?.rows?.length===2,null,{timeout:5000});
  const opp=await page.evaluate(()=>window.OpponentCandidatePoolState);
  assert.strictEqual(opp.selectionMethod,'market_top2_excluding_axis','desktop: wrong opponent method');
  assert.deepStrictEqual(opp.rows.map(r=>r.no),['2','3'],'desktop: market Top2 excluding axis mismatch');
  assert.strictEqual(opp.structuralRescueMax,0,'desktop: structural rescue must be disabled');
  assert.strictEqual(opp.autoDrop,false,'desktop: automatic drop must be disabled');
  assert.deepStrictEqual(errors,[],'desktop: page errors '+errors.join(' | '));
  console.log('PASS desktop chromium',{build:EXPECTED_BUILD,opponents:opp.rows.map(r=>r.no)});
  await browser.close();
}

(async()=>{await runMobile(chromium,'chromium iPhone');await runMobile(webkit,'webkit iPhone');await runDesktop()})().catch(err=>{console.error(err);process.exit(1)});