const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=wide-auto-adaptive34';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

const PAIRS=[
  {a:{no:'1',name:'H1'},b:{no:'2',name:'H2'},p:.30},
  {a:{no:'1',name:'H1'},b:{no:'3',name:'H3'},p:.26},
  {a:{no:'2',name:'H2'},b:{no:'3',name:'H3'},p:.22},
  {a:{no:'1',name:'H1'},b:{no:'4',name:'H4'},p:.18},
  {a:{no:'2',name:'H2'},b:{no:'4',name:'H4'},p:.15}
];
function odds(fourth){return `1 2.0\n2 3.2\n3 4.4\n4 ${fourth}\n5 8.5\n6 11.0\n7 15.0\n8 20.0`}
async function seed(page){
  await page.evaluate(pairs=>{
    window.JointPairProbabilityState={ready:true,version:'wide-auto-smoke',wide:pairs};
    const ps=[.42,.38,.34,.30,.26,.22,.18,.14];
    window.CalibratedProbabilityState={ready:true,version:'wide-auto-cal',results:ps.map((top3,i)=>({no:String(i+1),name:`H${i+1}`,pop:i+1,top3}))};
  },PAIRS);
}
async function trigger(page){await page.evaluate(()=>dispatchEvent(new CustomEvent('joint-pair-probability-ready',{detail:window.JointPairProbabilityState})));await page.waitForTimeout(260)}
async function keys(page){return page.locator('#wqCandidatePaste').inputValue().then(v=>v.trim().split(/\n+/).filter(Boolean))}
async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&document.querySelector('#wqPriceGate')&&document.querySelector('#trioThirdRow'),null,{timeout:25000});
  await seed(page);

  // Below threshold -> four candidates.
  await page.fill('#oddsPaste',odds('5.6'));
  await trigger(page);
  let s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(s.version,'wide-auto-candidates-v1.1-adaptive34',`${name}: version mismatch`);
  assert.strictEqual(s.selectionPolicy.mode,'adaptive_top3_or_top4',`${name}: adaptive policy missing`);
  assert.strictEqual(s.selectionPolicy.threshold,2.9,`${name}: threshold changed`);
  assert.strictEqual(s.selectionPolicy.developmentYear,2025,`${name}: dev year changed`);
  assert.strictEqual(s.selectionPolicy.holdoutYear,2026,`${name}: holdout year changed`);
  assert.strictEqual(s.selectionPolicy.status,'forward_validation',`${name}: status must stay Forward`);
  assert.strictEqual(s.selectionPolicy.thresholdMeaning,'candidate_width_not_hit_rate_or_ev',`${name}: threshold meaning changed`);
  assert.deepStrictEqual(s.selectionPolicy.impacts,{ability:false,m3:false,probability:false,ranking:false,automaticBuy:false},`${name}: independence flags changed`);
  assert.strictEqual(s.decision.count,4,`${name}: concentrated market should expand to four`);
  assert.strictEqual(s.decision.expanded,true,`${name}: expansion flag missing`);
  assert.strictEqual((await keys(page)).length,4,`${name}: four candidates not written`);
  assert.strictEqual(new Set(await keys(page)).size,4,`${name}: duplicate candidate pair`);
  assert((await page.locator('#wqAutoCandidateInfo').innerText()).includes('4組まで拡張'),`${name}: expanded UI reason missing`);

  // Exactly 2.90 remains inclusive.
  await page.fill('#oddsPaste',odds('5.8'));
  await page.waitForTimeout(260);
  s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert(Math.abs(s.decision.ratio-2.9)<1e-12,`${name}: threshold ratio parsing failed`);
  assert.strictEqual(s.decision.count,4,`${name}: threshold must be inclusive`);
  assert.strictEqual((await keys(page)).length,4,`${name}: exact threshold did not keep four`);

  // Above threshold -> stop at three.
  await page.fill('#oddsPaste',odds('6.0'));
  await page.waitForTimeout(260);
  s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(s.decision.count,3,`${name}: spread market should stop at three`);
  assert.strictEqual(s.decision.expanded,false,`${name}: spread market incorrectly expanded`);
  assert.strictEqual((await keys(page)).length,3,`${name}: three candidates not written`);
  assert((await page.locator('#wqAutoCandidateInfo').innerText()).includes('3組で停止'),`${name}: stop UI reason missing`);

  // Missing odds -> conservative top3 fallback.
  await page.fill('#oddsPaste','1 2.0\n2 3.2\n3 4.4');
  await page.waitForTimeout(260);
  s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(s.decision.fallback,true,`${name}: missing odds must trigger fallback`);
  assert.strictEqual(s.decision.count,3,`${name}: fallback must be top3`);
  assert.strictEqual((await keys(page)).length,3,`${name}: fallback wrote wrong count`);

  // Manual edits are protected from later automatic refreshes.
  await page.fill('#wqCandidatePaste','7-8');
  await page.fill('#oddsPaste',odds('5.6'));
  await trigger(page);
  assert.deepStrictEqual(await keys(page),['7-8'],`${name}: manual candidate was overwritten`);
  s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(s.manualOverride,true,`${name}: manual override state missing`);

  // Restore uses the current adaptive decision and notifies trio.
  await page.click('#wqTop3Btn');
  await page.waitForTimeout(320);
  assert.strictEqual((await keys(page)).length,4,`${name}: restore did not use adaptive four`);
  s=await page.evaluate(()=>window.WideAutoCandidateState);
  assert.strictEqual(s.manualOverride,false,`${name}: restore did not clear manual override`);
  await page.evaluate(()=>dispatchEvent(new CustomEvent('calibrated-probability-ready',{detail:window.CalibratedProbabilityState})));
  await page.waitForFunction(()=>window.TrioThirdRowState?.ready===true&&window.TrioThirdRowState?.pairs?.length===4,null,{timeout:7000});
  assert.strictEqual((await page.evaluate(()=>window.TrioThirdRowState.pairs.length)),4,`${name}: trio did not receive four wide candidates`);

  // M3 / Ability annotations must never change the width decision.
  const before=await page.evaluate(()=>JSON.stringify(window.WideAutoCandidateState.decision));
  await page.evaluate(()=>{
    window.Finish600State={ready:true,rows:Array.from({length:8},(_,i)=>({no:String(i+1),finishRank:8-i}))};
    window.M3PureAbilityV2State={rows:Array.from({length:8},(_,i)=>({no:String(i+1),abilityRank:8-i,v2Rank:i+1,histN:99}))};
    dispatchEvent(new CustomEvent('m3-race-lab-ready',{detail:window.Finish600State}));
    dispatchEvent(new CustomEvent('m3-pure-ability-v2-ready',{detail:window.M3PureAbilityV2State}));
  });
  await page.waitForTimeout(220);
  const after=await page.evaluate(()=>JSON.stringify(window.WideAutoCandidateState.decision));
  assert.strictEqual(after,before,`${name}: M3/Ability changed candidate-width decision`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'adaptive wide top3/top4 candidate width');
  await browser.close();
}
(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
