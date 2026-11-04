// Run: node waku-bc-converter/regression/prospective-precision-v1.test.mjs
// Synthetic fixtures only. Do not infer historical accuracy or ROI from this test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../mobile-prediction-ledger-v1.js',import.meta.url),'utf8');
function extract(begin,end) {
 const a=source.indexOf(begin),b=source.indexOf(end,a+begin.length);
 assert.ok(a>=0&&b>a,'Expected ledger function: '+begin);
 return source.slice(a,b);
}
const compare=new Function(extract('function comparisonSummary(all){','function history(){')+'return comparisonSummary;')();
const snap=new Function('window','val','num',extract('function snapshot(){','function partners(')+'return snapshot();');
function race(date,placed,partners,opts={}){
 const field=12;
 const horses=Array.from({length:field},(_,i)=>({no:String(i+1),m3Rank:i+1,scenarioM4Ranks:[i+1,i+1,i===2?1:i===0?2:i===1?3:i+1,i+1]}));
 return {kind:'pre_race',capturedAt:opts.at||date+'T06:00:00Z',timeValidation:{status:'before_user_confirmed_time'},
  meta:{date,venue:'東京',name:'11R',surface:'芝',distance:1600,fieldSize:12},
  choice:{axisNo:1,partners,scenario:'2',decision:'buy'},snapshot:{appAxis:{no:'1',status:'ready'},horses,marketRows:Array.from({length:field},(_,i)=>({no:String(i+1),pop:i+1}))},
  outcome:placed?{top3Nos:placed}:null};
}
const a=race('2026-11-07',[1,3,7],[3]),b=race('2026-11-08',[2,4,5],[3]);
const base=compare([a,b]);
assert.match(base,/アプリ軸 1\/2（50\.0%）/);
assert.match(base,/他馬平均 50\.0%／アプリ軸 50\.0%（比較 2R）/);
assert.match(base,/手動 1\/2（50\.0%）/);
assert.match(base,/通常M3 0\/2（0\.0%）/);
assert.match(base,/選択M4 1\/2（50\.0%）/);
const newer=race('2026-11-07',null,[2],{at:'2026-11-07T08:00:00Z'});
assert.match(compare([a,newer,b]),/手動 0\/2（0\.0%）/,'later pre-race choice wins even if result entered in older record');
const contradictory=race('2026-11-07',[1,4,7],[3],{at:'2026-11-07T09:00:00Z'});
assert.match(compare([a,newer,b,contradictory]),/相違するレース 1件/);
const legacy=race('2026-11-09',[1,2,3],[3]);legacy.timeValidation={status:'unverified_no_time'};
assert.match(compare([legacy]),/アプリ軸 0\/0/);
const absent=race('2026-11-07',[1,3,7],[3]);absent.snapshot.marketRows=[];
assert.match(compare([absent]),/同人気帯比較は未集計/,'never backfill popularity from post-race');
const n=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const markets=Array.from({length:12},(_,i)=>({no:String(i+1),pop:i+1,od:2.1+i}));
const window={DecisionShellV2State:{market:{complete:true,rows:markets}},ProductionDecisionPipelineV1State:{stages:{axis:{no:'1',status:'ready'},price:{axisPopularity:1},opponents:{rows:[]}}},Finish600State:{rows:markets.map((x,i)=>({no:x.no,finishRank:i+1,sc:[0,1,2,3].map(()=>({rank:i+1}))}))},ValidatedQueueState:{byNo:{}},Remaining600ValidatedState:{rows:[]}};
const screenshot=snap(window,id=>id==='fieldSize'?'12':'',n);
assert.equal(screenshot.marketRows.length,12);
assert.equal(screenshot.marketRows[0].pop,1);
assert.equal(screenshot.appAxis.status,'ready');
console.log('prospective-precision-v1: PASS (axis, same-band peers, matched opponent K, latest snapshot, conflicts, legacy exclusions, market freeze)');
