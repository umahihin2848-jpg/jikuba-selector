'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../waku-bc-converter');
const html=fs.readFileSync(path.join(root,'v3.html'),'utf8'),loader=fs.readFileSync(path.join(root,'v3-addons-loader-p.js'),'utf8'),v='20261118m3p87';
for(const name of ['shape-core-v2.js','target-csv-compat-v1.js','v3-addons-loader-p.js'])
  assert(html.includes(name+'?v='+v),'missing fresh browser URL '+name);
for(const name of ['remaining600-validated-v1.js','finish600-simulator-v2.js'])
  assert.equal((loader.match(new RegExp(name.replaceAll('.','\\.')+'\\?v='+v,'g'))||[]).length,2,'mobile and desktop both need current '+name);
assert(loader.includes("const BUILD='"+v+"'"),'build should be diagnosable');
console.log('PASS P3-87 cache contract for desktop and mobile M3');