'use strict';
/* Run: node --test waku-bc-converter/tests/finish600-gap-audit-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','finish600-gap-audit-v1.js'),'utf8');
const context={};vm.runInNewContext(code,context,{timeout:1500});
const core=context.RSAFinish600GapAuditCoreV1;
const horses=Array.from({length:16},(_,i)=>({no:String(i+1),name:'H'+(i+1),ability:i===0?1:null,m3:null}));
const preds=Object.fromEntries(horses.map(h=>[h.no,{gap:.5,reason:''}]));preds['1'].gap=.8;
const actualRaw=horses.map((h,i)=>h.no+' '+(i===0?1.4:.5)+' '+(i+1)).join('\n');
const actual=core.parseActual(actualRaw,horses);
test('all horses required before forecast is frozen',()=>{
 assert.equal(core.checkForecast(horses,preds).ok,true);
 assert.equal(core.checkForecast(horses,{...preds,16:{gap:''}}).ok,false);
});
test('actual TARGET upper-3F gap parser rejects duplicate, unknown, missing, and negative gaps',()=>{
 assert.equal(actual.ok,true);
 assert.equal(actual.values['1'].gap,1.4);
 assert.equal(core.parseActual(actualRaw.replace('2 0.5 2','1 0.5 2'),horses).ok,false);
 assert.equal(core.parseActual(actualRaw.replace('2 0.5 2','99 0.5 2'),horses).ok,false);
 assert.equal(core.parseActual(actualRaw.replace('2 0.5 2','2 -1 2'),horses).ok,false);
 assert.equal(core.parseActual(actualRaw.split('\n').slice(1).join('\n'),horses).ok,false);
 assert.equal(core.parseActual(actualRaw.replace('2 0.5 2','2 0.5 1'),horses).ok,true); // tie
});
test('positive bias means underestimated actual leader gap',()=>{
 const z=core.stats(preds,actual.values,horses);
 assert.equal(z.n,16);assert.ok(Math.abs(z.mae-.6/16)<1e-9);
 assert.ok(Math.abs(z.bias-.6/16)<1e-9);
 assert.equal(z.unexpectedBack,1);
 assert.equal(z.highAbilityUnexpected,1);
});
test('missing Ability and M3 ranks cannot be treated as top-three',()=>{
 const z=core.stats({'2':{gap:.5}},{'2':{gap:1.4}},[horses[1]]);
 assert.equal(z.highAbilityUnexpected,0);
});
test('the same race and forecast must be frozen before official result timestamp',()=>{
 const meta={date:'2026-11-23',venue:'東京',race:'G1',grade:'G1',surface:'芝',dist:'1600'};
 const raceKey=core.keyOf(meta,horses);
 const snap={startAt:'2026-11-23T06:00:00Z',lockedAt:'2026-11-23T05:00:00Z',roster:horses,predicted:preds};
 const record={version:core.version,raceKey,meta,frozen:snap,outcome:{actual:actual.values,recordedAt:'2026-11-23T07:00:00Z'}};
 assert.equal(core.validateImport(record,raceKey),true);
 assert.equal(core.validateImport(record,raceKey+'extra'),false);
 assert.equal(core.validateImport({...record,frozen:{...snap,lockedAt:'2026-11-23T07:00:00Z'}},raceKey),false);
 assert.equal(core.validateImport({...record,outcome:{...record.outcome,recordedAt:'2026-11-23T05:30:00Z'}},raceKey),false);
});
test('aggregates only completed race audits and does not modify official bets',()=>{
 const meta={date:'2026-11-23',venue:'東京',race:'G1',grade:'G1',surface:'芝',dist:'1600'};
 const x={version:core.version,raceKey:core.keyOf(meta,horses),meta,frozen:{roster:horses,predicted:preds},outcome:{actual:actual.values}};
 const s=core.combine([x,{...x,outcome:null}]);
 assert.equal(s.races,1);assert.equal(s.horses,16);
 assert.doesNotMatch(code,/\.betEligible\s*=|\.partnerNos\s*=|\.axisNo\s*=/);
});
