const fs=require('fs');
const path=require('path');
const Module=require('module');
const target=path.join(__dirname,'race-scenario-v3-current-smoke.cjs');
let src=fs.readFileSync(target,'utf8')
  .replaceAll('20261011r30','20261012r32')
  .replaceAll('?test=r30','?test=r32')
  .replaceAll('r30-target.csv','r32-target.csv')
  .replaceAll('R30 Smoke Stakes','R32 Smoke Stakes');
src=src
  .replace('  abilityPanels:document.querySelectorAll(\'#m3AbilityCompareV1\').length,','  abilityPanels:document.querySelectorAll(\'#m3AbilityCompareV1\').length,\n  overallPanels:document.querySelectorAll(\'#raceOverallSummary\').length,')
  .replace('  ability:window.M3PureAbilityState||null,\n  abilityNarrativeState:window.M3AbilityNarrativeState||null','  ability:window.M3PureAbilityState||null,\n  abilityV2:window.M3PureAbilityV2State||null,\n  abilityNarrativeState:window.M3AbilityNarrativeState||null,\n  overall:window.RaceOverallSummaryState||null')
  .replace('window.M3PureAbilityState?.ready===true&&window.M3AbilityNarrativeState?.ready===true','window.M3PureAbilityState?.ready===true&&window.M3PureAbilityV2State?.ready===true&&window.M3AbilityNarrativeState?.ready===true&&window.RaceOverallSummaryState?.ready===true')
  .replace('  assert.strictEqual(first.abilityPanels,1,`${name}: Ability comparison panel missing/duplicated`);','  assert.strictEqual(first.abilityPanels,1,`${name}: Ability comparison panel missing/duplicated`);\n  assert.strictEqual(first.overallPanels,1,`${name}: whole-race summary missing/duplicated`);\n  assert((first.overall?.paragraphs||[]).length>=3,`${name}: whole-race summary too short`);\n  assert.strictEqual(first.overall?.version,\'race-overall-summary-v2\',`${name}: summary classifier version mismatch`);\n  assert([\'買い検討型\',\'条件付き\',\'見送り寄り\'].includes(first.overall?.classification),`${name}: invalid overall classification`);\n  assert(String(first.overall?.core||\'\').length>=20,`${name}: race core missing`);\n  assert(String(first.overall?.buyFocus||\'\').length>=20,`${name}: buy focus missing`);\n  assert(String(first.overall?.skipReason||\'\').length>=20,`${name}: skip reason missing`);')
  .replace('  assert.strictEqual(first.ability?.rows?.length,16,`${name}: Ability state must contain 16 runners`);','  assert.strictEqual(first.ability?.rows?.length,16,`${name}: Ability state must contain 16 runners`);\n  assert.strictEqual(first.abilityV2?.rows?.length,16,`${name}: Ability v2 state must contain 16 runners`);\n  assert.strictEqual(first.abilityV2?.status,\'candidate_parallel_not_replacement\',`${name}: Ability v2 must remain parallel candidate`);')
  .replace('  assert(Math.abs(abilitySum-3)<1e-6,`${name}: Ability top3 race coherence failed (${abilitySum})`);','  assert(Math.abs(abilitySum-3)<1e-6,`${name}: Ability top3 race coherence failed (${abilitySum})`);\n  const abilityV2Sum=(first.abilityV2?.rows||[]).reduce((s,r)=>s+(Number(r.top3)||0),0);\n  assert(Math.abs(abilityV2Sum-3)<1e-6,`${name}: Ability v2 top3 race coherence failed (${abilityV2Sum})`);')
  .replace('  assert.strictEqual(last.abilityPanels,1,`${name}: Ability comparison panel leaked`);','  assert.strictEqual(last.abilityPanels,1,`${name}: Ability comparison panel leaked`);\n  assert.strictEqual(last.overallPanels,1,`${name}: whole-race summary leaked/duplicated`);');
if(!src.includes('abilityV2:window.M3PureAbilityV2State||null')||!src.includes('Ability v2 top3 race coherence failed')||!src.includes('invalid overall classification'))throw new Error('Ability v2 / whole-race summary classifier smoke injection failed');
const m=new Module(target,module);
m.filename=target;
m.paths=Module._nodeModulePaths(path.dirname(target));
m._compile(src,target);
