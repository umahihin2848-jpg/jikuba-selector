'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.resolve(__dirname,'../waku-bc-converter/finish600-simulator-v2.js'),'utf8');
const start=src.indexOf('function render(){'),end=src.indexOf('const css=',start);
assert(start>=0&&end>start,'render function is missing');
const renderSrc=src.slice(start,end);
assert(!renderSrc.includes('dateVal(meta.date)||99999999'),'invalid date must not become open-ended cutoff');
assert(renderSrc.includes('rows.every(r=>r.x.hist_n===0)'),'empty historical coverage must not publish a ranking');
const run=(date,histN)=>{
 let message='',root={innerHTML:'stale M3'};
 const window={Remaining600ValidatedState:{rows:[{no:'1',pred:.7}],generation:0},Finish600State:{ready:true,rows:[{no:'1',finishRank:1}]}};
 const fn=new Function('window','dateVal','generation','featuresFor','predictLinear','betaFlags','pauseM3',
   'let raf=0,busy=false,parsed=true,MODEL={core_m3:{},scenario_m4:{0:{},1:{},2:{},3:{}}},lastCtx={meta:{date:"'+date+'",surface:"芝",fieldSize:16},analysis:{hs:[{name:"テスト馬",no:"1"}]}};'+renderSrc+';return render;')(
   window,d=>d==='invalid'?0:20261004,()=>0,()=>({hist_n:histN}),()=>.2,()=>[],msg=>{message=msg;window.Finish600State={ready:false,reason:msg};root.innerHTML=msg});
 fn();
 assert(message.startsWith('M3を停止：'),date+' / histN='+histN+' must fail closed');
 assert.equal(window.Finish600State.ready,false,'old M3 must not stay ready');
 assert(!root.innerHTML.includes('stale'),'stale DOM ranking must be invalidated');
};
run('invalid',5);
run('2026-10-04',0);
console.log('PASS P3-87 strict race date and zero-history guards');
