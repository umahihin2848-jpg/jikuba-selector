# Win-market vs quinella-market distortion validation (2026-10-17)

## Goal
Test whether the **single-win market** contains repeatable information that the **quinella market** does not fully reflect.

This is not an ROI search. The question is:

> When the quinella probability implied by the single-win market is higher than the probability implied by the quinella market itself, does that pair win more often than the quinella market expects?

This directly studies disagreement between two pari-mutuel markets instead of adding more horse-model features.

---

## Data
Supplied TARGET closing-odds and settlement files, 2016-2026.

After removing 11 dead-heat races with multiple winning quinella combinations:
- full supplied odds universe: **5,357 races / 499,290 unordered pairs**
- matched application-style universe used for the stricter test: current class 3-win or higher (including old 1600-man class), field size >=12, all-2yo races excluded.

The application-style metadata match is sparse in the earliest years, so its clean walk-forward test starts with training data from 2019 and evaluates 2021-2026.

All odds are final / closing prices, so this is a market-structure validation, not a T-15 executable backtest.

---

## Market definitions
### 1. Single-win market probability
For horse i:

`p_i = (1 / win_odds_i) / sum_k(1 / win_odds_k)`

### 2. Quinella probability implied by the single-win market
Treat the normalized single-win probabilities as Plackett-Luce first-place weights.

For unordered pair i-j:

`q_single(i,j) = p_i * p_j/(1-p_i) + p_j * p_i/(1-p_j)`

This is the probability that i and j occupy the first two places in either order under the coherent ranking model implied only by the win market.

### 3. Quinella-market probability

`q_market(i,j) = (1 / quinella_odds_ij) / sum_pairs(1 / quinella_odds)`

### 4. Market disagreement ratio

`R = q_single / q_market`

Interpretation:
- R > 1: the single-win market implies the pair should occur more often than the quinella market implies.
- R < 1: the quinella market is relatively more enthusiastic about the pair than the single-win market.

No outcome or payout information enters R.

---

# Descriptive result: supplied odds universe

Fixed bins around the theoretical boundary R=1:

| R band | pairs | observed / quinella-market expected | closing ROI |
|---|---:|---:|---:|
| <0.50 | 101,800 | **0.632** | 32.2% |
| 0.50-0.75 | 131,781 | **0.945** | 69.3% |
| 0.75-1.00 | 135,482 | **0.991** | 81.8% |
| 1.00-1.25 | 84,312 | **1.024** | 74.9% |
| 1.25-1.50 | 32,285 | **1.085** | 82.1% |
| >=1.50 | 13,630 | **1.103** | 64.1% |

The market residual is ordered in the expected direction: pairs that the single-win market rates relatively higher tend to beat the quinella-market expected hit count, while pairs favored relatively more by the quinella market tend to underperform.

For the simple theoretical split R>=1, quinella-market O/E was above 1 in 10 of 11 years; 2024 was the only year below 1 (0.975).

This does **not** produce a profitable raw buy rule. Closing ROI remains mostly below 100% because the residual is modest relative to takeout and because price level and market disagreement are different questions.

---

# Stricter application-style walk-forward test

The main test does not choose an R threshold. Instead, it asks whether a small amount of the single-win market should be blended into the quinella market out of sample.

For each test year, fit only on earlier years:
- train 2019-2020 -> test 2021
- train 2019-2021 -> test 2022
- ...
- train 2019-2025 -> test 2026

Use one scalar beta:

`q_blend(i,j) proportional to q_market(i,j)^(1-beta) * q_single(i,j)^beta`

Then renormalize all pairs within each race to sum to 1.

Beta is selected on prior races by minimizing multiclass log loss. No ROI or payout is used.

## Fitted beta and out-of-sample log loss

| Test year | train races | test races | beta | market LL | blend LL | delta |
|---|---:|---:|---:|---:|---:|---:|
| 2021 | 448 | 393 | 0.285 | 3.848202 | 3.844938 | **-0.003264** |
| 2022 | 841 | 392 | 0.285 | 3.745428 | 3.741586 | **-0.003843** |
| 2023 | 1,233 | 416 | 0.290 | 3.700051 | 3.697572 | **-0.002479** |
| 2024 | 1,649 | 405 | 0.276 | 3.614084 | 3.614393 | +0.000310 |
| 2025 | 2,054 | 403 | 0.245 | 3.707642 | 3.698952 | **-0.008689** |
| 2026 | 2,457 | 298 | 0.293 | 3.790531 | 3.784120 | **-0.006411** |

