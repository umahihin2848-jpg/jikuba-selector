# vNext Validation 09 — Golden Set / implementation parity protocol

更新日: 2026-10-28

## 目的

Pythonで検証したvNext Axisロジックと、Safari上のJavaScript実装が完全に同じ計算をしているか確認するための固定テストセットを作る。

統計モデルが正しくても、日付フィルタ・欠損補完・オッズ正規化・rank percentile・標準化・one-hot・tier境界の実装差で結果が変わるため、本番化前に必須とする。

## Golden Set

30レースを固定。

- 2024: 10レース
- 2025: 10レース
- 2026: 10レース

各年でQueue完全/不完全を混在させ、Queue予測0頭のレースも合計4件含む。
G1/G2/G3、芝/ダート、短距離/中距離/長距離、12–15頭/16–18頭を含むよう選定。

期待値ファイル:

- `docs/golden/vnext_axis_golden_set_expected_20261028.csv`
- `docs/golden/vnext_axis_reference_models_20261028.json`

ローカル検証用には全馬runner-level scoreを含む `vnext_axis_golden_set_runners.csv` も保持する。

## 固定ルート

### Queue complete

`FULL_QUEUE`

- Full reference modelを全馬へ適用
- score最大馬をaxis候補
- Full専用Tier境界でA/B/C/D

### Queue incomplete

`FALLBACK_NO_QUEUE`

- Queueあり馬だけでFullを回してはいけない
- Fallback reference modelを全馬へ適用
- score最大馬をaxis候補
- Fallback専用Tier境界でA/B/C/D

### Simplified

Market+M3 candidateはShadow比較のみ。
Production候補へ自動昇格させない。

## Parity合格条件

各Golden raceについて:

1. 全馬の入力特徴量がPython fixtureと一致
2. Market Shareが許容誤差 `1e-10` 以内
3. rank percentileが一致
4. standardized featureが許容誤差 `1e-10` 以内
5. linear logitが許容誤差 `1e-9` 以内
6. logistic scoreが許容誤差 `1e-9` 以内
7. axis horse_noが完全一致
8. A/B/C/D Tierが完全一致
9. Queue complete/incomplete routeが完全一致

1件でも不一致ならProduction mergeしない。

## 特に確認するバグ候補

- TARGET CSVの日付が今回レースより前だけになっているか
- 馬名の表記差/空白で履歴を落としていないか
- JRA限定Ability履歴ポリシーがPythonと同じか
- 単勝オッズの欠損/0/取消をMarket Shareへ入れていないか
- `market_share = (1/odds)/sum(1/odds)` のレース単位分母
- Ability/M3 rank percentileの分母がfield−1か
- Grade表記 G1/G2/G3 の正規化
- Surface表記 芝/ダ の正規化
- Queue coverageの判定が `prediction rows == field` か
- Fallback時にpartial Queue馬だけを候補にしていないか
- scaler mean/scaleの順序
- one-hot係数のカテゴリ順序
- sigmoidの数値誤差
- tier境界で `>=` を使うか

## 実装順

1. reference JSONをJSから読み込む
2. score計算だけをShadowで実装
3. Golden Set 30レースで自動比較
4. 全一致後にUIへA/B/C/Dを表示
5. 旧Shadowの最終BUY/PASS接続はまだ外さない
6. 新UIが安定した後、旧最終判定を段階的に切り離す

