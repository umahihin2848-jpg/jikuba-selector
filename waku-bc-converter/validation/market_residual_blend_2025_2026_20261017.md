# Market residual blend validation (2026-10-17)

## Question
Can the structural coherent probability layer improve closing-market probabilities by adjusting the market up/down, rather than using `model probability × odds` directly?

## Protocol
- Structural probability: the coherent Plackett-Luce layer built from frozen Ability v1.
- Market probability: inverse closing odds normalized within race and ticket type.
  - Win / quinella probabilities sum to 1 per race.
  - Wide pair probabilities sum to 3 per race.
- Residual signal: `log(p_model / p_market)`.
- Coherent geometric blend:
  `p_beta ∝ p_market × (p_model / p_market)^beta`, renormalized within each race to the correct ticket-probability total.
- 2025: development year used once to select beta by log loss.
- 2026: untouched forward holdout.
- Race-bootstrap 95% intervals are calculated on the 2026 log-loss delta versus market-only.
- Odds are closing/final-price-like; this remains a feasibility test, not a T-15 executable strategy.

## Result: 2025 selects essentially zero structural correction
Unconstrained best beta values on 2025:

| Ticket | beta |
|---|---:|
| Win | -0.020 |
| Wide | -0.035 |
| Quinella | -0.065 |

If beta is constrained to the intended direction (`beta >= 0`, meaning the Ability residual is allowed only to add positive structural weight), **all three ticket types select beta = 0.000**.

Interpretation: on 2025, the closing market already contains more predictive information than this Ability-only structural residual. There is no development-year support for adding the Ability residual in its natural direction.

## 2026 untouched holdout

| Ticket | Market log loss | Residual-blend log loss | Delta (blend-market) | Race-bootstrap 95% CI |
|---|---:|---:|---:|---:|
| Win | 0.201369 | 0.201381 | +0.000011 | [-0.000119, +0.000144] |
| Wide | 0.104874 | 0.104861 | -0.000013 | [-0.000097, +0.000070] |
| Quinella | 0.043997 | 0.044005 | +0.000008 | [-0.000065, +0.000083] |

All intervals cross zero. The tiny wide improvement is not statistically separated from no change; win and quinella are slightly worse.

### 2026 discrimination
- Win market AUC: 0.80494; residual blend: 0.80498.
- Wide market AUC: 0.81700; residual blend: 0.81715.
- Quinella market AUC: 0.84004; residual blend: 0.84023.

These differences are very small and do not establish a tradable edge.

## Residual-bucket diagnostic
2026 tickets were grouped by the 2025-frozen deciles of `p_model / p_market`.

### Win
The highest structural-over-market decile had mean model/market ratio about 10.0 but produced 0 winners in 403 observations, while the closing market expected about 0.58% per runner on average. Other deciles were mixed rather than monotonic.

### Wide
Residual buckets were somewhat better behaved, but still not monotonic enough for a deployable correction. For example:
- decile 8: actual / market-expected hit ratio ~1.17
- decile 9: ~1.11
- decile 10: ~1.05
while deciles 4-5 underperformed market (~0.83-0.84).

### Quinella
Some middle/high residual deciles outperformed market expectation, but the pattern was irregular and sparse in the highest-value tails. It does not support a stable threshold from this holdout.

## Closing-price EV diagnostic
Because the fitted beta values are near zero, corrected probabilities stay close to closing-market probabilities. There is effectively no robust 20%+ edge left after the residual correction.

Sparse apparent high-return subsets still occur because quinella/wide payouts are heavy-tailed. They are unstable and not suitable for threshold selection. This is consistent with the previous EV backtest where 2025 and 2026 reversed sign.

## Decision
### Reject for deployment
Do **not** deploy an Ability-only market-residual correction as a buy signal.

Specifically:
- do not use `Ability PL probability / market probability` as a production value score;
- do not set a positive beta from the 2026 holdout;
- do not infer value from the small wide AUC/log-loss improvement.

### What this tells us
The market-residual architecture itself is still the correct framework, but the **current residual feature is too weak**. The closing market dominates Ability-only information for win and quinella and leaves no replicated positive correction for wide.

The next residual model should be tested only with additional genuinely orthogonal pre-race structural features, such as frozen M3 probability/rank and validated scenario/position components, with all transformations fixed on a development year and evaluated once on a future holdout.

The required test is incremental: `market baseline` vs `market + new structural residuals`. If the new layer cannot improve forward log loss/Brier and then survive an odds/ROI test, it should remain explanatory only.
