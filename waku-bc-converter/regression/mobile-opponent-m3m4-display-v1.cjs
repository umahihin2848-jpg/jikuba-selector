// Regression test for display-only M3/M4 opponent comparisons. Synthetic races only.
// Run: node waku-bc-converter/regression/mobile-opponent-m3m4-display-v1.cjs
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../mobile-opponent-analysis-v1.js'),'utf8');
const start=src.indexOf('function validRank(');
const end=src.indexOf('function typeOf(',start);
assert(start>=0&&end>start,'Cannot find M4 comparison helpers');
const make=new Function('window','E','rank',src.slice(start,end)+'return {chosenM4,m4Stats,m4Panel,setM4Filter,m4Kind};');
const f=[
 {no:'16',name:'浮上候補',finishRank:9,sc:[{rank:6},{rank:8},{rank:3},{rank:12}]},
 {no:'5',name:'安定候補',finishRank:2,sc:[{rank:3},{rank:2},{rank:2},{rank:4}]},
 {no:'2',name:'軸馬',finishRank:2,sc:[{rank:2},{rank:1},{rank:1},{rank:2}]},
 {no:'7',name:'欠損候補',finishRank:8,sc:[{rank:null},{rank:9},{rank:5},{rank:8}]},
 {no:'9',name:'低下候補',finishRank:3,sc:[{rank:11},{rank:10},{rank:12},{rank:14}]}
];
const app={RSAAnalysisTransitionState:{generation:5,status:'ready'},
 Finish600State:{ready:true,generation:5,rows:f},
 MobileAnalysisCoreState:{analysis:{pred:{p:[.1,.2,.6,.1]}}}};
const esc=x=>String(x).replace(/</g,'&lt;');
const rank=x=>Number.isFinite(x)?'#'+x:'—';
let v=make(app,esc,rank);
let choice=v.chosenM4();
assert.equal(choice.band,2);
assert.equal(choice.source,'app-default');
assert.equal(v.m4Stats('16',choice).m3,9);
assert.equal(v.m4Stats('16',choice).selected,3);
assert.equal(v.m4Stats('16',choice).change,6);
assert.equal(v.m4Stats('16',choice).top5,1);
assert.equal(v.m4Stats('5',choice).top5,4);
assert.equal(v.m4Stats('5',choice).stable,true);
assert.equal(v.m4Stats('7',choice).top5,null,'incomplete scenarios must never be shown as 4/4');
const rows=[{no:'2',name:'軸馬',axis:true},{no:'16',name:'浮上候補',axis:false},{no:'5',name:'安定候補',axis:false},{no:'7',name:'欠損候補',axis:false},{no:'9',name:'低下候補',axis:false}];
const html=v.m4Panel(rows,choice);
assert.match(html,/M3 #9 → M4 #3/);
assert.match(html,/↑6 ／ 上位5 1\/4/);
assert.match(html,/上位5 4\/4/);
assert.match(html,/3着内確率・着順やワイド期待値を意味しません/);
assert(!html.includes('class="moaM4Names"><b>軸馬'),'the axis must be excluded from opponent table');
assert(html.indexOf('浮上候補')<html.indexOf('安定候補'),'rising scenario partner should be discoverable before stable group');
app.RaceProgressVisualV1State={ready:true,scenarioSource:'manual',scenarioBand:0,generation:5};
choice=v.chosenM4();
assert.equal(choice.band,0);assert.equal(choice.source,'manual');
assert.equal(v.m4Stats('16',choice).selected,6);
app.RaceProgressVisualV1State.generation=4;
assert.equal(v.chosenM4().band,2,'stale scenario from previous race must not override current one');
// Filters are a presentation-only view of the same underlying runners.
v.setM4Filter('rise');
const rising=v.m4Panel(rows,{band:2,source:'app-default',text:'自動'});
assert(rising.includes('class="moaM4Names"><b>浮上候補'),'rising partner must appear');
assert(!rising.includes('class="moaM4Names"><b>安定候補'),'stable partner must not appear in rising filter');
v.setM4Filter('stable');
const stable=v.m4Panel(rows,{band:2,source:'app-default',text:'自動'});
assert(stable.includes('class="moaM4Names"><b>安定候補'),'stable partner must appear');
assert(!stable.includes('class="moaM4Names"><b>浮上候補'),'rising partner must not appear in stable filter');
v.setM4Filter('drop');
const declining=v.m4Panel(rows,{band:2,source:'app-default',text:'自動'});
assert(declining.includes('class="moaM4Names"><b>低下候補'),'declining partner must appear');
assert(!declining.includes('class="moaM4Names"><b>浮上候補'),'rising partner must not appear in declining filter');
v.setM4Filter('all');
const shown=v.m4Panel(rows,{band:2,source:'app-default',text:'自動'});
assert(shown.includes('Ability'),'ability ranking must accompany M3/M4');
assert(shown.includes('data-oa-m4-filter="stable"'),'filters must be interactive');
assert(shown.includes('ワイドオッズと実購入・見送りの理由'),'odds must be recorded, not inferred from M4');
assert(shown.includes('data-oa-open-ledger'),'prospective odds record must be one tap away');
assert(src.includes('ledger.open=true'),'price-record shortcut should open the existing ledger');
assert(src.includes("document.querySelector('[data-ims-tab=\"ticket\"]')?.click()"),'navigate to the ledger tab before opening the hidden panel');
const deep=fs.readFileSync(path.join(__dirname,'../mobile-opponent-deep-dive-v1.js'),'utf8');
assert(!deep.includes('シナリオ別M3'),'scenario ranks must consistently be called M4');
const scStart=deep.indexOf('function scenario(no){'),scEnd=deep.indexOf('function analyze(no){',scStart);
assert(scStart>=0&&scEnd>scStart,'deep-dive scenario function missing');
const fallback=v=>v==null||v===''?NaN:Number(v);
const makeScenario=new Function('finishMap','N',deep.slice(scStart,scEnd)+'return scenario;');
const partial=makeScenario(()=>({5:{sc:[{rank:1},{rank:null},{rank:2},{rank:3}]}}),fallback);
assert.equal(partial('5').label,'一部未算出','partial scenarios must not be called stable');
const fullScenario=makeScenario(()=>({5:{sc:[{rank:1},{rank:4},{rank:2},{rank:3}]}}),fallback);
assert.equal(fullScenario('5').label,'上位安定','four complete upper ranks may be called stable');

assert(src.includes('m4Quick(r.no)'),'summary cards must show M4 as well as M3');
assert(src.includes('m4Panel(rows,choice)'),'all rivals must remain visible, even low-M3 horses');
assert(src.includes("productionChanged:false"),'this component must stay display-only');
console.log('PASS M3/M4 opponent display: independent input, 4-scenario stability, uplift, missing data, manual scenario and no axis promotion');
