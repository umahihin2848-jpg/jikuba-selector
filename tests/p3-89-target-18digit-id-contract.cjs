'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../waku-bc-converter');
class TestFile{
 constructor(text){this.content=new TextEncoder().encode(text);this.name='sample.csv';this.size=this.content.byteLength;this.lastModified=0;this.type='text/csv';}
 async arrayBuffer(){return this.content.slice().buffer}
}
const ctx={console,Date,File:TestFile,TextDecoder,TextEncoder,Blob,Map,Set,Promise,WeakMap,setTimeout:()=>0,clearTimeout:()=>{},document:{readyState:'complete',getElementById:()=>null}};
ctx.window=ctx;vm.createContext(ctx);
for(const p of ['shape-core-v2.js','numeric-normalization-compat-v1.js','target-csv-compat-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),ctx);
const hdr=['何走目','馬名','馬番','日付','芝・ダート','上り3F','上3F地点差','レースPCI',' PCI','頭数','通過1','通過2','通過3','通過4','レースID(新)'];
const row=(name,priorNo,pci,id)=>['1',name,priorNo,'2026. 8. 1','芝','35.2','0.5','50',pci,'16','','','4','5',id];
const id='202608010801011105',intl='20250222K600000805';
const arr=[hdr,row('A馬','5','53.1',id),row('A馬','5','53.1',id),row('B馬','5','51.4',intl)];
const csv=arr.map(a=>a.join(',')).join('\n');
(async()=>{
 const f=new TestFile(csv);
 const buf=await f.arrayBuffer(),parsed=ctx.ShapeCore.rowsToObjects(ctx.ShapeCore.parseCSV(ctx.ShapeCore.decode(buf)));
 const rows=parsed.rows,alias='レースID(新・馬番無16桁)';
 assert.equal(rows.length,2,'duplicate 18-digit history should be removed');
 assert.equal(rows[0][alias],id.slice(0,16));assert.equal(rows[1][alias],intl.slice(0,16));
 assert.equal(ctx.RSATargetCsvCache.stats.historyDuplicateRowsSkipped,1);
 assert.equal(ctx.RSATargetCsvCache.stats.historyKeyUnavailable,0);
 const model=require(path.join(root,'data/finish600_model_v1.json'));
 const engineContext={window:null,console,TextDecoder,TextEncoder,Blob,Date,Map,Promise,fetch:async()=>({ok:true,json:async()=>model})};
 engineContext.window=engineContext;vm.createContext(engineContext);
 vm.runInContext(fs.readFileSync(path.join(root,'v4-m3-engine-v1.js'),'utf8'),engineContext);
 const r=await engineContext.V4M3Engine.compute({blob:new Blob([csv]),race:{raceDate:'2026-11-08',surface:'芝',distance:2500,fieldSize:18},horses:[{no:'1',name:'A馬'},{no:'2',name:'B馬'}]});
 assert.equal(r.rows.length,2);assert(r.rows.every(x=>x.histN===1));
 const invalid=csv.replace(id,'202608010801011106');
 const f2=new TestFile(invalid);
 const b2=await f2.arrayBuffer();const z2=ctx.ShapeCore.rowsToObjects(ctx.ShapeCore.parseCSV(ctx.ShapeCore.decode(b2)));
 assert.equal(z2.rows.some(x=>x[alias]===''),true,'invalid suffix must not generate a trusted stable id');
 await assert.rejects(()=>engineContext.V4M3Engine.compute({blob:new Blob([invalid]),race:{raceDate:'2026-11-08',surface:'芝',distance:2500,fieldSize:18},horses:[{no:'1',name:'A馬'}]}),/18桁レースID/);
 console.log('PASS P3-89 TARGET 18-digit race ID conversion (including overseas A-Z), dedup, bad suffix rejection');
})().catch(e=>{console.error(e);process.exitCode=1});
