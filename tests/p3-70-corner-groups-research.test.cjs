'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(__dirname,'../waku-bc-converter'),ctx={};
vm.runInNewContext(fs.readFileSync(path.join(app,'corner-group-shadow-v1.js'),'utf8'),ctx);
const mod=JSON.parse(fs.readFileSync(path.join(app,'data/corner_group_research_model_v1.json'),'utf8'));
const core=ctx.RSACornerGroupShadowV1;
const lineup=n=>Array.from({length:n},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),validated:true,hist_n:5,frontness5:.89-i*.035,earlyPosStd5:.12+i*.003,leadRate5:i<3?.2:0,corner3Mean5:.13+i*.03,corner4Mean5:.14+i*.03,corner34DeltaMean5:.01,corner3N5:5,corner4N5:5}));
const go=(n,options={})=>core.assess({ready:true,fieldSize:n,rows:lineup(n)},{surface:'芝',distance:1600},mod,{csvParserVersion:mod.requiresCsvParserVersion,actualNumbersVerified:true,...options});
test('3c/4c fitted models use 18 historical/peer features, no result labels',()=>{
 assert.equal(mod.trainedOn,2023);
 assert.equal(mod.stages.c3.features.length,18);
 assert.equal(mod.stages.c4.features.length,18);
 for(const f of mod.stages.c3.features)assert.doesNotMatch(f,/finish|odds|current_corner|target|actual/i);
 assert.equal(core.productionImpact,false);
});
test('12..18 runner predictions sum to 1 and enforce distinct pack seats',()=>{
 for(let n=12;n<=18;n++){
  const a=go(n);assert.equal(a.ready,true,JSON.stringify(a));
  assert.equal(a.seats.reduce((s,x)=>s+x,0),n);
  for(const stage of ['c3','c4']){
   const r=a.stages[stage].rows;assert.equal(r.length,n);
   for(let k=0;k<4;k++)assert.equal(r.filter(x=>x.groupIndex===k).length,a.seats[k]);
   for(const x of r)assert.ok(Math.abs(x.probabilities.reduce((s,y)=>s+y,0)-1)<1e-10);
  }
 }
});
test('no old CSV parser, guessed saddlecloth numbers or missing history',()=>{
 assert.equal(go(16,{actualNumbersVerified:false}).reason,'actual_horse_numbers_not_verified');
 assert.equal(go(16,{csvParserVersion:'target-csv-cache-v6-corner-zero-missing'}).reason,'deduplicated_history_required');
 const rows=lineup(16);rows[0].hist_n=2;
 assert.equal(core.assess({ready:true,fieldSize:16,rows},{surface:'芝',distance:1600},mod,{csvParserVersion:mod.requiresCsvParserVersion,actualNumbersVerified:true}).reason,'history_or_race_number_invalid');
});
test('known synthetic coefficient calculation remains stable and source cannot write production',()=>{
 const rows=Array.from({length:16},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),validated:true,hist_n:5,frontness5:.89-i*.04,earlyPosStd5:.12+i*.003,leadRate5:i<3?.2:0,corner3Mean5:.13+i*.035,corner4Mean5:.14+i*.035,corner34DeltaMean5:.01,corner3N5:5,corner4N5:5}));
 const q={ready:true,fieldSize:16,rows},before=JSON.stringify(q);
 const a=core.assess(q,{surface:'芝',distance:1600},mod,{csvParserVersion:mod.requiresCsvParserVersion,actualNumbersVerified:true});
 assert.ok(Math.abs(a.stages.c3.rows[0].probabilities[0]-.5585847349457256)<1e-10);
 assert.ok(Math.abs(a.stages.c4.rows[0].probabilities[0]-.5382137180479257)<1e-10);
 assert.equal(JSON.stringify(q),before);
 assert.equal(a.calibratedForLive,false);
 const code=fs.readFileSync(path.join(app,'corner-group-shadow-v1.js'),'utf8');
 assert.doesNotMatch(code,/\.(?:score|predGap|finishRank|axisNo|buy|odds)\s*=/);
});
