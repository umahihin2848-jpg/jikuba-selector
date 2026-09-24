const { chromium, webkit } = require('playwright');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const API_PREFIX = 'https://ep-shy-unit-b54tgtrq.apirest.c-7.us-east-2.aws.neon.tech/neondb/rest/v1/race_assessments';
const LOCAL_URL = 'http://127.0.0.1:4173/quinella-range/';
const LIVE_URL = 'https://umahihin2848-jpg.github.io/jikuba-selector/quinella-range/';

const A_ODDS = '1=2 2=3 3=4 4=5 5=8 6=12 7=20 8=30 9=50 10=80 11=100 12=120';
const B_ODDS = '1=3 2=4 3=5 4=6 5=7 6=8 7=9 8=10 9=12 10=18 11=25 12=35 13=50 14=70 15=90 16=120';
const C_ODDS = '1=5.6 2=6.5 3=7.7 4=8.7 5=11.8 6=13.6 7=17.4 8=18.4 9=22 10=23.6 11=26.8 12=27.2 13=27.6';
const D_ODDS = '1=5 2=6 3=7 4=8 5=9 6=10 7=11 8=12 9=13 10=14 11=15 12=16 13=17 14=18 15=19 16=20 17=21 18=22';

async function installMockDb(context) {
  const rows = [];
  let nextId = 9000;
  let lastPost = null;
  let lastPatch = null;
  await context.route(API_PREFIX + '**', async route => {
    const req = route.request();
    const method = req.method();
    const url = new URL(req.url());
    if (method === 'GET') {
      let out = [...rows];
      const date = url.searchParams.get('race_date');
      const venue = url.searchParams.get('venue');
      const no = url.searchParams.get('race_no');
      if (date?.startsWith('eq.')) out = out.filter(x => x.race_date === date.slice(3));
      if (venue?.startsWith('eq.')) out = out.filter(x => x.venue === venue.slice(3));
      if (no?.startsWith('eq.')) out = out.filter(x => String(x.race_no) === no.slice(3));
      const limit = Number(url.searchParams.get('limit') || 100);
      out = out.slice(0, limit);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
    }
    if (method === 'POST') {
      const body = JSON.parse(req.postData() || '{}');
      lastPost = structuredClone(body);
      const row = {
        id: ++nextId,
        assessed_at: new Date().toISOString(),
        result_first_horse_no: null,
        result_second_horse_no: null,
        result_recorded_at: null,
        result_note: null,
        quinella_stake_yen: null,
        quinella_return_yen: null,
        ...body,
      };
      rows.unshift(row);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) });
    }
    if (method === 'PATCH') {
      const body = JSON.parse(req.postData() || '{}');
      lastPatch = structuredClone(body);
      const id = url.searchParams.get('id');
      const targetId = id?.startsWith('eq.') ? Number(id.slice(3)) : null;
      const row = rows.find(x => x.id === targetId);
      if (!row) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'not found' }) });
      Object.assign(row, body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) });
    }
    return route.fulfill({ status: 405, contentType: 'application/json', body: '{}' });
  });
  return { rows, getLastPost: () => lastPost, getLastPatch: () => lastPatch };
}

async function classifyAndSave(page, { raceNo, odds, expectedCode, bet = 'skip', axis = '', stake = '0', opponents = '' }) {
  await page.fill('#raceNo', String(raceNo));
  await page.fill('#odds', odds);
  if (axis !== '') await page.fill('#axisHorseNo', String(axis)); else await page.fill('#axisHorseNo', '');
  await page.selectOption('#betDecision', bet);
  await page.fill('#plannedStake', String(stake));
  await page.fill('#opponents', opponents);
  await page.click('#judge');
  await page.waitForTimeout(100);
  assert((await page.textContent('#structure')).startsWith(expectedCode + '：'), `分類${expectedCode}にならない`);
}

