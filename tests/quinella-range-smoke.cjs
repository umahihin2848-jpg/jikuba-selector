const { chromium, webkit } = require('playwright');

function assert(c,m){ if(!c) throw new Error(m); }
const LOCAL='http://127.0.0.1:4173/quinella-range/';
const LIVE='https://umahihin2848-jpg.github.io/jikuba-selector/quinella-range/';
const SAMPLE='1=3.3 2=4.1 3=5.2 4=6.4 5=8.1 6=9.7 7=12.5 8=15.8 9=19.4 10=23.7 11=29.9 12=31.7 13=45.5 14=50.5 15=55.7 16=69.5 17=112.3 18=116.0';

async function installMock(context){
  await context.route('**/rest/v1/race_assessments**', async route=>{
    const req=route.request();
    if(req.method()==='GET') return route.fulfill({status:200,contentType:'application/json',body:'[]'});
    return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  });
}

async function runLocal(browserType,label){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  await installMock(context);
  const page=await context.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await page.goto(LOCAL,{waitUntil:'networkidle'});

  assert((await page.title())==='レース戦略 v2.56',label+' title');
  const helpers=await page.evaluate(()=>({
    g1First:typeof g1FirstPlaceOverride,
    g1Second:typeof g1SecondPlaceOverride,
    spread:typeof firstRangeSpreadAnalysis,
    filter:typeof v229FilterAnalysis,
    selection:typeof selectionDecisionV230,
    wideBoundary:typeof wideOpponentBoundaryAnalysis,
    rangeShare:typeof rangeSharePolicy
  }));
  for(const [k,v] of Object.entries(helpers)) assert(v==='function',label+' helper missing '+k+': '+v);

  const calc=await page.evaluate(s=>{
    const x=compute(s,'G2','older',2400);
    return {
      n:x.n,
      first:x.firstRange?.label,
      second:x.secondPlaceRange?.label,
      filter:x.v229Filter?.mode,
      selection:x.selectionDecision?.status
    };
  },SAMPLE);
  assert(calc.n===18,label+' compute runner count');
  assert(calc.first&&calc.second,label+' compute ranges');
  const sharePolicy=await page.evaluate(()=>({
    first6:rangeSharePolicy(Array.from({length:18}),{end:6},'first').band,
    first8:rangeSharePolicy(Array.from({length:18}),{end:8},'first').band,
    first9:rangeSharePolicy(Array.from({length:18}),{end:9},'first').band,
    first10:rangeSharePolicy(Array.from({length:18}),{end:10},'first').band,
    second8:rangeSharePolicy(Array.from({length:18}),{end:8},'second').band,
    second10:rangeSharePolicy(Array.from({length:18}),{end:10},'second').band,
    second11:rangeSharePolicy(Array.from({length:18}),{end:11},'second').band,
    second12:rangeSharePolicy(Array.from({length:18}),{end:12},'second').band
  }));
  assert(sharePolicy.first6==='strong'&&sharePolicy.first8==='good'&&sharePolicy.first9==='caution'&&sharePolicy.first10==='skip',label+' first range share bands '+JSON.stringify(sharePolicy));
  assert(sharePolicy.second8==='good'&&sharePolicy.second10==='caution'&&sharePolicy.second11==='caution'&&sharePolicy.second12==='skip',label+' quinella range share bands '+JSON.stringify(sharePolicy));
  assert(!errs.length,label+' page errors: '+errs.join(' | '));

  await context.close();await browser.close();
  console.log('PASS '+label+' quinella-range critical helpers and compute');
}

async function runLive(){
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const page=await context.newPage();
  const resp=await page.goto(LIVE+'?smoke=256-range-share',{waitUntil:'networkidle',timeout:60000});
  assert(resp&&resp.ok(),'live page HTTP');
  const state=await page.evaluate(()=>({
    title:document.title,
    g1First:typeof g1FirstPlaceOverride,
    selection:typeof selectionDecisionV230
  }));
  assert(state.title==='レース戦略 v2.56','live title '+state.title);
  assert(state.g1First==='function','live g1FirstPlaceOverride missing');
  assert(state.selection==='function','live selectionDecisionV230 missing');
  await context.close();await browser.close();
  console.log('PASS WebKit live GitHub Pages helper availability');
}

(async()=>{
  await runLocal(chromium,'Chromium');
  await runLocal(webkit,'WebKit(iPhone Safari相当)');
  await runLive();
})().catch(e=>{console.error(e);process.exit(1);});
