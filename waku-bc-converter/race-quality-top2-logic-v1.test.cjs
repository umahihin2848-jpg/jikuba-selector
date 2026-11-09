const assert=require('node:assert/strict');
const rq=require('./race-quality-top2-logic-v1.js');
const base=[
 {no:1,pop:1,odds:2.5,expectedRank:2,lane:0,front:true,rear:false,level:'normal',blockers:0},
 {no:2,pop:2,odds:4,expectedRank:9,lane:1,front:false,rear:true,level:'normal',blockers:2},
 {no:3,pop:3,odds:7,expectedRank:8,lane:3,front:false,rear:true,level:'normal',blockers:0},
 {no:4,pop:4,odds:9,expectedRank:2,lane:3,front:true,rear:false,level:'normal',blockers:0},
];
assert.equal(rq.rank(base,{lateral:'unknown',longitudinal:'even',confidence:'high'}).top2,null);
let v=rq.rank(base,{lateral:'outer_loss',longitudinal:'front_holds',confidence:'high'});
assert.deepEqual(v.top2,['1','2']);
v=rq.rank(base,{lateral:'inner_slow',longitudinal:'front_fades',confidence:'high'});
assert.deepEqual(v.top2,['3','4']);
assert.equal(rq.rank(base,{lateral:'inner_slow',longitudinal:'front_fades',confidence:'low'}).ready,false);
assert.equal(rq.rank([{...base[0],level:'unknown'},base[2]],{lateral:'flat',longitudinal:'even',confidence:'medium'}).ready,false);
assert.equal(rq.rank([{...base[0],odds:49},...base.slice(1)],{lateral:'flat',longitudinal:'even',confidence:'medium'}).top2.join(),'2,3');
assert.equal(rq.rank(base,{lateral:'flat',longitudinal:'even',confidence:'medium'}).top2.join(),'1,2');
assert.equal(rq.rank([{...base[0],expectedRank:null},base[1],base[2]],{lateral:'flat',longitudinal:'even',confidence:'medium'}).top2.join(),'2,3');
console.log('Race-quality Top2 logic tests OK (8 cases)');