Negative delta is better.

Result:
- improved in **5 of 6** walk-forward years,
- pooled market LL: **3.730921**,
- pooled blend LL: **3.726973**,
- pooled delta: **-0.003948**,
- race-bootstrap 95% CI: approximately **[-0.00726, -0.00049]**.

The interval stays below zero in this application-style reconstruction.

The fitted beta remains around 0.25-0.29, which means the useful formulation is not to replace the quinella market with the single market. It is approximately:

> **70-75% quinella-market structure + 25-30% single-win-market structure.**

---

# Out-of-sample pair ordering

For every test year, pairs were ranked by:

`Blend Edge = q_blend / q_market`

and split into within-year quintiles.

Pooled 2021-2026:

| Blend Edge quintile | mean edge | observed / market expected | closing ROI |
|---|---:|---:|---:|
| lowest 20% | 0.751 | **0.707** | 33.3% |
| 20-40% | 0.876 | **0.847** | 66.5% |
| 40-60% | 0.941 | **0.971** | 82.2% |
| 60-80% | 0.997 | **1.009** | 75.4% |
| highest 20% | 1.083 | **1.072** | 77.6% |

This is the desired monotone market-residual ordering.

Race-bootstrap O/E intervals:
- lowest 20%: approximately **[0.520, 0.906]**
- highest 20%: approximately **[1.018, 1.125]**

Year-by-year highest-quintile O/E:
- 2021: 1.130
- 2022: 1.042
- 2023: 1.068
- 2024: 0.967
- 2025: 1.152
- 2026: 1.091

Again, 2024 is the only negative year.

---

# Interpretation
This is materially different from the failed Pair Condition Edge v1.

The failed model tried to combine:
- horse Win Condition Edge,
- horse Top3 Condition Edge,
- their interaction.

That did not reproduce pair-level market errors.

The current test instead compares **two actual betting markets**:
- what the win market implies about the pair,
- what the quinella market directly prices for that pair.

The result suggests that the quinella market is strong but not perfectly self-contained. A small amount of information from the single-win market improves quinella probability estimates out of sample in this reconstruction.

This is exactly the kind of signal the project is looking for: a repeated, small market-pricing discrepancy rather than a rare high-ROI pattern.

---

# Important limitation: still not a buy rule

Even the highest Blend Edge quintile has closing ROI only 77.6%.

Therefore:
- the signal is predictive relative to the quinella market,
- but it is not by itself large enough to overcome takeout,
- and final/closing odds cannot be used as an executable purchase-time rule anyway.

Do **not** create a buy threshold from this report.

The useful role is as a new market-structure feature:

`Quinella Market Disagreement / QMD`

Example display concept:
- QMD +8%: single-win market prices this pair slightly stronger than quinella market
- QMD -12%: quinella market is richer than the single-win market would imply

This should remain separate from Win Condition Edge, Top3 Condition Edge, M3, Ability and P10.

---

# Decision
## KEEP the market-disagreement signal as a research layer
Evidence supporting retention:
1. fixed R bins show ordered realized residuals,
2. the simple market blend improves 5/6 application-style walk-forward years,
3. pooled log-loss improvement has a race-bootstrap CI below zero in that reconstruction,
4. highest and lowest Blend-Edge quintiles separate in the expected direction,
5. no ROI target or payout threshold was used to construct the signal.

## Do not deploy as a betting rule yet
Next clean validation steps:
1. test the same frozen formula on T-15 / earlier snapshots when available,
2. test whether QMD adds information **after** Win Condition Edge and dangerous-favorite context rather than simply correlating with them,
3. investigate whether the signal strengthens in pre-specified market-structure regimes (favorite concentration, field size, class) without tuning on ROI,
4. only after the residual survives should it influence quinella shortlist ranking.

The central finding is:

> **The single-win market appears to contain a small but repeatable piece of information not fully reflected in quinella prices.**

That is useful for probability correction and market diagnostics, but not yet sufficient for positive expected betting return.
