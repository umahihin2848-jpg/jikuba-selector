# vNext Axis S候補 独立検証

更新日: 2026-10-28
対象: Axis A群のみ
基準: 2019-23開発 / 2024-26確認。2024-26では新しい閾値探索を行わない。

## 1. 目的

Axis Aの中からSへ昇格させる際、AxisBaseに既に含まれるAbility / M3 / Market Share / Queue情報の言い換えではなく、独立した追加情報だけを使う。

検証候補:
- Front Pack Separation (FPS)
- CourseFit
- 市場構造追加情報（favorite dominance / Neff / top3 market share）

## 2. FPS

A群でFPS上位25%を2019-23分布だけから固定（cut = 0.300691）。この閾値は結果を見て好走率最大化したものではなく、分布上の上位四分位。

### 3着内率
- 2019-23: FPS高 28/35 = 80.0%、その他 69/104 = 66.3%
- 2024-26: FPS高 9/11 = 81.8%、その他 31/42 = 73.8%

### 独立性
Axis scoreとのSpearman相関:
- 2019-23: -0.009
- 2024-26: +0.158

市場系変数に比べ、Axis scoreとの重複が非常に小さい。

### 増分モデル
A群で `Axis score` と `Axis score + FPS` を比較。
2024-26では連続FPS追加で識別AUCは改善方向（約 +0.105）。Bootstrap 95%CIはAUC差でおおむね0より上だが、LogLoss/Brier改善CIは0を跨ぐ。
固定FPS-highルールでは識別は改善方向だが、LogLoss/Brierはほぼ中立。

### 年別注意
2024ではFPS高群 3/5=60.0%、その他 13/18=72.2%で逆転。2025では5/5=100% vs 9/15=60.0%。2026はFPS高が1例のみ。

### 判定
**🧪 S候補Shadow。正式Sには未昇格。**

理由:
- A群の中でも独立情報であることは強い
- 開発/確認の集計方向は一致
- ただし確認11例と少なく、年別完全安定ではない
- 2027 Forwardで固定条件を追加確認する

アプリでは当面 `A+ / S候補` などのShadow表示に留め、本番Sとして扱わない。

## 3. CourseFit

以前固定した再現コースだけで、Position Loss v3補正位置とコース好位置中心の距離を連続CourseFitとして使用。

A群でCourseFitが評価可能だった件数:
- 2019-23: 18/139 = 12.9%
- 2024-26: 2/53 = 3.8%

確認期間はわずか2例で、S昇格条件としての性能評価が不可能。

### 判定
**🧪 Courseモジュールとして保持、S昇格材料としては保留。**

CourseFitそのものは全該当馬の分析表示・補助評価には残すが、現時点でA→S昇格には使わない。

## 4. 市場構造の追加情報

AxisBaseには既にMarket Shareが含まれている。したがって追加市場変数はMarket Shareを超える独立価値が必要。

Axis scoreとのSpearman相関:

|変数|2019-23|2024-26|
|---|---:|---:|
|favorite dominance|+0.681|+0.668|
|Neff ratio|-0.776|-0.701|
|top3 market share|+0.583|+0.373|
|Market Share|+0.891|+0.814|
|FPS|-0.009|+0.158|

市場構造変数はAxis scoreと強く重複する。

A群における `Axis score + 追加市場変数` の確認結果:
- Dominance: AUC/LogLoss/Brierとも改善せず
- Neff: 小幅改善方向だがCIが広く、独立性も低い
- top3 market share: AUCは上がるがLogLoss/Brierが悪化し、2024-26で安定増分なし

### 判定
**👁/🧪 市場構造表示には残すが、S昇格材料には使わない。**

Market ShareをAxis本体へ入れた後にDominance/集中度を再加点すると二重計上になりやすい。

## 5. 現時点のS方針

正式Production Sはまだ作らない。

- A: Production候補として維持
- A + FPS高: `S候補Shadow / A+` として記録
- CourseFit: 該当時に分析表示するがS昇格なし
- 市場構造追加: S昇格なし

2027 Forwardで `A + FPS高` を固定し、件数が蓄積してから正式Sへの昇格を判断する。

## 6. 禁止事項

- FPS閾値を2024-26結果に合わせて動かさない
- CourseFit対象コースをA群の結果を見て追加しない
- Market Dominance等をSへ追加して80%超になる組合せを探索しない
- S件数が少ないことを理由に複数条件を後付けで足さない
