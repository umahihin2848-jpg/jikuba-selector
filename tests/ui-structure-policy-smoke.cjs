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
  await page.waitForSelector('#iosMobileShellV2',{timeout:10000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const s=await page.evaluate(()=>({
    shellFlag:Boolean(window.__IOS_MOBILE_SHELL_V2),
    bodyClass:document.body.className,
    tabs:[...document.querySelectorAll('#iosMobileShellV2 [data-ims-tab]')].map(x=>({key:x.dataset.imsTab,hidden:x.hidden})),
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
  assert.strictEqual(s.tabs.length,3,'expected three mobile tabs');
  assert.strictEqual(s.tabs[0].key,'ticket','first mobile tab must be ticket');
  assert.strictEqual(s.tabs[0].hidden,false,'ticket tab must be visible');
  assert.strictEqual(s.mobileLean,true,'iPhone must use lean runtime');
  assert.strictEqual(s.addonMobileLean,true,'addon runtime must report mobileLean');
  assert.deepStrictEqual(s.failures,[],'mobile addon load failures');
  assert.strictEqual(s.marketAbilityLoaded,true,'current Market × Ability Shadow not loaded');
  assert.strictEqual(s.prospectiveLoaded,false,'desktop prospective ledger must not load in mobile lean');
  assert.strictEqual(s.prospectivePolicy,false,'desktop ProspectiveLedgerPolicy must not be required on mobile lean');
  assert.deepStrictEqual(errors,[],`page errors: ${errors.join(' | ')}`);
  console.log('PASS WebKit iPhone mobile lean shell + current Shadow wiring');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
