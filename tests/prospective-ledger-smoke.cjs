const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=prospective-r71';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  assert.strictEqual(await page.evaluate(()=>window.RSA_BUILD),'20261012r71',`${name}: build mismatch`);
  assert.strictEqual(await page.locator('#prospectiveLedger').count(),1,`${name}: ledger root missing`);
  await page.evaluate(()=>localStorage.removeItem('rsa_prospective_ledger_v1'));
  await page.fill('#raceDate','2027-01-10');
  await page.selectOption('#venue','東京');
  await page.fill('#raceName','Prospective Smoke');
  await page.fill('#fieldSize','3');
  await page.selectOption('#surface','芝');
  await page.fill('#distance','2000');
  await page.selectOption('#grade','G3');
  await page.fill('#oddsPaste','1 5.0\n2 3.0\n3 10.0');
  await page.evaluate(()=>{
    const base=[
      {no:'1',name:'Horse1',abilityRank:1,top3:.55,index:62,elo:1700,eloMatched:4,eloTotal:4,historyStatus:'十分'},
      {no:'2',name:'Horse2',abilityRank:2,top3:.35,index:55,elo:1600,eloMatched:3,eloTotal:4,historyStatus:'十分'},
      {no:'3',name:'Horse3',abilityRank:3,top3:.20,index:48,elo:1500,eloMatched:1,eloTotal:2,historyStatus:'少なめ'}
    ];
    window.M3PureAbilityState={ready:true,version:'ability_model_v1',rows:base.map(x=>({...x}))};
    window.M3PureAbilityV2State={ready:true,version:'ability_v2_elo_candidate_runtime_v1',status:'candidate_parallel_not_replacement',rows:base.map(x=>({...x,v1Rank:x.abilityRank,abilityRank:x.abilityRank,top3:x.top3}))};
    window.FourAxisIntegrationState={p:[.1,.2,.4,.3]};
    window.Finish600State={ready:true,version:'smoke',rows:[
      {no:'1',name:'Horse1',finishRank:1,sc:[{rank:1},{rank:1},{rank:2},{rank:2}]},
      {no:'2',name:'Horse2',finishRank:2,sc:[{rank:2},{rank:3},{rank:3},{rank:4}]},
      {no:'3',name:'Horse3',finishRank:3,sc:[{rank:4},{rank:2},{rank:1},{rank:1}]}
    ]};
    window.M3NarrativeRoleSyncState={ready:true,axisNo:'1',upliftNo:'3',cautionNo:'2'};
    window.RaceIndependentLayerState={ready:true,ground:{label:'強い'},structure:{label:'中立'},market:{label:'概ね一致'},dataConfidence:{grade:'A'}};
    dispatchEvent(new CustomEvent('m3-pure-ability-v2-ready'));
  });
  await page.waitForFunction(()=>window.ProspectiveLedgerState?.ready===true&&document.querySelector('#plFreeze')&&!document.querySelector('#plFreeze').disabled,null,{timeout:5000});
  await page.selectOption('#plBetType','単勝');
  await page.fill('#plSelection','1');
  await page.fill('#plStake','1000');
  await page.fill('#plOdds','5.0');
  await page.fill('#plHitP','25');
  await page.click('#plAddBet');
  await page.waitForFunction(()=>document.querySelectorAll('#plDraftList .plDraftRow').length===1,null,{timeout:3000});
  await page.click('#plFreeze');
  let rec=await page.evaluate(()=>JSON.parse(localStorage.getItem('rsa_prospective_ledger_v1')||'[]')[0]);
  assert(rec,`${name}: snapshot not stored`);
  assert.strictEqual(rec.status,'frozen');
  assert.strictEqual(rec.build,'20261012r71');
  assert.strictEqual(rec.holdout2027,true,`${name}: 2027 holdout flag missing`);
  assert.strictEqual(rec.prospectiveEligible,true,`${name}: prospective flag missing`);
  assert.strictEqual(rec.horses.length,3);
  assert.strictEqual(rec.roles.axisNo,'1');
  assert.strictEqual(rec.bets.length,1);
  assert(Math.abs(rec.bets[0].ev-1.25)<1e-9,`${name}: EV wrong`);
  assert(Math.abs(rec.bets[0].breakEvenP-.2)<1e-9,`${name}: break-even wrong`);
  await page.click('#plFreeze');
  assert.strictEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('rsa_prospective_ledger_v1')||'[]').length),1,`${name}: duplicate snapshot allowed`);
  await page.waitForTimeout(150);
  await page.fill('[data-pl-place="1"]','1');
  await page.fill('[data-pl-place="2"]','2');
  await page.fill('[data-pl-place="3"]','3');
  await page.fill('[data-pl-return="b1"]','5000');
  await page.click('[data-pl-settle]');
  rec=await page.evaluate(()=>JSON.parse(localStorage.getItem('rsa_prospective_ledger_v1')||'[]')[0]);
  assert.strictEqual(rec.status,'settled');
  assert.deepStrictEqual(rec.outcome.top3,['1','2','3']);
  assert.strictEqual(rec.outcome.betReturns.b1,5000);
  const st=await page.evaluate(()=>window.ProspectiveLedgerState);
  assert.strictEqual(st.holdout2027,1);
  assert.strictEqual(st.settled,1);
  assert(Math.abs(st.roi-5)<1e-9,`${name}: ROI wrong ${st.roi}`);
  await page.reload({waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&window.ProspectiveLedgerState?.ready===true,null,{timeout:25000});
  assert.strictEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('rsa_prospective_ledger_v1')||'[]').length),1,`${name}: persistence failed`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'prospective ledger freeze -> settle -> ROI -> reload');
  await browser.close();
}
(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});