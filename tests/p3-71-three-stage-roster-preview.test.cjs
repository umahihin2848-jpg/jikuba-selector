'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(__dirname,'../waku-bc-converter'),ctx={};
const rosterSrc=fs.readFileSync(path.join(app,'corner-stage-roster-audit-v1.js'),'utf8');
const stageSrc=fs.readFileSync(path.join(app,'corner-group-shadow-v1.js'),'utf8');
const previewSrc=fs.readFileSync(path.join(app,'corner-stage-three-preview-v1.js'),'utf8');
const html=fs.readFileSync(path.join(app,'v3.html'),'utf8');
vm.runInNewContext(rosterSrc,ctx);vm.runInNewContext(stageSrc,ctx);
const audit=ctx.RSACornerRosterAuditV1,stage=ctx.RSACornerGroupShadowV1,model=JSON.parse(fs.readFileSync(path.join(app,'data/corner_group_research_model_v1.json'),'utf8'));
const meta=n=>({date:'2026-12-06',venue:'中山',raceName:'研究サンプル',surface:'芝',distance:1600,fieldSize:n});
function queue(n=12){
 const rows=Array.from({length:n},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),validated:true,expectedRank:i+1,hist_n:5,
  frontness5:.9-.035*i,earlyPosStd5:.12+i*.003,leadRate5:i<3?.2:0,corner3Mean5:.12+.03*i,corner4Mean5:.13+.03*i,
  corner34DeltaMean5:.01,corner3N5:5,corner4N5:5}));
 return{ready:true,fieldSize:n,version:'queue-v1',rows,byNo:Object.fromEntries(rows.map(x=>[x.no,x]))};
}
const roster=(n,{scratched=false,mismatch=false}={})=>Array.from({length:n},(_,i)=>{
 const id=(scratched&&i===n-1)?n+1:i+1,name=(mismatch&&i===0)?'UnexpectedHorse':'Synthetic'+(i+1);
 return id+','+name;
}).join('\n');
const check=(q,txt,confirmed=true)=>audit.verifyRoster({text:txt,queue:q,meta:meta(q.fieldSize),confirmed,sourceLabel:'手入力・架空出走表'});
test('scratch missing number is preserved as actual number; every horse matches one virtual name',()=>{
 const q=queue(12),start=JSON.stringify(q);
 const a=check(q,roster(12,{scratched:true}));
 assert.equal(a.ready,true,JSON.stringify(a));
 assert.deepEqual(Array.from(a.missingNumbers),['12']);
 assert.equal(a.rows[11].no,'13');
 assert.equal(a.rows[11].originalVirtualNo,'12');
 assert.equal(a.verifiedAgainst,'manual_roster_vs_current_csv_cohort_not_independent_official_api');
 const pred=stage.assess({ready:true,fieldSize:12,rows:a.rows},meta(12),model,{csvParserVersion:model.requiresCsvParserVersion,actualNumbersVerified:true});
 assert.equal(pred.ready,true,JSON.stringify(pred));
 assert.equal(pred.stages.c3.rows[11].no,'13');
 assert.equal(pred.stages.c4.rows.length,12);
 assert.equal(JSON.stringify(q),start,'No mutation of existing queue states');
});
test('fail closed for wrong roster, duplicate numbers, mismatch, no attestation, and no provenance',()=>{
 const q=queue(12);
 assert.equal(check(q,roster(12),false).reason,'user_confirmation_required');
 assert.equal(check(q,roster(12,{mismatch:true})).reason,'horse_name_mismatch');
 assert.equal(check(q,roster(11)).reason,'roster_invalid');
 assert.equal(check(q,roster(12).replace('12,Synthetic12','11,Synthetic12')).reason,'roster_invalid');
 assert.equal(audit.verifyRoster({text:roster(12),queue:q,meta:meta(12),confirmed:true,sourceLabel:''}).reason,'roster_source_required');
 const bad=queue(12);bad.rows[0].validated=false;
 assert.equal(check(bad,roster(12)).reason,'queue_names_invalid');
});
test('virtual-number changes are captured, no accidental old snapshot use, and no implicit official verification',()=>{
 const q=queue(16),txt=roster(16),original=check(q,txt);
 assert.equal(original.ready,true);
 q.rows[0].corner34DeltaMean5+=.1;
 assert.notEqual(check(q,txt).snapshotSignature,original.snapshotSignature);
 assert.match(rosterSrc,/not_independent_official_api/);
 assert.match(previewSrc,/not official API verification/);
 assert.match(previewSrc,/3角・4角は各地点を別々に推定/);
});
test('model is only wired on research branch; all three blocks are loaded in order',()=>{
 const names=['corner-group-shadow-v1.js','corner-stage-roster-audit-v1.js','corner-stage-three-preview-v1.js'];
 const pos=names.map(x=>html.indexOf(x));assert.ok(pos.every(x=>x>=0)&&pos[0]<pos[1]&&pos[1]<pos[2]);
 assert.match(previewSrc,/p371Roster/);
 assert.match(previewSrc,/groupIndex/);
 assert.match(previewSrc,/JSON保存/);
 assert.match(previewSrc,/root\.RSATargetCsvCache\?\.version!==/);
 assert.equal(stage.productionImpact,false);
 assert.equal(audit.productionImpact,false);
 assert.doesNotMatch(previewSrc,/root\.(?:Finish600State|ValidatedQueueState|Remaining600ValidatedState)\s*=/);
 assert.doesNotMatch(rosterSrc,/root\.(?:Finish600State|ValidatedQueueState|Remaining600ValidatedState)\s*=/);
});
