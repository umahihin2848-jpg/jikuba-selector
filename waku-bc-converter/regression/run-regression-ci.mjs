import { chromium } from 'playwright';

const base = process.env.RSA_REGRESSION_URL || 'http://127.0.0.1:8080/waku-bc-converter/regression/regression-v3.html';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', msg => logs.push(`[browser:${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[pageerror] ${err.stack || err.message}`));
try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#runBtn:not([disabled])', { timeout: 30000 });
  await page.click('#runBtn');
  await page.waitForFunction(() => {
    const s = document.getElementById('summary')?.textContent || '';
    return /^\d+\/\d+ races PASS/.test(s);
  }, { timeout: 180000 });
  const summary = (await page.locator('#summary').textContent())?.trim() || '';
  const failed = await page.locator('.case.fail').evaluateAll(nodes => nodes.map(n => n.innerText));
  console.log(`Regression summary: ${summary}`);
  if (failed.length) console.error('Failed cases:\n' + failed.join('\n\n'));
  if (summary !== '5/5 races PASS ✓' || failed.length) {
    console.error(logs.join('\n'));
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err.stack || err.message);
  console.error(logs.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
