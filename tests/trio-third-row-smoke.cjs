const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=trio-third-row';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&document.querySelector('#wqPriceGate')&&document.querySelector('#trioThirdRow'),null,{timeout:25000});
  assert.strictEqual(await page.locator('#trioThirdRow').count(),1,`${name}: trio panel missing/duplicated`);

  const sourceBefore=await page.evaluate(()=>{
    window.CalibratedProbabilityState={ready:true,version:'trio-smoke-cal',results:[
      {no:'1',name:'H1',pop:1,top3:.62},{no:'2',name:'H2',pop:2,top3:.52},{no:'3',name:'H3',pop:3,top3:.42},{no:'4',name:'H4',pop:4,top3:.30},{no:'5',name:'H5',pop:5,top3:.20}
    ]};
    window.Finish600State={ready:true,rows:[
      {no:'1',finishRank:1},{no:'2',finishRank:2},{no:'3',finishRank:4},{no:'4',finishRank:3},{no:'5',finishRank:5}
    ]};
    window.M3PureAbilityV2State={rows:[
      {no:'1',abilityRank:1,v2Rank:1,histN:5},{no:'2',abilityRank:2,v2Rank:3,histN:5},{no:'3',abilityRank:3,v2Rank:2,histN:4},{no:'4',abilityRank:4,v2Rank:4,histN:3},{no:'5',abilityRank:5,v2Rank:5,histN:2}
    ]};
    return JSON.stringify(window.CalibratedProbabilityState);
  });
  await page.fill('#wqCandidatePaste','1-2\n1-3');
  await page.evaluate(()=>{
    dispatchEvent(new CustomEvent('calibrated-probability-ready',{detail:window.CalibratedProbabilityState}));
    dispatchEvent(new CustomEvent('m3-pure-ability-v2-ready',{detail:window.M3PureAbilityV2State}));
  });
  await page.waitForFunction(()=>window.TrioThirdRowState?.ready===true&&window.TrioThirdRowState?.pairs?.length===2,null,{timeout:7000});
  const state=await page.evaluate(()=>window.TrioThirdRowState);
  assert.strictEqual(state.version,'trio-third-row-v1.0',`${name}: version mismatch`);
  assert.strictEqual(state.status,'research_display_only',`${name}: must remain research-only`);
  assert.strictEqual(state.displayOnly,true,`${name}: displayOnly lost`);
  assert.strictEqual(state.scoringImpact,false,`${name}: scoring impact must stay off`);
  assert.strictEqual(state.probabilityImpact,false,`${name}: probability impact must stay off`);
  assert.strictEqual(state.rankingImpact,false,`${name}: ranking impact must stay off`);
  assert.strictEqual(state.bettingImpact,false,`${name}: betting impact must stay off`);
  assert.strictEqual(state.automaticBuy,false,`${name}: automatic buy must stay off`);
  assert(state.marginalMaxError<1e-7,`${name}: IPF marginal error too large ${state.marginalMaxError}`);
  assert(Math.abs(state.tripleSum-1)<1e-7,`${name}: triple distribution must sum to 1 (${state.tripleSum})`);
  for(const p of state.pairs){
    assert(!p.error,`${name}: pair ${p.key} unresolved`);
    assert.strictEqual(p.top.length,3,`${name}: ${p.key} top3 missing`);
    const s=p.all.reduce((a,r)=>a+r.conditional,0);
    assert(Math.abs(s-1)<1e-9,`${name}: ${p.key} conditional shares must sum to 1 (${s})`);
    assert(p.cumulativeTop3>0&&p.cumulativeTop3<=1,`${name}: ${p.key} cumulative top3 invalid`);
    assert(p.top.every(r=>r.no!==String(p.a)&&r.no!==String(p.b)),`${name}: base horse leaked into third row`);
  }
  const p12=state.pairs.find(p=>p.key==='1-2');
  assert(p12.top.some(r=>r.m3Rank===4||r.m3Rank===3||r.m3Rank===5),`${name}: M3 annotation missing`);
  assert(p12.top.some(r=>Number.isFinite(r.abilityV2)),`${name}: Ability annotation missing`);
  assert.strictEqual(await page.locator('#trioThirdRows .t3Pair').count(),2,`${name}: rendered pair count wrong`);
  assert.strictEqual(await page.locator('#trioThirdRows .t3Row').count(),6,`${name}: rendered third-row count wrong`);

  const sourceAfter=await page.evaluate(()=>JSON.stringify(window.CalibratedProbabilityState));
  assert.strictEqual(sourceAfter,sourceBefore,`${name}: calibrated source was mutated`);
  await page.evaluate(()=>{dispatchEvent(new CustomEvent('rsa-addons-ready'));dispatchEvent(new CustomEvent('calibrated-probability-ready',{detail:window.CalibratedProbabilityState}))});
  await page.waitForTimeout(150);
  assert.strictEqual(await page.locator('#trioThirdRow').count(),1,`${name}: trio panel duplicated after repeated events`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'wide pair -> coherent conditional third-row ranking');
  await browser.close();
}

(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
