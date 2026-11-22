'use strict';
/* node --test waku-bc-converter/tests/finish600-gap-review-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','finish600-gap-review-v1.js'),'utf8');
const scope={};vm.runInNewContext(code,scope,{timeout:2000});
const c=scope.RSAFinish600GapReviewCoreV1;
test('no time gap is inferred from initial corner rank or P10',()=>{
 assert.equal(c.assess('').valid,false);
 assert.equal(c.assess('a').valid,false);
 assert.equal(c.assess(-.1).valid,false);
});
test('labels are review reminders, not production vetoes',()=>{
 assert.equal(c.assess(0).band,'inspect-low');
 assert.equal(c.assess(.6).band,'inspect-low');
 assert.equal(c.assess(.7).band,'inspect-middle');
 assert.equal(c.assess(1.0).band,'inspect-middle');
 assert.equal(c.assess(1.1).band,'inspect-high');
 assert.equal(c.assess(15.1).valid,false);
});
test('race/horse changes require distinct keys',()=>{
 const m={date:'2026-11-22',venue:'東京',race:'テストG1',grade:'G1',surface:'芝',dist:'1600'};
 const hs=[{no:'1',name:'A'}];
 assert.notEqual(c.keyOf(m,hs),c.keyOf({...m,date:'2026-11-23'},hs));
 assert.notEqual(c.keyOf(m,hs),c.keyOf(m,[{no:'1',name:'B'}]));
});
test('do not mutate official axis, opponents, Ability, M3 or purchase gates',()=>{
 assert.doesNotMatch(code,/\.betEligible\s*=|\.axisNo\s*=|\.partnerNos\s*=|\.abilityRank\s*=|\.finishRank\s*=/);
 assert.match(code,/自動減点・消去基準にはしません/);
});
