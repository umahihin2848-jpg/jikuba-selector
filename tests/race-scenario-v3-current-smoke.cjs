const { chromium, webkit } = require('playwright');
const assert = require('assert');

const EXPECTED_BUILD='20261017a11';
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=r72';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

function makeTargetCsv(){
  const head=['何走目','馬番','馬名','レースPCI','PCI','Ave-3F','上3F地点差','決手','日付','距離','開催','着順','着差','クラス名','頭数','芝・ダ','上り3F','通過1','通過2','通過3','通過4'];
  const rows=[head.join(',')];
  for(let h=1;h<=16;h++){
    for(let k=0;k<8;k++){
      const style=h<=2?'逃げ':h<=7?'先行':h<=12?'差し':'追込';
      const rpci=43+((h+k)%13),pci=45+((h*2+k)%14),ave=(34+((h+k)%9)*.2).toFixed(1),gap=(.2+((h+k)%10)*.25).toFixed(2),last3=(34+((h*2+k)%10)*.18).toFixed(2),margin=(((h+k)%9)*.18-.25).toFixed(2);
      const month=String(9-k).padStart(2,'0'),p1=Math.min(16,Math.max(1,h<=7?h:8+((h+k)%8))),p4=Math.min(16,Math.max(1,p1+(style==='差し'||style==='追込'?-2:1)));
      rows.push([k+1,h,`TestHorse${h}`,rpci,pci,ave,gap,style,`2026.${month}.10`,1800,'阪神',((h+k)%12)+1,margin,'Ｇ３',16,'ダ',last3,p1,p1,p4,p4].join(','));
    }
  }
  return rows.join('\n');
}
function oddsText(){const vals=[2.8,4.1,5.6,7.4,9.8,12.5,16,20.5,26,33,41,52,65,80,100,130];return vals.map((v,i)=>`${i+1} ${v}`).join('\n')}
async function ensureCsvParsed(page){
  await page.locator('#csvFile').setInputFiles({name:'r72-target.csv',mimeType:'text/csv',buffer:Buffer.from(makeTargetCsv(),'utf8')});
  await page.waitForTimeout(500);
  if(!/^解析済\s+16頭$/.test(await page.locator('#csvState').innerText())){
    await page.click('#parseCsvBtn');
  }
  await page.waitForFunction(()=>/^解析済\s+16頭$/.test(document.querySelector('#csvState')?.textContent||''),null,{timeout:12000});
}
async function analyze(page,label){
  const prev=await page.evaluate(()=>window.RSAAnalysisTransitionState?.generation||0);
  const t0=Date.now();
  await page.click('#analyzeBtn');
  await page.waitForFunction(p=>{const s=window.RSAAnalysisTransitionState;return !!s&&s.generation>p&&['ready','error'].includes(s.status)},prev,{timeout:20000});
  const state=await page.evaluate(()=>window.RSAAnalysisTransitionState);
  assert.strictEqual(state.status,'ready',`${label}: analysis failed; missing=${(state.missing||[]).join(',')}`);
  await page.waitForFunction(()=>window.M3RaceLabState?.ready===true,null,{timeout:8000});
  const ms=Date.now()-t0;
  assert(ms<12500,`${label}: analysis too slow ${ms}ms`);
  return ms;
}
async function currentSnapshot(page){return page.evaluate(()=>({
  nodes:document.querySelectorAll('*').length,
  labs:document.querySelectorAll('#m3RaceLab').length,
  repro:document.querySelectorAll('#m3PrevRunRepro').length,
  narrative:document.querySelectorAll('#m3NarrativeAnalysis').length,
  abilityPanels:document.querySelectorAll('#m3AbilityCompareV1').length,
  abilityInline:document.querySelectorAll('.m3AbilityInline').length,
  abilityNarrative:document.querySelectorAll('.m3AbilityNarrativeText').length,
  v2ValidationNotes:document.querySelectorAll('#abilityV2FinalValidationNote').length,
  v2ValidationMsgs:document.querySelectorAll('.v2ValidationMsg').length,
  shapeBiasPanels:document.querySelectorAll('#raceShapeBias').length,
  shapeNarrativeLines:document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length,
  shapeNarrativeTags:document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-tag="1"]').length,
  shapeUxMetrics:document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length,
  shapeUxReadouts:document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length,
  shapeNarrativeText:document.querySelector('#m3NarrativeAnalysis [data-rsb-summary="1"]')?.textContent||'',
  shapeUxText:document.querySelector('#raceUXSummary [data-rsb-ux-readout="1"]')?.textContent||'',
  cache:window.RSATargetCsvCache?.stats||null,
  health:window.RSAAddonHealth||null,
  transition:window.RSAAnalysisTransitionState||null,
  front:window.M3FrontPositionState||null,
  prev:window.M3PrevRunReproducibilityState||null,
  append:window.M3NarrativeReproAppendState||null,
  ability:window.M3PureAbilityState||null,
  v2Validation:window.AbilityV2ValidationStatusState||null,
  abilityNarrativeState:window.M3AbilityNarrativeState||null,
  shapeBiasState:window.RaceShapeBiasState||null,
  shapeBridge:window.RaceShapeSummaryBridgeState||null
}))}
async function run(browserType,name){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const health=await page.evaluate(()=>window.RSAAddonHealth);
  assert.strictEqual(await page.evaluate(()=>window.RSA_BUILD),EXPECTED_BUILD,`${name}: wrong build`);
  assert.strictEqual(health.build,EXPECTED_BUILD,`${name}: loader build mismatch`);
  assert.deepStrictEqual(health.failures,[],`${name}: addon failures ${health.failures.join(',')}`);
  assert(health.preloaded>=40,`${name}: addon preloading not active (${health.preloaded})`);

  await page.fill('#raceDate','2026-10-11');
  await page.selectOption('#venue','阪神');
  await page.fill('#raceName','R72 Smoke Stakes');
  await page.fill('#fieldSize','16');
  await page.selectOption('#surface','ダート');
  await page.fill('#distance','1800');
  await page.selectOption('#grade','G3');
  await page.selectOption('#going','良');
  await ensureCsvParsed(page);

  const structuralMs=await analyze(page,`${name} structural`);
  let snap=await currentSnapshot(page);
  assert.strictEqual(snap.labs,1,`${name}: M3 lab duplicated after structural analysis`);
  assert.strictEqual(snap.cache?.rawReads,1,`${name}: TARGET file read more than once (${snap.cache?.rawReads})`);
  assert.strictEqual(snap.cache?.transforms,1,`${name}: TARGET transform repeated (${snap.cache?.transforms})`);
  assert((snap.cache?.bufferHits||0)>=1,`${name}: TARGET shared buffer cache not reused`);
  assert((snap.cache?.parseHits||0)>=1,`${name}: TARGET parsed grid cache not reused`);

  await page.fill('#oddsPaste',oddsText());
  await page.click('#applyOddsBtn');
  await page.waitForFunction(()=>document.querySelector('#oddsInfo')?.textContent.includes('16頭を反映'),null,{timeout:5000});
  const full1=await analyze(page,`${name} full-1`);
  await page.waitForFunction(()=>window.M3PrevRunReproducibilityState?.ready===true&&window.M3NarrativeReproAppendState?.ready===true,null,{timeout:6000});
  await page.waitForFunction(()=>window.M3FrontPositionState?.ready===true,null,{timeout:6000});
  await page.waitForFunction(()=>window.M3PureAbilityState?.ready===true&&window.M3AbilityNarrativeState?.ready===true,null,{timeout:7000});
  await page.waitForFunction(()=>window.AbilityV2ValidationStatusState?.ready===true,null,{timeout:4000});
  await page.waitForFunction(()=>window.AbilityV2ValidationStatusState?.uiReady===true&&document.querySelectorAll('#abilityV2FinalValidationNote').length===1&&document.querySelectorAll('.v2ValidationMsg').length===16,null,{timeout:5000});
  await page.waitForFunction(()=>window.RaceShapeBiasState?.ready===true&&window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length===1,null,{timeout:7000});
  const first=await currentSnapshot(page);
  assert.strictEqual(first.labs,1,`${name}: duplicate lab after full analysis`);
  assert(first.repro<=1,`${name}: duplicate reproducibility panel`);
  assert(first.narrative<=1,`${name}: duplicate narrative panel`);
  assert.strictEqual(first.abilityPanels,1,`${name}: Ability comparison panel missing/duplicated`);
  assert.strictEqual(first.abilityInline,16,`${name}: Ability rows not attached to all horses (${first.abilityInline})`);
  assert.strictEqual(first.ability?.rows?.length,16,`${name}: Ability state must contain 16 runners`);
  assert.strictEqual(first.v2ValidationNotes,1,`${name}: Ability v2 validation note missing/duplicated`);
  assert.strictEqual(first.v2ValidationMsgs,16,`${name}: Ability v2 per-horse validation messages missing/duplicated (${first.v2ValidationMsgs})`);
  assert.strictEqual(first.v2Validation?.status,'release_candidate_frozen_parallel',`${name}: Ability v2 validation status mismatch`);
  const abilitySum=(first.ability?.rows||[]).reduce((s,r)=>s+(Number(r.top3)||0),0);
  assert(Math.abs(abilitySum-3)<1e-6,`${name}: Ability top3 race coherence failed (${abilitySum})`);
  assert(first.abilityNarrative>=1,`${name}: Ability narrative missing`);
  assert(first.shapeBiasPanels<=1,`${name}: standalone Race Shape panel duplicated`);
  assert.strictEqual(first.shapeNarrativeLines,1,`${name}: Race Shape narrative missing/duplicated`);
  assert.strictEqual(first.shapeNarrativeTags,1,`${name}: Race Shape narrative tag missing/duplicated`);
  assert.strictEqual(first.shapeUxMetrics,1,`${name}: Race Shape summary metric missing/duplicated`);
  assert.strictEqual(first.shapeUxReadouts,1,`${name}: Race Shape summary readout missing/duplicated`);
  assert(first.shapeBridge?.ready===true&&first.shapeBridge?.narrative===true&&first.shapeBridge?.ux===true,`${name}: Race Shape bridge not ready`);
  assert(first.shapeNarrativeText.includes(first.shapeBiasState?.label||'__missing__'),`${name}: Race Shape narrative label mismatch`);
  assert(first.shapeUxText.includes(first.shapeBiasState?.label||'__missing__'),`${name}: Race Shape UX label mismatch`);

  await page.selectOption('#going','稍');const full2=await analyze(page,`${name} full-2`);
  await page.selectOption('#going','重');const full3=await analyze(page,`${name} full-3`);
  await page.waitForFunction(()=>window.AbilityV2ValidationStatusState?.uiReady===true&&document.querySelectorAll('#abilityV2FinalValidationNote').length===1&&document.querySelectorAll('.v2ValidationMsg').length===16,null,{timeout:5000});
  await page.waitForFunction(()=>window.RaceShapeSummaryBridgeState?.ready===true&&document.querySelectorAll('#m3NarrativeAnalysis [data-rsb-summary="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-metric="1"]').length===1&&document.querySelectorAll('#raceUXSummary [data-rsb-ux-readout="1"]').length===1,null,{timeout:5000});
  await page.waitForTimeout(300);
  const last=await currentSnapshot(page);
  assert.strictEqual(last.labs,1,`${name}: duplicate lab after repeated analysis`);
  assert(last.repro<=1,`${name}: reproducibility panel leaked`);
  assert(last.narrative<=1,`${name}: narrative panel leaked`);
  assert.strictEqual(last.abilityPanels,1,`${name}: Ability comparison panel leaked`);
  assert.strictEqual(last.abilityInline,16,`${name}: Ability inline rows leaked/duplicated (${last.abilityInline})`);
  assert.strictEqual(last.v2ValidationNotes,1,`${name}: Ability v2 validation note leaked/duplicated`);
  assert.strictEqual(last.v2ValidationMsgs,16,`${name}: Ability v2 validation messages leaked/duplicated (${last.v2ValidationMsgs})`);
  assert(last.shapeBiasPanels<=1,`${name}: standalone Race Shape panel leaked/duplicated`);
  assert.strictEqual(last.shapeNarrativeLines,1,`${name}: Race Shape narrative leaked/duplicated`);
  assert.strictEqual(last.shapeNarrativeTags,1,`${name}: Race Shape narrative tag leaked/duplicated`);
  assert.strictEqual(last.shapeUxMetrics,1,`${name}: Race Shape summary metric leaked/duplicated`);
  assert.strictEqual(last.shapeUxReadouts,1,`${name}: Race Shape summary readout leaked/duplicated`);
  assert(last.nodes<=first.nodes+280,`${name}: repeated analysis DOM leak ${first.nodes} -> ${last.nodes}`);
  assert.strictEqual(last.cache?.rawReads,1,`${name}: TARGET file re-read during repeat analysis (${last.cache?.rawReads})`);
  assert.deepStrictEqual(pageErrors,[],`${name}: page errors ${pageErrors.join(' | ')}`);
  console.log('PASS',name,{bootMs:health.bootMs,structuralMs,full1,full2,full3,cache:last.cache,nodes:[first.nodes,last.nodes],abilityTop3Sum:abilitySum,v2Validation:last.v2Validation?.status,raceShape:last.shapeBiasState?.label});
  await browser.close();
}
(async()=>{await run(chromium,'chromium iPhone');await run(webkit,'webkit iPhone')})().catch(err=>{console.error(err);process.exit(1)});