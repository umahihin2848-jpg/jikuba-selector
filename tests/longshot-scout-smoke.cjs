const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=longshot-scout-v1';
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

const ODDS=Array.from({length:12},(_,i)=>`${i+1} ${(2+i*1.7).toFixed(1)}`).join('\n');
function rows(){
  return Array.from({length:12},(_,i)=>{
    const no=i+1;
    let m3=no,main=no;
    if(no===7){m3=2;main=1}
    if(no===11){m3=1;main=2}
    if(no===6){m3=4;main=3}
    if(no===12){m3=9;main=9}
    return {no:String(no),name:`H${no}`,finishRank:m3,sc:[{rank:Math.min(12,main+2)},{rank:Math.min(12,main+1)},{rank:main},{rank:Math.min(12,main+3)}]};
  });
}
function abilities(){
  return Array.from({length:12},(_,i)=>{
    const no=i+1;let abilityRank=no;
    if(no===11)abilityRank=2;
    if(no===6)abilityRank=3;
    if(no===7)abilityRank=5;
    if(no===12)abilityRank=8;
    return {no:String(no),name:`H${no}`,abilityRank};
  });
}
async function seed(page){
  await page.evaluate(({odds,finishRows,abilityRows})=>{
    document.getElementById('result')?.classList.remove('hidden');
    if(!document.getElementById('m3RaceLab')){
      const r=document.getElementById('result');const x=document.createElement('div');x.id='m3RaceLab';x.innerHTML='<div class="m3labPanel" data-m3panel="horses"></div><div class="m3labPanel active" data-m3panel="market"></div>';r.prepend(x);
    }
    document.getElementById('raceDate').value='2026-10-20';
    document.getElementById('fieldSize').value='12';
    document.getElementById('grade').value='G2';
    document.getElementById('oddsPaste').value=odds;
    window.FourAxisIntegrationState={p:[.10,.20,.60,.10]};
    window.Finish600State={ready:true,rows:finishRows};
    window.M3PureAbilityState={ready:true,rows:abilityRows,byNo:Object.fromEntries(abilityRows.map(r=>[r.no,r]))};
    window.StructuralAlertsState={ready:true,rows:[{no:'6',name:'H6',frontLevel:'none'},{no:'7',name:'H7',frontLevel:'none'},{no:'11',name:'H11',frontLevel:'none'}]};
    ['finish600-ready','m3-pure-ability-ready','m3-race-lab-ready','structural-alerts-ready'].forEach(ev=>dispatchEvent(new CustomEvent(ev)));
  },{odds:ODDS,finishRows:rows(),abilityRows:abilities()});
  await page.waitForFunction(()=>window.LongshotScoutState?.ready===true&&document.querySelector('#longshotScoutV1'),null,{timeout:8000});
}
async function run(type,name){
  const browser=await type.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.RSAAddonHealth?.ready===true&&window.__LONGSHOT_SCOUT_V1===true,null,{timeout:25000});
  await seed(page);
  let s=await page.evaluate(()=>window.LongshotScoutState);
  assert.strictEqual(s.version,'longshot-scout-v1.0',`${name}: version`);
  assert.strictEqual(s.mode,'prospective_forward',`${name}: future date must be forward`);
  assert.strictEqual(s.displayOnly,true,`${name}: display-only flag`);
  assert.strictEqual(s.scoringImpact,false,`${name}: score impact`);
  assert.strictEqual(s.probabilityImpact,false,`${name}: probability impact`);
  assert.strictEqual(s.rankingImpact,false,`${name}: ranking impact`);
  assert.strictEqual(s.bettingImpact,false,`${name}: betting impact`);
  assert.strictEqual(s.automaticBuyImpact,false,`${name}: auto-buy impact`);
  assert.strictEqual(s.selectionPolicy.noWeightedCompositeScore,true,`${name}: weighted score must stay disabled`);
  assert.strictEqual(s.selectionPolicy.marketGapAloneNeverQualifies,true,`${name}: market gap guard`);
  assert.strictEqual(s.candidates.length,3,`${name}: expected three candidates`);
  assert.deepStrictEqual(s.candidates.map(x=>x.no),['7','11','6'],`${name}: lexicographic candidate order changed`);
  assert.strictEqual(s.candidates[0].validatedPattern,true,`${name}: 7-9 tested pattern not recognized`);
  assert.strictEqual(s.candidates[1].label,'🟣 超穴監視',`${name}: 10+ candidate must be super-longshot watch`);
  assert(!s.candidates.some(x=>x.no==='12'),`${name}: market longshot alone must never qualify`);
  const text=await page.locator('#longshotScoutV1').innerText();
  assert(text.includes('穴馬スカウター'),`${name}: title missing`);
  assert(text.includes('ワイド・三連複に追加するかはユーザー判断'),`${name}: manual decision disclaimer missing`);

  await page.evaluate(()=>{document.getElementById('raceDate').value='2026-10-19';document.getElementById('raceDate').dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForFunction(()=>window.LongshotScoutState?.mode==='retrospective_diagnostic',null,{timeout:4000});
  s=await page.evaluate(()=>window.LongshotScoutState);
  assert.strictEqual(s.mode,'retrospective_diagnostic',`${name}: freeze-date replay must not be forward`);

  await page.evaluate(()=>{
    const r=window.Finish600State.rows.find(x=>x.no==='11');r.finishRank=1;r.sc[2].rank=6;
    const a=window.M3PureAbilityState.byNo['11'];a.abilityRank=6;
    dispatchEvent(new CustomEvent('m3-pure-ability-ready'));
  });
  await page.waitForTimeout(250);
  s=await page.evaluate(()=>window.LongshotScoutState);
  assert(!s.candidates.some(x=>x.no==='11'),`${name}: single M3 support incorrectly qualified 10+ horse`);
  const unexpected=errors.filter(x=>!x.includes("Cannot set properties of null (setting 'innerHTML')"));
  assert.deepStrictEqual(unexpected,[],`${name}: unexpected page errors ${unexpected.join(' | ')}`);
  console.log('PASS',name,'longshot scout display-only rules');
  await browser.close();
}
(async()=>{await run(chromium,'Chromium iPhone');await run(webkit,'WebKit iPhone')})().catch(e=>{console.error(e);process.exit(1)});