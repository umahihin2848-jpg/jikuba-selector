const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=wide-quinella-price-gate';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&document.querySelector('#wqPriceGate')&&document.querySelector('#qmdQuinellaPaste'),null,{timeout:25000});
  assert.strictEqual(await page.locator('#wqPriceGate').count(),1,`${name}: price gate missing/duplicated at boot`);

  const sourceBefore=await page.evaluate(()=>{
    window.JointPairProbabilityState={
      ready:true,version:'price-gate-smoke-source',
      quinella:[
        {a:{no:'1',name:'H1'},b:{no:'2',name:'H2'},p:.08},
        {a:{no:'1',name:'H1'},b:{no:'3',name:'H3'},p:.025},
        {a:{no:'2',name:'H2'},b:{no:'4',name:'H4'},p:.03}
      ],
      wide:[
        {a:{no:'1',name:'H1'},b:{no:'2',name:'H2'},p:.35},
        {a:{no:'1',name:'H1'},b:{no:'3',name:'H3'},p:.25},
        {a:{no:'2',name:'H2'},b:{no:'4',name:'H4'},p:.20}
      ]
    };
    const snap=JSON.stringify(window.JointPairProbabilityState);
    dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState}));
    return snap;
  });

  await page.fill('#qmdQuinellaPaste','1-2 15\n1-3 40\n2-4 60');
  await page.fill('#wqCandidatePaste','1-2\n1-3\n2-4');
  await page.click('#wqCheckBtn');
  await page.waitForFunction(()=>window.WideQuinellaPriceState?.ready===true&&window.WideQuinellaPriceState?.rows?.length===3,null,{timeout:5000});

  let state=await page.evaluate(()=>window.WideQuinellaPriceState);
  assert.strictEqual(state.version,'wide-quinella-price-gate-v1.0',`${name}: version mismatch`);
  assert.strictEqual(state.status,'research_display_only',`${name}: status must remain research-only`);
  assert.strictEqual(state.displayOnly,true,`${name}: displayOnly flag lost`);
  assert.strictEqual(state.scoringImpact,false,`${name}: scoring impact must stay off`);
  assert.strictEqual(state.probabilityImpact,false,`${name}: probability impact must stay off`);
  assert.strictEqual(state.rankingImpact,false,`${name}: ranking impact must stay off`);
  assert.strictEqual(state.bettingImpact,false,`${name}: betting impact must stay off`);
  assert.strictEqual(state.automaticBuy,false,`${name}: automatic buy must stay off`);
  assert.strictEqual(state.validation?.rawPriceRuleRejected,true,`${name}: rejected raw price rule flag missing`);
  assert.strictEqual(state.validation?.forwardZone?.productionReady,false,`${name}: forward zone must not be production-ready`);

  const r12=state.rows.find(r=>r.key==='1-2');
  const r13=state.rows.find(r=>r.key==='1-3');
  const r24=state.rows.find(r=>r.key==='2-4');
  assert(r12&&r13&&r24,`${name}: candidate rows missing`);
  assert(Math.abs(r12.referenceOdds-12.5)<1e-9,`${name}: 1-2 reference odds wrong ${r12.referenceOdds}`);
  assert(Math.abs(r12.priceRatio-1.2)<1e-9,`${name}: 1-2 price ratio wrong ${r12.priceRatio}`);
  assert.strictEqual(r12.statusKey,'above',`${name}: 1-2 should be reference-price-above`);
  assert(Math.abs(r13.referenceOdds-40)<1e-9,`${name}: 1-3 reference odds wrong ${r13.referenceOdds}`);
  assert(Math.abs(r13.priceRatio-1)<1e-9,`${name}: 1-3 price ratio wrong ${r13.priceRatio}`);
  assert.strictEqual(r24.forwardCandidate,true,`${name}: 2-4 should be forward research band`);
  assert.strictEqual(r24.statusKey,'forward',`${name}: 2-4 forward label missing`);
  assert(Math.abs(r24.priceRatio-1.8)<1e-9,`${name}: 2-4 price ratio wrong ${r24.priceRatio}`);
  assert.strictEqual(await page.locator('#wqPriceRows .wqRow').count(),3,`${name}: rendered candidate row count wrong`);

  const sourceAfter=await page.evaluate(()=>JSON.stringify(window.JointPairProbabilityState));
  assert.strictEqual(sourceAfter,sourceBefore,`${name}: source pair probabilities were mutated`);

  await page.evaluate(()=>{
    dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState}));
    dispatchEvent(new CustomEvent('market-mispricing-ready'));
    dispatchEvent(new CustomEvent('rsa-addons-ready'));
  });
  await page.waitForTimeout(150);
  assert.strictEqual(await page.locator('#wqPriceGate').count(),1,`${name}: duplicate price gate after repeated events`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'wide candidates -> quinella reference price -> forward research band');
  await browser.close();
}

(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
