# vNext Validation 06 — Queue missingness / Fallback Axis

更新日: 2026-10-28

## 目的

Position Loss v3 / P10-v3は全馬のQueue予測が揃うレースで厳密検証したが、実戦ではQueueが欠けるレースがある。

vNext実装前に、Queue不完全時のAxis候補選定が欠損馬の除外で歪まないようFallbackを固定する。

## Queue完全率

866レース中、全馬Queue予測が揃ったのは516レース = 59.6%。

年別完全率:

- 2019: 59/108 = 54.6%
- 2020: 68/108 = 63.0%
- 2021: 66/111 = 59.5%
- 2022: 72/117 = 61.5%
- 2023: 69/117 = 59.0%
- 2024: 64/115 = 55.7%
- 2025: 64/114 = 56.1%
- 2026: 54/85 = 63.5%

したがってQueue完全を前提にProductionを組むことはできない。

## Fallback定義

Queue不完全レースでは、Queue予測がある馬だけでAxis候補を選ばない。

Fallback Axisは、Validation 04の正本と同じL2 logistic / `C=0.1` を使い、通常AxisBaseから `pred_front` だけを除く。

使用:

- Ability P3
- Ability rank percentile
- M3 rank percentile
- M3 score
- Market Share logit
- history amount
- field size
- distance
- grade / surface controls

不使用:

- pred_front
- Position Loss v3
- P10-v3
- FPS

Fallback用Tier境界は2019–23のQueue不完全レース候補score四分位だけから固定。

- A: score >= 0.654064
- B: 0.573666 <= score < 0.654064
- C: 0.513495 <= score < 0.573666
- D: score < 0.513495

2024–26を見て境界は動かしていない。

## Fallback tier結果

2019–23 Queue不完全227レース:

- A: 57頭, 68.4%
- B: 57頭, 49.1%
- C: 56頭, 57.1%
- D: 57頭, 43.9%

2024–26 Queue不完全132レース:

- A: 22頭, 77.3%
- B: 39頭, 64.1%
- C: 34頭, 58.8%
- D: 37頭, 40.5%

確認期間ではA > B > C > Dが再現。
DevelopmentではB/Cが逆転するため、B/Cを強く分離しすぎない方針は通常Axisと同じ。

## 現行partial-queue候補との比較

「Queue予測できた馬だけで通常Axis候補を選ぶ」方式と、Fallbackで全馬を再評価する方式を同一レースで比較。

2019–23 Queue不完全222レース（通常Axis候補が存在するレース）:

- 同じ候補: 76.6%
- 通常partial Axis候補 Top3: 53.6%
- Fallback候補 Top3: 55.9%
- 差 +2.25pt, bootstrap 95%CI 約 -3.15〜+7.66pt

2024–26 Queue不完全128レース:

- 同じ候補: 73.4%
- 通常partial Axis候補 Top3: 51.6%
- Fallback候補 Top3: 57.0%
- 差 +5.47pt, bootstrap 95%CI 約 -0.78〜+11.72pt

CIは0を跨ぐのでFallbackが優越すると断定しない。しかし、欠損馬を候補集合から落とす方式より劣化する証拠はなく、全馬を同一条件で評価できるため実装上安全。

## Production方針

- Queue coverage = 100%: 通常AxisBaseを使用
- Queue coverage < 100%: Fallback Axisを全馬に使用
- partial raceでQueueあり馬だけ通常Axisへ通すことは禁止
- FallbackレースではPosition Loss v3 / P10-v3 / FPSをAxis判定へ使用しない
- UIに `Queue confidence: partial / Fallback` を表示
- Fallback A/B/C/Dは専用development境界を使用し、通常Axis score境界と混用しない

## 注意

2024–26の完全QueueレースでもFallback候補のTop3率が通常Axis候補より高い差が見えたが、これはQueueが不要という結論にはしない。
Queue特徴量の本当の増分はAblation検証で別途評価する。

