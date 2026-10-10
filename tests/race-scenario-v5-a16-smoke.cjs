const { chromium, webkit } = require('playwright');
const assert = require('assert');
const BUILD='20261010v5a16s2';
const BASE=`http://127.0.0.1:4173/waku-bc-converter/v5.html?build=${BUILD}&test=a16`;
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
function csv(){
  const h=['何走目','馬番','馬名','レースPCI','PCI','Ave-3F','上3F地点差','決手','日付','距離','開催','着順','クラス名','頭数','芝・ダ','上り3F','通過1','通過2','通過3','通過4'],a=[h.join(',')];
  for(let n=1;n<=16;n++){
    const runs=n===16?1:3;
    for(let k=0;k<runs;k++){
      const style=n<=2?'逃げ':n<=7?'先行':n<=12?'差し':'追込',p1=Math.min(16,Math.max(1,n<=7?n:8+((n+k)%8))),p4=Math.min(16,Math.max(1,p1+(style==='差し'||style==='追込'?-2:1)));
      a.push([k+1,n,`A16Horse${n}`,43+((n+k)%13),45+((n*2+k)%14),(34+((n+k)%9)*.2).toFixed(1),(.2+((n+k)%10)*.25).toFixed(2),style,`2026.09.${String(10-k).padStart(2,'0')}`,1800,'阪神',((n+k)%12)+1,'Ｇ３',16,'ダ',(34+((n*2+k)%10)*.18).toFixed(2),p1,p1,p4,p4].join(','));
    }
  }
  return a.join('\n');
}
function odds(){return [2.8,4.1,5.6,7.4,9.8,12.5,16,20.5,26,33,41,52,65,80,100,130].map((v,i)=>`${i+1} ${v}`).join('\n')}
async function fill(page){
  await page.fill('#raceDate','2026-10-10');await page.selectOption('#venue','阪神');await page.fill('#raceName','V5 A16 Smoke Stakes');await page.fill('#fieldSize','16');await page.selectOption('#surface','ダート');await page.fill('#distance','2000');await page.selectOption('#grade','G3');await page.selectOption('#going','良');
  await page.locator('#csvFile').setInputFiles({name:'v5a16.csv',mimeType:'text/csv',buffer:Buffer.from(csv())});
  await page.waitForFunction(()=>document.querySelector('#csvState')?.textContent.includes('端末保存済'),null,{timeout:12000});await page.fill('#oddsPaste',odds());
}
async function analyze(page,name){
  const before=await page.evaluate(()=>window.V4AppState?.state?.results?.analyzedAt||'');await page.click('#analyzeBtn');
  await page.waitForFunction(b=>{const s=document.querySelector('#modelStatus')?.textContent||'',a=window.V4AppState?.state?.results?.analyzedAt||'';return s==='解析エラー'||(s==='解析完了'&&a&&a!==b)},before,{timeout:80000});
  if((await page.locator('#modelStatus').innerText())==='解析エラー')throw new Error(`${name}: ${await page.locator('#errorBox').innerText()}`);
}
async function assertA16(page,name){
  await page.click('[data-v5-tab="overview"]');
  await page.waitForFunction(()=>window.V5QuickViewState?.version==='v5-quick-view-v2'&&window.V5ConfidenceCourseState?.ready===true&&document.querySelector('#v5ConfidencePanel'),null,{timeout:12000});
  const q=await page.locator('#v5QuickView').innerText();for(const k of ['構造フォーカス','★ 最重要：構造一致','○ 準一致','評価分岐'])assert(q.includes(k),`${name}: structural focus missing ${k}`);
  const conf=await page.locator('#v5ConfidencePanel').innerText();assert(conf.includes('展開集中度'),`${name}: pace concentration missing`);assert(conf.includes('的中率を表す数値ではありません'),`${name}: pace concentration disclaimer missing`);
  const cs=await page.evaluate(()=>window.V5ConfidenceCourseState);assert.strictEqual(cs?.predictiveLogicChanged,false,`${name}: display layer must not change prediction`);assert.strictEqual(cs?.paceConcentrationIsAccuracy,false,`${name}: concentration must not claim accuracy`);assert.strictEqual(cs?.formalOOS,true,`${name}: 16-runner race should be inside formal OOS universe`);
  await page.waitForFunction(()=>window.V5CourseFitBridgeState?.ready===true&&(window.V5CourseFitBridgeState?.rows||[]).length>0,null,{timeout:12000});
  assert((await page.evaluate(()=>window.V5CourseFitBridgeState.rows.length))>0,`${name}: course-fit bridge empty`);
  await page.click('[data-v5-tab="horses"]');
  await page.waitForFunction(()=>window.V5HorseKartState?.version==='v5-horse-kart-v3'&&document.querySelectorAll('.v5KartCard').length>=10,null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelectorAll('.v5TrustBadge.courseA,.v5TrustBadge.courseB,.v5TrustBadge.courseC').length>0,null,{timeout:8000});
  assert((await page.locator('.v5TrustBadge.courseA,.v5TrustBadge.courseB,.v5TrustBadge.courseC').count())>0,`${name}: course badges missing`);
  assert((await page.locator('.v5TrustBadge.warn').filter({hasText:'低履歴'}).count())>0,`${name}: low-history warning missing`);
  const state=await page.evaluate(()=>window.V5HorseKartState);assert.strictEqual(state?.colorMeaning,'main-scenario x finishing-performance intersection; popularity not used in classification',`${name}: horse-card semantics mismatch`);
  const audit=await page.evaluate(()=>window.V4AppState?.state?.results?.audit);assert.strictEqual(audit?.probability?.monotone,true,`${name}: probability audit failed`);assert.strictEqual(audit?.m3Parity?.ok,true,`${name}: M3 parity failed`);
}
async function run(type,name){
  const browser=await type.launch({headless:true}),ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:UA,isMobile:true,hasTouch:true}),errors=[];const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#persistStatus')?.textContent!=='保存準備中',{timeout:12000});
  assert.strictEqual(await page.evaluate(()=>window.RSA_V5_BUILD),BUILD,`${name}: build mismatch`);assert.strictEqual(await page.locator('.v5Build').innerText(),'V5 A16',`${name}: label mismatch`);
  await fill(page);await analyze(page,name);await assertA16(page,name);assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);await browser.close();console.log('PASS',name,'V5 A16 structural focus + reliability + pace concentration + course badges');
}
(async()=>{await run(chromium,'chromium iPhone');await run(webkit,'webkit iPhone')})().catch(e=>{console.error(e);process.exit(1)});
