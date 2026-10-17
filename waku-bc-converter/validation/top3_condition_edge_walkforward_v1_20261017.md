# Top3 Condition Edge v1 — walk-forward validation (2026-10-17)

## Goal
Build a separate horse-level **Top3 Condition Edge** for partner selection without changing the frozen Win Condition Edge philosophy.

The target is not ROI. The target is:

> if the model says a horse is more under-valued than another horse for finishing in the top 3, does its realized top-3 frequency exceed the market-implied expectation out of sample?

This is intended to support the future role split:
- Win Edge -> axis / single candidate,
- Top3 Edge -> wide / pair partner candidate,
- market-overvalued edge -> caution / avoid candidate.

No automatic bet rule is deployed from this report.

## Market Top3 benchmark
The available historical wide odds behave like final / closing prices and provide a quoted range.

For each race:
1. use the **lower wide odds** for each unordered pair,
2. convert each pair to inverse-odds weight,
3. normalize pair probabilities so all unordered wide-pair probabilities sum to **3.0**,
4. infer each horse's market top-3 probability as

`0.5 * sum_j P_market(wide i-j)`.

Because each actual top-3 horse appears in exactly two of the three winning unordered wide pairs, the horse probabilities sum to exactly 3.0 per normal race.

This is a market benchmark, not an executable T-15 price and not a claim that the lower end of the wide range is the exact fair probability.

## Data / universe
Current reconstruction:
- JRA flat,
- 3-win class or higher,
- field size >=12,
- all-2yo races excluded,
- supplied 2016-2026 TARGET results and odds,
- evaluation 2021-2026: **34,938 runners / 2,302 races**.

This reconstruction is close in concept but not row-for-row identical to the earlier Win Condition Edge report, so direct numerical comparisons should be treated as approximate.

## Frozen factors
No new factor search was performed for this Top3 version.

The factor family was frozen from Win Condition Edge v1:
1. distance change from the previous available high-class start,
2. age,
3. sex x season.

Distance-change buckets:
- shorten 400m+,
- shorten ~200m,
- roughly same,
- extend ~200m,
- extend 400m+,
- missing prior high-class start.

Age and sex-season use coarse categorical levels only.

## Model / walk-forward protocol
For each evaluation year:
- train 2016-2020 -> test 2021,
- train 2016-2021 -> test 2022,
- train 2016-2022 -> test 2023,
- train 2016-2023 -> test 2024,
- train 2016-2024 -> test 2025,
- train 2016-2025 -> test 2026.

A binomial logistic correction is fit with `logit(market_top3)` as an offset and the three frozen categorical factor families as corrections.

After prediction, one common within-race logit shift is applied so each race again sums to exactly **3.0**.

`Top3 Condition Edge = adjusted top3 probability / market top3 probability`.

## Year-by-year predictive result
Delta is model minus raw market; negative LogLoss/Brier is better.

| Year | Delta LogLoss | Delta Brier | Delta AUC |
|---|---:|---:|---:|
| 2021 | -0.000053 | -0.000060 | -0.000032 |
| 2022 | -0.000491 | -0.000227 | +0.000526 |
| 2023 | -0.000168 | -0.000013 | +0.000057 |
| 2024 | -0.000253 | -0.000141 | +0.000327 |
| 2025 | -0.000082 | -0.000068 | +0.000054 |
| 2026 | -0.000370 | -0.000168 | +0.000496 |

**LogLoss improved in all 6 walk-forward years.**

### Pooled 2021-2026
- Market Top3 LogLoss: **0.412359**
- Top3 Condition Edge LogLoss: **0.412131**
- delta: **-0.000228**
- Market Brier: **0.131465**
- Top3 Condition Edge Brier: **0.131355**
- Market AUC: **0.782083**
- Top3 Condition Edge AUC: **0.782263**

Race-bootstrap 95% CI for pooled LogLoss delta is approximately:

`[-0.000566, +0.000101]`

So the pooled proper-score improvement is small and the bootstrap interval still crosses zero. This is not enough by itself to call the probability model conclusively better.

## Most important result: Top3 Edge ordering
Walk-forward runners were sorted by `Top3 Condition Edge` and split into five equal groups.

