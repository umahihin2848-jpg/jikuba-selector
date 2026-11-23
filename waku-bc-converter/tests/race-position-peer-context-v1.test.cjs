'use strict';
/* Run: node --test waku-bc-converter/tests/race-position-peer-context-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'race-position-peer-context-v1.js'),'utf8');
const context={};vm.runInNewContext(source,context,{timeout:1500});
const core=context.RSAPositionPeerContextCoreV1;
const runners=Array.from({length:15},(_,i)=>({no:String(i===14?16:i+1),name:'Horse'+i,expectedRank:i+1,validated:true}));
test('nonconsecutive actual horse numbers following scratches remain valid',()=>{const x=core.evaluate(runners);assert.equal(x.ready,true);assert.equal(x.rows.length,15);assert.equal(x.rows[14].no,16);});
test('nearby-rival counts use actual entrants in horse-number order',()=>{const x=core.evaluate(runners);assert.deepEqual(Array.from(x.rows[7].inside),[5,6,7]);assert.equal(x.rows[7].outside.length,0);});
test('missing or duplicate entries are rejected without guessing a position',()=>{
 assert.equal(core.evaluate(runners.map((x,i)=>i===0?{...x,validated:false}:x)).ready,false);
 assert.equal(core.evaluate([...runners.slice(0,-1),runners[0]]).ready,false);
});
test('research only: never writes official model, score or betting fields',()=>{
 assert.doesNotMatch(source,/\.(finishRank|predGap|score|axisNo|partnerNos|betEligible|odds)\s*=/);
 assert.match(source,/productionImpact:false/);
 const html=fs.readFileSync(path.join(root,'v3.html'),'utf8');assert.equal(html.split('race-position-peer-context-v1.js?').length-1,1);
});
