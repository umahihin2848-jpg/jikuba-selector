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
    const ta=document.querySelector('#wqCandidatePaste');
    if(ta){ta.value='';ta.dataset.wqAutoValue='';ta.dataset.wqSource=''}
    window.__wqInputSeen=0;
    ta?.addEventListener('input',()=>window.__wqInputSeen++);
    const snap=JSON.stringify(window.JointPairProbabilityState);
    dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState}));
    return snap;
  });

  await page.waitForFunction(()=>window.WideAutoCandidateState?.ready===true&&window.WideAutoCandidateState?.activePairs?.length===3&&document.querySelector('#wqCandidatePaste')?.dataset.wqSource==='auto',null,{timeout:5000});
  let auto=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(auto.version,'wide-auto-candidates-v1.0',`${name}: auto candidate version mismatch`);
  assert.strictEqual(auto.status,'forward_validation_display_only',`${name}: auto candidates must remain forward-only`);
  assert.strictEqual(auto.automaticCandidateExtraction,true,`${name}: automatic extraction flag missing`);
  assert.strictEqual(auto.candidateSource,'joint_pair_probability_wide_top3',`${name}: automatic candidate source changed`);
  assert.strictEqual(auto.suggestionCount,3,`${name}: suggestion count changed`);
  assert.deepStrictEqual(auto.suggestedPairs.map(x=>x.key),['1-2','1-3','2-4'],`${name}: suggested top3 wrong`);
  assert.deepStrictEqual(auto.activePairs.map(x=>x.key),['1-2','1-3','2-4'],`${name}: active automatic candidates wrong`);
  assert.strictEqual(auto.activeSource,'automatic',`${name}: active source should be automatic`);
  assert.strictEqual(auto.manualOverride,false,`${name}: auto state incorrectly marked manual`);
  assert.strictEqual(auto.scoringImpact,false,`${name}: auto candidates must not affect scoring`);
  assert.strictEqual(auto.abilityImpact,false,`${name}: auto candidates must not affect Ability`);
  assert.strictEqual(auto.m3Impact,false,`${name}: auto candidates must not affect M3`);
  assert.strictEqual(auto.bettingImpact,false,`${name}: auto candidates must not be betting logic`);
  assert.strictEqual(auto.automaticBuy,false,`${name}: automatic buy must stay off`);
  assert.strictEqual(auto.evClaim,false,`${name}: auto candidates must not claim EV`);
  assert.strictEqual(auto.productionReady,false,`${name}: auto candidates must remain forward-validation`);
  assert.strictEqual((await page.locator('#wqCandidatePaste').inputValue()).trim(),'1-2\n1-3\n2-4',`${name}: textarea was not automatically populated`);
  assert((await page.locator('#wqAutoCandidateInfo').textContent()).includes('自動抽出'),`${name}: auto extraction status text missing`);
  assert.strictEqual(await page.locator('#wqTop3Btn').textContent(),'自動候補に戻す',`${name}: restore-auto button label missing`);

  await page.fill('#qmdQuinellaPaste','1-2 15\n1-3 40\n2-4 60');
  await page.click('#wqCheckBtn');
  await page.waitForFunction(()=>window.WideQuinellaPriceState?.ready===true&&window.WideQuinellaPriceState?.rows?.length===3,null,{timeout:5000});

  let state=await page.evaluate(()=>window.WideQuinellaPriceState);
  assert.strictEqual(state.version,'wide-quinella-price-gate-v1.0',`${name}: price-gate version mismatch`);
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

  const sourceAfterAuto=await page.evaluate(()=>JSON.stringify(window.JointPairProbabilityState));
  assert.strictEqual(sourceAfterAuto,sourceBefore,`${name}: automatic extraction mutated source pair probabilities`);

  await page.fill('#wqCandidatePaste','1-3');
  await page.waitForFunction(()=>window.WideAutoCandidateState?.manualOverride===true&&window.WideAutoCandidateState?.activePairs?.length===1,null,{timeout:3000});
  auto=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(auto.activeSource,'manual_override',`${name}: manual override source missing`);
  assert.deepStrictEqual(auto.activePairs.map(x=>x.key),['1-3'],`${name}: manual active candidate wrong`);
  assert((await page.locator('#wqAutoCandidateInfo').textContent()).includes('手動候補'),`${name}: manual override status text missing`);

  await page.evaluate(()=>{
    window.JointPairProbabilityState.wide=[
      {a:{no:'2',name:'H2'},b:{no:'4',name:'H4'},p:.40},
      {a:{no:'1',name:'H1'},b:{no:'2',name:'H2'},p:.30},
      {a:{no:'1',name:'H1'},b:{no:'3',name:'H3'},p:.20}
    ];
    dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState}));
  });
  await page.waitForTimeout(250);
  assert.strictEqual((await page.locator('#wqCandidatePaste').inputValue()).trim(),'1-3',`${name}: new auto ranking overwrote manual candidates`);
  auto=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(auto.manualOverride,true,`${name}: manual override was lost after source refresh`);
  assert.deepStrictEqual(auto.suggestedPairs.map(x=>x.key),['2-4','1-2','1-3'],`${name}: refreshed suggestions not published`);

  const inputBeforeRestore=await page.evaluate(()=>window.__wqInputSeen);
  await page.click('#wqTop3Btn');
  await page.waitForFunction(()=>window.WideAutoCandidateState?.manualOverride===false&&window.WideAutoCandidateState?.activePairs?.[0]?.key==='2-4'&&document.querySelector('#wqCandidatePaste')?.dataset.wqSource==='auto',null,{timeout:3000});
  assert.strictEqual((await page.locator('#wqCandidatePaste').inputValue()).trim(),'2-4\n1-2\n1-3',`${name}: restore-auto did not use latest top3`);
  assert((await page.evaluate(()=>window.__wqInputSeen))>inputBeforeRestore,`${name}: restore-auto did not dispatch downstream input event`);

  await page.evaluate(()=>{
    dispatchEvent(new CustomEvent('market-mispricing-ready'));
    dispatchEvent(new CustomEvent('rsa-addons-ready'));
  });
  await page.waitForTimeout(150);
  assert.strictEqual(await page.locator('#wqPriceGate').count(),1,`${name}: duplicate price gate after repeated events`);
  assert.strictEqual(await page.locator('#wqAutoCandidateInfo').count(),1,`${name}: duplicate auto candidate status after repeated events`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'automatic wide top3 -> manual override -> restore automatic candidates');
  await browser.close();
}

(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
