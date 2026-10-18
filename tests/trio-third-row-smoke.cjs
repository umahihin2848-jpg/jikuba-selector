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
    const ps=[.34,.33,.32,.31,.30,.29,.28,.27,.26,.25];
    window.CalibratedProbabilityState={ready:true,version:'trio-smoke-cal',results:ps.map((top3,i)=>({no:String(i+1),name:`H${i+1}`,pop:i+1,top3}))};
    window.Finish600State={ready:true,rows:ps.map((_,i)=>({no:String(i+1),finishRank:i+1}))};
    window.M3PureAbilityV2State={rows:ps.map((_,i)=>({no:String(i+1),abilityRank:i+1,v2Rank:10-i,histN:5}))};
    return JSON.stringify(window.CalibratedProbabilityState);
  });
  await page.fill('#wqCandidatePaste','1-2\n1-3');
  await page.evaluate(()=>{
    dispatchEvent(new CustomEvent('calibrated-probability-ready',{detail:window.CalibratedProbabilityState}));
    dispatchEvent(new CustomEvent('m3-pure-ability-v2-ready',{detail:window.M3PureAbilityV2State}));
  });
  await page.waitForFunction(()=>window.TrioThirdRowState?.ready===true&&window.TrioThirdRowState?.pairs?.length===2,null,{timeout:7000});
  const state=await page.evaluate(()=>window.TrioThirdRowState);
  assert.strictEqual(state.version,'trio-third-row-v1.1-adaptive65',`${name}: version mismatch`);
  assert.strictEqual(state.status,'forward_validation_display_only',`${name}: must remain forward-validation display only`);
  assert.strictEqual(state.displayOnly,true,`${name}: displayOnly lost`);
  assert.strictEqual(state.scoringImpact,false,`${name}: scoring impact must stay off`);
  assert.strictEqual(state.probabilityImpact,false,`${name}: probability impact must stay off`);
  assert.strictEqual(state.rankingImpact,false,`${name}: ranking impact must stay off`);
  assert.strictEqual(state.bettingImpact,false,`${name}: betting impact must stay off`);
  assert.strictEqual(state.automaticBuy,false,`${name}: automatic buy must stay off`);
  assert.deepStrictEqual(state.selectionPolicy,{mode:'adaptive_cumulative',minimum:3,maximum:5,targetCumulative:.65,thresholdStatus:'exploratory_fixed_for_forward_validation',thresholdMeaning:'selection_coverage_not_hit_rate'},`${name}: selection policy changed`);
  assert(state.marginalMaxError<1e-7,`${name}: IPF marginal error too large ${state.marginalMaxError}`);
  assert(Math.abs(state.tripleSum-1)<1e-7,`${name}: triple distribution must sum to 1 (${state.tripleSum})`);
  let sawExpansion=false;
  for(const p of state.pairs){
    assert(!p.error,`${name}: pair ${p.key} unresolved`);
    assert.strictEqual(p.top.length,3,`${name}: ${p.key} backward-compatible top3 missing`);
    assert.strictEqual(p.top3.length,3,`${name}: ${p.key} top3 missing`);
    assert(p.selectionCount>=3&&p.selectionCount<=5,`${name}: ${p.key} selection count outside 3-5 (${p.selectionCount})`);
    assert.strictEqual(p.selected.length,p.selectionCount,`${name}: ${p.key} selected length mismatch`);
    assert.deepStrictEqual(p.selected.map(x=>x.no),p.all.slice(0,p.selectionCount).map(x=>x.no),`${name}: ${p.key} selection must be a leading prefix`);
    const s=p.all.reduce((a,r)=>a+r.conditional,0);
    assert(Math.abs(s-1)<1e-9,`${name}: ${p.key} conditional shares must sum to 1 (${s})`);
    assert(p.cumulativeTop3>0&&p.cumulativeTop3<=1,`${name}: ${p.key} cumulative top3 invalid`);
    assert(p.cumulativeSelected>=p.cumulativeTop3-1e-12,`${name}: ${p.key} adaptive cumulative below top3`);
    assert(p.selected.every(r=>r.no!==String(p.a)&&r.no!==String(p.b)),`${name}: base horse leaked into third row`);
    if(p.selectionCount<5) assert(p.cumulativeSelected>=.65-1e-12,`${name}: ${p.key} stopped before 65% without hitting max`);
    if(p.selectionCount===5&&p.cumulativeSelected<.65) assert.strictEqual(p.dispersed,true,`${name}: ${p.key} max5 below 65% must be dispersed`);
    if(p.dispersed){assert.strictEqual(p.selectionCount,5,`${name}: dispersed must use max5`);assert(p.cumulativeSelected<.65,`${name}: dispersed cannot already reach 65%`)}
    if(p.selectionCount>3)sawExpansion=true;
  }
  assert(sawExpansion,`${name}: synthetic case did not exercise adaptive expansion`);
  const p12=state.pairs.find(p=>p.key==='1-2');
  assert(p12.selected.some(r=>Number.isFinite(r.m3Rank)),`${name}: M3 annotation missing`);
  assert(p12.selected.some(r=>Number.isFinite(r.abilityV2)),`${name}: Ability annotation missing`);
  assert.strictEqual(await page.locator('#trioThirdRows .t3Pair').count(),2,`${name}: rendered pair count wrong`);
  const rendered=await page.locator('#trioThirdRows .t3Row').count();
  const expected=state.pairs.reduce((n,p)=>n+(p.selectionCount||0),0);
  assert.strictEqual(rendered,expected,`${name}: rendered adaptive third-row count wrong`);
  const foot=await page.locator('#trioThirdRow .t3Foot').textContent();
  assert(foot.includes('的中率65%を意味しません'),`${name}: statistical caveat missing`);

  const sourceAfter=await page.evaluate(()=>JSON.stringify(window.CalibratedProbabilityState));
  assert.strictEqual(sourceAfter,sourceBefore,`${name}: calibrated source was mutated`);
  await page.evaluate(()=>{dispatchEvent(new CustomEvent('rsa-addons-ready'));dispatchEvent(new CustomEvent('calibrated-probability-ready',{detail:window.CalibratedProbabilityState}))});
  await page.waitForTimeout(150);
  assert.strictEqual(await page.locator('#trioThirdRow').count(),1,`${name}: trio panel duplicated after repeated events`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'adaptive 3-5 third-row selection with 65% forward threshold');
  await browser.close();
}

(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
