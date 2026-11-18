'use strict';
// P3-88: v3 and v4 must calculate exactly the same 19 features on the same AS-OF data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../waku-bc-converter');
const s3=fs.readFileSync(path.join(root,'finish600-simulator-v2.js'),'utf8');
const s4=fs.readFileSync(path.join(root,'v4-m3-engine-v1.js'),'utf8');
const model=require(path.join(root,'data/finish600_model_v1.json'));
const cut=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'source missing: '+a);return s.slice(i,j)};
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((v,x)=>v+x,0)/a.length:NaN};
const med=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;return a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2};
const sd=a=>{a=a.filter(Number.isFinite);if(a.length<2)return NaN;const m=mean(a);return Math.sqrt(a.reduce((v,x)=>v+(x-m)*(x-m),0)/(a.length-1))};
const vOr=(x,d)=>Number.isFinite(x)?x:d,surf=v=>String(v).includes('ダ')?'ダ':'芝',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
let prior=[];
const hist=(_name,cutoff)=>prior.filter(x=>x.date&&x.date<cutoff).slice(0,5);
const v3=new Function('hist','surf','mean','med','sd','vOr','clamp',cut(s3,'function featuresFor(','function fallbackGap(')+'return {featuresFor,predictLinear};')(hist,surf,mean,med,sd,vOr,clamp);
const v4=new Function('surf','mean','med','sd','vOr','clamp',cut(s4,'function featuresFor(','function fallbackGap(')+'return featuresFor;')(surf,mean,med,sd,vOr,clamp);
const v4predict=new Function(cut(s4,'function predictLinear(','function parseHistory(')+'return predictLinear;')();
const rows=[
 {date:20261101,surface:'芝',gap:.4,pci:56,rpci:50,last3f:33.6,front:.67},
 {date:20260901,surface:'芝',gap:.7,pci:53.3,rpci:52,last3f:34.6,front:.55},
 {date:20260701,surface:'ダ',gap:.5,pci:49,rpci:47,last3f:36.2,front:.3},
 {date:20260501,surface:'芝',gap:.9,pci:NaN,rpci:51,last3f:35.0,front:.7},
 {date:20260301,surface:'芝',gap:.2,pci:55,rpci:NaN,last3f:33.4,front:.6},
 {date:20260101,surface:'ダ',gap:.6,pci:47,rpci:49,last3f:36.8,front:.1},
 {date:20251201,surface:'芝',gap:NaN,pci:NaN,rpci:NaN,last3f:NaN,front:NaN}
];
let n=0;
for(const data of [rows,rows.slice(1),rows.slice(3),rows.slice(6)]){
 for(const cutoff of [20261004,20260401,20250101]){
  for(const surface of ['芝','ダート']){
   prior=data;
   const race={surface,distance:1600,fieldSize:16},no='4',predGap=.72;
   const x3=v3.featuresFor({name:'A馬',no},race,predGap,cutoff);
   const x4=v4(data.filter(x=>x.date<cutoff).slice(0,5),race,predGap,no);
   assert.deepEqual(Object.keys(x3),Object.keys(x4),'19 fields must have the same order');
   assert.equal(Object.keys(x3).length,19);
   for(const k of Object.keys(x3))assert(Math.abs(x3[k]-x4[k])<1e-10,JSON.stringify({k,x3:x3[k],x4:x4[k],cutoff,surface}));
   const p3=v3.predictLinear(model.core_m3,x3),p4=v4predict(model.core_m3,x4);
   assert(Math.abs(p3-p4)<1e-11,'closing equation differs between apps');
   assert(Math.abs((predGap-p3)-(predGap-p4))<1e-11,'final M3 score differs between apps');
   n++;
  }
 }
}
console.log('PASS P3-88 v3/v4 19-feature and coefficient parity: '+n+' paired fixtures');
