# vNext Validation 04 — Axis A/B/C/D + S candidate

更新日: 2026-10-28

## 目的

Market層の整理後、vNextのAxis Reliability基礎を構築する。
Sは無理に確定せず、まずA/B/C/Dの年代再現性を確認する。

対象: G1–G3、12頭以上。Validated Queueが得られる866レース。

- 2019–23: 開発。各年を1年ずつ外すLOYOでrunner-level scoreを生成
- 2024–26: 既知の確認期間

## AxisBase入力

AxisBaseは以下のみを使用する。

- Ability P3
- Ability rank percentile
- M3 rank percentile
- M3 score
- Market Share（単勝暗黙確率をレース内正規化）
- validated predicted front position
- history amount
- field size / distance / grade / surface（control）

Position Loss v3 / P10-v3は同じqueue情報の派生なので、別加点しない。
FPSはS候補用に後段で別検証する。
Market Dominance / Neff / CourseFitもAxisBaseへ混ぜない。

## 候補馬の選び方

各レースでAxisBase scoreが最大の1頭だけを「そのレースの軸候補」とする。

2019–23 LOYOで得た軸候補score分布の四分位点を固定し、

- A = 上位25%
- B = 50–75%
- C = 25–50%
- D = 下位25%

とした。
2024–26の結果を見て境界は動かしていない。

固定score境界（development OOF）:

- A: score >= 0.644794
- B: 0.564534 <= score < 0.644794
- C: 0.486251 <= score < 0.564534
- D: score < 0.486251

## 結果

| Period | Tier | n | Top3 rate |
|---|---|---:|---:|
| 2019–23 | A | 139 | 69.8% |
| 2019–23 | B | 139 | 56.8% |
| 2019–23 | C | 139 | 54.0% |
| 2019–23 | D | 139 | 36.7% |
| 2024–26 | A | 53 | **75.5%** |
| 2024–26 | B | 71 | **64.8%** |
| 2024–26 | C | 96 | **53.1%** |
| 2024–26 | D | 90 | **32.2%** |

2024–26ではA > B > C > Dが明確に再現した。
開発期間でもA > B > C > Dの方向を維持した（B/C差は小さい）。

## S候補: A + FPS high

SはAxis scoreをさらに高く切るだけでは作らない。
独立性が比較的高いFront Pack SeparationをAへの確認材料として検証した。

A群の2019–23 FPS分布上位25%を固定境界にする。
FPS high threshold = 0.300691

| Period | A subgroup | n | Top3 rate |
|---|---|---:|---:|
| 2019–23 | A, FPS not high | 104 | 66.3% |
| 2019–23 | A + FPS high | 35 | **80.0%** |
| 2024–26 | A, FPS not high | 42 | 73.8% |
| 2024–26 | A + FPS high | 11 | **81.8%** |

方向は非常に良いが、2024–26のS候補は11例のみ。
したがってSはProduction確定しない。

## vNext採否

- A/B/C/D: ✅ Base tierとして採用候補
- S: 🧪 Shadow。`A + independent confirmation`思想は維持するが正式化しない
- FPS: S候補のindependent confirmationとしてForward継続
- P10-v3: 表示/queue説明。AxisBaseへ別加点しない
- Market Dominance: S材料にまだ使わない
- CourseFit: 母集団が限定されるため、S材料としては別途Forward確認

## 解釈

A/B/C/Dは「馬の絶対能力ランク」ではなく、そのレースで最も軸に向く候補の信頼度。

SはAの上位scoreを切っただけの階級にしない。
Aに対してQueue / Course / Marketなど別系統の確認が将来データで再現した場合だけ昇格させる。
