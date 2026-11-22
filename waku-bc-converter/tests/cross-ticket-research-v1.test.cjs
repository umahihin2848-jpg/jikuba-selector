'use strict';
/* run node --test waku-bc-converter/tests/cross-ticket-research-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','cross-ticket-research-v1.js'),'utf8');
const scope={};vm.runInNewContext(source,scope,{timeout:2000});
const c=scope.RSACrossTicketResearchCoreV1;
test('seven bet types, 60 possible tickets from four horses',()=>{
 const ts=c.makeTickets(7,[3,10,14]);
 const count=Object.fromEntries(c.types.map(type=>[type,ts.filter(t=>t.type===type).length]));
 assert.deepEqual(JSON.parse(JSON.stringify(count)),{'単勝':4,'複勝':4,'馬連':6,'ワイド':6,'馬単':12,'3連複':4,'3連単':24});
 assert.equal(new Set(ts.map(x=>x.key)).size,60);
});
test('exact ticket logic distinguishes unordered and ordered races',()=>{
 const f=['7','3','10'];
 for(const [type,nos,expected] of [
  ['単勝',['7'],true],['複勝',['10'],true],['馬連',['3','7'],true],['ワイド',['3','10'],true],
  ['馬単',['3','7'],false],['馬単',['7','3'],true],['3連複',['7','3','10'],true],
  ['3連単',['7','3','10'],true],['3連単',['7','10','3'],false]
 ])assert.equal(c.hit({type,nos},f),expected,type);
});
test('probability and odds are necessary; stake 100 JPY units only',()=>{
 assert.equal(c.evaluate('',9,100).ready,false);
 assert.equal(c.evaluate(15,'',100).ready,false);
 assert.equal(c.evaluate(15,8,110).ready,false);
 const ev=c.evaluate(15,10,100);
 assert.equal(ev.roi,1.5);
 assert.equal(ev.expectedPayout,150);
 assert.equal(ev.breakEvenPct,10);
});
test('ticket portfolio expectation adds payouts without independence assumption',()=>{
 const z=c.portfolio([{probPct:20,odds:6.5,stake:100},{probPct:12,odds:10,stake:100},{probPct:8,odds:9,stake:100}]);
 assert.equal(z.n,3);assert.equal(z.totalStake,300);assert.ok(Math.abs(z.roi-322/300)<1e-10);
});
test('research JS cannot modify production selections/gates or persist user forecasts',()=>{
 assert.doesNotMatch(source,/localStorage\.setItem|\.betEligible\s*=|\.partnerNos\s*=|\.axisNo\s*=/);
});
