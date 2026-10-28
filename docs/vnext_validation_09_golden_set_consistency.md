# vNext Validation 09 — Golden Set consistency

更新日: 2026-10-28

## 目的

vNext Axis の統計モデル定義と、独立した再計算実装が同じ結果を返すことを確認する。

この検証は統計モデルの妥当性検証ではなく、**モデル定義・係数・標準化・ルーティング・Tier判定の再現性検証**である。

## 対象

Golden Set 30レース / 464頭。

- 2024: 10レース
- 2025: 10レース
- 2026: 10レース
- FULL_QUEUE: 14レース
- FALLBACK_NO_QUEUE: 16レース
- Queue 0頭: 4レース
- Tier coverage: A=4, B=6, C=11, D=9
- Grade coverage: G1=3, G2=6, G3=21
- Surface coverage: 芝=27, ダ=3
- Distance coverage: <=1599m=4, 1600–1999m=12, >=2000m=14
- Field coverage: 12–15頭=14, 16–18頭=16

## 再計算仕様

### 共通派生特徴

- `ab_rank_pct = 1 - (abRank_wf - 1) / (field - 1)`
- `m3_rank_pct = 1 - (m3Rank_wf - 1) / (field - 1)`
- `market_logit = log(market_share / (1 - market_share))`

Market Shareは各Goldenレースで合計1.0を確認。最大丸め誤差は約 `1.1e-15`。

各numeric featureはreference model JSON内のmean/scaleで標準化し、保存係数を掛ける。categoricalは保存levelのone-hotを使用。最後にsigmoidでscoreへ変換する。

## Python独立再計算

保存済みrunner scoreとの最大絶対誤差:

- Full reference: `5.62e-16`（比較可能316頭）
- Fallback reference: `6.28e-16`（464頭）
- Simplified shadow: `5.86e-16`（比較可能316頭）

すべて倍精度浮動小数点の機械誤差レベル。

## JavaScript独立再計算

Node.js / JavaScript `Number`（IEEE-754 binary64）で同じJSONを読み、Pythonとは別実装で再計算。

保存済みrunner scoreとの最大絶対誤差:

- Full reference: `5.62e-16`
- Fallback reference: `6.28e-16`
- Simplified shadow: `5.86e-16`

`1e-12`許容基準をすべて通過。

## 30レース最終判定

Golden expected と独立再計算を比較。

- Route一致: **30/30**
- Axis horse number一致: **30/30**
- Axis horse name一致: **30/30**
- Tier一致: **30/30**
- Axis score最大誤差: `2.22e-16`

Tier比較は保存thresholdに対して `>=` を使用。

Golden 30レースの選択軸で最もTier境界に近い例でも、境界まで約 `1.03e-4` 離れている。したがって通常の倍精度丸め誤差でTierが反転する状況ではない。

## 受け入れ基準

Safari / Production Shadow実装時は以下を必須とする。

1. route: 完全一致
2. axis horse: 完全一致
3. tier: 完全一致
4. numeric score: `abs(JS - expected) < 1e-10`
5. market_share: race内合計 `abs(sum - 1) < 1e-12`
6. Tier境界比較: referenceと同じ `>=` semantics
7. Queue不完全時にpartial runnerだけでFullを計算しない

`1e-9完全一致`は要求しない。最終判定は完全一致、連続値は数値許容差で判定する。

## Simplified Shadowの注意

現Golden runner fixtureでは `simplified_score` が148頭で空欄で、これはFull score欠損（Queue featureなし）と同じ行に対応する。

Simplified model自体はQueueを入力に使わないため数式上は計算可能だが、現在の保存済み比較対象はFull評価母集団由来の316頭だけである。

したがって現時点では:

- Full reference: Golden検証可
- Fallback reference: Golden検証可
- Simplified shadow: **Queue featureがある316頭でのみ再現性検証済み**

SimplifiedをQueue不完全レースにも正式表示する場合は、専用の保存済みexpected fixtureを追加してから行う。

## 結論

reference model JSONと独立Python/JavaScript再計算の整合性は確認できた。

ただしこれはまだSafari実アプリの統合検証ではない。

次段階はvNext AxisをShadow実装し、同じGolden 30レースでブラウザ実行結果を照合する。Production切替は、そのShadowが上記受け入れ基準を全て通過した後に行う。
