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
console.log('PASS P3-46 full-column schema gate, no PCI3/racePCI fallback, stale M3 state invalidation');