| Edge quintile | Mean predicted multiplier | Observed / market-expected top3 |
|---|---:|---:|
| lowest 20% | 0.892 | **0.918** |
| 20-40% | 0.960 | **0.965** |
| 40-60% | 0.994 | **1.007** |
| 60-80% | 1.027 | **1.033** |
| highest 20% | 1.100 | **1.053** |

The ordering is monotone in realized market residual.

For the highest quintile, race-bootstrap 95% CI for observed / expected is approximately:

`[1.008, 1.098]`

For the lowest quintile:

`[0.864, 0.975]`

This is the strongest evidence in this test: the top edge group was under-estimated by the wide-market benchmark, while the low edge group was over-estimated.

## Year-by-year top / bottom edge check
Using within-year predictor quintiles only:

| Year | Top 20% O/E | Bottom 20% O/E |
|---|---:|---:|
| 2021 | 1.127 | 0.958 |
| 2022 | 1.076 | 0.916 |
| 2023 | 1.010 | 0.884 |
| 2024 | 1.034 | 0.876 |
| 2025 | 1.005 | 0.919 |
| 2026 | 1.061 | 0.936 |

The top group was above market expectation in all six years and the bottom group was below expectation in all six years.

The magnitude is modest, which is expected when the starting point is a mature closing market.

## Wide-pair translation pilot
To test whether horse-level Top3 Edge can immediately become a wide buy rule, each unordered pair received a simple proxy:

`pair edge proxy = sqrt(Top3Edge_A * Top3Edge_B)`.

This is only a diagnostic ranking proxy, not a fitted joint-probability model.

Pooled pair quintiles showed ordered residuals:

| Pair-edge quintile | Observed / market-expected winning wide pairs |
|---|---:|
| lowest 20% | 0.870 |
| 20-40% | 0.967 |
| 40-60% | 0.995 |
| 60-80% | 1.054 |
| highest 20% | 1.072 |

However, the annual highest-quintile pair O/E was:
- 2021: 1.151
- 2022: 1.157
- 2023: 0.996
- 2024: 1.063
- 2025: 0.956
- 2026: 1.091

Therefore the horse-level Top3 Edge **does not yet justify an automatic wide-pair rule**. The pooled ordering is encouraging, but pair conversion is not stable enough year by year.

## Role interpretation
Current evidence supports this architecture, but only as a ranking / context layer:

### A — Win Edge candidate
Use the separate Win Condition Edge layer to identify horses the market may under-price for winning.

### B — Top3 Edge partner candidate
A high Top3 Condition Edge is now supported as a **partner shortlist signal**: the top group exceeded market top-3 expectation in every walk-forward year.

It is not yet a standalone wide buy signal because pair-level translation has not replicated every year.

### C — Market-overvalued candidate
Low Top3 Condition Edge is a meaningful caution flag: the bottom group underperformed market top-3 expectation in all six years.

Do not automatically remove the horse from every ticket; use it as a negative pricing-context feature.

## Decision
### KEEP Top3 Condition Edge v1 as a research layer
The frozen factor set produces a small but repeatable top-3 market residual ordering.

Do:
- keep the three-factor definition frozen,
- display Top3 Edge separately from Win Edge,
- use high Top3 Edge for partner shortlisting,
- use low Top3 Edge as market-overvaluation caution,
- continue prospective / future validation without threshold tuning.

Do not:
- convert Top3 Edge directly into wide EV yet,
- optimize an Edge cutoff for ROI,
- mix P10 into this probability layer,
- claim the model has proven a profitable strategy.

## Next test
The next statistically clean step is to test **one strong Win Edge axis + Top3 Edge partner** without inventing a new joint probability model:
1. freeze the axis definition from Win Condition Edge,
2. rank partners by Top3 Condition Edge,
3. compare pair market O/E and actual wide / quinella return in walk-forward years,
4. keep P10 / dangerous-favorite as separate race-context flags,
5. only deploy if the same direction survives across years and future data.

This preserves the project's current principle: find repeatable market mistakes first; only then decide how to express them as a ticket.
