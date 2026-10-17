# QMD incremental validation: Win Edge and dangerous-favorite context (2026-10-17)

## Goal
Test the previously proposed sequence without adding new horse/race factors or optimizing ROI:

1. QMD alone,
2. QMD + Win Condition Edge,
3. QMD + dangerous-favorite context.

The question is whether either existing layer contributes **incremental** information after QMD, not whether a profitable threshold can be found.

All price variables are final / closing odds. This remains a market-structure validation, not an executable T-15 backtest.

---

# A. QMD + Win Edge

## Universe
Use the previously generated positive axis-partner application pool:
- one positive Win Condition Edge axis per race,
- positive Top3 Condition Edge partners,
- quinella pair rows,
- 2021-2026 available.

Walk-forward evaluation starts in 2022:
- 2022-2026 evaluation rows: **5,871 pairs**
- **1,773 races**.

For each pair, QMD is reconstructed directly from the two actual closing markets:

`R = q_single-win-implied / q_quinella-market`

where the single-win implied pair probability is the coherent Plackett-Luce pair probability from normalized single-win odds.

Two conservative offset-logistic residual models were fit using only earlier years:
- `QMD`: market pair probability + log(R)
- `QMD + Win`: market pair probability + log(R) + log(axis Win Edge)

L2 penalty lambda=10. The intercept is allowed to absorb the fact that this candidate universe is already preselected.

## Year-by-year log loss
Lower is better.

| Year | Market | QMD | QMD + Win | QMD-Market | Add Win vs QMD |
|---|---:|---:|---:|---:|---:|
| 2022 | 0.039065 | 0.039143 | 0.039168 | +0.000078 | +0.000025 |
| 2023 | 0.035132 | 0.035321 | 0.035327 | +0.000189 | +0.000006 |
| 2024 | 0.056949 | 0.056700 | 0.056702 | -0.000248 | +0.000001 |
| 2025 | 0.036550 | 0.036432 | 0.036440 | -0.000118 | +0.000009 |
| 2026 | 0.052859 | 0.052156 | 0.052144 | -0.000703 | -0.000012 |

Pooled 2022-2026:
- Market: **0.043743**
- QMD: **0.043611**
- QMD + Win: **0.043617**

So QMD improves the selected candidate pool slightly in the pooled result, but the improvement is not stable enough in this already-selected sub-universe:
- pooled QMD-market delta: **-0.000132**
- race-bootstrap 95% CI: approximately **[-0.000528, +0.000227]**.

Most importantly, adding the numeric axis Win Edge after QMD does **not** help:
- QMD+Win minus QMD pooled delta: **+0.0000065** (slightly worse)
- race-bootstrap 95% CI: approximately **[-0.000025, +0.000042]**.

The fitted Win-Edge coefficient is tiny and changes sign across walk-forward fits. There is no stable incremental effect.

### Interpretation
This does **not** invalidate horse-level Win Condition Edge. The candidate universe is already selected using Win Edge, so much of its useful information has already entered through selection.

What fails is the stronger claim:

> after a pair has already been selected around a positive Win-Edge axis, the magnitude of axis Win Edge should further correct the quinella probability.

The data do not support that extra correction.

---

# B. QMD + dangerous favorite

## Universe
For the dangerous-favorite test, use the full 2025-2026 application-style quinella pair universe available in the existing P10 reconstruction:
- 2025: 401 races
- 2026: 297 races
- total pair rows: **75,999**.

Dangerous favorite remains the previously fixed definition:

`market favorite AND P10 >= 65%`.

Pair context is separated into:
- `danger_include`: pair contains the dangerous favorite,
- `danger_exclude`: dangerous-favorite race, but the pair excludes that favorite,
- ordinary race.

No threshold is tuned.

## Raw market residual by context

| Year | Context | Pairs | Market O/E | Closing ROI |
|---|---|---:|---:|---:|
| 2025 | ordinary | 27,021 | **1.004** | 66.0% |
| 2025 | includes dangerous favorite | 2,091 | **0.998** | 71.7% |
| 2025 | excludes dangerous favorite | 14,247 | **1.025** | 75.5% |
| 2026 | ordinary | 24,609 | **1.009** | 67.6% |
| 2026 | includes dangerous favorite | 1,040 | **0.931** | 72.5% |
| 2026 | excludes dangerous favorite | 6,991 | **1.072** | 77.5% |

