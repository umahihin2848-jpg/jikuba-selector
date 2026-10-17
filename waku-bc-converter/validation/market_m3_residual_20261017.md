# Market + M3 residual validation (2026-10-17)

## Question
Does the current market-independent M3 structural signal add reproducible information after closing market prices are already known?

The intended use under test is not `M3 probability x odds = buy`. The test asks whether M3 can improve a market baseline first, then only later be considered for value detection.

## Protocol
- Development / fit year: **2025**.
- Untouched evaluation year: **2026**.
- Race universe aligned to the earlier EV reconstruction pilot: JRA flat, field size >=12, 3-win class or higher, all-2yo races excluded.
  - 2025: **401 races / 6,060 runners**.
  - 2026: **297 races / 4,526 runners**.
- Market probabilities: closing odds, normalized within race.
  - win total = 1.0
  - quinella pair total = 1.0
  - wide pair total = 3.0
- M3 was reconstructed from the frozen `finish600_model_v1` + `m3_top3_probability_v1` runtime definitions using strictly prior TARGET history from `umadete.csv`.
- For win, horse M3 top-3 probability is used as the M3 structural feature.
- For wide / quinella, a deliberately simple pre-specified pair proxy is used: `M3_top3_A * M3_top3_B`, normalized within race to the appropriate ticket-event total. This is a feature, not a claim that the product is the true joint probability.
- L2 logistic combiner `C=0.1`, fit on 2025. After prediction, one common within-race logit shift enforces the correct event total.
- Compared models:
  1. market only
  2. market + Ability ticket probability
  3. market + M3
  4. market + Ability + M3
- Race bootstrap is used for the 2026 log-loss delta confidence interval.

## Reconstruction quality caveat
The locally reconstructed M3 is close to but not identical to the committed canonical OOS artifact because the original row-level validation matrix is not committed.

Reconstruction standalone top-3 metrics:
- 2025: log loss **0.48655**, AUC **0.62343**.
- 2026: log loss **0.48594**, AUC **0.61478**.

Committed canonical M3 reference:
- 2025: log loss **0.48283**, AUC **0.62589**.
- 2026: log loss **0.48117**, AUC **0.61870**.

Therefore the test below is a **reconstruction pilot**, not an exact replay of the frozen validation rows.

## 2026 holdout — win
| Model | LogLoss | Brier | AUC | Delta LL vs market |
|---|---:|---:|---:|---:|
| Market | **0.201479** | 0.055048 | 0.80488 | — |
| Market + Ability | 0.201592 | 0.055079 | 0.80468 | +0.000113 |
| Market + M3 | **0.201135** | **0.054974** | **0.80626** | **-0.000344** |
| Market + Ability + M3 | 0.201236 | 0.054999 | 0.80592 | -0.000244 |

For Market + M3, the race-bootstrap 95% CI for the log-loss delta is approximately:

`[-0.000832, +0.000159]`

The point estimate is better, but the interval crosses zero. This is **not statistically separated from no improvement**.

Also important: the M3 coefficient learned on 2025 is **negative** (`-0.144` on the logit-scale M3 feature). In other words, this fit does not support the intended positive interpretation "M3 likes the horse more -> raise the market win probability." The small 2026 improvement comes from a weak corrective / anti-signal relationship and should not be promoted into a buy rule.

## 2026 holdout — wide
| Model | LogLoss | Brier | AUC | Delta LL vs market |
|---|---:|---:|---:|---:|
| Market | **0.104870** | 0.024761 | 0.81705 | — |
| Market + Ability | 0.104866 | 0.024760 | 0.81709 | -0.000004 |
| Market + M3 | 0.104865 | 0.024759 | 0.81708 | -0.000004 |
| Market + Ability + M3 | 0.104865 | 0.024759 | 0.81710 | -0.000005 |

Market + M3 race-bootstrap 95% CI for delta log loss:

`[-0.0000297, +0.0000223]`

Effect is essentially zero. The 2025 M3 coefficient is again slightly negative (`-0.020`).

### Direct horse top-3 cross-check
Because M3 is intrinsically a horse top-3 structural model, a second test inferred a horse-level market top-3 probability from the wide market:

`market_top3_i = 0.5 * sum_j P_market(wide i-j)`

This identity follows from each top-3 horse appearing in two of the three winning unordered wide pairs.

2026:
- Market top3 model log loss: **0.413184**
- Market + M3 top3 log loss: **0.413159**
- Delta: **-0.0000254**
- Race-bootstrap 95% CI: approximately **[-0.000241, +0.000189]**

Again, no statistically reliable incremental value is established.

## 2026 holdout — quinella
| Model | LogLoss | Brier | AUC | Delta LL vs market |
|---|---:|---:|---:|---:|
| Market | **0.044002** | 0.008806 | 0.84006 | — |
| Market + Ability | 0.043999 | 0.008805 | 0.84015 | -0.000002 |
| Market + M3 | 0.044007 | 0.008805 | 0.84011 | **+0.000005** |
| Market + Ability + M3 | 0.044004 | 0.008805 | 0.84014 | +0.000003 |

Market + M3 race-bootstrap 95% CI:

`[-0.0000214, +0.0000339]`

No positive incremental signal.

## Closing-odds ROI diagnostic
This is diagnostic only because the source odds behave like final / closing prices, not T-15 executable prices.

Using Market + M3 probabilities and then selecting by model EV does **not** produce a stable production rule.

Examples on 2026:
- Win EV >=1.20: only 5 bets, 0 hits.
- Wide EV >=1.10: 0 bets.
- Quinella EV >=1.20: 4 bets, 0 hits.

At lower thresholds some tiny samples show large ROI swings, which is exactly the payout-concentration / small-n failure mode seen in the previous EV backtest. These should not be optimized into thresholds.

## Decision
### Do not deploy M3 as a positive market-probability correction yet.

Current evidence says:
- M3 remains useful as a **market-independent structural ranking / top-3 probability layer**.
- Once closing market prices are included, its additional predictive information is very small.
- Win has an encouraging point estimate in 2026, but it is not statistically separated from zero and the learned sign is opposite to the desired positive residual interpretation.
- Wide and quinella show effectively no incremental gain.
- Adding Ability together with M3 does not materially change the conclusion.

Therefore production policy should remain:

`structure first -> market last -> do not mechanically turn M3/Ability disagreement into EV.`

## Best next test
The next candidate should not be another generic M3 weight. Test **scenario-specific residuals that are more plausibly absent from closing market price**, one at a time with frozen direction and thresholds:

1. validated first-corner / remaining-600 position improvement,
2. M3 front-position probability correction,
3. course / distance residual fit,
4. current-race pressure / queue interaction,
5. only after those pass, a multivariable market residual model.

Use 2025 for all rule selection and 2026 exactly once for confirmation. Do not tune EV thresholds on the 2026 outcomes.
