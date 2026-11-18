'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../waku-bc-converter/finish600-simulator-v2.js'),'utf8');
const a=src.indexOf('function hist(name,raceDate){'),b=src.indexOf('function vOr(x,d)',a);
assert(a>=0&&b>a,'production hist selector missing');
const rawByHorse=new Map([['A馬',[
 {date:20261101,raceId:'LATE'},{date:20260801,raceId:'SAME'},
 {date:20260801,raceId:'SAME'},{date:20260601,raceId:'EARLY'},
 {date:20260401,raceId:'THIRD'},{date:20261004,raceId:'RACEDAY'}]]]);
const hist=new Function('rawByHorse',src.slice(a,b)+'return hist;')(rawByHorse);
const h=hist('A馬',20261004);
assert.deepEqual(h.map(x=>x.raceId),['SAME','EARLY','THIRD'],'future, same-day and repeated starts must be discarded');
assert(src.includes("window.M3InputReceiptState={ready:true,version:'m3-input-receipt-p3-88'"),'ready receipt missing');
assert(src.includes('history:hist(r.name,raceDate).map('),'past race identities must accompany scores');
assert(src.includes('features:r.x'),'all 19 M3 features must be saved for local audit');
assert(src.includes('window.M3InputReceiptState={ready:false'),'invalid data must revoke stale receipt');
assert(src.includes('audit?.historyConflictCount>0'),'conflicting source rows must block v3 M3');
assert(src.includes('targetExport:h.some('),'TARGET exports must require stable race IDs');
console.log('PASS P3-88 strict five-history identity and local M3 receipt');
