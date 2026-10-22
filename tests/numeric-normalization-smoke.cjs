const {chromium,webkit}=require('playwright');
const assert=require('assert');
const BASE='http://127.0.0.1:4173/waku-bc-converter/v3.html?test=nfkc-num-s26';
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
function csv(){return [
'何走目,馬番,馬名,レース名,競走種別コード,レースPCI,PCI,Ave-3F,上3F地点差,決手,日付,距離,開催,着順,着差,クラス名,頭数,芝・ダ,通過1,通過2,通過3,通過4',
'1,1,全角テストA,平地テスト,12,49.7,50.1,34.5,0.4,先行,2026.9.1,1600,4京1,１,0.0,Ｇ３,17,芝,0,0,２,２',
'2,1,全角テストA,平地テスト,12,51.2,51.8,34.8,0.6,差し,2026.8.1,1600,3京1,８,0.7,３勝,16,芝,,,６,５',
'3,1,全角テストA,地方テスト,12,50.0,50.0,35.0,0.5,先行,2026.7.1,1600,名古,３,0.2,重賞,12,ダ,,,２,２',
'4,1,全角テストA,障害未勝利,18,,,,,後方,2026.6.1,2910,4京1,９,1.5,未勝利,12,ダ,,,,',
'5,1,全角テストA,ペガサス,19,48.0,49.0,36.0,0.8,先行,2026.5.15,3350,2中7,２,0.2,ｵｰﾌﾟﾝ,12,芝,,,２,２',
'6,1,全角テストA,中止テスト,12,55.2,,,,,2026.5.1,2000,2東1,止,,OP(L),14,芝,,,,',
'7,1,全角テストA,取消テスト,12,50.1,,,,,2026.4.1,1800,2阪1,消,,３勝,14,芝,,,,',
'8,1,全角テストA,除外テスト,12,50.1,,,,,2026.3.1,1800,2阪1,外,,３勝,14,芝,,,,',
'1,2,全角テストB,平地テスト,12,47.2,48.0,35.0,0.3,逃げ,2026.9.2,1600,4京2,２,0.1,Ｇ２,17,芝,,,１,１',
'2,2,全角テストB,平地テスト,12,53.0,52.2,34.2,0.5,先行,2026.8.2,1600,3京2,１２,1.2,３勝,16,芝,,,３,４',
'1,3,履歴不足テスト,下級条件,12,50.0,50.5,35.1,0.7,差し,2026.9.3,1600,4京3,４,0.4,２勝,14,芝,,,７,６',
'2,3,履歴不足テスト,下級条件,12,52.0,52.5,34.9,0.8,差し,2026.8.3,1600,3京3,５,0.6,１勝,15,芝,,,８,７'
].join('\n')}
async function run(type,name){
  const browser=await type.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:IPHONE_UA,isMobile:true,hasTouch:true});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>window.ShapeCore&&window.RSAAddonHealth?.ready===true,null,{timeout:25000});
  const nums=await page.evaluate(()=>['１','８','１２','１.２','３３．５'].map(x=>window.ShapeCore.num(x)));
  assert.deepStrictEqual(nums,[1,8,12,1.2,33.5],`${name}: NFKC numeric parse failed ${JSON.stringify(nums)}`);
  const genericCornerGuard=await page.evaluate(()=>{
    const g=window.ShapeCore.parseCSV('馬名,1角,2角,3角,4角\nA,0,０,4,4');
    return window.ShapeCore.rowsToObjects(g).rows[0];
  });
  assert.strictEqual(genericCornerGuard['1角'],'',`${name}: shared corner guard kept numeric zero`);
  assert.strictEqual(genericCornerGuard['2角'],'',`${name}: shared corner guard kept full-width zero`);
  assert.strictEqual(String(genericCornerGuard['3角']),'4',`${name}: shared corner guard removed positive corner`);
  await page.locator('#csvFile').setInputFiles({name:'fullwidth-target.csv',mimeType:'text/csv',buffer:Buffer.from(csv(),'utf8')});
  await page.waitForFunction(()=>/^解析済\s+3頭$/.test(document.querySelector('#csvState')?.textContent||''),null,{timeout:12000});
  const info=await page.locator('#csvInfo').innerText();
  assert(/過去走\s+7件\s*\/\s*馬\s+3頭/.test(info),`${name}: filtered history count or CSV summary wrong: ${info}`);
  const transformed=await page.evaluate(async()=>{
    const f=document.querySelector('#csvFile').files[0];
    const grid=window.ShapeCore.parseCSV(window.ShapeCore.decode(await f.arrayBuffer()));
    const z=window.ShapeCore.rowsToObjects(grid);
    return {rows:z.rows,stats:window.RSATargetCsvCache?.stats||{},cornerGuard:window.RSACornerPositionGuard||{}};
  });
  assert(!transformed.rows.some(r=>['18','19'].includes(String(r['競走種別コード']||'').normalize('NFKC').trim())),`${name}: obstacle type 18/19 leaked into transformed CSV`);
  assert(!transformed.rows.some(r=>['止','中止','取','取消','消','除','除外','外','失','失格'].includes(String(r['着順']||'').normalize('NFKC').trim())),`${name}: non-finish history leaked into transformed CSV`);
  const local=transformed.rows.find(r=>r['レース名']==='地方テスト');
  const jra=transformed.rows.find(r=>r['開催']==='4京1');
  const zeroCase=transformed.rows.find(r=>r['レース名']==='平地テスト'&&r['日付']==='2026.09.01');
  assert(local&&local['場所']==='',`${name}: local 名古 was misclassified as ${local?.['場所']}`);
  assert(jra&&jra['場所']==='京都',`${name}: JRA venue mapping failed ${jra?.['場所']}`);
  assert(transformed.rows.some(r=>r['日付']==='2026.09.01'),`${name}: date normalization failed`);
  assert(zeroCase&&zeroCase['通過1']===''&&zeroCase['通過2']==='',`${name}: TARGET source zero corners were not normalized`);
  assert(zeroCase&&zeroCase['1角']===''&&zeroCase['2角']==='',`${name}: generated corner zero values were not normalized`);
  assert(zeroCase&&String(zeroCase['3角']).normalize('NFKC')==='2',`${name}: first positive corner was lost`);
  assert((transformed.stats.cornerZeroNormalized||0)>=2,`${name}: TARGET zero-corner normalization stats missing`);
  assert((transformed.stats.obstacleRowsSkipped||0)>=2,`${name}: obstacle skip stats missing`);
  assert((transformed.stats.nonFinishRowsSkipped||0)>=3,`${name}: non-finish skip stats missing`);
  assert((transformed.cornerGuard.normalizedZeroCorners||0)>=2,`${name}: shared corner guard did not run`);

  await page.locator('#raceDate').fill('2026-10-15');
  await page.locator('#venue').selectOption({label:'京都'});
  await page.locator('#raceName').fill('回帰テスト');
  await page.locator('#fieldSize').fill('3');
  await page.locator('#surface').selectOption({label:'芝'});
  await page.locator('#distance').fill('1600');
  await page.locator('#grade').selectOption({label:'G3'});
  await page.locator('#oddsPaste').fill('1 2.0\n2 3.0\n3 5.0');
  await page.locator('#applyOddsBtn').click();
  await page.locator('#analyzeBtn').click();
  await page.waitForFunction(()=>window.AbilityOpponentState?.ready===true&&window.AbilityOpponentState?.coverage?.total===3,null,{timeout:15000});
  const abilityText=await page.locator('#abilityListV27').innerText();
  assert(abilityText.includes('履歴不足テスト'),`${name}: unrated horse disappeared from Ability panel`);
  assert(abilityText.includes('履歴不足'),`${name}: unrated horse was not labelled as history-insufficient`);
  const coverage=await page.evaluate(()=>window.AbilityOpponentState.coverage);
  assert.deepStrictEqual(coverage,{rated:2,total:3},`${name}: Ability coverage wrong ${JSON.stringify(coverage)}`);
  assert.deepStrictEqual(errors,[],`${name}: page errors ${errors.join(' | ')}`);
  console.log('PASS',name,{nums,info,coverage,cornerZeroNormalized:transformed.stats.cornerZeroNormalized,sharedCornerNormalizations:transformed.cornerGuard.normalizedZeroCorners,obstacleRowsSkipped:transformed.stats.obstacleRowsSkipped,nonFinishRowsSkipped:transformed.stats.nonFinishRowsSkipped});
  await browser.close();
}
(async()=>{await run(chromium,'Chromium iPhone full-width CSV');await run(webkit,'WebKit iPhone full-width CSV')})().catch(e=>{console.error(e);process.exit(1)});
