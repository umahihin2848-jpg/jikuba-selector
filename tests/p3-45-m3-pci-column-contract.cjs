'use strict';
// P3-45: M3 horse PCI must never silently use TARGET's different "PCI3" field.
// The same test permits the authentic " PCI" TARGET header after normalizing.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/finish600-simulator-v2.js'),'utf8');
const start=src.indexOf('function col(headers,names'),end=src.indexOf('function dateVal(v)',start);
assert(start>=0&&end>start,'production M3 col mapper not found');
const N=h=>String(h??'').normalize('NFKC').replace(/[\s_　]/g,'').toUpperCase();
const col=new Function('C',src.slice(start,end)+'return col;')({normHead:N});
const miss=['馬名','レースPCI','PCI3','上り3F','上3F地点差'];
assert.equal(col(miss,['PCI'],true),'','M3 must not silently substitute PCI3 when horse PCI is missing');
const full=['馬名','レースPCI',' PCI','PCI3'];
assert.equal(col(full,['PCI'],true),' PCI','the real TARGET horse PCI field is supported');
assert.equal(col(full,['PCI']),' PCI','non-strict alias matches remain consistent');
assert.equal(col(['レースPCI','上がり3F'],['上がり3F'],true),'上がり3F','strict mode must not hide exact known fields');
assert.equal(col(['レースPCI','上り3F'],['上がり3F'],false),'','fuzzy fallback must not invent unrelated result fields');
assert(src.includes("pci:col(h,['PCI'],true)"),'production M3 must opt in to exact PCI lookup');
console.log('PASS P3-45 horse PCI exact-column binding: real PCI is read, PCI3 never substituted');
