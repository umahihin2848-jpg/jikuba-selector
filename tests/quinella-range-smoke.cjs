const { chromium, webkit } = require('playwright');

function ok(v, m) { if (!v) throw new Error(m); }
const API = 'https://ep-shy-unit-b54tgtrq.apirest.c-7.us-east-2.aws.neon.tech/neondb/rest/v1/race_assessments';
const LOCAL = 'http://127.0.0.1:4173/quinella-range/';
const LIVE = 'https://umahihin2848-jpg.github.io/jikuba-selector/quinella-range/';
const A='1=2 2=3 3=4 4=5 5=8 6=12 7=20 8=30 9=50 10=80 11=100 12=120';
const B='1=3 2=4 3=5 4=6 5=7 6=8 7=9 8=10 9=12 10=18 11=25 12=35 13=50 14=70 15=90 16=120';
const C='1=5.6 2=6.5 3=7.7 4=8.7 5=11.8 6=13.6 7=17.4 8=18.4 9=22 10=23.6 11=26.8 12=27.2 13=27.6';
const D='1=5 2=6 3=7 4=8 5=9 6=10 7=11 8=12 9=13 10=14 11=15 12=16 13=17 14=18 15=19 16=20 17=21 18=22';

async function mocked(type, label) {
  const browser=await type.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const rows=[]; let id=9000, post=null, patch=null;
  await ctx.route(API+'**', async route=>{
    const req=route.request(), method=req.method(), u=new URL(req.url());
    if(method==='GET'){
      let out=rows.slice();
      const d=u.searchParams.get('race_date'),v=u.searchParams.get('venue'),n=u.searchParams.get('race_no');
      if(d&&d.startsWith('eq.')) out=out.filter(x=>x.race_date===d.slice(3));
      if(v&&v.startsWith('eq.')) out=out.filter(x=>x.venue===v.slice(3));
      if(n&&n.startsWith('eq.')) out=out.filter(x=>String(x.race_no)===n.slice(3));
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
    }
    if(method==='POST'){
      post=JSON.parse(req.postData()||'{}');
      const row=Object.assign({id:++id,assessed_at:new Date().toISOString(),result_first_horse_no:null,result_second_horse_no:null,result_recorded_at:null,result_note:null,quinella_stake_yen:null,quinella_return_yen:null},post);
      rows.unshift(row);
      return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify([row])});
    }
    if(method==='PATCH'){
      patch=JSON.parse(req.postData()||'{}');
      const q=u.searchParams.get('id'), target=q&&q.startsWith('eq.')?Number(q.slice(3)):null;
      const row=rows.find(x=>x.id===target); if(row) Object.assign(row,patch);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(row?[row]:[])});
    }
    return route.fulfill({status:405,body:'{}'});
  });
  const p=await ctx.newPage(), errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto(LOCAL,{waitUntil:'networkidle'});
  ok(await p.title()==='馬連レンジ v2.1',label+' title');
  ok(await p.locator('link[rel="manifest"]').getAttribute('href')==='./manifest.webmanifest',label+' manifest');
  const codes=await p.evaluate(([a,b,c,d])=>[compute(a).structure.code,compute(b).structure.code,compute(c).structure.code,compute(d).structure.code],[A,B,C,D]);
  ok(codes.join('')==='ABCD',label+' ABCD classification '+codes.join(''));
  const explicit=await p.evaluate(()=>parseRaceOdds('1=1=2.0 2=2=2.0 3=3=4 4=4=5 5=5=8').length);
  ok(explicit===5,label+' explicit tied odds');
  const tieErr=await p.evaluate(()=>{try{parseRaceOdds('1=2 2=2 3=4 4=5 5=8');return false}catch(e){return e.message.includes('同一オッズ')}});
  ok(tieErr,label+' tied odds guard');
  await p.selectOption('#venue','東京');
  await p.selectOption('#raceNo','1');
  await p.fill('#raceName',label+'テスト');
  await p.fill('#odds',A);
  await p.fill('#axisHorseNo','13');
  await p.waitForTimeout(30);
  ok((await p.textContent('#inputBrake')).includes('13番'),label+' non-runner axis guard');
  await p.fill('#axisHorseNo','1');
  await p.selectOption('#betDecision','buy');
  await p.fill('#opponents','9');
  await p.waitForTimeout(30);
  ok((await p.textContent('#opponentBrake')).includes('50.0倍'),label+' 40x brake');
  await p.fill('#opponents','2 3');
  await p.fill('#plannedStake','1000');
  await p.click('#judge');
  await p.waitForTimeout(100);
  ok((await p.textContent('#structure')).startsWith('A：'),label+' A render');
  ok(post && post.odds_snapshot.length===12,label+' snapshot saved');
  ok(post.odds_snapshot[0].horse_no===1 && post.odds_snapshot[0].popularity===1 && post.odds_snapshot[0].win_odds===2,label+' horse/pop/odds saved');
  ok(post.prior_axis_popularity===1 && post.bet_decision==='buy' && post.planned_stake_yen===1000,label+' plan payload');
  ok(post.quinella_opponents[0].popularity===2,label+' opponent t15 saved');
  const h=p.locator('#history .history').first();
  await h.locator('input[placeholder="1着馬番"]').fill('1');
  await h.locator('input[placeholder="2着馬番"]').fill('5');
  await h.locator('input[placeholder="馬連投資額"]').fill('1000');
  await h.locator('input[placeholder="馬連払戻額"]').fill('0');
  await h.getByRole('button',{name:'結果保存'}).click();
  await p.waitForTimeout(100);
  ok(patch && patch.result_first_horse_no===1 && patch.result_second_horse_no===5,label+' result patch');
  ok((await p.textContent('#history')).includes('軸○・相手レンジ外'),label+' range miss');
  ok((await p.textContent('#stats')).includes('A 捕捉率'),label+' stats');
  if(errs.length) throw new Error(label+' browser errors: '+errs.join(' | '));
  await ctx.close(); await browser.close();
  console.log('PASS '+label+' 馬連レンジ major flow');
}

async function live(){
  const browser=await webkit.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP'});
  const p=await ctx.newPage(), errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  const r=await p.goto(LIVE,{waitUntil:'networkidle',timeout:60000});
  ok(r&&r.ok(),'live page HTTP');
  ok(await p.title()==='馬連レンジ v2.1','live title');
  ok(!(await p.textContent('#history')).includes('DB接続エラー'),'live DB load');
  const api=await p.evaluate(async u=>{const r=await fetch(u+'?select=id&limit=1');return [r.ok,r.status,await r.text()]},API);
  ok(api[0],'live Data API GET '+api[1]+' '+api[2]);
  if(errs.length) throw new Error('live browser errors: '+errs.join(' | '));
  await ctx.close(); await browser.close();
  console.log('PASS WebKit live GitHub Pages + Neon GET');
}

(async()=>{await mocked(chromium,'Chromium');await mocked(webkit,'WebKit(iPhone Safari相当)');await live()})().catch(e=>{console.error(e);process.exit(1)});
