'use strict';
// P3-46: missing *entire* M3 input columns must not yield credible ranks from imputed values.
// Regression is independent from horse outcomes or betting decisions.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/finish600-simulator-v2.js'),'utf8');
const get=(start,end)=>{const i=src.indexOf(start),j=src.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'Source contract not found: '+start);return src.slice(i,j)};
const norm=s=>String(s??'').normalize('NFKC').replace(/[\s_　]/g,'').toUpperCase();
const mapFns=new Function('C',get('function col(headers,names','function invalidateM3(reason){')+'return {col,m3MissingFields};')({normHead:norm});
const {col,m3MissingFields}=mapFns;
const toMapping=h=>({
 name:col(h,['馬名']),date:col(h,['日付','年月日','レース日']),
 surface:col(h,['芝・ダ','芝ダ']),last3f:col(h,['上り3F','上がり3F']),
 gap:col(h,['上3F地点差','-3F差','－3F差','−3F差']),
 rpci:col(h,['RPCI']),pci:col(h,['PCI'],true),
 field:col(h,['頭数','出走頭数']),
 c1:col(h,['1角','１角']),c2:col(h,['2角','２角']),
 c3:col(h,['3角','３角']),c4:col(h,['4角','４角'])
});
const good=['馬名','日付','芝・ダート','上り3F','上3F地点差','RPCI',' PCI','頭数','3角'];
assert.deepEqual(m3MissingFields(toMapping(good)),[],'real TARGET padded PCI header accepted');
const changes=[
 ['PCI',good.filter(x=>x!==' PCI').concat(['レースPCI','PCI3']),'馬PCI'],
 ['RPCI',good.filter(x=>x!=='RPCI'),'RPCI'],
 ['gap',good.filter(x=>x!=='上3F地点差'),'上3F地点差'],
 ['last3f',good.filter(x=>x!=='上り3F'),'上り3F'],
 ['corners',good.filter(x=>x!=='3角'),'通過順位'],
 ['surface',good.filter(x=>x!=='芝・ダート'),'芝・ダート'],
 ['field',good.filter(x=>x!=='頭数'),'頭数']
];
for(const [id,h,expected] of changes)assert(m3MissingFields(toMapping(h)).includes(expected),id+' must fail closed when '+expected+' absent');
const state={Finish600State:{ready:true,rows:[{no:'1',finishRank:1}]}};
const root={innerHTML:'<p>old ranking</p>'};
const inv=new Function('window','$','generation','E',
  'let parsed=true,lastSig="prior";'+get('function invalidateM3(reason){','function dateVal(v){')+
  'return ()=>{invalidateM3("M3を停止：PCI欠損");return {parsed,lastSig};}')(
 state,()=>root,()=>2,s=>String(s));
const flags=inv();
assert.equal(state.Finish600State.ready,false,'stale M3 result must be invalidated');
assert.equal(state.Finish600State.generation,2);
assert.equal(flags.parsed,false);
assert.equal(flags.lastSig,'');
assert.match(root.innerHTML,/M3を停止/);
assert(src.includes('const missing=m3MissingFields(m);if(missing.length)'), 'parser must enforce full schema');
assert(src.includes('if(busy||!parsed||!MODEL'), 'renderer must not emit an all-imputed rank without a valid CSV');

const vm=require('node:vm');
const scode=fs.readFileSync(path.join(__dirname,'../waku-bc-converter/shape-core-v2.js'),'utf8');
const browser={};vm.runInNewContext(scode,{window:browser,TextDecoder,Date,console});
const C=browser.ShapeCore;
let paints=0;
const userWindow={Finish600State:{ready:true,rows:[{no:'1',finishRank:1}]}};
const ui={innerHTML:''};
const source=get('function col(headers,names','function hist(name,raceDate){');
const runtime=new Function('C','window','
,'E','generation','num','clamp','schedule','TextEncoder',
  'let parsed=false,rawByHorse=new Map(),lastSig="";'+source+
  'return {parseFile,state:()=>({parsed,rawByHorse})};')(
  C,userWindow,()=>ui,String,()=>3,
  v=>v===null||v===undefined||v===''?NaN:Number(String(v).trim()),
  (v,a,b)=>Math.max(a,Math.min(b,v)),()=>{paints++},TextEncoder
);
const toFile=s=>({arrayBuffer:async()=>new TextEncoder().encode(s).buffer});
const headers=['馬名','日付','芝・ダート','上り3F','上3F地点差','RPCI',' PCI','頭数','3角'];
const goodRows=[headers,['テスト馬','2025.11. 1','芝','35.0','0.8','51.0','50.0','16','5']];
const goodCsv=goodRows.map(a=>a.join(',')).join('\n');
const badCsv=[headers.filter(x=>x!==' PCI'),goodRows[1].filter((_,i)=>headers[i]!==' PCI')]
 .map(a=>a.join(',')).join('\n');
(async()=>{
  await runtime.parseFile(toFile(badCsv));
  assert.equal(runtime.state().parsed,false,'incomplete CSV must not be declared ready');
  assert.equal(userWindow.Finish600State.ready,false);
  assert.match(userWindow.Finish600State.reason,/馬PCI/);
  assert.equal(paints,0,'invalid data must never schedule M3');
  await runtime.parseFile(toFile(goodCsv));
  assert.equal(runtime.state().parsed,true,'valid TARGET-compatible CSV must become ready');
  assert.equal(paints,1);
  const h=runtime.state().rawByHorse.get('テスト馬');
  assert.equal(h.length,1);
  assert.equal(h[0].pci,50);
  assert.equal(h[0].rpci,51);
  assert.equal(h[0].date,20251101);
  assert.equal(h[0].firstCorner,5);
  console.log('PASS P3-46 full-column schema gate, live parse red/green, stale M3 invalidation');
})().catch(e=>{console.error(e);process.exitCode=1});

