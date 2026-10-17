# QMD partial-input approximation validation (2026-10-17)

## Purpose
The production UI should let the user inspect only a few quinella combinations without requiring every quinella price in the race.

Exact QMD uses a normalized quinella market:

`q_market(i,j) = (1 / quinella_odds_ij) / sum_pairs(1 / quinella_odds)`

That requires the complete pair matrix. For partial input, this validation tests the practical approximation:

`q_market_approx(i,j) = 0.775 / quinella_odds_ij`

where 0.775 is the JRA quinella payout-rate factor used only to approximate the pair's market probability from its quoted decimal odds.

The QMD numerator remains unchanged:

`q_single = quinella probability implied by normalized single-win odds under Plackett-Luce`

and

`R = q_single / q_market`.

This is a display approximation, not a new betting rule.

## Data
- supplied historical TARGET win + quinella odds,
- high-class flat-race reconstruction used in the current project,
- **401,981 matched quinella pair rows**.

## Agreement with exact normalized QMD
Across matched pairs:

- correlation between exact `R` and approximate `R`: **0.999326**
- median `q_market_exact / q_market_approx`: **0.9978**
- mean `q_market_exact / q_market_approx`: **1.0009**

So the payout-rate approximation is extremely close to the fully normalized pair probability in this historical universe.

## Does ordering survive?
Pairs were ranked by QMD and split into five equal groups. Outcome information was not used to define the approximation.

### Exact normalized QMD
Observed / exact quinella-market expected wins by quintile:

1. **0.686**
2. **0.858**
3. **0.996**
4. **1.026**
5. **1.060**

### Partial-input approximation
Observed / exact quinella-market expected wins after ranking by approximate QMD:

1. **0.667**
2. **0.867**
3. **0.988**
4. **1.033**
5. **1.058**

The same directional ordering is preserved almost unchanged.

## Decision
### Allow partial-input QMD in the app, clearly labeled `近似`
This is useful when the user wants to inspect selected ticket combinations only.

Rules:
- if all active quinella pairs are supplied, use exact normalized QMD;
- otherwise use `0.775 / odds` for the entered pair and label the result `QMD 近似`;
- do not show a quinella market rank in partial mode because the full market is not known;
- do not present approximate QMD as a buy signal;
- keep the exact/approx mode visible in the UI.

The approximation is for usability. It does not replace future T-15 / T-10 / T-5 validation, because the historical test still uses closing/final prices.