async function mockFlow(browserType, label) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
  const db = await installMockDb(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(LOCAL_URL, { waitUntil: 'networkidle' });
  assert(await page.title() === '馬連レンジ v2.1', `${label}: title`);
  assert(await page.locator('link[rel="manifest"]').getAttribute('href') === './manifest.webmanifest', `${label}: manifest link`);
  await page.selectOption('#venue', { label: '東京' });
  await page.fill('#raceName', `${label}自動テスト`);

  // 入力パース・人気自動算出
  await page.fill('#odds', A_ODDS);
  await page.waitForTimeout(50);
  assert((await page.textContent('#oddsPreview')).includes('12頭を認識'), `${label}: 頭数認識`);
  assert((await page.textContent('#oddsPreview')).includes('1人気：1番 2.0倍'), `${label}: 人気自動算出`);

  // 存在しない馬番を即時ブロック
  await page.fill('#axisHorseNo', '13');
  await page.waitForTimeout(30);
  assert((await page.textContent('#inputBrake')).includes('13番（事前軸）がオッズ表にありません'), `${label}: 出走頭数外軸ブロック`);
  await page.fill('#axisHorseNo', '1');

  // 40倍ブレーキ
  await page.selectOption('#betDecision', 'buy');
  await page.fill('#opponents', '9');
  await page.waitForTimeout(30);
  assert((await page.textContent('#opponentBrake')).includes('50.0倍'), `${label}: 40倍ブレーキ`);
  await page.fill('#opponents', '2 3');
  await page.fill('#plannedStake', '1000');

  // Aを保存しpayload確認
  await page.fill('#raceNo', '1');
  await page.click('#judge');
  await page.waitForTimeout(100);
  assert((await page.textContent('#structure')).startsWith('A：'), `${label}: A分類`);
  const postA = db.getLastPost();
  assert(postA.structure_code === 'A', `${label}: A payload`);
  assert(Array.isArray(postA.odds_snapshot) && postA.odds_snapshot.length === 12, `${label}: snapshot配列`);
  assert(postA.odds_snapshot[0].horse_no === 1 && postA.odds_snapshot[0].popularity === 1 && postA.odds_snapshot[0].win_odds === 2, `${label}: 馬番人気オッズ保存`);
  assert(postA.prior_axis_popularity === 1, `${label}: 軸人気自動保存`);
  assert(postA.bet_decision === 'buy' && postA.planned_stake_yen === 1000, `${label}: 購入計画保存`);
  assert(postA.quinella_opponents.length === 2 && postA.quinella_opponents[0].popularity === 2, `${label}: 相手T15情報保存`);

  // 結果入力→Aの5人気はレンジ外
  const resultButton = page.getByRole('button', { name: '結果保存' }).first();
  const history = page.locator('#history .history').first();
  await history.locator('input[placeholder="1着馬番"]').fill('1');
  await history.locator('input[placeholder="2着馬番"]').fill('5');
  await history.locator('input[placeholder="馬連投資額"]').fill('1000');
  await history.locator('input[placeholder="馬連払戻額"]').fill('0');
  await resultButton.click();
  await page.waitForTimeout(100);
  assert((await page.textContent('#history')).includes('軸○・相手レンジ外'), `${label}: 相手レンジ外判定`);
  const patch = db.getLastPatch();
  assert(patch.result_first_horse_no === 1 && patch.result_second_horse_no === 5, `${label}: 結果PATCH`);

  // B/C/D分類
  await classifyAndSave(page, { raceNo: 2, odds: B_ODDS, expectedCode: 'B' });
  await classifyAndSave(page, { raceNo: 3, odds: C_ODDS, expectedCode: 'C' });
  await classifyAndSave(page, { raceNo: 4, odds: D_ODDS, expectedCode: 'D', bet: 'buy', axis: 1, stake: 500, opponents: '10' });
  assert(db.getLastPost().structure_code === 'D' && db.getLastPost().bet_decision === 'buy', `${label}: Dでも購入保存可能`);

  // 同一オッズは明示人気なら受理・自動順位では拒否
  await page.fill('#odds', '1=2.0 2=2.0 3=4 4=5 5=8');
  await page.waitForTimeout(30);
  assert((await page.textContent('#oddsPreview')).includes('同一オッズ'), `${label}: 同一オッズ自動順位拒否`);
  await page.fill('#odds', '1=1=2.0 2=2=2.0 3=3=4 4=4=5 5=5=8');
  await page.waitForTimeout(30);
  assert((await page.textContent('#oddsPreview')).includes('5頭を認識'), `${label}: 明示人気入力`);

  // 集計表示
  const stats = await page.textContent('#stats');
  assert(stats.includes('A 捕捉率') && stats.includes('全体回収率'), `${label}: 集計UI`);

  if (errors.length) throw new Error(`${label}: ブラウザエラー ${errors.join(' | ')}`);
  await context.close();
  await browser.close();
  console.log(`PASS ${label}: 馬連レンジ主要フロー`);
}

async function liveConnectivity() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const resp = await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  assert(resp && resp.ok(), '公開URLが200で開けない');
  assert(await page.title() === '馬連レンジ v2.1', '公開URLのtitleが不正');
  assert(!(await page.textContent('#history')).includes('DB接続エラー'), '公開URLからNeon Data APIへ接続できない');
  const api = await page.evaluate(async prefix => {
    const r = await fetch(prefix + '?select=id&limit=1');
    return { ok: r.ok, status: r.status, text: await r.text() };
  }, API_PREFIX);
  assert(api.ok, `Neon Data API GET失敗: ${api.status} ${api.text}`);
  if (errors.length) throw new Error('公開版WebKitエラー: ' + errors.join(' | '));
  await context.close();
  await browser.close();
  console.log('PASS WebKit live: GitHub Pages + Neon Data API');
}

(async () => {
  await mockFlow(chromium, 'Chromium');
  await mockFlow(webkit, 'WebKit(iPhone Safari相当)');
  await liveConnectivity();
})().catch(err => {
  console.error(err);
  process.exit(1);
});