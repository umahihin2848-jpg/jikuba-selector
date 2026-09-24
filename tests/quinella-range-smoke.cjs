const { chromium, webkit } = require('playwright');
function assert(c,m){if(!c)throw new Error(m)}
const LOCAL='http://127.0.0.1:4173/quinella-range/';
const LIVE='https://umahihin2848-jpg.github.io/jikuba-selector/quinella-range/';
const API='https://ep-shy-unit-b54tgtrq.apirest.c-7.us-east-2.aws.neon.tech/neondb/rest/v1/race_assessments';
function oddsPairs(s){return s.trim().split(/\s+/).map(x=>{const [h,o]=x.split('=');return [h,o]})}
async function fillOddsGrid(page,s){
  const pairs=oddsPairs(s);
  await page.selectOption('#runnerCountSelect',String(pairs.length));
  for(const [h,o] of pairs) await page.fill(`#oddsGrid input[data-horse="${h}"]`,o);
}
const A='1=2 2=3 3=4 4=5 5=8 6=12 7=20 8=30 9=50 10=80 11=100 12=120';
const B='1=3 2=4 3=5 4=6 5=7 6=8 7=9 8=10 9=12 10=18 11=25 12=35 13=50 14=70 15=90 16=120';
const C='1=5.6 2=6.5 3=7.7 4=8.7 5=11.8 6=13.6 7=17.4 8=18.4 9=22 10=23.6 11=26.8 12=27.2 13=27.6';
const D='1=5 2=6 3=7 4=8 5=9 6=10 7=11 8=12 9=13 10=14 11=15 12=16 13=17 14=18 15=19 16=20 17=21 18=22';
const WALL_SAMPLE='12=1.9 8=5.3 7=8.8 16=14.9 4=16.7 18=19.9 9=22.7 6=23.3 14=26.2 13=35.8 11=39.4 17=39.8 15=49.4 3=83.6 10=87.6 5=97.7 1=127.3 2=149.0';

async function installMock(context){
  const rows=[]; let id=9000; let lastPost=null,lastPatch=null;
  await context.route('**/rest/v1/race_assessments**', async route=>{
    const req=route.request(), method=req.method(), u=new URL(req.url());
    if(method==='GET'){
      let out=[...rows];
      const d=u.searchParams.get('race_date'),v=u.searchParams.get('venue'),n=u.searchParams.get('race_no');
      if(d?.startsWith('eq.'))out=out.filter(x=>x.race_date===d.slice(3));
      if(v?.startsWith('eq.'))out=out.filter(x=>x.venue===v.slice(3));
      if(n?.startsWith('eq.'))out=out.filter(x=>String(x.race_no)===n.slice(3));
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
    }
    if(method==='POST'){
      const b=JSON.parse(req.postData()||'{}'); lastPost=structuredClone(b);
      const row={id:++id,assessed_at:new Date().toISOString(),result_first_horse_no:null,result_second_horse_no:null,result_recorded_at:null,result_note:null,quinella_stake_yen:null,quinella_return_yen:null,...b};
      rows.unshift(row);
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify([row])});
    }
    if(method==='PATCH'){
      const b=JSON.parse(req.postData()||'{}'); lastPatch=structuredClone(b);
      const q=u.searchParams.get('id'); const tid=q?.startsWith('eq.')?Number(q.slice(3)):null;
      const row=rows.find(x=>x.id===tid); if(!row)return route.fulfill({status:404,body:'{}'});
      Object.assign(row,b); return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([row])});
    }
    return route.fulfill({status:405,body:'{}'});
  });
  return {rows,getPost:()=>lastPost,getPatch:()=>lastPatch};
}

