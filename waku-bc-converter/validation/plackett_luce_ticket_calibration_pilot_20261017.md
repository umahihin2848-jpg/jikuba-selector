# Coherent ticket probability calibration pilot (2026-10-17)

## Purpose
Test the proposed idea of generating win / quinella / wide probabilities from one coherent race-order model, then checking whether predicted probabilities remain calibrated on a future holdout.

This is a pilot of the **probability-construction architecture**, not a deployable betting/value model.

## Data and protocol
- Base horse-strength signal: frozen `Ability v1` raw logit.
- Ability v1 was developed on 2024; no odds, popularity, PCI/RPCI, current scenario or current result are inputs.
- Strictly-prior 3-win-or-higher histories were reconstructed from the available TARGET history export (`umadete.csv`).
- 2025 was used only to choose one global Plackett-Luce temperature parameter.
- Temperature selected on 2025: `tau = 0.955462`.
- 2026 was then evaluated once as the untouched holdout for this pilot.
- Pilot universe used actual result rows >=12 and excluded 2-year-old-only races, giving 297 races / 4,526 runners in 2026. This is very close to the committed Ability validation universe (297 races / 4,528 runners), but not an exact row-for-row replay. Therefore all results below are labelled **reconstruction pilot**.

## Model
For runner `i`, define weight:

`w_i = exp(AbilityLogit_i / tau)`

Then use one Plackett-Luce ranking distribution for the entire field.

From the same distribution:
- Win probability = probability horse finishes 1st.
- Quinella probability for pair A-B = probability A and B occupy 1st/2nd in either order.
- Wide probability for pair A-B = probability A and B are both in the top 3.

No Monte Carlo simulation is required for this pilot. These probabilities are calculated analytically, so there is no 50,000-run simulation noise.

The distribution is internally coherent by construction:
- Sum of all win probabilities in a race = 1.0000.
- Sum of all quinella-pair probabilities in a race = 1.0000.
- Sum of all wide-pair probabilities in a race = 3.0000, because every top-3 outcome contains exactly three unordered pairs.

## 2026 holdout results
### Win
- 297 races / 4,526 runners
- LogLoss: `0.226354`
- Brier: `0.059119`
- AUC: `0.698554`

Calibration bands:

| Predicted band | n | Mean predicted | Actual win rate |
|---|---:|---:|---:|
| 0-3% | 825 | 2.25% | 1.70% |
| 3-5% | 1,159 | 3.98% | 3.19% |
| 5-7.5% | 1,139 | 6.12% | 6.58% |
| 7.5-10% | 710 | 8.57% | 9.58% |
| 10-15% | 456 | 12.01% | 11.62% |
| 15-20% | 136 | **16.97%** | **19.85%** |
| 20-30% | 97 | **23.35%** | **22.68%** |
| 30%+ | 4 | 33.16% | 25.00% |

Race-bootstrap 95% intervals for the key bands:
- 15-20% predicted: actual 19.85%, CI approximately **13.29-26.71%**; prediction-minus-outcome gap interval crosses zero.
- 20-30% predicted: actual 22.68%, CI approximately **15.12-30.84%**; prediction-minus-outcome gap interval crosses zero.

For the practically stronger region `p >= 10%`:
- n = 693
- mean predicted = 14.69%
- actual win rate = 14.86%

This is encouraging calibration on the untouched year.

## Wide
Dead-heat top-3 races were excluded from pair-outcome scoring because a simple numeric finish-rank label is ambiguous in those cases.

- 293 evaluable races / 32,173 pair observations
- LogLoss: `0.116490`
- Brier: approximately `0.026`
- AUC: `0.713540`

Calibration bands:

| Predicted band | n | Mean predicted | Actual wide hit rate |
|---|---:|---:|---:|
| 0-1% | 7,288 | 0.65% | 0.66% |
| 1-2% | 9,335 | 1.47% | 1.62% |
| 2-3% | 5,658 | 2.46% | 2.88% |
| 3-5% | 5,631 | 3.87% | 3.39% |
| 5-8% | 2,879 | 6.19% | 5.66% |
| 8-12% | 966 | 9.57% | 9.11% |
| 12-20% | 361 | **14.60%** | **16.62%** |
| 20-30% | 42 | **24.10%** | **26.19%** |
| 30-50% | 13 | 33.63% | 30.77% |

Race-bootstrap 95% intervals:
- 12-20% predicted: actual 16.62%, CI approximately **12.84-20.57%**; calibration-gap interval crosses zero.
- 20-30% predicted: actual 26.19%, CI approximately **14.29-39.40%**; sample is still small.

For `p >= 8%`:
- n = 1,382
- mean predicted = 11.55%
- actual hit rate = 11.79%

The wide probability architecture is particularly promising in this pilot.

## Quinella
Dead-heat top-2 races were excluded from pair-outcome scoring.

- 294 evaluable races / 32,293 pair observations
- LogLoss: `0.048618`
- Brier: approximately `0.009`
- AUC: `0.723367`

Calibration bands:

| Predicted band | n | Mean predicted | Actual quinella hit rate |
|---|---:|---:|---:|
| 0-0.5% | 13,216 | 0.29% | 0.33% |
| 0.5-1% | 9,468 | 0.72% | 0.75% |
| 1-2% | 6,583 | 1.39% | 1.28% |
| 2-3% | 1,887 | 2.40% | 2.70% |
| 3-5% | 878 | 3.74% | 3.19% |
| 5-8% | 209 | 5.94% | 4.78% |
| 8-12% | 39 | 9.69% | 12.82% |
| 12-20% | 12 | 13.75% | 8.33% |

For `p >= 3%`:
- n = 1,139
- mean predicted = 4.47%
- actual hit rate = 3.95%

The quinella probabilities are directionally useful, but the higher-probability bins are too sparse to make a strong calibration claim. There is also mild overprediction in the 3-8% region.

## Main conclusion
The proposed **one-world ranking distribution -> derive every ticket probability** architecture passes this first calibration pilot well enough to continue.

Most importantly, on the 2026 holdout:
- A win prediction around 20% was empirically close to a 20% actual win rate.
- A wide prediction in the 12-30% range was also directionally close to observed hit rates.
- Quinella is usable as a candidate probability layer, but high-probability bins need more data / future validation.

This also confirms that **50,000 real bets are not required**. The important test is not Monte Carlo convergence; it is forward calibration against actual unseen race outcomes.

## What this does NOT prove
- It does not prove positive betting ROI.
- It does not use actual ticket odds in this pilot.
- It does not yet estimate a safe EV margin.
- It does not yet combine M3, queue, course fit, Position Risk or current race structure into the latent utility.
- Ability history was reconstructed from available TARGET exports, not replayed from the original canonical training matrix.

## Deployment decision
**Architecture: CONTINUE / promising.**

**Do not yet use as an automatic buy signal.**

Next required step:
1. Freeze this coherent probability layer.
2. Join historical win / quinella / wide odds using only odds available before purchase time.
3. Compute fair odds and EV on a forward holdout.
4. Evaluate ROI, calibration by EV band, max drawdown, longest losing streak, and same-axis portfolio concentration.
5. Only then define purchase thresholds such as EV 1.20 / Safe EV 1.30.
