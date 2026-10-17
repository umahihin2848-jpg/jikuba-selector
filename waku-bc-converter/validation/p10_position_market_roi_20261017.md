# P10 / position-improvement × market / ROI validation (2026-10-17)

## Goal
Test the intuition that a horse with poor P10 (high probability of first valid passage position >=10th) tends to have poor betting return, and test whether pre-race position improvement adds reproducible information beyond closing market prices.

This is a validation report only. It does not change M3, P10, probability, or betting logic.

## Protocol
- Universe aligned to the recent EV reconstruction: JRA flat, field size >=12, 3-win class or higher, all-2yo races excluded.
- 2025: 401 races / 6,060 runners.
- 2026: 297 races / 4,526 runners.
- P10 reconstructed with the deployed `position-risk-runtime-v2` feature definitions and coefficients using strictly prior TARGET history.
- Market win probability: closing win odds normalized to sum 1 within race.
- Market top-3 probability: inferred from normalized wide market probabilities using `0.5 * sum_j P(wide i-j)`.
- P10 bands are the already-fixed display bands: `<20%`, `20-50%`, `50-65%`, `>=65%`.
- Closing-price ROI is descriptive only; the available odds behave like final/closing prices, not T-15 executable prices.
- Market residual models are fit on 2025 and evaluated once on 2026.

## 1. Raw closing win ROI by P10 band

### 2025
| P10 band | n | Win rate | Market expected win | Closing win ROI |
|---|---:|---:|---:|---:|
| <20% | 678 | 14.45% | 11.61% | **109.0%** |
| 20-50% | 1,023 | 8.80% | 8.58% | 82.6% |
| 50-65% | 498 | 6.63% | 7.76% | **56.2%** |
| >=65% | 3,861 | 4.69% | 5.07% | **79.9%** |

All-runner closing win ROI: 81.7%.

### 2026
| P10 band | n | Win rate | Market expected win | Closing win ROI |
|---|---:|---:|---:|---:|
| <20% | 726 | 10.06% | 10.47% | 68.1% |
| 20-50% | 919 | 9.79% | 8.36% | **89.9%** |
| 50-65% | 430 | 5.81% | 7.29% | **51.7%** |
| >=65% | 2,451 | 4.45% | 4.60% | **66.9%** |

All-runner closing win ROI: 70.3%.

### Interpretation
The user's intuition is directionally supported descriptively: **P10 50%+ is not a good raw win-price region**, and the `50-65%` caution band is particularly poor in both years. However, the effect is not monotone: `>=65%` is not always worse than `50-65%`.

This matters because high P10 is already visible to the market through running style / popularity / price. A raw low ROI in a band does not by itself prove a new exploitable edge.

## 2. Does P10 improve a market win model?
2025 fit: market logit + P10. The fitted P10 coefficient is negative (`-0.393`): higher P10 lowers win probability after market price, which matches the intuitive direction in the development year.

### 2026 untouched holdout
- Market-only LogLoss: **0.201369**
- Market + P10 LogLoss: **0.201545**
- Delta: **+0.000176** (worse)
- Race-bootstrap 95% CI for delta: approximately **[-0.000679, +0.001022]**
- Market AUC: 0.80494
- Market + P10 AUC: 0.80404

So the 2025 negative P10 correction **does not replicate as a probability improvement in 2026**.

For horse top-3 probability, P10 adds essentially no signal after the wide market:
- 2026 market LogLoss: 0.413250
- market + P10: 0.413183
- Delta: -0.000066
- 95% CI: approximately **[-0.000369, +0.000251]**
- fitted P10 coefficient is approximately zero (`+0.0039`).

## 3. Pressure Impact
Adding P10 Pressure Impact (`current P10 - neutral-pressure P10`) does not materially change the result.

2025 fitted extra impact coefficient:
- win: `+0.0127`
- top3: `-0.0002`

Both are practically negligible after market + P10. Therefore Pressure Impact remains an explanation / scenario feature, not a betting probability correction.

## 4. P10 as a filter on the previously rejected raw-EV rule
For the previous naive PL rule `model p * closing odds >=1.20`:

### Win tickets
- 2025 all candidates: 3,209 bets / ROI **83.6%**
- 2025 require P10 <50%: 672 bets / ROI **88.9%**
- 2026 all candidates: 2,306 bets / ROI **59.8%**
- 2026 require P10 <50%: 637 bets / ROI **73.3%**

Removing P10 >=50% improves the rejected win-EV rule in both years, but the remaining strategy is still below 100% ROI and therefore is **not a deployable buy rule**.

For wide / quinella the P10 pair filter is not stable across 2025 and 2026, so no pair-ticket cutoff is supported.

## 5. Remaining-600 position improvement × market
A pre-race position-improvement feature was defined as:

`historical median -3F gap - predicted remaining-600 gap`

Positive means the model expects the horse to be closer to the leader than its own recent historical median.

### Win model
2025 fit:
- market-only LogLoss: 0.203455
- market + improvement: 0.203065
- fitted improvement coefficient: **-0.326** (opposite the intended positive interpretation)

2026 holdout:
- market-only LogLoss: **0.201369**
- market + improvement: **0.201972**
- Delta: **+0.000602** (worse)
- 95% CI: approximately **[-0.000105, +0.001308]**

### Top-3 model
2026:
- market-only LogLoss: 0.413250
- market + improvement: 0.413213
- Delta: -0.000036
- 95% CI crosses zero.

### Decision
**Reject remaining-600 improvement as a market probability correction.** It remains useful as a structural scenario display, but it does not show reproducible incremental market information.

## Production decision
1. Keep P10 display-only; do not reduce M3/Ability probability mechanically.
2. Do not turn high P10 into a standalone buy/sell signal.
3. It is reasonable to show P10 >=50% as an additional **risk-brake / caution flag for win-ticket candidates**, because the raw return pattern is poor and it improved the already-rejected naive win-EV candidate pool in both years.
4. Do not claim that this brake creates positive EV; it does not.
5. Do not apply the same hard cutoff to wide / quinella yet.
6. Keep remaining-600 position improvement out of market probability correction.

## Best next test
Move from generic position level to **scenario-specific interaction**, pre-specified and one at a time:
- current pressure × horse frontness / P10,
- course-distance residual × position style,
- track-bias direction × expected lane / front-back position.

Use 2025 only for selection and 2026 once for confirmation; do not optimize ROI thresholds on 2026.
