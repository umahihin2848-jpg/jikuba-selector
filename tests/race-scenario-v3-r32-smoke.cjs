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
  .replace('  ability:window.M3PureAbilityState||null,\n  abilityNarrativeState:window.M3AbilityNarrativeState||null','  ability:window.M3PureAbilityState||null,\n  abilityV2:window.M3PureAbilityV2State||null,\n  abilityNarrativeState:window.M3AbilityNarrativeState||null')
  .replace('window.M3PureAbilityState?.ready===true&&window.M3AbilityNarrativeState?.ready===true','window.M3PureAbilityState?.ready===true&&window.M3PureAbilityV2State?.ready===true&&window.M3AbilityNarrativeState?.ready===true')
  .replace('  assert.strictEqual(first.ability?.rows?.length,16,`${name}: Ability state must contain 16 runners`);','  assert.strictEqual(first.ability?.rows?.length,16,`${name}: Ability state must contain 16 runners`);\n  assert.strictEqual(first.abilityV2?.rows?.length,16,`${name}: Ability v2 state must contain 16 runners`);\n  assert.strictEqual(first.abilityV2?.status,\'candidate_parallel_not_replacement\',`${name}: Ability v2 must remain parallel candidate`);')
  .replace('  assert(Math.abs(abilitySum-3)<1e-6,`${name}: Ability top3 race coherence failed (${abilitySum})`);','  assert(Math.abs(abilitySum-3)<1e-6,`${name}: Ability top3 race coherence failed (${abilitySum})`);\n  const abilityV2Sum=(first.abilityV2?.rows||[]).reduce((s,r)=>s+(Number(r.top3)||0),0);\n  assert(Math.abs(abilityV2Sum-3)<1e-6,`${name}: Ability v2 top3 race coherence failed (${abilityV2Sum})`);');
if(!src.includes('abilityV2:window.M3PureAbilityV2State||null')||!src.includes('Ability v2 top3 race coherence failed'))throw new Error('Ability v2 smoke injection failed');
const m=new Module(target,module);
m.filename=target;
m.paths=Module._nodeModulePaths(path.dirname(target));
m._compile(src,target);
