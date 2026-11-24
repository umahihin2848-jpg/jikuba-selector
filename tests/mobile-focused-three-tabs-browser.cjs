const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
  await page.goto('http://127.0.0.1:4173/waku-bc-converter/v3.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#rsaFocusedView',{state:'attached',timeout:30000});
  await page.waitForFunction(()=>document.body.classList.contains('rsaFocusedThreeTabs')&&Boolean(document.querySelector('#rsafAxis .rsaf-alert, #rsafAxis .rsaf-decision')),{timeout:30000});
  const labels=await page.locator('#rsafTabs [role=tab]').allTextContents();
  assert.deepEqual(labels.map(x=>x.trim()),['軸馬','相手馬','展開隊列','最終判断']);
  // Diagnose any inherited race-gate or startup visibility restrictions.
  await page.waitForTimeout(4200);
  const diagnostic=await page.evaluate(()=>{
   const result=[];let el=document.querySelector('#rsafAxis');
   while(el&&result.length<9){const st=getComputedStyle(el),r=el.getBoundingClientRect();result.push({tag:el.tagName,id:el.id,cls:el.className,display:st.display,visibility:st.visibility,opacity:st.opacity,w:r.width,h:r.height,hidden:el.hidden});el=el.parentElement;}
   return {elements:result,htmlClass:document.documentElement.className,htmlRaceGate:document.documentElement.dataset.raceGate,coreAnalyzed:document.documentElement.dataset.rsaCoreAnalyzed,bodyClass:document.body.className,axisText:document.querySelector('#rsafAxis')?.textContent?.slice(0,120)};
  });
  console.log('RS-AFOCUS-DIAG',JSON.stringify(diagnostic));
  await page.locator('#rsafAxis').waitFor({state:'visible',timeout:14000});
  assert.equal(await page.locator('#rsafPartners').isVisible(),false);
  assert.equal(await page.locator('#av3ResearchPanel').isVisible(),false);
  assert.equal(await page.locator('#iosMobileShellV2').isVisible(),false);
  await page.locator('[data-rsaf-tab="partners"]').click();
  assert.equal(await page.locator('#rsafPartners').isVisible(),true);
  assert.equal(await page.locator('#rsafAxis').isVisible(),false);
  assert.equal(await page.locator('#rsafPartners .rsaf-horse').count(),0); // no fake picks without odds
  await page.locator('[data-rsaf-tab="formation"]').click();
  assert.equal(await page.locator('#rsafFormation').isVisible(),true);
  assert.equal(await page.locator('#rsafPartners').isVisible(),false);
  await page.locator('[data-rsaf-tab="decision"]').click();
  assert.equal(await page.locator('#rsafDecision').isVisible(),true);
  assert.equal(await page.locator('#rsafFormation').isVisible(),false);
  assert.equal(await page.locator('#rsaForecastWorkflowV1').isVisible(),true);
  assert.equal(await page.locator('#rsaForecastWorkflowV1').evaluate(el=>el.parentElement.id),'rsafDecision');
  await page.locator('#rfwWhyAxis').fill('4タブの切替でもメモを保持');
  await page.locator('#rfwPaceNote').fill('隊列のメモも保持');
  await page.locator('[data-rsaf-tab="axis"]').click();
  assert.equal(await page.locator('#rsafDecision').isVisible(),false);
  await page.locator('[data-rsaf-tab="decision"]').click();
  assert.equal(await page.locator('#rfwWhyAxis').inputValue(),'4タブの切替でもメモを保持');
  assert.equal(await page.locator('#rfwPaceNote').inputValue(),'隊列のメモも保持');
  assert.equal(await page.locator('#rsafDecision #rfwCornerAuditV1').count(),1,'result form stays in final tab');
  // Synthetic no-axis fixture: test UI visibility only, not model accuracy.
  await page.evaluate(()=>{
   const rows=Array.from({length:16},(_,i)=>({no:String(i+1),name:'検証馬'+(i+1),finishRank:i+1}));
   window.Finish600State={ready:true,rows};
   window.M3PureAbilityState={ready:true,activeModel:'C',rows:rows.map(h=>({no:h.no,name:h.name,abilityRank:h.finishRank}))};
   window.DecisionShellV2State={ready:true,at:Date.now(),structure:{code:'no_auto_axis',level:'neutral',reason:'軸馬が成立しない検証ケース',axis:null,candidates:[]},final:{code:'no_auto_axis',level:'neutral'},market:{complete:false}};
   window.AxisAccessGateV1State={status:'skip',reason:'軸馬が成立しない検証ケース'};
   window.RSAAnalysisTransitionState={status:'ready'};
   window.RSAFocusedThreeTabsV1.dirty=false;
   window.dispatchEvent(new CustomEvent('decision-shell-v2-ready'));
  });
  await page.locator('#rsafSkipScreen').waitFor({state:'visible',timeout:12000});
  assert.match(await page.locator('#rsafSkipScreen').innerText(),/見送り/);
  assert.match(await page.locator('#rsafSkipScreen').innerText(),/軸馬が成立しない/);
  assert.equal(await page.locator('#rsafTabs').isVisible(),false,'tabs hidden when no axis');
  assert.equal(await page.locator('#rsafAxis').isVisible(),false,'axis analysis hidden');
  assert.equal(await page.locator('#rsafPartners').isVisible(),false,'partner analysis hidden');
  assert.equal(await page.locator('#rsafFormation').isVisible(),false,'formation hidden');
  assert.equal(await page.locator('#rsafDecision').isVisible(),false,'final purchase decision hidden');
  assert.equal(await page.locator('#rsaFocusedView').isVisible(),true,'skip message must remain visible');
  assert.equal(await page.evaluate(()=>window.RSAFocusedThreeTabsState.skipOnly),true,'published state is skip-only');
  // An edited race must not inherit the previous no-axis verdict.
  await page.locator('#raceName').fill('別のレース');
  await page.locator('#rsafTabs').waitFor({state:'visible',timeout:12000});
  assert.equal(await page.locator('#rsafSkipScreen').isVisible(),false,'changing race hides previous skip verdict');
  console.log('P3 no-axis skip-only screen and recovery PASS');
  console.log('P3-45 four-tab iPhone smoke PASS',labels);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
