'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '../waku-bc-converter/shape-core-v2.js'), 'utf8');
const browser = {};
vm.runInNewContext(code, { window: browser, Date, TextDecoder, console }, { filename: 'shape-core-v2.js' });
const C = browser.ShapeCore;
assert(C && typeof C.dateVal === 'function', 'ShapeCore.dateVal not found');

// Original unpadded TARGET exports must normalize to YYYYMMDD, not Date.parse() milliseconds.
const cases = [
  ['2026.10. 4', 20261004],
  ['2026. 6. 7', 20260607],
  ['2025.11.30', 20251130],
  ['2026-10-04', 20261004],
  ['2026/6/7', 20260607],
  ['2026年6月7日', 20260607],
  ['261004', 20261004],
  ['20261004', 20261004],
  ['20261004123000', 20261004],
  ['20240229', 20240229],
  ['20260229', 0],
  ['2026. 13. 7', 0],
  ['2026. 2. 30', 0],
  ['', 0]
];
for (const [input, expected] of cases) {
  assert.equal(C.dateVal(input), expected, 'Date '+JSON.stringify(input)+' must be '+expected);
}

// A race on Oct 4 must not include its own finishing result, and should retain
// chronological strictly prior starts regardless of original day/month padding.
const raceDate = C.dateVal('2026-10-04');
const source = ['2026.10. 4','2026. 6. 7','2026. 4. 5','2026. 3. 1',
  '2025.11.30','2025.11. 2','2025. 5.10','2025. 2.16','2024.11.30'];
const recent5 = source.map(v => C.dateVal(v)).filter(d => d && d < raceDate)
  .sort((a,b) => b-a).slice(0,5);
assert.deepEqual(Array.from(recent5), [20260607,20260405,20260301,20251130,20251102]);
console.log('PASS P3-41 date contract: '+cases.length+' cases; strictly prior last-5 starts');
