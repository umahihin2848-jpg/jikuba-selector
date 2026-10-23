const {webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=structure-policy-r86';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#iosMobileShellV2',{timeout:10000});
  const mobile=await page.evaluate(()=>({
    innerWidth:window.innerWidth,
    ua:navigator.userAgent,
    touch:navigator.maxTouchPoints,
    shellFlag:Boolean(window.__IOS_MOBILE_SHELL_V2),
    shellState:window.IOSMobileShellV2State||null,
    shell:Boolean(document.getElementById('iosMobileShellV2')),
    bodyClass:document.body.className,
    tabs:[...document.querySelectorAll('#iosMobileShellV2 [data-ims-tab]')].map(x=>({key:x.dataset.imsTab,text:x.textContent,hidden:x.hidden,selected:x.getAttribute('aria-selected')})),
    script:[...document.scripts].map(s=>s.src).find(x=>x.includes('ios-mobile-shell-v2.js'))||''
  }));
  console.log('MOBILE_DEBUG',name,JSON.stringify(mobile));
  console.log('PAGE_ERRORS',JSON.stringify(errors));
  assert.strictEqual(mobile.shellFlag,true,`${name}: mobile shell flag not set`);
  assert.strictEqual(mobile.shell,true,`${name}: #iosMobileShellV2 missing`);
  assert.strictEqual(mobile.tabs.length,3,`${name}: expected three mobile tabs`);
  assert(/iosMobileShellV2/.test(mobile.bodyClass),`${name}: mobile shell body class missing`);
  assert.strictEqual(mobile.tabs[0].key,'ticket',`${name}: first tab is not ticket`);
  assert.strictEqual(mobile.tabs[0].hidden,false,`${name}: ticket tab hidden`);
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&window.ProspectiveLedgerPolicy?.version==='prospective-ledger-policy-v2',null,{timeout:25000});
  const base=await page.evaluate(()=>{
    const result=document.getElementById('result'),children=result?[...result.children]:[],reliability=document.getElementById('reliabilitySection'),market=document.getElementById('marketSection');
    const reliabilityIndex=children.indexOf(reliability),marketIndex=children.indexOf(market);
    return{
      types:[...document.querySelectorAll('#plBetType option')].map(x=>x.textContent),
      native:window.ProspectiveLedgerTicketTypesState?.version,
      oldAddonLoaded:(window.RSAAddonHealth?.loaded||[]).some(x=>x.includes('prospective-ledger-ticket-types-v1.js')),
      boundary:['2026-12-31','2027-01-01','2027-12-31','2028-01-01'].map(d=>window.ProspectiveLedgerPolicy.isHoldout2027Date(d)),
      reliabilityIndex,marketIndex,marketAfterReliability:reliabilityIndex>=0&&marketIndex>reliabilityIndex,
      marketTitle:document.querySelector('#marketSection h2')?.textContent||''
    }
  });
  assert.deepStrictEqual(base.types,['単勝','複勝','馬連','馬単','ワイド'],`${name}: native five ticket types`);
  assert.strictEqual(base.native,'prospective-ledger-v2-native-ticket-types',`${name}: ticket types not integrated into ledger core`);
  assert.strictEqual(base.oldAddonLoaded,false,`${name}: legacy ticket addon still loaded`);
  assert.deepStrictEqual(base.boundary,[false,true,true,false],`${name}: 2027 holdout boundary wrong`);
  assert.strictEqual(base.marketAfterReliability,true,`${name}: market is not after reliability (${base.reliabilityIndex} -> ${base.marketIndex})`);
  assert(/最後に照合/.test(base.marketTitle),`${name}: market-last label missing; actual=${JSON.stringify(base.marketTitle)}`);
  await page.evaluate(()=>{
    window.RSAAnalysisTransitionState={generation:91,status:'ready'};
    window.FourAxisIntegrationState={p:[.1,.2,.5,.2]};
    window.M3PureAbilityState={ready:true,rows:[
      {no:'1',name:'A',abilityRank:1,index:62,top3:.44,historyStatus:'十分'},
      {no:'2',name:'B',abilityRank:2,index:56,top3:.34,historyStatus:'十分'},
      {no:'3',name:'C',abilityRank:3,index:52,top3:.29,historyStatus:'十分'}
    ]};
    window.M3PureAbilityV2State={ready:true,generation:91,rows:[
      {no:'1',name:'A',v2Rank:1},{no:'2',name:'B',v2Rank:2},{no:'3',name:'C',v2Rank:3},{no:'4',name:'D',v2Rank:4}
    ]};
    window.Finish600State={ready:true,rows:[
      {no:'1',name:'A',finishRank:1,sc:[{rank:1},{rank:1},{rank:1},{rank:2}]},
      {no:'2',name:'B',finishRank:2,sc:[{rank:2},{rank:2},{rank:2},{rank:3}]},
      {no:'3',name:'C',finishRank:3,sc:[{rank:3},{rank:3},{rank:3},{rank:3}]},
      {no:'4',name:'D',finishRank:4,sc:[{rank:4},{rank:4},{rank:4},{rank:4}]}
    ]};
    window.RPCIFitBetaState={ready:true,expectedRPCI:51.2,rows:[]};
    window.StructuralTicketEngineV3State={ready:true,route:'single_ability1',reason:'単独Ability1軸',structuralCount:1,axis:{no:'1',name:'A',abilityRank:1,m3Rank:1},candidates:[{no:'1',name:'A',abilityRank:1,m3Rank:1}]};
    window.RaceOverallSummaryState={ready:true,generation:91,version:'test'};
    dispatchEvent(new CustomEvent('m3-pure-ability-ready'));
    dispatchEvent(new CustomEvent('finish600-ready'));
    dispatchEvent(new CustomEvent('four-axis-integration-ready'));
    dispatchEvent(new CustomEvent('rpci-fit-beta-ready'));
    dispatchEvent(new CustomEvent('structural-ticket-engine-v3-ready',{detail:window.StructuralTicketEngineV3State}));
    dispatchEvent(new CustomEvent('race-overall-summary-ready'));
  });
  await page.waitForFunction(()=>document.querySelector('#imsAxisSummary')?.textContent.includes('1番 A')&&document.querySelector('#imsPaceSummary')?.textContent.includes('標準 50%')&&document.querySelector('#imsPaceSummary')?.textContent.includes('51.2'),null,{timeout:8000});
  const compact=await page.evaluate(()=>({
    axis:document.querySelector('#imsAxisSummary')?.textContent||'',
    pace:document.querySelector('#imsPaceSummary')?.textContent||'',
    axisClosed:document.querySelector('#imsAxisDetails')?.open===false,
    paceClosed:document.querySelector('#imsPaceDetails')?.open===false
  }));
  assert(/単独軸型/.test(compact.axis),`${name}: compact axis route missing`);
  assert(/Ability #1/.test(compact.axis),`${name}: compact Ability #1 missing`);
  assert(/M3 #1/.test(compact.axis),`${name}: compact structural M3 rank missing`);
  assert(/想定RPCI/.test(compact.pace),`${name}: compact RPCI label missing`);
  assert(/M3 #1/.test(compact.pace),`${name}: compact M3 top missing`);
  assert.strictEqual(compact.axisClosed,true,`${name}: axis details should start closed`);
  assert.strictEqual(compact.paceClosed,true,`${name}: pace details should start closed`);
  await page.waitForFunction(()=>window.RaceOverallSummaryState?.anchorPolicy==='ability-v2-m3-axis-v1'&&window.MarketIndependentCenterState?.generation===91,null,{timeout:12000});
  const cls=await page.evaluate(()=>window.RaceOverallSummaryState.classification);
  assert.strictEqual(cls,'構造一致・安定',`${name}: structural classification wrong: ${cls}`);
  assert(!/買い検討型|見送り寄り/.test(cls),`${name}: betting-style classification remains`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,'mobile shell + compact axis/pace + market-last + structural labels + native 5 tickets + bounded 2027 holdout');
  await browser.close();
}
run(webkit,'WebKit iPhone').catch(e=>{console.error(e);process.exit(1)});
