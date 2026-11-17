'use strict';
// P3-47: independent, synthetic 19-feature contract; invokes the exact
// current JS M3 functions from the production source, no TARGET data in Git.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/finish600-simulator-v2.js'),'utf8');
const start=src.indexOf('function featuresFor('),end=src.indexOf('function fallbackGap(',start);
assert(start>=0&&end>start,'M3 feature function not found');
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>{a=a.filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN};
const med=a=>{a=a.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
const sd=a=>{a=a.filter(Number.isFinite);if(a.length<2)return NaN;const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1))};
const vOr=(x,d)=>Number.isFinite(x)?x:d;
const surf=v=>String(v||'').includes('ダ')?'ダ':'芝';
const cutoff=20260801;
const runs=[
 {date:20261001,surface:'芝',pci:92,rpci:98,gap:9,last3f:30,front:1}, // future, must be ignored
 {date:20260601,surface:'芝',pci:51.4,rpci:50,gap:.4,last3f:34.2,front:.7},
 {date:20260401,surface:'ダ',pci:48,rpci:49,gap:.9,last3f:36,front:.3},
 {date:20260101,surface:'芝',pci:53,rpci:51,gap:.5,last3f:35,front:.8},
 {date:20251201,surface:'芝',pci:NaN,rpci:52,gap:.8,last3f:35.5,front:.6},
 {date:20251101,surface:'ダ',pci:47,rpci:46,gap:.2,last3f:33.5,front:.4}
];
const hist=(_name,date)=>runs.filter(x=>x.date&&x.date<date).slice(0,5);
const {featuresFor,predictLinear}=new Function('hist','surf','clamp','med','mean','sd','vOr',
 src.slice(start,end)+'return {featuresFor,predictLinear};')(
 hist,surf,clamp,med,mean,sd,vOr);
const x=featuresFor({name:'synthetic',no:4},{surface:'芝',distance:1600,fieldSize:16},.75,cutoff);
const close=(a,b,key)=>assert(Math.abs(a-b)<1e-10,key+': '+a+' !== '+b);
const vals={
 pred_gap:.75,hist_gap_med:.5,hist_pci_med:49.7,hist_rpci_med:50,
 hist_last3f_med:35,hist_last3f_mean:34.84,
 hist_last3f_sd:Math.sqrt([34.2,36,35,35.5,33.5].reduce((s,v)=>s+(v-34.84)**2,0)/4),
 hist_front_mean:.56,hist_pr_diff_med:1.2,hist_pr_diff_mean:.85,
 hist_pr_diff_sd:Math.sqrt([1.4,-1,2,1].reduce((s,v)=>s+(v-.85)**2,0)/3),
 same_surface_pr_diff_med:1.7,same_surface_last3f_med:35,
 same_surface_n:3,hist_n:5,field_size:16,gate_frac:.2,distance:1600,surface_dirt:0
};
for(const [k,v] of Object.entries(vals))close(x[k],v,k);
const m=require(path.join(__dirname,'../waku-bc-converter/data/finish600_model_v1.json')).core_m3;
assert.equal(m.features.length,19,'feature count drift');
assert.deepEqual(Object.keys(x),m.features,'feature names/order drift');
const result=predictLinear(m,x);
const manual=m.intercept+m.features.reduce((s,k,i)=>s+m.coef[i]*((x[k]-m.scaler_mean[i])/m.scaler_scale[i]),0);
close(result,manual,'M3 linear predictor');
console.log('PASS P3-47: production M3 19-feature JS contract, 5 strict prior runs, PCI missingness and model coefficient path');
