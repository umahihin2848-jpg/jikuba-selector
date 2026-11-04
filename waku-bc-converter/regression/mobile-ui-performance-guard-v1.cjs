// Regression guard: presentation-only changes must not cause rerender storms.
// No historical model inference or betting ROI conclusions are made by these tests.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p=require('node:path');
const root=p.resolve(__dirname,'..');
const read=name=>fs.readFileSync(p.join(root,name),'utf8');
const shell=read('ios-mobile-shell-v3.js');
const product=read('mobile-product-ui-v1.js');
const fix=read('mobile-product-ui-fix-v1.js');
const html=read('v3.html');
const extract=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Cannot find script section: '+a);return s.slice(i,j)};

// 1. Every script that names the three old tabs must agree.
// The fourth race-progress tab is not renamed here.
for(const name of ['軸馬','相手分析','全馬比較']){
 assert.ok(product.includes(name),'product UI missing label '+name);
 assert.ok(fix.includes(name),'stability UI missing label '+name);
}
assert.ok(product.includes("const map={ticket:'軸馬',axis:'相手分析',pace:'全馬比較'}"));
assert.ok(fix.includes("const m={ticket:'軸馬',axis:'相手分析',pace:'全馬比較'}"));

// 2. Missing panels must not start an endless self-scheduling render loop.
// Simulate 500 unsuccessful render attempts: at most 25 reschedules.
const renderSource=extract(product,'function render(){',"document.addEventListener('click',");
let retryTimers=0;
const render=new Function('css','buildSetup','renameShell','ensurePanels','$','schedule',
 'let missingPanelsRetries=0;'+renderSource+'return render;')(
 ()=>{},()=>{},()=>{},()=>{},()=>null,()=>{retryTimers++}
);
for(let i=0;i<500;i++)render();
assert.equal(retryTimers,25,'missing DOM must have a finite retry budget');

// 3. Under a burst of completed events, shell should enqueue only one frame.
// The latest state is consumed by renderAll when that frame actually runs.
const scheduleSource=extract(shell,'function schedule(ms=0){','function closestCard(');
const timeouts=new Map(),frames=new Map();let id=0,rendered=0;
const schedule=new Function('clearTimeout','setTimeout','requestAnimationFrame','renderAll',
 'let timer=0,frame=0;'+scheduleSource+'return schedule;')(
 k=>timeouts.delete(k),
 fn=>{const k=++id;timeouts.set(k,fn);return k},
 fn=>{const k=++id;frames.set(k,fn);return k},
 ()=>{rendered++}
);
function fireTimeouts(){for(const [k,fn] of [...timeouts]){timeouts.delete(k);fn()}}
function fireFrames(){for(const [k,fn] of [...frames]){frames.delete(k);fn()}}
for(let i=0;i<100;i++)schedule(0);
assert.equal(timeouts.size,1,'debounce to one active timer');
fireTimeouts();
assert.equal(frames.size,1);
for(let i=0;i<100;i++)schedule(0);
fireTimeouts();
assert.equal(frames.size,1,'pending frame must not be duplicated');
fireFrames();
assert.equal(rendered,1);
schedule(0);fireTimeouts();fireFrames();
assert.equal(rendered,2,'subsequent user actions must continue to update');

// 4. Keep all four tabs and model-independent research UI wired.
assert.ok(html.includes('ios-mobile-shell-v3.js'));
assert.ok(html.includes('mobile-product-ui-v1.js'));
assert.ok(html.includes('mobile-race-progress-v1.js'));
assert.ok(html.includes('mobile-prediction-ledger-v1.js'));
assert.ok(shell.includes("['ticket','axis','pace','flow']"));
assert.ok(!product.includes("吟味"));
console.log('PASS mobile UI lightweight regression: labels, finite retries, single-frame render, four tabs');
