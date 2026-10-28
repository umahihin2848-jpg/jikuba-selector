# vNext Validation 08 — Axis score calibration and tier-boundary stability

更新日: 2026-10-28

## 目的

Axis scoreをそのまま「3着内確率」と誤解しないため、top-candidate scoreの較正と、A/B/C/D境界の不確実性を確認する。

対象モデル:

1. Full AxisBase（Validation 04 reference）
2. Simplified candidate = Market + M3 + reliability/controls

## Top-candidate calibration

### Full AxisBase

2019–23 OOF:

- mean score 0.5676
- actual Top3 54.3%
- calibration intercept -0.092
- calibration slope 0.949
- 4-tier ECE 3.13pt

2024–26:

- mean score 0.5396
- actual Top3 53.5%
- calibration intercept -0.047
- calibration slope 1.185
- 4-tier ECE 4.26pt

### Simplified Market + M3

2019–23 OOF:

- mean score 0.5693
- actual Top3 54.5%
- calibration intercept -0.086
- calibration slope 0.929
- 4-tier ECE 4.12pt

2024–26:

- mean score 0.5433
- actual Top3 56.5%
- calibration intercept +0.079
- calibration slope 1.077
- 4-tier ECE 4.67pt

## 解釈

Full/Simplifiedとも極端なmiscalibrationではないが、scoreを「0.71 = 71%」のように文字通りの確率として表示する精度ではない。

Production UIではscoreを内部連続値として使い、ユーザーにはA/B/C/Dとモジュール内訳を主表示する。

## Boundary bootstrap

2019–23のtop-candidate scoreをレース単位相当で5000回再標本化し、四分位境界の95%範囲を確認。

### Full AxisBase

固定境界:

- D/C 0.486251
- C/B 0.564534
- B/A 0.644794

Bootstrap 95%範囲:

- D/C: 0.4764–0.4951
- C/B: 0.5530–0.5741
- B/A: 0.6303–0.6569

2024–26候補310頭のうち、その境界帯に入る頭数:

- D/C: 16頭（5.2%）
- C/B: 30頭（9.7%）
- B/A: 11頭（3.5%）

### Simplified Market + M3

固定境界:

- D/C 0.489809
- C/B 0.564592
- B/A 0.645143

Bootstrap 95%範囲:

- D/C: 0.4802–0.5016
- C/B: 0.5532–0.5776
- B/A: 0.6298–0.6626

2024–26境界帯:

- D/C: 19頭（6.1%）
- C/B: 28頭（9.0%）
- B/A: 15頭（4.8%）

## Tier stability

Fullでは2024–26候補の約86.1%が、bootstrap境界変動に対して元Tierへ90%以上の確率で残った。
Simplifiedでは約86.5%。

AとDは特に安定し、B/C近辺が最も境界不確実性が大きい。

## Production方針

- scoreは内部値。生の%表示をしない。
- A/B/C/Dは維持する。
- scoreがbootstrap境界帯に入る場合、UIで `境界付近` を表示する候補。
- 境界付近だから自動降格はしない。
- 特にB/Cは近い信頼帯として扱い、過度に意味を分けない。
- B/A境界帯はFullで確認期間の3.5%だけなので、A判定の大半は境界に依存しない。

