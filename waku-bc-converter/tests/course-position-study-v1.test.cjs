'use strict';
/* Run: node --test waku-bc-converter/tests/course-position-study-v1.test.cjs */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(dir,'course-position-study-v1.js'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(dir,'data/course_position_c3c4_study_20261123.json'),'utf8'));
const html=fs.readFileSync(path.join(dir,'v3.html'),'utf8');
test('research module syntax and no production decision writes',()=>{
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.doesNotMatch(js,/\.finishRank\s*=|\.predGap\s*=|\.axisNo\s*=|\.partnerNos\s*=|\.betEligible\s*=/);
 assert.match(js,/productionImpact:false/);
});
test('the panel is registered without requiring a real browser',()=>{
 const ctx={document:{readyState:'loading'},addEventListener(){}};
 vm.runInNewContext(js,ctx,{timeout:1000});
 assert.equal(ctx.RSACoursePositionStudyV1.productionImpact,false);
 assert.equal(typeof ctx.RSACoursePositionStudyV1.refresh,'function');
});
test('course aggregation is numeric, bounded, and has unique keys',()=>{
 assert.equal(data.min_races,8);
 assert.ok(Array.isArray(data.rows)&&data.rows.length>=30);
 const seen=new Set();
 for(const row of data.rows){
  const key=[row.v,row.s,row.d].join('|');
  assert.equal(seen.has(key),false,key);seen.add(key);
  assert.ok(Number.isInteger(row.n)&&Number.isInteger(row.r)&&row.r>=8&&row.n>=row.r);
  assert.ok(Number.isFinite(row.m)&&row.m>=0&&row.m<18);
  for(const p of [row.up3,row.down3])assert.ok(p>=0&&p<=1);
 }
});
test('only one research-only loader added to the main page',()=>{
 assert.equal(html.split('course-position-study-v1.js?').length-1,1);
 assert.ok(html.indexOf('course-position-study-v1.js')>html.indexOf('finish600-gap-audit-v1.js'));
});
