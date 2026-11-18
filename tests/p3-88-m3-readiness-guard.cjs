'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../waku-bc-converter/mobile-analysis-controller-v1.js'),'utf8');
const a=src.indexOf('async function waitReady(){'),b=src.indexOf('function showError(',a);
assert(a>=0&&b>a,'Mobile M3 readiness guard not found');
const factory=new Function('window','ready','sleep',src.slice(a,b)+'return waitReady;');
(async()=>{
 let calls=0;
 const fail=factory({M3InputReceiptState:{ready:false,reason:'M3を停止：レースID(新・馬番無16桁)欠損'}},()=>false,async()=>{calls++});
 await assert.rejects(fail(),/M3を停止：レースID/);
 assert.equal(calls,0,'Known invalid TARGET input must fail before polling');
 const good=factory({M3InputReceiptState:{ready:true}},()=>true,async()=>{calls++});
 assert.equal(await good(),true,'Ready healthy model must continue');
 console.log('PASS P3-88 meaningful user error on invalid M3 data, no timeout; valid model unchanged');
})().catch(e=>{console.error(e);process.exitCode=1});
