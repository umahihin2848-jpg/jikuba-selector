# vNext Validation 09 — Shadow implementation / Golden browser test

更新日: 2026-10-28

## 目的

検証済み vNext Axis を Production 判定へ接続せず、Shadow としてブラウザ実装し、Python/JSON基準値と JavaScript 計算の一致を確認する。

## 実装

ブランチ `vnext-logic-ledger` に以下を追加。

- `waku-bc-converter/vnext-axis-core-v1.js`
- `waku-bc-converter/vnext-axis-shadow-v1.js`
- `waku-bc-converter/data/vnext_axis_reference_models_20261028.json`
- `waku-bc-converter/vnext-axis-golden-selftest.html`
- Golden fixture chunks 4 files

既存 `axis-reliability-shadow-v1.js` から研究ブランチ上だけ vNext core/shadow を追加ロードする。
旧 AxisReliability / MobileFinalSummary の判定ロジックは変更しない。

## 重要な互換性方針

研究で Full Axis に使った `pred_front` は、現行ブラウザ `ValidatedQueueState.posFrac` と同じモデル/定義ではない。

そのため現行Queue値を Full Axis の `pred_front` に代入しない。

- `window.VNextAxisExactQueueState` に研究時互換の `pred_front` が全馬分ある場合のみ Full を有効化
- それ以外は Fallback Axis を Shadow の正本表示にする
- Simplified Market+M3 は比較 Shadow
- Production は常に未変更

## Golden Set

30レース、2024/2025/2026 各10レース。
Queue complete / incomplete / zero queue を含む。

Chromium JavaScript 再計算結果:

- Full: 14/14
- Fallback: 30/30
- Simplified: 30/30
- Route: 30/30
- Axis horse: 30/30
- Tier: 30/30
- max Full score error: 5.55e-17
- max Fallback score error: 1.11e-16
- max Simplified score error: 1.11e-16
- max chosen Axis score error: 1.11e-16

合格条件 `score abs error < 1e-10` を十分満たした。

## Golden Set が発見した実装バグ

初回 core 実装では JavaScript の `Number(null) === 0` により、欠損 `pred_front=null` を 0 と解釈する可能性があった。

修正後:

```js
const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const num = v => {
  if (v === null || v === undefined || v === '') return NaN;
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
};
```

修正後Golden Setを再実行し全一致を確認。

## Shadow adapter smoke test

ブラウザDOM/StateをGoldenレースで模擬し、実際の `vnext-axis-shadow-v1.js` 経由でも確認。

Fallback例:

- route: `FALLBACK_RUNTIME_SAFE`
- expected: 6番 / B / 0.6217179945687796
- got: 6番 / B / 0.62171799456878
- `productionChanged=false`

Exact Queue Full例:

- route: `FULL_EXACT_QUEUE`
- expected: 4番 / C / 0.5022496016018692
- got: 4番 / C / 0.5022496016018693
- `productionChanged=false`

## Safariについて

この実行環境には実Safari/WebKit実機がないため「Safari合格」とはまだ記録しない。

ブラウザ自己診断ページをブランチへ追加したので、Safariで同ページを開いた際に同一Golden 30レースを自動再計算し PASS/FAIL を表示できる。

Production昇格条件には Safari 実機PASSを残す。

## 現時点の判定

- 数式移植: PASS
- JavaScript倍精度再現: PASS
- Chromium browser Golden test: PASS
- Shadow adapter wiring: PASS
- Production isolation: PASS
- Safari actual browser: PENDING
- Full live queue compatibility: PENDING（互換pred_frontを実装するまでFallbackを使用）

したがって現時点では Shadow 運用まで許可し、Productionへの置換は行わない。
