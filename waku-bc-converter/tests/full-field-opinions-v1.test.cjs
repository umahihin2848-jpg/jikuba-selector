'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=fs.readFileSync(path.join(__dirname,'..','full-field-opinions-v1.js'),'utf8');
const scope={};vm.runInNewContext(file,scope,{timeout:1500});
const core=scope.RSAFullFieldOpinionsCoreV1;
const horses=[{no:'1',name:'A',ability:1,m3:3,p10:.21},{no:'2',name:'B',ability:5,m3:2,p10:.72}];
const meta={date:'2026-11-22',venue:'京都',name:'テスト',grade:'G1',surface:'芝',distance:'1600'};
test('fair odds from user-entered probabilities, not Ability or P10',()=>{
 assert.equal(core.fair('25'),4);
 assert.equal(core.fair(''),null);
 assert.equal(core.fair('0'),null);
});
test('full roster probability sum and progress',()=>{
 const x=core.summary(horses,{'1':{winPct:'75',top3Pct:'85',opinion:'好走有力'},'2':{winPct:'25',top3Pct:'40',opinion:'割安候補'}});
 assert.equal(x.written,2);assert.equal(x.withWin,2);assert.equal(x.sum,100);
 assert.equal(x.warnings.length,0);
});
test('warnings on probability contradiction and sum above 100 percent',()=>{
 const x=core.summary(horses,{'1':{winPct:'90',top3Pct:'30'},'2':{winPct:'25',top3Pct:'35'}});
 assert.ok(x.warnings.some(x=>x.includes('3着内率')));
 assert.ok(x.warnings.some(x=>x.includes('100%')));
});
test('Markdown export keeps human statements and model evidence distinctly',()=>{
 const s=core.report(meta,horses,{'1':{winPct:'25',top3Pct:'50',strength:'持続力',scenario:'ハイ',opinion:'買い候補'}},null);
 assert.match(s,/総合見解：買い候補/);assert.match(s,/Ability 1位/);assert.match(s,/採算分岐 4\.00倍/);
 assert.match(s,/主観確率であり、検証済みの予測確率ではありません/);
});
test('separate keys for changes in horse number or race',()=>{
 assert.notEqual(core.keyOf(meta,horses),core.keyOf({...meta,date:'2026-11-23'},horses));
 assert.notEqual(core.keyOf(meta,horses),core.keyOf(meta,[...horses].reverse()));
});
test('no mutation to official axis, opponents or betting gate',()=>{
 assert.doesNotMatch(file,/\.betEligible\s*=|\.axisNo\s*=|\.partnerNos\s*=/);
});
