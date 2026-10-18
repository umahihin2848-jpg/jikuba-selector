const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=candidate-odds-compact';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const PAIRS=[
  {a:{no:'1',name:'H1'},b:{no:'2',name:'H2'},p:.30},
  {a:{no:'1',name:'H1'},b:{no:'3',name:'H3'},p:.26},
  {a:{no:'2',name:'H2'},b:{no:'3',name:'H3'},p:.22},
  {a:{no:'1',name:'H1'},b:{no:'4',name:'H4'},p:.18},
  {a:{no:'2',name:'H2'},b:{no:'4',name:'H4'},p:.15}
];
const QPAIRS=PAIRS.map((r,i)=>({...r,p:[.12,.10,.08,.06,.05][i]}));
function odds(fourth){return `1 2.0\n2 3.2\n3 4.4\n4 ${fourth}\n5 8.5\n6 11.0\n7 15.0\n8 20.0`}
async function seed(page){await page.evaluate(({wide,quinella})=>{window.JointPairProbabilityState={ready:true,version:'compact-smoke',wide,quinella};}, {wide:PAIRS,quinella:QPAIRS});await page.evaluate(()=>dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState})));await page.waitForTimeout(300)}
async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&document.querySelector('#candidateOddsCompact')&&document.querySelector('#wqPriceGate'),null,{timeout:25000});
  await seed(page);
  await page.fill('#oddsPaste',odds('5.6'));
  await page.waitForTimeout(350);
  assert.strictEqual(await page.locator('#candidateOddsRows .coRow').count(),4,`${name}: concentrated market must show four compact rows`);
  assert.strictEqual(await page.locator('#candidateOddsRows input').count(),8,`${name}: four pairs must require only eight price inputs`);
  const st0=await page.evaluate(()=>window.CandidateOddsCompactState);
  assert.strictEqual(st0.version,'candidate-odds-compact-v1.0',`${name}: version mismatch`);
  assert.strictEqual(st0.candidateOnly,true,`${name}: candidate-only flag missing`);
  assert.strictEqual(st0.wideOddsMeaning,'lower_bound',`${name}: wide lower-bound meaning missing`);
  assert.deepStrictEqual(st0.impacts,{ability:false,m3:false,probability:false,ranking:false,candidateSelection:false,automaticBuy:false},`${name}: independence flags changed`);
  assert.strictEqual(await page.locator('#candidateOddsAdvancedDetails').count(),1,`${name}: advanced full-input section missing`);
  assert.strictEqual(await page.locator('#candidateOddsAdvancedDetails').getAttribute('open'),null,`${name}: advanced full-input section should start collapsed`);

  await page.locator('input[data-co-kind="q"][data-co-pair="1-2"]').fill('12.8');
  await page.locator('input[data-co-kind="q"][data-co-pair="1-2"]').press('Tab');
  await page.waitForTimeout(150);
  await page.locator('input[data-co-kind="w"][data-co-pair="1-2"]').fill('3.6');
  await page.locator('input[data-co-kind="w"][data-co-pair="1-2"]').press('Tab');
  await page.waitForTimeout(250);
  assert((await page.locator('#qmdQuinellaPaste').inputValue()).includes('1-2 12.8'),`${name}: quinella compact input did not sync`);
  assert((await page.locator('#qmdWidePaste').inputValue()).includes('1-2 3.6'),`${name}: wide compact input did not sync`);
  let st=await page.evaluate(()=>window.CandidateOddsCompactState);
  const p12=st.rows.find(r=>r.key==='1-2');
  assert.strictEqual(p12.quinellaOdds,12.8,`${name}: state missing quinella odds`);
  assert.strictEqual(p12.wideLowerOdds,3.6,`${name}: state missing wide lower odds`);
  await page.waitForFunction(()=>window.WideQuinellaPriceState?.rows?.some(r=>r.key==='1-2'&&r.odds===12.8),null,{timeout:5000});

  // Move above the width threshold: only three pairs remain visible; existing keyed prices are preserved.
  await page.fill('#oddsPaste',odds('6.0'));
  await page.waitForTimeout(350);
  assert.strictEqual(await page.locator('#candidateOddsRows .coRow').count(),3,`${name}: spread market must reduce compact rows to three`);
  assert.strictEqual(await page.locator('#candidateOddsRows input').count(),6,`${name}: three pairs must require only six price inputs`);
  assert.strictEqual(await page.locator('input[data-co-kind="q"][data-co-pair="1-2"]').inputValue(),'12.8',`${name}: keyed quinella value was not preserved`);
  assert.strictEqual(await page.locator('input[data-co-kind="w"][data-co-pair="1-2"]').inputValue(),'3.6',`${name}: keyed wide value was not preserved`);

  // Existing clear button must also clear the compact view.
  await page.click('#qmdClearBtn');
  await page.waitForTimeout(250);
  assert.strictEqual(await page.locator('input[data-co-kind="q"][data-co-pair="1-2"]').inputValue(),'',`${name}: quinella compact value did not clear`);
  assert.strictEqual(await page.locator('input[data-co-kind="w"][data-co-pair="1-2"]').inputValue(),'',`${name}: wide compact value did not clear`);
  st=await page.evaluate(()=>window.CandidateOddsCompactState);
  assert.strictEqual(st.complete,false,`${name}: cleared state incorrectly complete`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'candidate-only quinella/wide odds input');
  await browser.close();
}
(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
