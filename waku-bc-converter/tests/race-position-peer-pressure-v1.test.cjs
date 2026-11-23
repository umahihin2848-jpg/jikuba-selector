'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../race-position-competition-v1.js'),'utf8');
function setup(){
 const els={},events={};let snapshot=null;
 const make=tag=>({tag,id:'',innerHTML:'',children:[],style:{},open:false,addEventListener(k,v){(this.events??={})[k]=v},appendChild(x){x.parentElement=this;this.children.push(x);if(x.id)els[x.id]=x},remove(){},click(){}});
 const doc={readyState:'complete',getElementById(id){return els[id]||null},createElement:make,addEventListener(k,v){events[k]=v},head:make('head'),body:make('body')};
 for(const [k,v] of Object.entries({grade:'G3',raceDate:'2026-12-06',venue:'中山',raceName:'研究',surface:'芝',distance:'1600'}))els[k]={value:v};
 els.rsafFormation=make('div');
 const runners=Array.from({length:16},(_,i)=>({no:String(i+1),name:'Synthetic'+(i+1),score:i*.03,finishRank:i+1,x:{hist_gap_sd:.3,hist_gap_n:5,hist_unique_races5:5,hist_duplicate_rows5:0}}));
 const byNo=Object.fromEntries(runners.map((r,i)=>[r.no,{name:r.name,expectedRank:i+1,validated:true,frontness5:.95-i*.05,hist_n:5}]));
 const root={document:doc,addEventListener(){},setTimeout(cb){cb();return 1},clearTimeout(){},
  Blob:class{constructor(chunks){snapshot=chunks.join('')}},URL:{createObjectURL(){return 'blob:fake'},revokeObjectURL(){}},
  RSAFocusedThreeTabsState:{active:'formation',analysisReady:true},RSAFocusedThreeTabsV1:{dirty:false},
  ValidatedQueueState:{ready:true,version:'queue',byNo},Remaining600ValidatedState:{ready:true,version:'remaining600-validated-v3',rows:runners.map((r,i)=>({no:r.no,name:r.name,pred:i*.08}))},
  Finish600State:{ready:true,version:'m3',generation:1,rows:runners},RSATargetCsvCache:{version:'unknown'}};
 new Function('globalThis',source)(root);
 const save=()=>{events.click({target:{id:'rsarpcExport'}});return JSON.parse(snapshot)};
 return{root,els,save,runners,byNo};
}
test('frontness peer diagnostics show counts, not backtested horse probabilities',()=>{
 const {els,save}=setup(),ui=els.rsarpcPanel.innerHTML,j=save(),p=j.peerPressureResearch;
 assert.match(ui,/同レースの先行競争/);
 assert.match(ui,/精度改善を保証しません/);
 assert.equal(p.rows.length,16);
 assert.equal(p.rows[0].strongerRivals,0);
 assert.equal(p.rows[0].nearFrontRivals,3);
 assert.equal(p.rows[0].innerStrongerRivals,0);
 assert.equal(p.rows[15].strongerRivals,15);
 assert.equal(j.calibrated,false);
 assert.equal(j.runners.length,16);
 assert.match(ui,/<\/tbody><\/table><details class="rsarpcSub">/);
});
test('changing display-only frontness updates peer counts but cannot alter rank simulations or official M3',()=>{
 const {root,save,byNo}=setup();
 const before=save();const beforeM3=JSON.stringify(root.Finish600State),beforeRemaining=JSON.stringify(root.Remaining600ValidatedState);
 const ranks=before.runners.map(r=>r.rankProbabilities);
 byNo['1'].frontness5=.25;root.RSARacePositionCompetitionV1.refresh();
 const after=save();
 assert.notEqual(before.peerPressureResearch.rows[0].strongerRivals,after.peerPressureResearch.rows[0].strongerRivals);
 assert.deepEqual(after.runners.map(r=>r.rankProbabilities),ranks);
 assert.equal(JSON.stringify(root.Finish600State),beforeM3);
 assert.equal(JSON.stringify(root.Remaining600ValidatedState),beforeRemaining);
 assert.equal(root.RSARacePositionCompetitionV1.productionImpact,false);
});
test('name or horse list mismatches fail closed on peer diagnostics',()=>{
 const {root,save,els}=setup();
 root.ValidatedQueueState.byNo['1'].name='another horse';
 root.RSARacePositionCompetitionV1.refresh();
 assert.equal(save().peerPressureResearch,null);
 assert.match(els.rsarpcPanel.innerHTML,/先行度と馬名の照合ができないため非表示/);
});