async function run(browserType,label){
  const browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const db=await installMock(context);
  const page=await context.newPage(); const errs=[];
  page.on('pageerror',e=>errs.push('pageerror:'+e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text())});
  await page.goto(LOCAL,{waitUntil:'networkidle'});
  assert(await page.title()==='馬連レンジ v2.3',label+' title');
  assert(await page.locator('link[rel="manifest"]').getAttribute('href')==='./manifest.webmanifest',label+' manifest');
  const codes=await page.evaluate(([a,b,c,d])=>[compute(a).structure.code,compute(b).structure.code,compute(c).structure.code,compute(d).structure.code],[A,B,C,D]);
  assert(JSON.stringify(codes)==='["A","B","C","D"]',label+' A/B/C/D分類 '+JSON.stringify(codes));
  const wa=await page.evaluate(s=>compute(s).wallAnalysis,WALL_SAMPLE);
  assert(wa.max.from===1&&wa.max.to===2&&Math.abs(wa.max.ratio-2.7895)<0.002,label+' 最大壁1→2');
  assert(wa.aWall.from===4&&wa.aWall.to===5&&Math.abs(wa.aWall.ratio-1.1208)<0.002,label+' 4→5壁');
  assert(wa.middle.from===9&&wa.middle.to===10&&Math.abs(wa.middle.ratio-1.3664)<0.002,label+' 中穴側9→10');


  await page.selectOption('#venue','東京');
  await page.selectOption('#raceNo','1');
  await page.fill('#raceName',label+'テスト');

  await page.selectOption('#runnerCountSelect','12');
  assert(await page.locator('#oddsGrid input[data-horse]').count()===12,label+' 12頭表示');
  assert(await page.locator('#oddsGrid input[data-horse="13"]').count()===0,label+' 12頭立てで13番を出さない');
  await page.selectOption('#runnerCountSelect','18');
  assert(await page.locator('#oddsGrid input[data-horse]').count()===18,label+' 18頭表示');
  assert(await page.locator('#oddsGrid input[data-horse="18"]').count()===1,label+' 18番表示');

  await page.selectOption('#runnerCountSelect','5');
  for(const [h,o] of [['1','2'],['2','2'],['3','4'],['4','5'],['5','8']]) await page.fill(`#oddsGrid input[data-horse="${h}"]`,o);
  await page.waitForTimeout(50);
  assert((await page.textContent('#oddsPreview')).includes('同一オッズは馬番順の暫定順位'),label+' 同一オッズ自動処理');
  assert((await page.textContent('#oddsPreview')).includes('1人気：1番 2.0倍'),label+' 同一オッズ順位1');
  assert((await page.textContent('#oddsPreview')).includes('2人気：2番 2.0倍'),label+' 同一オッズ順位2');

  await fillOddsGrid(page,A);
  await page.fill('#oddsGrid input[data-horse="12"]','');
  await page.selectOption('#betDecision','skip');
  await page.click('#judge');
  await page.waitForTimeout(50);
  assert((await page.textContent('#msg')).includes('未入力 1頭'),label+' 全頭入力必須');
  await page.fill('#oddsGrid input[data-horse="12"]','120');

  await page.fill('#axisHorseNo','13');
  await page.waitForTimeout(50);
  assert((await page.textContent('#inputBrake')).includes('13番（事前軸）がオッズ表にありません'),label+' 存在しない軸ブロック');
  await page.fill('#axisHorseNo','1');
  await page.selectOption('#betDecision','buy');
  await page.fill('#plannedStake','1000');
  await page.fill('#opponents','9');
  await page.waitForTimeout(50);
  assert((await page.textContent('#opponentBrake')).includes('50.0倍'),label+' 40倍ブレーキ');
  await page.fill('#opponents','2 3');
  await page.selectOption('#betDecision','buy');
  await page.click('#judge');
  await page.waitForTimeout(120);
  assert((await page.textContent('#structure')).startsWith('A：'),label+' A表示');
  assert((await page.textContent('#wallSummary')).includes('最大の壁'),label+' 壁サマリー表示');
  assert((await page.textContent('#wallList')).includes('1→2'),label+' 壁一覧表示');

  const post=db.getPost();
  assert(post&&post.structure_code==='A',label+' 保存');
  assert(post.odds_snapshot.length===12&&post.odds_snapshot[0].horse_no===1&&post.odds_snapshot[0].popularity===1&&post.odds_snapshot[0].win_odds===2,label+' T15馬番人気オッズ保存');
  assert(post.prior_axis_popularity===1,label+' 軸人気自動保存');
  assert(post.quinella_opponents.length===2,label+' 相手保存');

  const row=db.rows[0];
  await page.fill('#f'+row.id,'1'); await page.fill('#s'+row.id,'5');
  await page.fill('#k'+row.id,'1000'); await page.fill('#p'+row.id,'0');
  await page.getByRole('button',{name:'結果保存'}).first().click();
  await page.waitForTimeout(120);
  assert((await page.textContent('#history')).includes('軸○・相手レンジ外'),label+' 結果レンジ判定');
  assert(db.getPatch().result_first_horse_no===1&&db.getPatch().result_second_horse_no===5,label+' 結果PATCH');
  assert((await page.textContent('#stats')).includes('A 捕捉率'),label+' 集計');

  if(errs.length)throw new Error(label+' browser errors '+errs.join(' | '));
  await browser.close();
  console.log('PASS '+label+' 馬連レンジ');
}

async function live(){
  const browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const page=await context.newPage();
  const resp=await page.goto(LIVE,{waitUntil:'networkidle',timeout:60000});
  assert(resp&&resp.ok(),'live page HTTP');
  assert(await page.title()==='馬連レンジ v2.3','live title');
  await page.waitForTimeout(300);
  assert((await page.textContent('#storageStatus')).includes('このiPhone内'),'Neon障害時に端末保存へ切替されない');
  await page.selectOption('#venue','東京');
  await page.selectOption('#raceNo','12');
  await page.fill('#raceName','Safari端末保存テスト');
  await fillOddsGrid(page,A);
  await page.selectOption('#betDecision','skip');
  await page.click('#judge');
  await page.waitForFunction(()=>document.querySelector('#history')?.textContent.includes('Safari端末保存テスト'),null,{timeout:15000});
  assert((await page.textContent('#history')).includes('Safari端末保存テスト'),'端末保存できない');
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#history')?.textContent.includes('Safari端末保存テスト'),null,{timeout:15000});
  assert((await page.textContent('#history')).includes('Safari端末保存テスト'),'再読み込み後に端末履歴が消える');
  assert((await page.textContent('#storageStatus')).includes('このiPhone内'),'再読み込み後に端末保存モードにならない');
  await context.close();await browser.close();
  console.log('PASS WebKit live GitHub Pages + iPhone local fallback');
}
(async()=>{await run(chromium,'Chromium');await run(webkit,'WebKit(iPhone Safari相当)');await live()})().catch(e=>{console.error(e);process.exit(1)});
