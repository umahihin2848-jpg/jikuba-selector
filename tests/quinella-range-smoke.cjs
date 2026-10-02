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
const PATTERN_GO='1=3.7 2=6.8 3=11.2 4=11.9 5=22.4 6=25.7 7=28.0 8=34.7 9=35.8 10=37.2 11=43.6 12=48.0';
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
const PREBASE_GUARD='10=5.5 13=5.5 7=6.9 8=6.9 1=8.7 6=9.6 11=11.1 12=16.2 9=17.7 14=19.1 15=20.0 3=44.8 4=49.6 16=86.6 2=87.2 5=105.8';
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
  assert(await page.title()==='レース戦略 v2.40',label+' title');
  assert(await page.locator('link[rel="manifest"]').getAttribute('href')==='./manifest.webmanifest',label+' manifest');
  const bodyText=await page.locator('body').innerText();
  assert(bodyText.includes('入力時刻に制限はありません'),label+' 時間制限なし表示');
  assert(!bodyText.includes('15分前'),label+' 15分前の旧表示が残っている');
  assert(!bodyText.includes('T-15'),label+' T-15の旧表示が残っている');
  assert(!bodyText.includes('v2.38'),label+' v2.38の旧表記が残っている');
  const fullText=await page.locator('body').textContent();
  assert(fullText.includes('2021〜2026 型再分類')&&fullText.includes('構造A/Aだけで買う'),label+' 型再分類UI');
  assert(bodyText.includes('基本は単勝。馬連は条件が揃ったレースだけ追加する。'),label+' 単勝主戦メッセージ');
  assert(await page.locator('#betPriority').count()===1,label+' 単勝主戦・馬連追加UIシェル');
  assert(await page.locator('#decisionPipelineBox').count()===1,label+' 7段階判定UIシェル');
  assert(await page.locator('#availabilityDashboard').count()===1,label+' 買えるレース数UIシェル');
  assert(await page.locator('#tierForwardDashboard').count()===1,label+' 4段階前向き成績UIシェル');
  assert(await page.locator('#hardLockAudit').count()===1,label+' 固定ロック監査UIシェル');
  assert(await page.locator('#grade option[value="L"]').count()===1&&await page.locator('#grade option[value="OP"]').count()===1,label+' L/OP選択肢');
  const opl=await page.evaluate(s=>{
    const x=compute(s,'OP','older',1800);
    const r={context:{grade:'OP',surface:'dirt',age:'older',weight:'fixed',distance:1800},runners:x.runners,structure:x.structure};
    const cp=conditionProfileAnalysis(r,x.firstRange,x.v229Filter);
    const mp=marketPatternAnalysis(r,x.firstRange,x.secondPlaceRange,x.firstRangeSpread,x.v229Filter);
    const rh={...r,context:{...r.context,weight:'handicap'}};
    const cpH=conditionProfileAnalysis(rh,x.firstRange,x.v229Filter);
    const mpH=marketPatternAnalysis(rh,x.firstRange,x.secondPlaceRange,x.firstRangeSpread,x.v229Filter);
    const ex=fixedExclusionAnalysis({grade:'L',age:'3',weight:'fixed',distance:1600});
    return{cpLevel:cp.level,cpTitle:cp.title,mpStatus:mp.status,cpH:cpH.level,mpH:mpH.level,ex:ex.excluded,exCode:ex.code};
  },A);
  assert(opl.cpLevel==='provisional'&&opl.cpTitle.includes('OP 型検証モード'),label+' OP型検証モード '+JSON.stringify(opl));
  assert(opl.cpH!=='stop'&&opl.mpH!=='stop',label+' OP/Lハンデは条件付き・非ロック '+JSON.stringify(opl));
  assert(opl.ex&&opl.exCode==='opl_3yo_shortmile',label+' 3歳1600m以下L固定除外 '+JSON.stringify(opl));
  const historicalGate=await page.evaluate(s=>{
    const x=compute(s,'G3','older',1200);
    const shortR={context:{grade:'G3',surface:'turf',age:'older',weight:'fixed',distance:1200},runners:x.runners,structure:x.structure};
    const shortMp=marketPatternAnalysis(shortR,x.firstRange,x.secondPlaceRange,x.firstRangeSpread,x.v229Filter);
    const mid=compute(s,'G3','older',2000);
    const midR={context:{grade:'G3',surface:'turf',age:'older',weight:'fixed',distance:2000},runners:mid.runners,structure:mid.structure};
    const midMp=marketPatternAnalysis(midR,mid.firstRange,mid.secondPlaceRange,mid.firstRangeSpread,mid.v229Filter);
    const y=compute(s,'OP','older',1800);
    const opR={context:{grade:'OP',surface:'turf',age:'older',weight:'fixed',distance:1800},runners:y.runners,structure:y.structure};
    const opMp=marketPatternAnalysis(opR,y.firstRange,y.secondPlaceRange,y.firstRangeSpread,y.v229Filter);
    return{shortLevel:shortMp.level,shortTitle:shortMp.title,midLevel:midMp.level,midTitle:midMp.title,opQ:opMp.quinellaFit,opClass:opMp.historyClass};
  },PATTERN_GO);
  assert(historicalGate.shortLevel!=='stop'&&historicalGate.shortTitle.includes('G3芝1400m以下'),label+' G3芝短距離は注意・非ロック '+JSON.stringify(historicalGate));
  assert(historicalGate.midLevel!=='stop'&&historicalGate.midTitle.includes('G3芝2000m'),label+' G3芝2000は注意・非ロック '+JSON.stringify(historicalGate));
  assert(historicalGate.opQ!=='候補'&&historicalGate.opClass==='検証継続',label+' OP/Lは前向き検証 '+JSON.stringify(historicalGate));
  const pipelineCheck=await page.evaluate(([s,broadOdds])=>{
    const x=compute(s,'G1','older',2400);
    const r={context:{grade:'G1',surface:'turf',age:'older',weight:'fixed',distance:2400},runners:x.runners,structure:x.structure};
    const p=decisionPipelineAnalysis(r,x.firstRange,x.secondPlaceRange,x.firstRangeSpread,x.v229Filter,x.selectionDecision);
    const y=compute(s,'OP','older',1800);
    const ro={context:{grade:'OP',surface:'turf',age:'older',weight:'fixed',distance:1800},runners:y.runners,structure:y.structure};
    const po=decisionPipelineAnalysis(ro,y.firstRange,y.secondPlaceRange,y.firstRangeSpread,y.v229Filter,y.selectionDecision);
    const handicap=fixedExclusionAnalysis({grade:'G1',surface:'turf',age:'older',weight:'handicap',distance:2400});
    const hp=decisionPipelineAnalysis({context:{grade:'G1',surface:'turf',age:'older',weight:'handicap',distance:2400},runners:x.runners,structure:x.structure},x.firstRange,x.secondPlaceRange,x.firstRangeSpread,x.v229Filter,x.selectionDecision);
    const neff=v229FilterAnalysis('G3','older',1800,{boundary:{}},{boundary:{},end:6},{ratio:.90});
    const broad=selectionDecisionAnalysis({targetEnd:8,end:8},{targetEnd:10,end:10});
    const z=compute(s,'G3','older',1200);
    const zr={context:{grade:'G3',surface:'turf',age:'older',weight:'fixed',distance:1200},runners:z.runners,structure:z.structure};
    const zp=decisionPipelineAnalysis(zr,z.firstRange,z.secondPlaceRange,z.firstRangeSpread,z.v229Filter,z.selectionDecision);
    const noisy=compute(broadOdds,'G3','older',1200);
    const nr={context:{grade:'G3',surface:'turf',age:'older',weight:'fixed',distance:1200},runners:noisy.runners,structure:noisy.structure};
    const np=decisionPipelineAnalysis(nr,noisy.firstRange,noisy.secondPlaceRange,noisy.firstRangeSpread,noisy.v229Filter,noisy.selectionDecision);
    return{final:p.finalCode,label:p.finalLabel,four:p.fourLevelCode,risk:p.riskCount,win:p.winFit,q:p.quinellaFit,stages:p.stages.length,pairStage:p.stages.find(z=>z.id==='quinella')?.value,opFinal:po.finalCode,opFour:po.fourLevelCode,handicap,handicapPipe:hp.hardLocked,handicapFour:hp.fourLevelCode,handicapSignals:hp.riskSignals.map(x=>x.id),neffLocked:neff.locked,neffLevel:neff.level,broadLocked:broad.locked,g3Risk:zp.riskCount,g3Four:zp.fourLevelCode,noisyRisk:np.riskCount,noisyFour:np.fourLevelCode,noisySignals:np.riskSignals.map(x=>x.id)};
  },[PATTERN_GO,BROAD_CAUTION]);
  assert(pipelineCheck.final==='win'&&pipelineCheck.label.includes('単勝候補')&&pipelineCheck.win==='candidate'&&pipelineCheck.four==='strong'&&pipelineCheck.risk<=1,label+' G1中長距離は4段階で強候補 '+JSON.stringify(pipelineCheck));
  assert(pipelineCheck.q!=='candidate'&&pipelineCheck.pairStage.includes('条件付き'),label+' G1中長距離の馬連は89.4%で条件付き '+JSON.stringify(pipelineCheck));
  assert(pipelineCheck.stages===7&&pipelineCheck.opFinal==='conditional'&&pipelineCheck.opFour==='conditional',label+' OP/Lは条件付き・非ロック '+JSON.stringify(pipelineCheck));
  assert(!pipelineCheck.handicap.excluded&&!pipelineCheck.handicapPipe&&pipelineCheck.handicapFour==='conditional'&&pipelineCheck.handicapSignals.includes('handicap_under_validation'),label+' ハンデは赤ロック解除・条件付き上限 '+JSON.stringify(pipelineCheck));
  assert(pipelineCheck.noisyRisk>=3&&pipelineCheck.noisyFour==='recommend_skip',label+' 注意3個以上で見送り推奨 '+JSON.stringify(pipelineCheck));
  assert(!pipelineCheck.neffLocked&&pipelineCheck.neffLevel==='caution',label+' Neff注意帯は非ロック '+JSON.stringify(pipelineCheck));
  assert(!pipelineCheck.broadLocked,label+' 広いレンジも推奨見送り止まり '+JSON.stringify(pipelineCheck));
  const codes=await page.evaluate(([a,b,c,d])=>[compute(a).structure.code,compute(b).structure.code,compute(c).structure.code,compute(d).structure.code],[A,B,C,D]);
  assert(JSON.stringify(codes)==='["A","B","C","D"]',label+' A/B/C/D分類 '+JSON.stringify(codes));
  const riskA=await page.evaluate(s=>compute(s).axisRisk.level,A);
  const riskD=await page.evaluate(s=>compute(s).axisRisk.level,D);
  assert(riskA==='low',label+' 上位集中レースは不要な軸警告を出さない');
  assert(riskD==='high',label+' 分散レースは人気馬軸強警戒');
  const second=await page.evaluate(([a,b,c,d,e])=>[compute(a),compute(b),compute(c),compute(d),compute(e)].map(x=>({code:x.structure.code,end:x.secondRange.end,center:x.secondRange.centerEnd,relation:x.secondRange.relation})),[EX18,EX19,EX20,EX22,EX23]);
  assert(JSON.stringify(second.map(x=>[x.code,x.end]))===JSON.stringify([['B',9],['A',9],['C',12],['C',13],['C',12]]),label+' 第二レンジ 18/19/20/22/23 '+JSON.stringify(second));
  assert(second[0].relation==='基本と同じ'&&second[1].relation==='基本より広い'&&second[2].relation==='基本と同じ',label+' 第二レンジ relation');
  const calib=await page.evaluate(data=>data.map(([odds,required],i)=>{const raw=odds.map((o,j)=>(j+1)+'='+o).join(' '),x=compute(raw);return{ex:i+1,code:x.structure.code,end:x.secondRange.end,required,hit:x.secondRange.end>=required}}),CALIBRATION_23);
  const calibHits=calib.filter(x=>x.hit).length;
  assert(calibHits===22,label+' 23例の1・2着第二レンジ捕捉 22/23 '+JSON.stringify(calib.filter(x=>!x.hit)));
  assert(calib.find(x=>x.ex===11).end>=9,label+' 例11を基本レンジより狭めない');
  assert(calib.find(x=>x.ex===10).hit===false,label+' 例10は市場外れ値として残す');
  const guard=await page.evaluate(s=>{const x=compute(s);return{code:x.structure.code,end:x.secondRange.end,guard:x.secondRange.guardBoundary,explanation:x.secondRange.explanation}},PREBASE_GUARD);
  assert(guard.code==='C'&&guard.end===12,label+' 基本レンジ直前壁でC12を維持 '+JSON.stringify(guard));
  assert(guard.guard&&guard.guard.from===11&&guard.guard.to===12&&guard.guard.ratio>2.2,label+' 11→12拡張停止壁 '+JSON.stringify(guard.guard));
  assert(guard.explanation.includes('遠い壁を理由に第二レンジを広げず'),label+' 拡張停止の解説');
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
  assert(Number(await page.inputValue('#oddsGrid input[data-horse="5"]'))===20,label+' 下書きオッズ復元');

  // 通常テスト用に新規入力へ
  await page.click('#newRace');

  const wa=await page.evaluate(s=>compute(s).wallAnalysis,WALL_SAMPLE);
  assert(wa.max.from===1&&wa.max.to===2&&Math.abs(wa.max.ratio-2.7895)<0.002,label+' 最大壁1→2');
  assert(wa.aWall.from===4&&wa.aWall.to===5&&Math.abs(wa.aWall.ratio-1.1208)<0.002,label+' 4→5壁');
  assert(wa.middle.from===9&&wa.middle.to===10&&Math.abs(wa.middle.ratio-1.3664)<0.002,label+' 中穴側9→10');


  await page.selectOption('#venue','東京');
  await page.selectOption('#raceNo','1');
  await page.fill('#raceName',label+'テスト');
  await page.selectOption('#grade','G1');
  await page.selectOption('#surface','turf');
  await page.selectOption('#age','older');
  await page.selectOption('#weight','fixed');
  await page.fill('#distance','2400');

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

  await fillOddsGrid(page,PATTERN_GO);
  await page.fill('#oddsGrid input[data-horse="12"]','');
  await page.click('#judge');
  await page.waitForTimeout(50);
  assert((await page.textContent('#msg')).includes('未入力 1頭'),label+' 全頭入力必須');
  await page.fill('#oddsGrid input[data-horse="12"]','48.0');

  await page.fill('#axisHorseNo','13');
  await page.waitForTimeout(50);
  assert((await page.textContent('#inputBrake')).includes('13番（事前軸）がオッズ表にありません'),label+' 存在しない軸ブロック');
  await page.fill('#axisHorseNo','');

  // 購入判断なしで先に判定できる
  await page.selectOption('#betDecision','');
  await page.fill('#plannedStake','');
  await page.fill('#opponents','');
  await page.click('#judge');
  await page.waitForTimeout(120);
  assert((await page.textContent('#structure')).startsWith('A：'),label+' A表示');
  assert((await page.textContent('#lock')).includes('判定プレビュー'),label+' 購入前プレビュー');
  assert((await page.textContent('#planSummary')).includes('購入判断：未確定'),label+' 購入判断前表示');
  const patternText=await page.textContent('#marketPatternBox');
  assert(patternText.includes('A・明確')&&patternText.includes('B・まずまず')&&patternText.includes('馬連適性')&&patternText.includes('慎重'),label+' A/B構造表示 '+patternText);
  const pipelineText=await page.textContent('#decisionPipelineBox');
  assert(pipelineText.includes('強候補')&&pipelineText.includes('N≥30')&&pipelineText.includes('馬連は条件付き'),label+' 7段階＋4段階の強候補判定 '+pipelineText);
  assert(pipelineText.includes('注意点')&&pipelineText.includes('個'),label+' 注意項目表示 '+pipelineText);
  assert((await page.textContent('#strategyBox')).includes('強候補')&&(await page.textContent('#strategyBox')).includes('条件付き'),label+' 戦略も強候補＋条件付きへ同期');
  const priorityText=await page.textContent('#betPriority');
  assert(priorityText.includes('主戦・単勝')&&priorityText.includes('単勝候補'),label+' 単勝を主戦表示 '+priorityText);
  assert(priorityText.includes('追加・馬連')&&priorityText.includes('単勝のみ優先'),label+' 馬連は追加条件未達を明示 '+priorityText);
  assert((await page.textContent('#warningStrip')).includes('注意')||(await page.textContent('#warningStrip')).includes('大きな注意点なし'),label+' 注意要約を上段表示');
  assert(db.getPost()===null,label+' 判定を見るだけでは保存しない');

  // 判定を見た後で購入判断
  await page.fill('#axisHorseNo','1');
  await page.selectOption('#betDecision','buy');
  await page.selectOption('#betType','quinella');
  await page.fill('#plannedStake','1000');
  await page.fill('#opponents','11');
  await page.waitForTimeout(50);
  assert((await page.textContent('#opponentBrake')).includes('40.0倍以上'),label+' 40倍ブレーキ');
  await page.fill('#opponents','2 3');
  assert((await page.textContent('#wallSummary')).includes('最大の壁'),label+' 壁サマリー表示');
  assert((await page.textContent('#wallList')).includes('1→2'),label+' 壁一覧表示');
  assert((await page.textContent('#axisRisk')).includes('市場警告なし'),label+' 軸警告UI');
  assert((await page.textContent('#secondPlaceBox')).includes('2着レンジ'),label+' 2着レンジUI');
  assert((await page.textContent('#marketPatternBox')).includes('条件 × オッズ構造'),label+' 型判定UI');
  assert((await page.textContent('#decisionPipelineBox')).includes('7段階判定'),label+' 7段階UI');
  assert((await page.textContent('#strategyBox')).length>10,label+' 実戦戦略UI');

  // 馬連は強候補基準未達でも固定除外ではないため、注意表示のままユーザー判断で保存可能
  await page.click('#savePlan');
  await page.waitForTimeout(120);

  const post=db.getPost();
  assert(post&&post.structure_code==='A',label+' 保存');
  assert(post.odds_snapshot.length===12&&post.odds_snapshot[0].horse_no===1&&post.odds_snapshot[0].popularity===1&&post.odds_snapshot[0].win_odds===3.7,label+' 入力時点の馬番人気オッズ保存');
  assert(post.context?.decision_snapshot?.app_version==='2.40'&&post.context?.decision_snapshot?.market_pattern_key,label+' v2.40アプリ型ログ保存 '+JSON.stringify(post.context?.decision_snapshot));
  assert(post.context?.decision_snapshot?.decision_pipeline_final==='win'&&post.context?.decision_snapshot?.decision_pipeline_stages?.length===7,label+' 7段階ログ保存 '+JSON.stringify(post.context?.decision_snapshot));
  assert(post.context?.decision_snapshot?.hard_lock===false,label+' 非固定条件はhard lock false');
  assert(post.context?.decision_snapshot?.four_level_code==='strong',label+' 4段階判定ログ保存 '+JSON.stringify(post.context?.decision_snapshot));
  assert(Number.isInteger(post.context?.decision_snapshot?.risk_signal_count)&&Array.isArray(post.context?.decision_snapshot?.risk_signals),label+' 注意項目ログ保存');
  assert(post.context?.bet_type==='quinella',label+' 条件付き馬連も保存可能');
  assert(post.prior_axis_popularity===1,label+' 軸人気自動保存');
  assert(post.quinella_opponents.length===2,label+' 条件付き馬連の相手保存');
  assert((await page.textContent('#raceList')).includes('購入'),label+' 判定後に一覧が購入表示');
  const doneItem=page.locator('#raceList .raceItem').filter({hasText:label+'テスト'});
  assert(await doneItem.count()===1,label+' 判定済みレースが一覧に存在');
  await doneItem.click();
  assert(await page.inputValue('#raceName')===label+'テスト',label+' 判定済み一覧から入力画面へ復帰');


  const row=db.rows[0];
  await page.fill('#f'+row.id,'1'); await page.fill('#s'+row.id,'3');
  await page.fill('#wk'+row.id,'0'); await page.fill('#wp'+row.id,'0');
  await page.fill('#qk'+row.id,'1000'); await page.fill('#qp'+row.id,'0');
  await page.getByRole('button',{name:'結果保存'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#history')?.textContent.includes('1着は1着レンジ内'),null,{timeout:5000});
  const histText=await page.textContent('#history');
  assert(histText.includes('1着は1着レンジ内')&&histText.includes('2着は2着レンジ内'),label+' 1着・2着レンジ判定');
  assert(db.getPatch().result_first_horse_no===1&&db.getPatch().result_second_horse_no===3,label+' 結果PATCH');
  const statsText=await page.textContent('#stats');
  assert(statsText.includes('1着レンジ内率')&&statsText.includes('両方レンジ内率'),label+' 1着・2着集計');
  assert((await page.textContent('#patternValidationSummary')).includes('v2.39型ログ'),label+' 型別前向き検証UI');
  const availabilityText=await page.textContent('#availabilityDashboard');
  assert(availabilityText.includes('強候補')&&availabilityText.includes('条件付き')&&availabilityText.includes('見送り推奨')&&availabilityText.includes('固定ロック'),label+' 4段階レース数ダッシュボード '+availabilityText);
  assert((await page.textContent('#availabilitySummary')).includes('検討対象'),label+' 買えるレース数サマリー');
  assert((await page.textContent('#tierForwardSummary')).includes('前向き分類ログ'),label+' 4段階前向き成績サマリー');
  const tierText=await page.textContent('#tierForwardDashboard');
  assert(tierText.includes('強候補')&&tierText.includes('条件付き')&&tierText.includes('回収率'),label+' 4段階別前向き成績 '+tierText);
  assert((await page.textContent('#hardLockAudit')).length>0,label+' 固定ロック監査表示');

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
  const title=await page.title(),body=await page.locator('body').innerText();
  assert(title.trim().length>0,'live title');
  assert(body.trim().length>100,'live app shell');
  // GitHub PagesのデプロイはこのCIと並列で走るため、最新コミット固有UIはローカルChromium/WebKitで検証する。
  // liveではCDN伝播に左右されない「公開ページが正常に応答し、アプリ本体が描画される」ことだけを確認する。
  await context.close();await browser.close();
  console.log('PASS WebKit live GitHub Pages');
}
(async()=>{await run(chromium,'Chromium');await run(webkit,'WebKit(iPhone Safari相当)');await live()})().catch(e=>{console.error(e);process.exit(1)});
