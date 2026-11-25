const {webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=mobile-lean-structure';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
(async()=>{
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('#axis8Primary',{state:'visible',timeout:15000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const s=await page.evaluate(()=>({
    shellFlag:Boolean(window.__IOS_MOBILE_SHELL_V2),
    bodyClass:document.body.className,
    tabs:[...document.querySelectorAll('#rsafTabs [role=tab]')].map(x=>({key:x.dataset.rsafTab,selected:x.getAttribute('aria-selected'),label:x.textContent.trim()})),
    originalShellHidden:getComputedStyle(document.querySelector('#iosMobileShellV2')).display==='none',
    mobileLean:Boolean(window.RSAMobileLean),
    addonMobileLean:Boolean(window.RSAAddonHealth?.mobileLean),
    loaded:window.RSAAddonHealth?.loaded||[],
    failures:window.RSAAddonHealth?.failures||[],
    prospectiveLoaded:(window.RSAAddonHealth?.loaded||[]).some(x=>x.includes('prospective-ledger-v2.js')),
    prospectivePolicy:Boolean(window.ProspectiveLedgerPolicy),
    marketAbilityLoaded:(window.RSAAddonHealth?.loaded||[]).some(x=>x.includes('market-ability-opponent-shadow-v1.js'))
  }));
  assert.strictEqual(s.shellFlag,true,'mobile shell flag missing');
  assert(/iosMobileShellV2/.test(s.bodyClass),'mobile shell body class missing');
  assert.deepStrictEqual(s.tabs.map(x=>x.key),['axis','partners','formation','decision'],'expected four focused tabs');
  assert.deepStrictEqual(s.tabs.map(x=>x.label),['軸馬','相手馬','展開隊列','最終判断']);
  assert.strictEqual(await page.locator('#rsaFocusedView').isVisible(),false,'legacy focused view is hidden');
  assert.strictEqual(s.originalShellHidden,true,'old mobile shell should be hidden by new focused view');
  assert.strictEqual(await page.locator('#axis8Result').isVisible(),true,'new verdict visible');
  assert.strictEqual(await page.locator('#axis8Controls').isVisible(),false,'no unconfirmed predictions');
  await page.locator('#axis8Ledger > summary').click();
  assert.strictEqual(await page.locator('#a8LedgerFreeze').isDisabled(),true,'cannot save incomplete prediction');
  assert.strictEqual(await page.locator('#a8LedgerExport').isVisible(),true,'ledger visible');
  await page.evaluate(()=>{for(let i=0;i<100;i++)window.dispatchEvent(new CustomEvent('validated-queue-ready'))});
  await page.waitForFunction(()=>window.RSAAxis8SnapshotV1?.diagnostics().pendingTimer===false);
  assert.strictEqual(await page.locator('#axis8Primary').isVisible(),true,'new panel remains visible after burst');
  assert.strictEqual(s.mobileLean,true,'iPhone must use lean runtime');
  assert.strictEqual(s.addonMobileLean,true,'addon runtime must report mobileLean');
  assert.deepStrictEqual(s.failures,[],'mobile addon load failures');
  assert.strictEqual(s.marketAbilityLoaded,true,'current Market × Ability Shadow not loaded');
  assert.strictEqual(s.prospectiveLoaded,false,'desktop prospective ledger must not load in mobile lean');
  assert.strictEqual(s.prospectivePolicy,false,'desktop ProspectiveLedgerPolicy must not be required on mobile lean');
  assert.deepStrictEqual(errors,[],`page errors: ${errors.join(' | ')}`);
  console.log('PASS WebKit iPhone axis8 view, ledger, event burst + mobile lean runtime and Shadow wiring');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
