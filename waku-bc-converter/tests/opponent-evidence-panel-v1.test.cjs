/* Run with: node --test waku-bc-converter/tests/opponent-evidence-panel-v1.test.cjs */
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','opponent-evidence-panel-v1.js'),'utf8');
const sandbox={};
vm.runInNewContext(source,sandbox,{timeout:1000});
const c=sandbox.RSAOpponentEvidenceCoreV1;
test('historical evidence types keep Ability and M3 disagreement separate',()=>{
 assert.equal(c.typeOf({abilityRank:2,m3Rank:5}),'agreement');
 assert.equal(c.typeOf({abilityRank:1,m3Rank:4}),'agreement'); // Grade Pair may select rank-2 axis
 assert.equal(c.typeOf({abilityRank:2,m3Rank:10}),'ability_only');
 assert.equal(c.typeOf({abilityRank:5,m3Rank:4}),'m3_challenger');
 assert.equal(c.typeOf({abilityRank:2,m3Rank:null}),'missing');
 assert.equal(c.typeOf({abilityRank:2,m3Rank:''}),'missing');
});
test('no ranking-based forced decision when agreement is missing or multiple',()=>{
 assert.equal(c.mainChoice([{no:2,abilityRank:2,m3Rank:12},{no:3,abilityRank:3,m3Rank:11}]).kind,'none');
 assert.equal(c.mainChoice([{no:2,abilityRank:2,m3Rank:4},{no:3,abilityRank:3,m3Rank:3}]).kind,'multiple');
 const choice=c.mainChoice([{no:2,name:'A',abilityRank:2,m3Rank:12},{no:3,name:'B',abilityRank:3,m3Rank:4},{no:4,name:'C',abilityRank:4,m3Rank:1}]);
 assert.equal(choice.kind,'single');assert.equal(choice.no,'3');
});
test('queue position stays unknown without validated history',()=>{
 assert.equal(c.zone(4,12,false),'未確定');
 assert.equal(c.zone(NaN,12,true),'未確定');
 assert.equal(c.zone(3,12,true),'前方');
 assert.equal(c.zone(8,12,true),'中団');
 assert.equal(c.zone(10,12,true),'後方');
});
test('backward low-M3 and two-front-runner warnings are descriptive, not exclusions',()=>{
 const back=c.notes({abilityRank:2,m3Rank:12,expectedRank:11,queueValidated:true},{expectedRank:2,queueValidated:true},12);
 assert.match(back.positional,/差し届く根拠/);
 const front=c.notes({abilityRank:2,m3Rank:12,expectedRank:2,queueValidated:true},{expectedRank:3,queueValidated:true},12);
 assert.match(front.positional,/先行争い/);
 assert.equal(c.typeOf({abilityRank:2,m3Rank:12}),'ability_only');
});
test('research overlay source does not write gate or silently change partner shortlist',()=>{
 assert.doesNotMatch(source,/localStorage\.setItem|betEligible\s*=|partnerNos\s*=|axisNo\s*=/);
});
