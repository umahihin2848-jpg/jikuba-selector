'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..'),source=fs.readFileSync(path.join(dir,'race-position-600m-band-v1.js'),'utf8');
const panel=fs.readFileSync(path.join(dir,'race-position-competition-v1.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'v3.html'),'utf8');
const ctx={};vm.runInNewContext(source,ctx);
const core=ctx.RSAPosition600BandV1;
const OLD='target-csv-cache-v6-corner-zero-missing',NEW='target-csv-cache-p363-history-dedup-shadow',R='remaining600-validated-v3';
test('2025 margins change with predicted front / middle / rear position',()=>{
 const front=core.compute(.3,OLD,R,16),middle=core.compute(.8,OLD,R,16),rear=core.compute(1.3,OLD,R,16);
 assert.equal(front.ready,true);assert.equal(middle.ready,true);assert.equal(rear.ready,true);
 assert.equal(front.bucket,'front');assert.equal(middle.bucket,'middle');assert.equal(rear.bucket,'rear');
 assert.ok(front.margin<middle.margin&&middle.margin<rear.margin);
 assert.equal(front.low,0,'negative seconds behind the leader should be truncated');
 assert.ok(front.high<.8&&rear.high>2);
});
test('deduplicated research CSV uses its own separately calibrated margins',()=>{
 const a=core.compute(.9,OLD,R,16),b=core.compute(.9,NEW,R,16);
 assert.equal(a.ready,true);assert.equal(b.ready,true);
 assert.equal(a.mode,'legacy');assert.equal(b.mode,'dedup');
 assert.ok(b.margin<a.margin);
 assert.equal(a.nominalCoverage,.8);
 assert.equal(a.calibrationYear,2025);
 assert.equal(a.validationYear,2026);
});
test('fail closed for unknown parser, old 600m algorithm, wrong field, and invalid prediction',()=>{
 assert.equal(core.compute(.5,'another-parser',R,16).ready,false);
 assert.equal(core.compute(.5,OLD,'remaining600-v2',16).ready,false);
 assert.equal(core.compute(.5,OLD,R,11).ready,false);
 assert.equal(core.compute(null,OLD,R,16).ready,false);
 assert.equal(core.compute(NaN,OLD,R,16).ready,false);
 assert.equal(core.compute(-.2,OLD,R,16).ready,false);
});
test('display and snapshot are research only and do not overwrite M3 or buying logic',()=>{
 assert.match(panel,/残り600mの予測位置と80%参考範囲/);
 assert.match(panel,/gap80ResearchBand:gapBand\(/);
 assert.match(panel,/gap80ResearchCalibration/);
 assert.match(panel,/model\.compute\(a\.pred,root\.RSATargetCsvCache\?\.version/);
 assert.equal(core.productionImpact,false);
 assert.doesNotMatch(source,/\.(?:score|predGap|finishRank|axisNo|buy|odds)\s*=/);
 assert.doesNotMatch(panel,/\.(?:score|predGap|finishRank|axisNo|buy|odds)\s*=/);
 assert.equal(html.split('race-position-600m-band-v1.js').length-1,1);
 assert.ok(html.indexOf('race-position-600m-band-v1.js')<html.indexOf('race-position-competition-v1.js'));
});
