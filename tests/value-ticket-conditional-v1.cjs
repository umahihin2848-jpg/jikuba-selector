/* Node-only guards for manual conditional wide research. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const p='waku-bc-converter/value-ticket-lab-v1.js';
const code=fs.readFileSync(p,'utf8');
const sandbox={window:{}};
vm.runInNewContext(code,sandbox,{filename:p,timeout:3000});
const v=sandbox.window.RSAValueTicketLabCoreV1;
assert(v&&typeof v.evaluateConditional==='function');
function close(actual,expected,tol=1e-10){assert(Math.abs(actual-expected)<tol,`expected ${expected}; got ${actual}`);}
const good=v.evaluateConditional({axisPct:60,givenAxisPct:30,wideLow:7});
assert.equal(good.ready,true);
close(good.probability,.18);
close(good.roi,1.26);
close(good.netPer100,26);
close(good.breakEven,1/.18);
close(good.conditionalBreakEvenPct,10000/(60*7));
assert.equal(good.lowerRoi,null);
const low=v.evaluateConditional({axisPct:60,axisLowerPct:50,givenAxisPct:30,givenAxisLowerPct:25,wideLow:7});
close(low.lowerRoi,.875);
assert.equal(low.cautiousInputsComplete,true);
assert.equal(v.evaluateConditional({axisPct:60,axisLowerPct:50,givenAxisPct:30,wideLow:7}).lowerRoi,null);
assert.equal(v.evaluateConditional({axisPct:'',givenAxisPct:30,wideLow:7}).ready,false);
assert.equal(v.evaluateConditional({axisPct:60,givenAxisPct:'',wideLow:7}).ready,false);
assert.equal(v.evaluateConditional({axisPct:101,givenAxisPct:30,wideLow:7}).ready,false);
assert.equal(v.evaluateConditional({axisPct:60,givenAxisPct:-1,wideLow:7}).ready,false);
assert.equal(v.evaluateConditional({axisPct:60,givenAxisPct:30,wideLow:0}).ready,false);
assert.equal(v.evaluateConditional({axisPct:60,givenAxisPct:30,axisLowerPct:61,wideLow:7}).ready,false);
assert.equal(v.evaluateConditional({axisPct:60,givenAxisPct:30,givenAxisLowerPct:31,wideLow:7}).ready,false);
const zero=v.evaluateConditional({axisPct:0,givenAxisPct:30,wideLow:7});
assert.equal(zero.ready,true);
assert.equal(zero.roi,0);
assert.equal(zero.conditionalBreakEvenPct,null);
const direct=v.evaluate({probPct:18,cautiousPct:12,wideLow:7});
close(direct.roi,1.26);
close(direct.lowerRoi,.84);
const c=v.compare([
 {no:'5',givenAxisPct:40,wideLow:5},
 {no:'6',givenAxisPct:30,wideLow:7}
],{mode:'conditional',axisPct:60});
assert.equal(c.evaluated,2);
assert.equal(c.scenarios.length,2);
assert.equal(c.scenarios[0].nos[0],'6');
close(c.scenarios[1].roi,1.23);
assert.equal(c.scenarios[1].costYen,200);
close(c.scenarios[1].expectedNetYen,46);
assert.equal(v.compare([{no:'5',probPct:18,wideLow:7}]).evaluated,1);
const workflow=fs.readFileSync('waku-bc-converter/mobile-forecast-workflow-v1.js','utf8');
assert(workflow.includes('conditionalWideResearch:root.RSAValueTicketLabV1'));
const html=fs.readFileSync('waku-bc-converter/v3.html','utf8');
assert(html.includes('value-ticket-lab-v1.js?v=20261124conditional1'));
assert(!code.includes('ProductionDecisionPipelineV1State='));
assert(!code.includes('betEligible:true'));
console.log('value-ticket conditional research PASS (math, validation, backwards compatibility, snapshot hook, guarded deployment)');
