const { chromium, webkit } = require('playwright');
const assert = require('assert');

const BASE = 'http://127.0.0.1:4173/waku-bc-converter/scanner.html';

function makeRace(i) {
  const raceNo = (i % 12) + 1;
  const venue = ['東京', '京都', '新潟'][Math.floor(i / 12)];
  const horses = Array.from({ length: 16 }, (_, j) => ({
    horseNo: j + 1,
    frame: Math.floor(j / 2) + 1,
    // Concentrated enough that scanner must create green candidates.
    winOdds: [2.0, 3.2, 4.8, 6.5, 14, 18, 23, 29, 36, 44, 55, 68, 82, 100, 125, 160][j]
  }));
  const frameOdds = {
    '1-2': 3.0, '1-3': 4.0, '1-4': 5.0, '1-5': 6.0,
    '1-6': 7.0, '1-7': 8.0, '1-8': 12.0, '2-3': 16.0
  };
  return {
    date: '2026-10-05', venue, raceNo, raceName: `Scanner Test ${i + 1}`,
    startTime: '12:00', runners: 16, horses, frameOdds
  };
}

const feed = {
  source: 'scanner-e2e-dummy',
  generatedAt: '2026-10-05T08:00:00+09:00',
  snapshot: 'E2E',
  races: Array.from({ length: 36 }, (_, i) => makeRace(i))
};

async function run(browserType, name) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: name === 'webkit' ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.route('**/waku-bc-converter/data/today.json*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(feed)
  }));

  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('#refresh');
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('取得 36R'));

  assert.strictEqual(await page.textContent('#count'), '36R', `${name}: 36 races should load`);
  const storedCount = await page.evaluate(() => JSON.parse(localStorage.getItem('wakuRaceScannerV2')).rows.length);
  assert.strictEqual(storedCount, 36, `${name}: all races should persist`);

  await page.click('[data-f="green"]');
  const greenCount = await page.locator('.race').count();
  assert(greenCount > 0, `${name}: scanner should extract green candidates`);
  assert.strictEqual(await page.locator('.detail').count(), greenCount, `${name}: every green race should expose detail handoff`);

  const expected = await page.locator('.detail').first().getAttribute('data-id');
  await page.locator('.detail').first().click();
  await page.waitForURL('**/waku-bc-converter/app-v4.html?fromScanner=1');

  const handoff = await page.evaluate(() => JSON.parse(localStorage.getItem('wakuScannerHandoffV1')));
  assert(handoff, `${name}: handoff payload should exist`);
  assert.strictEqual(`${handoff.date}|${handoff.venue}|${handoff.raceNo}`, expected, `${name}: clicked race must be handed off unchanged`);
  assert(Array.isArray(handoff.horses) && handoff.horses.length === 16, `${name}: horse data must survive handoff`);
  assert(handoff.frameOdds && Object.keys(handoff.frameOdds).length >= 3, `${name}: frame odds must survive handoff`);

  await browser.close();
  console.log(`PASS scanner ${name}: 36R -> green extraction -> detail handoff`);
}

(async () => {
  await run(chromium, 'chromium');
  await run(webkit, 'webkit');
})().catch(err => { console.error(err); process.exit(1); });
