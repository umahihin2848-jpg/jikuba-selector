// Focused release gate for grade-only Ability C; real historical rows, hypothetical replay.
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const base=process.env.RSA_APP_URL||'http://127.0.0.1:8080/waku-bc-converter/v3.html';
const lines=[
['セイウンハーデス',1,57,.4,4,3,3,'1.45.5',0,33.5,57.5,'先行'],
['ホウオウビスケッツ',2,57,0,1,1,1,'1.45.5',0,33.9,55.6,'逃げ'],
['レディネス',3,57,.6,7,5,5,'1.45.7',.2,33.5,57.8,'差し'],
['レイニング',4,57,1.3,13,12,13,'1.45.8',.3,32.9,60.8,'追込'],
['ライヒスアドラー',5,55,1.1,11,11,9,'1.45.9',.4,33.2,59.5,'中団'],
['サトノシャイニング',6,57,.7,10,6,6,'1.45.9',.4,33.6,57.6,'中団'],
['リアライズシリウス',7,55,.2,2,2,2,'1.45.9',.4,34.1,55.3,'先行'],
['ダノンエアズロック',8,57,.4,4,3,3,'1.46.0',.5,34,55.9,'先行'],
['エルトンバローズ',9,57,1.2,11,12,13,'1.46.1',.6,33.3,59.3,'後方'],
['レガーロデルシエロ',10,57,1.5,15,15,15,'1.46.1',.6,33,60.8,'後方'],
['ドラゴンブースト',11,57,.8,7,8,7,'1.46.1',.6,33.7,57.4,'中団'],
['クルゼイロドスル',12,57,1.5,17,17,15,'1.46.1',.6,33,60.8,'後方'],
['シャンパンカラー',13,58,1.1,6,9,9,'1.46.2',.7,33.5,58.5,'中団'],
['ロングラン',14,57,1.1,14,12,9,'1.46.3',.8,33.6,58.2,'中団'],
['ビーアストニッシド',15,57,1.5,15,15,15,'1.46.6',1.1,33.5,59.1,'後方'],
['ランスオブカオス',16,57,.8,3,6,7,'1.46.6',1.1,34.2,55.8,'中団'],
['アドマイヤクワッズ',17,55,1,7,9,9,'1.46.6',1.1,34,56.8,'中団']];
const headers=['何走目','何走前','日付','開催','場所','R','レース名','クラス名','頭数','出走頭数','馬番','着順','確定着順','斤量','芝・ダート','距離','馬場状態','タイムS','着差','通過1','通過2','通過3','通過4','決手','脚質','Ave-3F','上り3F','上3F地点差','PCI','レースPCI','レースID(新・馬番無16桁)','異常コード','馬名'];
const data=lines.map(([name,fin,kg,gap,c2,c3,c4,t,margin,l3,pci,style])=>[1,1,'2026.10. 4','4東2','東京',11,'毎日王冠G2','Ｇ２',17,17,fin,fin,fin,kg,'芝',1800,'良',t,margin,'',c2,c3,c4,style,style,36,l3,gap,pci,55.6,'2026100405040211',0,name]);
function csv(missing=false){const select=(r)=>r.filter((_,i)=>!missing||i!==13);return [headers,...data].map(r=>select(r).join(',')).join('\r\n');}
async function go(browserType,engine){
 const browser=await browserType.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],failures=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.js(?:\?|$)|\.json(?:\?|$)/.test(r.url()))failures.push(r.status()+' '+r.url());});
 try{
  await page.goto(base+'?abilityCReleaseTest=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready&&!document.getElementById('analyzeBtn')?.disabled,null,{timeout:45000});
  assert.deepEqual(await page.evaluate(()=>window.RSAAddonHealth.failures),[]);
  const set=async(id,value)=>page.evaluate(([id,v])=>{const el=document.getElementById(id);el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},[id,value]);
  const odds=Array.from({length:17},(_,i)=> (i+1)+' '+(2+i*1.5)).join('\n');
  const fields={raceDate:'2026-11-12',venue:'東京',raceName:'Ability C 仮想再戦',fieldSize:17,surface:'芝',distance:1800,grade:'G2',going:'良',oddsPaste:odds};
  for(const [id,v] of Object.entries(fields))await set(id,v);
  const upload=async(missing=false)=>page.locator('#csvFile').setInputFiles({name:missing?'missing-kg.csv':'historical-replay.csv',mimeType:'text/csv',buffer:Buffer.from(csv(missing))});
  const run=async()=>{
   const prev=await page.evaluate(()=>Number(window.MobileAnalysisCoreState?.generation)||0);
   await page.evaluate(()=>document.getElementById('analyzeBtn').click());
   await page.waitForFunction(p=>window.RSAAnalysisTransitionState?.status==='error'||(window.RSAAnalysisTransitionState?.status==='ready'&&Number(window.MobileAnalysisCoreState?.generation)>p),prev,{timeout:30000});
   const state=await page.evaluate(()=>({status:window.RSAAnalysisTransitionState,ability:window.M3PureAbilityState,finish:window.Finish600State?.rows,decision:window.DecisionShellV2State,gate:window.RaceSkipLockV1State}));
   assert.equal(state.status.status,'ready',JSON.stringify(state.status));
   assert.equal(state.ability.rows.length,17);assert.equal(state.finish.length,17);
   assert.ok(state.ability.rows.every(r=>Number.isFinite(r.logit)&&Number.isFinite(r.top3)&&Number.isFinite(r.abilityRank)));
   assert.ok(Math.abs(state.ability.rows.reduce((s,r)=>s+r.top3,0)-3)<1e-8);
   assert.equal(new Set(state.ability.rows.map(r=>r.abilityRank)).size,17);
   await page.waitForFunction(()=>window.DecisionShellV2State?.ready&&window.DecisionShellV2State.market?.complete,null,{timeout:10000});
   return {...state,decision:await page.evaluate(()=>window.DecisionShellV2State)};
  };
  await upload();const c=await run();
  assert.equal(c.ability.activeModel,'C',JSON.stringify(c.ability.abilityC));
  assert.equal(c.ability.abilityC.coverage,17);
  assert.equal(c.ability.abilityC.eloMatched,17);
  assert.ok(c.ability.rows.every(r=>r.contextPairN===16));
  const ranks=c.ability.rows.map(r=>[r.no,r.abilityRank]),m3=c.finish.map(r=>[r.no,r.finishRank]);
  const overlaps=c.finish.filter(f=>f.finishRank<=3&&c.ability.byNo[f.no].abilityRank<=3).map(f=>String(f.no)).sort();
  if(!c.ability.leaderAmbiguous&&!c.ability.top3BoundaryAmbiguous)assert.deepEqual((c.decision.structure.candidates||[]).map(r=>r.no).sort(),overlaps);
  assert.equal(c.decision.manualCombination,true);assert.equal(c.decision.manualStake,true);
  for(const grade of ['OP','L','3勝']){
   await set('grade',grade);const v=await run();assert.equal(v.ability.activeModel,'v1');assert.ok(v.ability.rows.every(r=>r.abilityRank===r.v1Rank));
   assert.deepEqual(v.finish.map(r=>[r.no,r.finishRank]),m3,'M3 unchanged');
  }
  for(const grade of ['G1','G3']){
   await set('grade',grade);const v=await run();assert.equal(v.ability.activeModel,'C');assert.deepEqual(v.ability.rows.map(r=>[r.no,r.abilityRank]),ranks);
  }
  await upload(true);const fallback=await run();assert.equal(fallback.ability.activeModel,'v1');assert.match(fallback.ability.abilityC.reason,/kg/);
  await upload();await set('raceDate','2026-10-04');const same=await run();assert.equal(same.ability.activeModel,'v1');assert.ok(same.ability.rows.every(r=>r.histN===0));assert.equal(same.ability.leaderAmbiguous,true);
  assert.equal(same.decision.structure.code,'ability_rank_tie');
  assert.deepEqual(errors,[],'page errors');assert.deepEqual(failures,[],'resource failures');
  console.log(engine+' PASS: C/G1-G3, v1/OP-L-3勝, M3 invariant, market, fallback, same-day/tie, no page/resource errors');
 }finally{await browser.close();}
}
await go(chromium,'Chromium');await go(webkit,'WebKit');
