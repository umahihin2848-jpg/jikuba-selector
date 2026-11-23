'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const directory = path.join(__dirname, '../waku-bc-converter');
class TestFile {
  constructor(text) { this.content = new TextEncoder().encode(text); this.name='history.csv'; this.size=this.content.byteLength; this.lastModified=0; this.type='text/csv'; }
  async arrayBuffer() { return this.content.slice().buffer; }
}
const ctx = {
  console, TextDecoder, TextEncoder, File: TestFile, Date, Map, WeakMap, Set,
  setTimeout:()=>0, clearTimeout:()=>{},
  document: {readyState:'complete', getElementById:()=>null}
};
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['shape-core-v2.js', 'numeric-normalization-compat-v1.js', 'target-csv-compat-v1.js']) {
  vm.runInContext(fs.readFileSync(path.join(directory, file),'utf8'),ctx,{filename:file});
}

// Synthetic-only fixture; do not commit real horse histories to public GitHub.
const headers = [
  '何走目','馬番','馬名','レースID(新・馬番無16桁)','日付','レースPCI',' PCI',
  '上3F地点差','上り3F','頭数','通過1','通過2','通過3','通過4','着順','距離','芝・ダート'
];
const r=(name,id,date,pci,other={})=>[
  '1','1',name,id,date,'50.0',pci,'0.5','35.2','16','0','0','4','5','2','1600','芝'
].map((x,i)=>Object.prototype.hasOwnProperty.call(other,headers[i])?other[headers[i]]:x);
const id1='2026090108010111', id2='2026080108010111', id3='2026070108010111';
const lines = [
  headers,
  r('A馬',id1,'2026. 9. 1','53.1'),
  r('A馬',id1,'2026. 9. 1','53.1'),
  r('A馬',id2,'2026. 8. 1','51.4'),
  r('B馬',id3,'2026. 7. 1','49.0'),
  r('B馬',id3,'2026. 7. 1','49.0')
].map(x=>x.join(',')).join('\n');

(async()=>{
  const file = new TestFile(lines);
  const transformed = ctx.ShapeCore.rowsToObjects(ctx.ShapeCore.parseCSV(ctx.ShapeCore.decode(await file.arrayBuffer())));
  const rows=transformed.rows, st=ctx.RSATargetCsvCache.stats;
  assert.equal(rows.length,3,'three distinct horse/race starts required');
  assert.equal(st.historyDuplicateRowsSkipped,2);
  assert.equal(st.historyConflictCount,0);
  assert.equal(st.historyKeyUnavailable,0);
  assert.deepEqual(Array.from(rows.map(x=>x['馬名'])),['A馬','A馬','B馬']);
  assert.deepEqual(Array.from(rows.map(x=>x['馬番'])),['1','1','2']);
  assert.equal(rows[0]['1角'],'');
  assert.equal(rows[0]['3角'],'4');
  assert.equal(ctx.ShapeCore.dateVal(rows[0]['日付']),20260901);

  // Deliberate conflict: same horse/race but different PCI. Never silently
  // consider it a clean duplicate; trace the inconsistency in stats.
  const changed = lines+'\n'+r('A馬',id1,'2026. 9. 1','56.9').join(',');
  const conflictFile = new TestFile(changed);
  const before = st.historyConflictCount;
  await conflictFile.arrayBuffer();
  assert.equal(st.historyConflictCount,before+1);

  // Without stable historical race IDs, do not deduplicate different rows by date.
  const noIdLines = [headers, r('A馬','','2026. 9. 1','53.1'),r('A馬','','2026. 9. 1','53.1')]
    .map(x=>x.join(',')).join('\n');
  const noIdFile=new TestFile(noIdLines);
  const raw=ctx.ShapeCore.parseCSV(ctx.ShapeCore.decode(await noIdFile.arrayBuffer()));
  assert.equal(raw.length-1,2,'no-id rows must be retained, not falsely collapsed');
  assert(st.historyKeyUnavailable>=2);
  // Same metadata is NOT proof of same content: two different files can have
  // the same name, size, lastModified, and type. Reusing a previous buffer
  // corrupts the entire horse roster and M3 histories.
  const one = new TestFile([headers, r('C馬',id1,'2026. 9. 1','53.1')].map(x=>x.join(',')).join('\n'));
  const two = new TestFile([headers, r('D馬',id1,'2026. 9. 1','53.1')].map(x=>x.join(',')).join('\n'));
  assert.equal(one.size,two.size,'test fixture must collide on file metadata');
  assert.equal(one.name,two.name);
  assert.equal(one.lastModified,two.lastModified);
  const decodeHorse=async f=>ctx.ShapeCore.rowsToObjects(ctx.ShapeCore.parseCSV(ctx.ShapeCore.decode(await f.arrayBuffer()))).rows[0]['馬名'];
  assert.equal(await decodeHorse(one),'C馬');
  assert.equal(await decodeHorse(two),'D馬','different File objects must not share a transformed buffer');
  // Match current app's full-race history flow, including a strict as-of cutoff.
  const mapping={horseName:'馬名',horseNo:'馬番',rpci:'RPCI',pci:' PCI',minus3f:'上3F地点差',style:'脚質',date:'日付',distance:'距離',finish:'着順'};
  const horses=ctx.ShapeCore.buildHistories(rows,mapping).horses;
  const model={fixed_priors:{recent_window:5,escape:.08,front:.33,prior_weight:3}};
  const historical=ctx.ShapeCore.summarize(horses,model,'2026-09-20');
  const a=historical.find(x=>x.name==='A馬');
  assert.equal(a.nRecent,2,'five rows must mean distinct racing starts, not repeated copies');
  assert.equal(a.nAll,2,'history coverage also must exclude future starts');
  const before=ctx.ShapeCore.summarize(horses,model,'2026-09-01').find(x=>x.name==='A馬');
  assert.equal(before.nRecent,1,'same-day race is excluded');
  const absent=ctx.ShapeCore.summarize(horses,model,'');
  assert.equal(absent.every(x=>x.nRecent===0&&x.nAll===0),true,'no date must not silently use future history');

    console.log('PASS P3-63 TARGET historical dedup: duplicates, roster, zero corners, conflict and missing-ID cases'); 
})().catch(e=>{console.error(e);process.exitCode=1});
