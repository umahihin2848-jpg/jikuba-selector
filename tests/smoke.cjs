const { chromium, webkit } = require('playwright');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}


async function safariSmoke() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  assert(await page.title() === '軸馬選定ツール', 'WebKit: タイトルが不正');

  // 複数レース下書き：作成・一覧・切替
  await page.fill('#raceNo', '11');
  await page.fill('#raceName', 'Safari自動テスト');
  await page.fill('[data-i="0"][data-k="name"]', 'Safari馬A');
  await page.click('#newBtn');
  await page.fill('#raceNo', '12');
  await page.fill('#raceName', 'Safari第2レース');
  await page.fill('[data-i="0"][data-k="name"]', 'Safari馬B');
  await page.click('[data-tab="races"]');
  const wkRaceList = await page.textContent('#raceList');
  assert(wkRaceList.includes('11R Safari自動テスト'), 'WebKit: 1件目の下書きが一覧に出ない');
  assert(wkRaceList.includes('12R Safari第2レース'), 'WebKit: 2件目の下書きが一覧に出ない');
  const wkFirst = page.locator('#raceList .history').filter({ hasText: '11R Safari自動テスト' });
  await wkFirst.getByRole('button', { name: '開く' }).click();
  assert(await page.inputValue('#raceNo') === '11', 'WebKit: レース番号が復元されない');
  assert(await page.inputValue('#raceName') === 'Safari自動テスト', 'WebKit: レース切替でレース名が復元されない');
  assert(await page.inputValue('[data-i="0"][data-k="name"]') === 'Safari馬A', 'WebKit: レース切替で馬入力が復元されない');
  await page.selectOption('#course', { label: '中山' });
  await page.selectOption('#surface', { label: '芝' });
  await page.fill('#distance', '1600');
  await page.waitForTimeout(100);
  assert(await page.inputValue('#firstTurn') === '短い', 'WebKit: 中山芝1600プリセットが反映されない');
  await page.selectOption('[data-i="0"][data-k="prevStatus"]', { label: '不利' });
  assert(await page.locator('#prevTypeWrap0').isVisible(), 'WebKit: 条件表示が動かない');
  assert(await page.locator('#prevType2Wrap0').isVisible(), 'WebKit: 前走不利②が表示されない');
  assert(await page.locator('#prevType3Wrap0').isVisible(), 'WebKit: 前走不利③が表示されない');
  await page.selectOption('[data-i="0"][data-k="prevType2"]', { label: '展開' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome2"]', { label: '継続・再発' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons0')).includes('前走不利2（展開）：継続・再発リスク'), 'WebKit: 複数前走不利の判定が動かない');
  await page.fill('[data-i="1"][data-k="prevDistance"]', '1200');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons1')).includes('距離延長：1200→1600m'), 'WebKit: 距離延長判定が動かない');
  await page.selectOption('[data-i="1"][data-k="settlingRisk"]', { label: '強い不安' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons1')).includes('折り合い×距離延長'), 'WebKit: 折り合い複合判定が動かない');
  await page.fill('[data-i="0"][data-k="prevCarryWeight"]', '55');
  await page.fill('[data-i="0"][data-k="currentCarryWeight"]', '58');
  await page.fill('[data-i="1"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="1"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="2"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="2"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="3"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="3"][data-k="currentCarryWeight"]', '56');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons0')).includes('前走比+3kg'), 'WebKit: 斤量判定が動かない');
  await page.selectOption('[data-i="0"][data-k="sex"]', { label: '牝' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons0')).includes('牝馬は2kgアローワンスを考慮'), 'WebKit: 牝馬斤量補正が動かない');
  await page.selectOption('[data-i="0"][data-k="sex"]', { label: '牡' });
  await page.selectOption('[data-i="2"][data-k="startDelayCount"]', { label: '2' });
  await page.selectOption('[data-i="2"][data-k="frame"]', { label: '2' });
  await page.selectOption('[data-i="2"][data-k="pos"]', { label: '後方' });
  await page.fill('#distance', '1400');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons2')).includes('出遅れ傾向×位置取り'), 'WebKit: 出遅れ複合判定が動かない');
  await page.fill('#runnerCount', '16');
  await page.fill('[data-i="1"][data-k="prevRunnerCount"]', '9');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons1')).includes('頭数増：前走9頭→今回16頭'), 'WebKit: 頭数増判定が動かない');
  await page.selectOption('#speed', { label: '高速' });
  await page.check('#insideLead');
  await page.check('#insideAdv');
  await page.selectOption('[data-i="0"][data-k="frame"]', { label: '7' });
  await page.click('#judgeBtn');
  assert((await page.textContent('#judgeCards')).includes('内枠主導・高速馬場・イン有利で外枠不利'), 'WebKit: 判定理由が出ない');
  await page.fill('#finish0', '4');
  await page.fill('#finish1', '1');
  await page.fill('#finish2', '2');
  await page.fill('#finish3', '3');
  page.once('dialog', dialog => dialog.accept());
  await page.click('#saveBtn');
  await page.click('[data-tab="stats"]');
  assert((await page.textContent('#statsBox')).includes('ルール別成績'), 'WebKit: 集計画面が壊れる');
  if (errors.length) throw new Error('WebKitブラウザエラー: ' + errors.join(' | '));
  await context.close();
  await browser.close();
  console.log('PASS WebKit: iPhone Safari相当の主要フロー');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ja-JP'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });

  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  assert(await page.title() === '軸馬選定ツール', 'タイトルが不正');
  assert(await page.locator('[id^="horse"]').filter({ has: page.locator('.pop') }).count() >= 4, '馬カードが4頭分表示されない');

  // 複数レース下書き：現在の入力を保持したまま次のレースを作成し、一覧から戻れる
  await page.fill('#raceNo', '9');
  await page.fill('#raceName', '下書きA');
  await page.fill('[data-i="0"][data-k="name"]', '下書き馬A');
  await page.click('#newBtn');
  await page.fill('#raceNo', '10');
  await page.fill('#raceName', '下書きB');
  await page.fill('[data-i="0"][data-k="name"]', '下書き馬B');
  await page.click('[data-tab="races"]');
  const raceListText = await page.textContent('#raceList');
  assert(raceListText.includes('9R 下書きA'), '1件目の下書きが一覧に表示されない');
  assert(raceListText.includes('10R 下書きB'), '2件目の下書きが一覧に表示されない');
  const firstDraft = page.locator('#raceList .history').filter({ hasText: '9R 下書きA' });
  await firstDraft.getByRole('button', { name: '開く' }).click();
  assert(await page.inputValue('#raceNo') === '9', '切替後にレース番号が戻らない');
  assert(await page.inputValue('#raceName') === '下書きA', '切替後にレース名が戻らない');
  assert(await page.inputValue('[data-i="0"][data-k="name"]') === '下書き馬A', '切替後に馬入力が戻らない');

  await page.fill('#raceNo', '11');
  await page.fill('#raceName', '自動テスト重賞');
  await page.selectOption('#course', { label: '東京' });
  await page.selectOption('#surface', { label: '芝' });
  await page.fill('#distance', '1600');
  await page.waitForTimeout(100);
  assert(await page.inputValue('#firstTurn') === '長い', '東京芝1600プリセットが反映されない');
  assert(await page.inputValue('#courseLayout') === '通常', 'コース区分が反映されない');

  // 距離延長は単独で注意、距離短縮は位置取りリスクと重なると赤
  await page.fill('[data-i="1"][data-k="prevDistance"]', '1200');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons1')).includes('距離延長：1200→1600m'), '400m距離延長が注意判定されない');
  await page.selectOption('[data-i="1"][data-k="settlingRisk"]', { label: '強い不安' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#badge1')).includes('軸非推奨'), '強い折り合い不安＋距離延長で赤判定にならない');
  assert((await page.textContent('#reasons1')).includes('折り合い×距離延長'), '折り合い複合判定理由が表示されない');

  // 斤量は補助要因：+3kgまたは上位4人気内で相対的に重い場合に黄色
  await page.fill('[data-i="0"][data-k="prevCarryWeight"]', '55');
  await page.fill('[data-i="0"][data-k="currentCarryWeight"]', '58');
  await page.fill('[data-i="1"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="1"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="2"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="2"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="3"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="3"][data-k="currentCarryWeight"]', '56');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons0')).includes('前走比+3kg'), '前走比+3kgの斤量注意が表示されない');
  assert((await page.textContent('#reasons0')).includes('性別補正後で最軽量馬より+2kg'), '相対斤量差の注意が表示されない');

  // 牝馬は2kgアローワンスを補正して相対斤量を比較
  await page.selectOption('[data-i="0"][data-k="sex"]', { label: '牝' });
  await page.fill('[data-i="0"][data-k="prevCarryWeight"]', '56');
  await page.fill('[data-i="0"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="1"][data-k="currentCarryWeight"]', '58');
  await page.fill('[data-i="2"][data-k="currentCarryWeight"]', '58');
  await page.fill('[data-i="3"][data-k="currentCarryWeight"]', '58');
  await page.waitForTimeout(50);
  const mareWeightText = await page.textContent('#reasons0');
  assert(mareWeightText.includes('牝馬は2kgアローワンスを考慮'), '牝馬の斤量補正説明が表示されない');
  assert(!mareWeightText.includes('性別補正後で最軽量馬より'), '牝56kgと牡58kgが同等換算になっていない');
  // 後続テスト用に元へ戻す
  await page.selectOption('[data-i="0"][data-k="sex"]', { label: '牡' });
  await page.fill('[data-i="0"][data-k="prevCarryWeight"]', '55');
  await page.fill('[data-i="0"][data-k="currentCarryWeight"]', '58');
  await page.fill('[data-i="1"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="2"][data-k="currentCarryWeight"]', '56');
  await page.fill('[data-i="3"][data-k="currentCarryWeight"]', '56');
  await page.waitForTimeout(50);

  // 出遅れ傾向：2回以上で注意、短距離内枠や多頭数後方型と重なると赤
  await page.fill('#runnerCount', '16');
  await page.selectOption('[data-i="3"][data-k="startDelayCount"]', { label: '2' });
  await page.selectOption('[data-i="3"][data-k="pos"]', { label: '後方' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#badge3')).includes('軸非推奨'), '出遅れ傾向＋多頭数後方型で赤判定にならない');
  assert((await page.textContent('#reasons3')).includes('出遅れ傾向×位置取り'), '出遅れ複合判定理由が表示されない');

  await page.fill('[data-i="2"][data-k="prevDistance"]', '2000');
  await page.selectOption('[data-i="2"][data-k="style"]', { label: '追込' });
  await page.selectOption('[data-i="2"][data-k="ten"]', { label: 'かなり遅い' });
  await page.selectOption('[data-i="2"][data-k="pos"]', { label: '後方' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#badge2')).includes('軸非推奨'), '大幅短縮＋位置取りリスクで赤判定にならない');
  assert((await page.textContent('#reasons2')).includes('距離短縮×位置取り'), '距離短縮の複合判定理由が表示されない');

  // 小頭数→多頭数
  await page.fill('#runnerCount', '16');
  await page.fill('[data-i="3"][data-k="prevRunnerCount"]', '9');
  await page.selectOption('[data-i="3"][data-k="style"]', { label: '先行' });
  await page.selectOption('[data-i="3"][data-k="ten"]', { label: '速い' });
  await page.selectOption('[data-i="3"][data-k="pos"]', { label: '好位' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons3')).includes('頭数増：前走9頭→今回16頭'), '小頭数→多頭数の注意判定が表示されない');
  await page.selectOption('[data-i="3"][data-k="pos"]', { label: '後方' });
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons3')).includes('出遅れ傾向×位置取り'), '出遅れ複合判定が再適用されない');

  await page.fill('[data-i="2"][data-k="prevRunnerCount"]', '8');
  await page.waitForTimeout(50);
  assert((await page.textContent('#reasons2')).includes('頭数増×位置取り：前走8頭→今回16頭'), '小頭数→多頭数＋後方型の赤判定が表示されない');

  const prevStatus = page.locator('[data-i="0"][data-k="prevStatus"]');
  await prevStatus.selectOption({ label: '不利' });
  assert(await page.locator('#prevTypeWrap0').isVisible(), '前走不利①欄が表示されない');
  assert(await page.locator('#prevOutcomeWrap0').isVisible(), '前走不利①継続欄が表示されない');
  assert(await page.locator('#prevType2Wrap0').isVisible(), '前走不利②欄が表示されない');
  assert(await page.locator('#prevType3Wrap0').isVisible(), '前走不利③欄が表示されない');
  await page.selectOption('[data-i="0"][data-k="prevType"]', { label: '進路' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome"]', { label: '解消' });
  await page.selectOption('[data-i="0"][data-k="prevType2"]', { label: '展開' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome2"]', { label: '継続・再発' });
  await page.selectOption('[data-i="0"][data-k="prevType3"]', { label: '馬場' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome3"]', { label: '一部解消' });
  await page.waitForTimeout(50);
  const multiPrev = await page.textContent('#reasons0');
  assert(multiPrev.includes('前走不利1（進路）：今回は解消見込み'), '前走不利①が個別判定されない');
  assert(multiPrev.includes('前走不利2（展開）：継続・再発リスク'), '前走不利②が個別判定されない');
  assert(multiPrev.includes('前走不利3（馬場）：今回は一部解消'), '前走不利③が個別判定されない');
  await prevStatus.selectOption({ label: '普通' });
  assert(await page.locator('#prevTypeWrap0').isHidden(), '前走不利①欄が自動で隠れない');
  assert(await page.locator('#prevType2Wrap0').isHidden(), '前走不利②欄が自動で隠れない');
  assert(await page.locator('#prevType3Wrap0').isHidden(), '前走不利③欄が自動で隠れない');
  assert(await page.inputValue('[data-i="0"][data-k="prevType2"]') === '特になし', '前走不利②がリセットされない');
  await prevStatus.selectOption({ label: '不利' });
  await page.selectOption('[data-i="0"][data-k="prevType"]', { label: '進路' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome"]', { label: '解消' });
  await page.selectOption('[data-i="0"][data-k="prevType2"]', { label: '展開' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome2"]', { label: '継続・再発' });
  await page.selectOption('[data-i="0"][data-k="prevType3"]', { label: '馬場' });
  await page.selectOption('[data-i="0"][data-k="prevOutcome3"]', { label: '一部解消' });

  await page.locator('[data-i="0"][data-k="prevLed"]').check();
  assert(await page.locator('#canLeadWrap0').isVisible(), '前走逃げ時の再現性欄が表示されない');
  await page.locator('[data-i="0"][data-k="prevLed"]').uncheck();
  assert(await page.locator('#canLeadWrap0').isHidden(), '前走逃げ解除時に欄が隠れない');

  await page.selectOption('#speed', { label: '高速' });
  await page.check('#insideLead');
  await page.check('#insideAdv');
  await page.selectOption('[data-i="0"][data-k="frame"]', { label: '7' });
  await page.waitForTimeout(100);
  assert((await page.textContent('#badge0')).includes('軸非推奨'), '外枠不利ルールで赤判定にならない');

  await page.click('#judgeBtn');
  await page.waitForTimeout(100);
  assert((await page.textContent('#summary')).includes('判定ルール v2.3'), 'ルールVersionが表示されない');
  assert((await page.textContent('#judgeCards')).includes('内枠主導・高速馬場・イン有利で外枠不利'), '判定理由が表示されない');
  assert((await page.textContent('#judgeCards')).includes('距離延長：1200→1600m'), '判定画面に距離延長理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('折り合い×距離延長'), '判定画面に折り合い複合理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('前走比+3kg'), '判定画面に斤量理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('出遅れ傾向×位置取り'), '判定画面に出遅れ複合理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('距離短縮×位置取り'), '判定画面に距離短縮複合理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('頭数増：前走9頭→今回16頭'), '判定画面に頭数増理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('頭数増×位置取り：前走8頭→今回16頭'), '判定画面に頭数増複合理由が出ない');
  assert((await page.textContent('#judgeCards')).includes('前走不利1（進路）：今回は解消見込み'), '判定画面に前走不利①が出ない');
  assert((await page.textContent('#judgeCards')).includes('前走不利2（展開）：継続・再発リスク'), '判定画面に前走不利②が出ない');
  assert((await page.textContent('#judgeCards')).includes('前走不利3（馬場）：今回は一部解消'), '判定画面に前走不利③が出ない');

  await page.selectOption('#finalAxis', { label: '2番人気' });
  await page.selectOption('#decision', { label: '買う' });
  await page.fill('#stake', '1000');
  await page.fill('#payout', '1800');
  await page.fill('#finish0', '4');
  await page.fill('#finish1', '1');
  await page.fill('#finish2', '2');
  await page.fill('#finish3', '3');
  await page.check('#quinella');

  page.once('dialog', dialog => dialog.accept());
  await page.click('#saveBtn');
  await page.waitForTimeout(100);
  assert((await page.textContent('#historyList')).includes('自動テスト重賞'), '履歴保存に失敗');
  assert((await page.textContent('#historyList')).includes('v2.3'), '保存Versionが履歴に出ない');

  await page.click('[data-tab="stats"]');
  await page.waitForTimeout(100);
  const statsText = await page.textContent('#statsBox');
  assert(statsText.includes('ルール別成績'), 'ルール別成績が表示されない');
  assert(statsText.includes('内枠主導・高速馬場・イン有利で外枠不利'), '発動ルールが集計されない');
  assert(statsText.includes('距離延長：1200→1600m'), '距離延長ルールが集計されない');
  assert(statsText.includes('折り合い×距離延長'), '折り合い複合ルールが集計されない');
  assert(statsText.includes('斤量：前走比+3kg'), '斤量ルールが集計されない');
  assert(statsText.includes('出遅れ傾向×位置取り'), '出遅れ複合ルールが集計されない');
  assert(statsText.includes('距離短縮×位置取り'), '距離短縮複合ルールが集計されない');
  assert(statsText.includes('頭数増：前走9頭→今回16頭'), '頭数増ルールが集計されない');
  assert(statsText.includes('頭数増×位置取り：前走8頭→今回16頭'), '頭数増複合ルールが集計されない');
  assert(statsText.includes('前走不利1（進路）：今回は解消見込み'), '前走不利①ルールが集計されない');
  assert(statsText.includes('前走不利2（展開）：継続・再発リスク'), '前走不利②ルールが集計されない');
  assert(statsText.includes('前走不利3（馬場）：今回は一部解消'), '前走不利③ルールが集計されない');
  assert(statsText.includes('発動 1頭'), 'ルール発動件数が不正');

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('[data-tab="history"]');
  assert((await page.textContent('#historyList')).includes('自動テスト重賞'), '再読み込み後に履歴が消える');
  await page.click('[data-tab="races"]');
  const persistedDrafts = await page.textContent('#raceList');
  assert(persistedDrafts.includes('10R 下書きB'), '再読み込み後に別レースの下書きが消える');
  assert(persistedDrafts.includes('11R 自動テスト重賞'), '再読み込み後に編集中レースが消える');

  if (errors.length) throw new Error('ブラウザエラー検出: ' + errors.join(' | '));

  await context.close();

  // 旧保存データとの後方互換スモークテスト
  const legacy = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
  const legacyPage = await legacy.newPage();
  const legacyErrors = [];
  legacyPage.on('pageerror', e => legacyErrors.push(e.message));
  await legacyPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await legacyPage.evaluate(() => {
    const rec = {
      id: 1,
      state: {
        race: { date:'2026-09-01', course:'東京', raceName:'旧データ', surface:'芝', distance:'1600' },
        preAxis: '1',
        horses: [{},{},{},{}]
      },
      greenCount: 4,
      allGreen: true,
      autoAxis: null,
      finalAxis: 1,
      decision: '買う',
      stake: 1000,
      payout: 0,
      quinella: false,
      finishes: [1,2,3,4],
      top4Quinella: true
    };
    localStorage.setItem('jikuba_hist_v3', JSON.stringify([rec]));
  });
  await legacyPage.reload({ waitUntil: 'networkidle' });
  await legacyPage.click('[data-tab="history"]');
  assert((await legacyPage.textContent('#historyList')).includes('旧データ'), '旧履歴を読み込めない');
  await legacyPage.click('[data-tab="stats"]');
  assert((await legacyPage.textContent('#statsBox')).includes('成績集計'), '旧履歴で集計画面が壊れる');
  if (legacyErrors.length) throw new Error('旧データでブラウザエラー: ' + legacyErrors.join(' | '));

  await legacy.close();
  await browser.close();
  console.log('PASS Chromium: input -> judgement -> save -> history -> stats -> reload -> legacy compatibility');
  await safariSmoke();
})().catch(async err => {
  console.error(err);
  process.exit(1);
});
