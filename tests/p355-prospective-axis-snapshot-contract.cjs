'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/p355-prospective-axis-snapshot-v1.js'),'utf8');
const root={};
vm.runInNewContext(src,{window:root,document:{readyState:'loading',addEventListener:()=>{}},console,Date,Number,Math,Map,Set,Object,String,Array,Error,Boolean}, {timeout:1500});
const api=root.P355ProspectiveAxisSnapshotV1;
assert(api&&typeof api.build==='function');
const times={capture:'2026-11-18T05:00:00Z',start:'2026-11-18T14:15:00+09:00'};
function fixture(){
 const h=Array.from({length:12},(_,i)=>{
  const no=i+1;return {no:String(no),name:'Horse'+no};
 });
 const A=h.map((v,i)=>({...v,logit:1-i*.2,abilityRank:i+1,top3:.2}));
 const F=h.map((v,i)=>({...v,finishRank:i+1,score:Math.round(i*50)/100}));
 const P=h.map(v=>({...v,p10:.22,historyN:5}));
 const Q=h.map(v=>({...v,frontness5:.66,validated:true}));
 const M=h.map((v,i)=>({...v,od:2+i*3,pop:i+1,share:.03}));
 const by=rows=>Object.fromEntries(rows.map(x=>[x.no,x]));
 return {
  meta:{date:'2026-11-18',venue:'京都',raceName:'研究テストステークス',grade:'G3',surface:'芝',distance:1600,fieldSize:12},
  raceNumber:11,startLocal:times.start,confirmOdds:true,oddsText:M.map(m=>m.no+' '+m.od).join('\n'),
  ability:{ready:true,version:'Ability-C',activeModel:'C',rows:A,byNo:by(A)},
  m3:{ready:true,version:'M3-Frozen',rows:F,byNo:by(F)},
  queue:{ready:true,version:'Queue',rows:Q,byNo:by(Q)},
  position:{ready:true,version:'P10-v2',rows:P,byNo:by(P)},
  decision:{ready:true,version:'Decision',market:{complete:true,rows:M,byNo:by(M)},structure:{axis:{no:'1'},code:'A1_high'},originalStructure:{axis:{no:'1'},code:'A1_high',kind:'A1',level:'green',candidates:[{no:'1',ar:1,m3:1}]},axisSelection:{version:'AxisSelection-v1',active:true,changed:false,chosen:{no:'1'}},final:{code:'A1_high',level:'green',reason:'fixture'}},
  gate:{status:'open',kind:'A1'}
 };
}
const x=fixture(),snap=api.build(x,new Date(times.capture));
assert.equal(snap.race.time_window,'T15_APPROX_USER_ENTERED');
assert.equal(snap.race.minutes_until_user_entered_start,15);
assert.equal(snap.race.official_start_independently_verified,false);
assert.equal(snap.market_provenance.executable_odds_unverified,true);
assert.equal(snap.horses.length,12);
assert.equal(snap.axis.structure_no,1);
assert.equal(snap.axis.final_axis_no,1);
assert(!JSON.stringify(snap).includes('actual_finish'),'outcome leakage');
const other=fixture();other.startLocal='';
assert.equal(api.build(other,new Date(times.capture)).race.time_window,'START_TIME_NOT_ENTERED');
function rejected(mutate,label){
 const f=fixture();mutate(f);
 assert.throws(()=>api.build(f,new Date(times.capture)),{name:'Error'},label);
}
rejected(f=>f.confirmOdds=false,'unchecked odds');
rejected(f=>f.decision.market.complete=false,'incomplete market');
rejected(f=>f.oddsText=f.oddsText.replace('1 2','1 3.1'),'stale odds');
rejected(f=>f.position.rows[0].p10=null,'missing P10');
rejected(f=>{f.ability.activeModel='v1'},'C inactive');
rejected(f=>{f.m3.rows[1].no='1'},'duplicate runner');
rejected(f=>f.raceNumber=0,'missing race number');
rejected(f=>f.startLocal='2026-11-18T13:00:00+09:00','post race');
console.log('PASS P3-55: pre-race snapshot includes 12 horses + provenance, blocks 8 invalid cases, no outcomes');
