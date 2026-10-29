# 4能力 + 消耗負荷 Shadow への構造変更

日付: 2026-10-29

## 結論

従来の5能力プロフィールから「消耗戦」を主能力として外し、次の4能力を主表示とする。

1. 基礎スピード
2. 超速力
3. 加速力
4. 持続力

消耗戦は第5能力として順位付けしない。

代わりに、展開タブで「消耗負荷チェック / Conditional Shadow」として、今回の予測隊列と前傾シナリオを並べて観察する補助表示へ格下げする。

## 根拠

既存検証では以下が再現しなかった。

- 旧 消耗戦: 2023〜2026で対応レースにおける上位馬が4年連続マイナス方向
- 消耗戦 v2: 2024 +7.5pt / 2025 -5.4pt / 2026 -1.5pt、人気調整後 OR 0.951, p=0.825
- 位置別・耐失速力 v1: 2024 -5.1pt / 2025 -3.1pt / 2026 -0.7pt、人気調整後 OR 0.776, p=0.322

したがって「消耗戦能力が高い馬」という固定ランキングを出す根拠は不足している。

一方で、今回の隊列とペース条件そのものは既存の独立モデルとして表示価値があるため、能力値へ統合せず条件付きの観察情報として残す。

## 実装

### 主能力

4能力のみを表示・優勢判定・メンバーランキングに使用する。

- speed
- ultra
- accel
- sust

旧 attr フィールドは互換性のため既存state内に残る場合があるが、主表示・優勢判定・ランキングには使用しない。

### 消耗負荷 Shadow

新規 `ability-structure-4plus-shadow-v1.js` で表示する。

使用する情報:

- `MobileAnalysisCoreState` のRPCIシナリオ確率
- 強前傾 + 前傾の合計確率
- `ValidatedQueueState` の今回予測ポジション
- 前受け候補（ハナ候補 / 前 / 好位）
- 予測番手
- 過去5走先行率
- 追走グレード

使用しない情報:

- 旧 消耗戦 v1 スコア
- 消耗戦 v2 スコア
- 位置別・耐失速力 v1 スコア

### 影響範囲

Shadowは以下へ影響させない。

- Ability
- M3
- 勝率 / 連対率 / 複勝率
- 馬券候補
- EV
- 軸順位

`predictionImpact=false`
`probabilityImpact=false`
`rankingImpact=false`
`ticketImpact=false`

## Forward方針

このShadowから新しい閾値や係数を2024〜2026へ後付けしない。

2027年の前向きデータで、

> 今回前受け予測 × 前傾シナリオ

の条件下で、どの既存指標が有効かを記録する。

十分なForwardデータが蓄積するまでは、消耗戦を第5能力へ戻さない。

## 状態

`PRIMARY_ABILITY_COUNT = 4`

`ATTRITION_PRIMARY_ABILITY = REMOVED`

`ATTRITION_ROLE = CONDITIONAL_FORWARD_SHADOW`

`PREDICTION_IMPACT = NONE`
