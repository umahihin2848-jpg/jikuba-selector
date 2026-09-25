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
const CALIBRATION_23=[
  [[1.9,5.3,8.8,14.9,16.7,19.9,22.7,23.3,26.2,35.8,39.4,39.8,49.4,83.6,87.6,97.7,127.3,149.0],2],
  [[3.0,3.2,5.2,7.6,10.9,12.5,33.7,37.9,59.2,99.7,112.0,124.4,157.7,260.5,309.3,356.1,364.2,471.8],5],
  [[5.7,6.0,6.8,8.3,9.1,12.4,13.1,13.3,14.7,15.9,16.7,17.0,25.0,115.1,154.2],10],
  [[2.5,3.9,4.8,6.1,9.9,44.9,45.4,58.9,64.9,66.7,68.0,102.1,113.2,162.1,336.7],3],
  [[4.0,4.3,6.9,7.3,8.1,9.5,15.2,22.5,23.9,32.8,41.1,51.2,65.3,95.9,119.1,154.7],7],
  [[2.7,4.1,4.8,12.3,17.0,17.4,23.3,29.1,29.8,30.1,45.4,45.5,60.7,62.1,68.7,153.0,188.6],5],
  [[3.8,4.7,6.9,7.7,8.7,8.8,16.7,21.8,22.1,28.5,44.1,45.8,53.2,75.9,86.0,137.4],6],
  [[2.7,5.7,6.6,9.1,11.7,13.2,16.1,18.9,22.3,25.4,34.0,42.8,74.4,89.2,188.7,249.9,281.8,304.7],4],
  [[3.0,3.8,4.6,9.7,11.3,14.4,17.2,25.9,30.3,49.0,71.0,98.3,129.7,191.0],3],
  [[3.5,4.0,5.0,8.6,16.9,18.6,19.4,19.8,26.1,29.8,36.5,40.2,63.9,66.2,67.0,88.0,117.6,150.5],15],
  [[3.1,3.6,3.9,10.8,11.4,12.1,17.2,37.1,44.5,48.1,135.4,157.7,161.2],9],
  [[3.5,4.5,7.1,8.5,10.8,15.4,17.1,18.1,18.5,21.0,26.0,36.1,50.0,51.1,155.1,220.5],9],
  [[1.4,8.9,9.6,11.0,12.3,17.0,23.8,38.1,42.4,53.8,113.7],3],
  [[4.3,4.7,5.0,5.2,7.5,11.6,23.3,27.5,32.7,40.5,41.9,50.6,102.9,117.1,130.2,338.7],12],
  [[2.5,5.2,6.7,7.2,8.9,12.7,15.0,20.0,31.1,50.7,56.9],6],
  [[4.7,5.8,6.2,7.2,8.4,11.5,11.9,14.1,18.2,19.6,30.5,34.3,71.7,76.7,87.8,295.8],10],
  [[4.1,4.2,5.4,7.8,8.3,12.1,17.9,18.4,20.4,38.3,38.9,70.6,84.5,140.5,143.9,153.6,287.9,294.5],9],
  [[3.6,5.6,6.4,7.3,7.7,8.7,11.9,13.5,24.8,35.0,73.5,88.9,102.5,142.3],8],
  [[2.0,4.9,7.9,11.2,14.2,15.0,17.0,19.4,24.4,55.6,71.0,73.5,85.3,312.1,385.8,426.0],8],
  [[5.4,5.6,5.8,7.5,8.5,9.9,10.9,23.2,24.3,25.0,25.8,28.8,31.2,32.8,97.1,99.0],4],
  [[3.3,5.0,8.1,8.7,9.4,9.9,15.0,20.0,22.7,24.6,25.0,38.7,54.5,94.6,140.7,215.2],9],
  [[5.4,5.6,6.3,7.8,9.0,11.1,13.8,14.0,18.6,18.6,21.7,27.2,29.1,59.5,79.2,151.8],8],
  [[6.1,6.9,7.5,8.0,8.8,9.1,10.3,10.5,12.2,14.0,26.3,33.4,44.5,60.9,68.9],10]
];
const WALL_SAMPLE='12=1.9 8=5.3 7=8.8 16=14.9 4=16.7 18=19.9 9=22.7 6=23.3 14=26.2 13=35.8 11=39.4 17=39.8 15=49.4 3=83.6 10=87.6 5=97.7 1=127.3 2=149.0';
const EX18='12=3.6 1=5.6 6=6.4 13=7.3 2=7.7 3=8.7 4=11.9 9=13.5 10=24.8 5=35.0 11=73.5 14=88.9 7=102.5 8=142.3';
const EX19='12=2.0 2=4.9 13=7.9 10=11.2 4=14.2 16=15.0 14=17.0 15=19.4 11=24.4 6=55.6 3=71.0 7=73.5 8=85.3 5=312.1 9=385.8 1=426.0';
const EX20='5=5.4 7=5.6 12=5.8 2=7.5 10=8.5 6=9.9 4=10.9 16=23.2 1=24.3 11=25.0 15=25.8 14=28.8 3=31.2 9=32.8 13=97.1 8=99.0';
const EX22='13=5.4 5=5.6 12=6.3 6=7.8 1=9.0 3=11.1 14=13.8 8=14.0 9=18.6 2=18.6 16=21.7 11=27.2 15=29.1 4=59.5 7=79.2 10=151.8';
const EX23='5=6.1 14=6.9 12=7.5 4=8.0 11=8.8 8=9.1 10=10.3 15=10.5 3=12.2 2=14.0 1=26.3 13=33.4 6=44.5 7=60.9 9=68.9';
const BROAD_CAUTION='13=3.3 6=5.6 3=10.2 12=10.8 10=12.9 8=13.1 2=13.8 16=15.1 1=15.3 14=19.6 5=22.4 11=23.2 9=29.4 15=30.5 7=59.0 4=212.9';

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
  assert(await page.title()==='馬連レンジ v2.9',label+' title');
  assert(await page.locator('link[rel="manifest"]').getAttribute('href')==='./manifest.webmanifest',label+' manifest');
  const codes=await page.evaluate(([a,b,c,d])=>[compute(a).structure.code,compute(b).structure.code,compute(c).structure.code,compute(d).structure.code],[A,B,C,D]);
  assert(JSON.stringify(codes)==='["A","B","C","D"]',label+' A/B/C/D分類 '+JSON.stringify(codes));
  const riskA=await page.evaluate(s=>compute(s).axisRisk.level,A);
  const riskD=await page.evaluate(s=>compute(s).axisRisk.level,D);
  assert(riskA==='low',label+' 上位集中レースは不要な軸警告を出さない');
  assert(riskD==='high',label+' 分散レースは人気馬軸強警戒');
  const second=await page.evaluate(([a,b,c,d,e])=>[compute(a),compute(b),compute(c),compute(d),compute(e)].map(x=>({code:x.structure.code,end:x.secondRange.end,center:x.secondRange.centerEnd,relation:x.secondRange.relation})),[EX18,EX19,EX20,EX22,EX23]);
  assert(JSON.stringify(second.map(x=>[x.code,x.end]))===JSON.stringify([['B',10],['A',9],['C',12],['C',13],['C',12]]),label+' 第二レンジ 18/19/20/22/23 '+JSON.stringify(second));
  assert(second[0].relation==='基本より広い'&&second[1].relation==='基本より広い'&&second[2].relation==='基本と同じ',label+' 第二レンジ relation');
  const calib=await page.evaluate(data=>data.map(([odds,required],i)=>{const raw=odds.map((o,j)=>(j+1)+'='+o).join(' '),x=compute(raw);return{ex:i+1,code:x.structure.code,end:x.secondRange.end,required,hit:x.secondRange.end>=required}}),CALIBRATION_23);
  const calibHits=calib.filter(x=>x.hit).length;
  assert(calibHits===22,label+' 23例の1・2着第二レンジ捕捉 22/23 '+JSON.stringify(calib.filter(x=>!x.hit)));
  assert(calib.find(x=>x.ex===11).end>=9,label+' 例11を基本レンジより狭めない');
  assert(calib.find(x=>x.ex===10).hit===false,label+' 例10は市場外れ値として残す');
  const advice=await page.evaluate(s=>{const x=compute(s);return practicalAdvice(x.runners,x.structure,x.axisRisk,x.secondRange)},BROAD_CAUTION);
  assert(advice.level==='high'&&advice.title.includes('見送り候補'),label+' 実戦解説：広い市場は見送り候補');
  assert(advice.text.includes('明確な1頭が見つからない場合'),label+' 実戦解説：軸馬選定との連携');
  assert(advice.point.includes('穴をたくさん買う'),label+' 実戦解説：穴多点買いブレーキ');


  // レース一覧：未判定を複数保存し、タップで入力途中へ戻れる
  await page.selectOption('#venue','東京');
  await page.selectOption('#raceNo','9');
  await page.fill('#raceName','九Rステークス');
  await page.click('#saveDraft');
  assert((await page.textContent('#raceList')).includes('9R')&&(await page.textContent('#raceList')).includes('九Rステークス')&&(await page.textContent('#raceList')).includes('未判定'),label+' レース一覧 未判定9R');

  await page.click('#newRace');
  await page.selectOption('#venue','東京');
  await page.selectOption('#raceNo','10');
  await page.fill('#raceName','十Rオープン');
  await page.selectOption('#runnerCountSelect','5');
  for(const [h,o] of [['1','3.2'],['2','5.1'],['3','8.0'],['4','12.5'],['5','20.0']]) await page.fill(`#oddsGrid input[data-horse="${h}"]`,o);
  await page.fill('#axisHorseNo','2');
  await page.click('#saveDraft');
  assert((await page.textContent('#raceList')).includes('10R')&&(await page.textContent('#raceList')).includes('十Rオープン'),label+' レース一覧 未判定10R');

  const nine=page.locator('#raceList .raceItem').filter({hasText:'九Rステークス'});
  await nine.click();
  assert(await page.inputValue('#raceNo')==='9'&&await page.inputValue('#raceName')==='九Rステークス',label+' 9Rへ切替');

  const ten=page.locator('#raceList .raceItem').filter({hasText:'十Rオープン'});
  await ten.click();
  assert(await page.inputValue('#raceNo')==='10'&&await page.inputValue('#raceName')==='十Rオープン',label+' 10Rへ切替');
  assert(await page.inputValue('#axisHorseNo')==='2',label+' 下書き軸復元');
  assert(await page.inputValue('#oddsGrid input[data-horse="5"]')==='20',label+' 下書きオッズ復元');

  // 通常テスト用に新規入力へ
  await page.click('#newRace');

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
  assert((await page.textContent('#axisRisk')).includes('人気馬軸：特別な警告なし'),label+' 軸警告UI');
  assert((await page.textContent('#secondRangeBox')).includes('第二レンジ'),label+' 第二レンジUI');
  assert((await page.textContent('#secondExplain')).includes('買い目を増やす指示ではなく'),label+' わかりやすい解説UI');
  assert((await page.textContent('#practicalBox')).length>10,label+' 実戦向け解説UI');



  const post=db.getPost();
  assert(post&&post.structure_code==='A',label+' 保存');
  assert(post.odds_snapshot.length===12&&post.odds_snapshot[0].horse_no===1&&post.odds_snapshot[0].popularity===1&&post.odds_snapshot[0].win_odds===2,label+' T15馬番人気オッズ保存');
  assert(post.prior_axis_popularity===1,label+' 軸人気自動保存');
  assert(post.quinella_opponents.length===2,label+' 相手保存');
  assert((await page.textContent('#raceList')).includes('入力済み'),label+' 判定後に一覧が入力済み');
  const doneItem=page.locator('#raceList .raceItem').filter({hasText:label+'テスト'});
  assert(await doneItem.count()===1,label+' 判定済みレースが一覧に存在');
  await doneItem.click();
  assert(await page.inputValue('#raceName')===label+'テスト',label+' 判定済み一覧から入力画面へ復帰');


  const row=db.rows[0];
  await page.fill('#f'+row.id,'1'); await page.fill('#s'+row.id,'5');
  await page.fill('#k'+row.id,'1000'); await page.fill('#p'+row.id,'0');
  await page.getByRole('button',{name:'結果保存'}).first().click();
  await page.waitForTimeout(120);
  assert((await page.textContent('#history')).includes('1・2着のどちらかが基本レンジ外'),label+' 結果レンジ判定');
  assert(db.getPatch().result_first_horse_no===1&&db.getPatch().result_second_horse_no===5,label+' 結果PATCH');
  assert((await page.textContent('#stats')).includes('基本レンジ内率'),label+' 1・2着集計');assert((await page.textContent('#stats')).includes('A 捕捉率'),label+' A集計');

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
  assert(await page.title()==='馬連レンジ v2.9','live title');
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