The direction is consistent with the earlier dangerous-favorite finding:
- pairs containing the vulnerable favorite are not attractive relative to market expectation,
- pairs excluding it have O/E above 1 in both years,
- but raw ROI remains below 100%.

## 2025 -> 2026 holdout
Train on 2025 only, test on untouched 2026.

Models:
- `QMD`: market pair probability + log(R)
- `QMD + danger`: QMD + danger_include + danger_exclude

Conservative L2 lambda=10.

2026 result:
- Market LogLoss: **0.043997**
- QMD: **0.043965**
- QMD + danger: **0.043958**
- incremental delta, danger vs QMD: **-0.0000078**.

Race-bootstrap 95% CI for that incremental delta:

**[-0.000046, +0.000032]**.

So dangerous-favorite context adds a tiny favorable point estimate after QMD, but the uncertainty clearly includes zero. It is **not yet an independently validated probability correction**.

A sensitivity version allowing QMD x danger interactions can improve the 2026 point estimate slightly, but this adds parameters and the conclusion remains the same: evidence is too weak for deployment.

---

# C. Important stress test: dangerous favorite inside the Win/Top3 selected candidate pool

The dangerous-favorite context was also tested inside the already-selected Win-Edge axis + positive Top3-partner candidate pool.

Train 2025 -> test 2026:
- QMD LogLoss: **0.052395**
- QMD + dangerous-favorite context: **0.055748**
- delta: **+0.003353** (substantially worse).

The selected-pool context also flips behavior because the number of relevant hits is small:
- 2025 dangerous-favorite-excluding candidate pairs: O/E **1.315**
- 2026: O/E **0.788**.

Therefore dangerous-favorite information should **not** be multiplied mechanically with the Win/Top3 shortlist.

This is an important guardrail against overfitting: a context that looks useful in the broad market does not necessarily remain useful after another selection filter has already changed the distribution.

---

# Decision

## KEEP
### QMD
QMD remains the strongest pair-market research layer in this sequence.
- In the broader application-style market it previously improved 5/6 walk-forward years.
- It measures a disagreement between two actual betting markets rather than a synthetic horse-model interaction.

### Win Condition Edge
Keep it at the **horse level** for axis / win-price context.

### Dangerous favorite / P10
Keep it as a **race-context warning**.
- Broad-market direction is consistent in 2025 and 2026.
- Pairs excluding a dangerous favorite are relatively better priced than pairs including it.

## DO NOT combine mechanically
1. Do **not** add numeric Win Edge directly to QMD pair probability.
2. Do **not** use `dangerous favorite -> boost every excluding quinella` as a hard correction.
3. Do **not** use `QMD + Win Edge + dangerous favorite` as one synthetic score.
4. Do **not** optimize a threshold from 2025/2026 ROI to rescue any of these interactions.

---

# Architecture after this validation

The cleanest structure is now:

- **Win Condition Edge**: horse-level win market mispricing
- **Top3 Condition Edge**: horse-level top-3 market mispricing / partner shortlist
- **QMD**: pair-level disagreement between single-win and quinella markets
- **P10 / dangerous favorite**: race-context / position-risk warning
- **M3**: structural race / pace context

These layers should remain separate unless an incremental OOS test proves that one should modify another.

---

# Best next validation

The next clean test should stay inside the pair market and ask why QMD is stronger in some pairs than others **without using ROI to choose the answer**.

Priority hypotheses, one at a time:
1. **favorite concentration**: does QMD work differently when win-market probability is concentrated in 1-2 horses versus diffuse?
2. **pair rank / market concentration**: does QMD residual ordering survive across top, middle and tail quinella-market ranks?
3. **field size**: 12-13 / 14-15 / 16+ runners, fixed before looking at outcomes.
4. **class family**: G1/G2 vs G3 vs L/OP vs 3-win, with broad pre-specified groups.

The target is not the highest ROI subgroup. The target is whether the **QMD O/E ordering remains monotone and directionally stable across pre-specified market regimes**.

If QMD survives those regime tests, it becomes a credible core diagnostic for the quinella side of the app.