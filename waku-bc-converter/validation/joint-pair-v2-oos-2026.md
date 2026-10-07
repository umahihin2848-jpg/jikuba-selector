# Joint Pair Probability v2/v3 — 2026 OOS validation

Date: 2026-10-07

## Correction note
An earlier draft reported 364 races / 35,137 pairs. That draft excluded rows explicitly named 障害/JG but still retained several named jump races whose names did not contain those exact tokens. The cohort has been rebuilt with the flat-race filter corrected before model comparison. All metrics below replace the earlier draft.

## Purpose
Validate the pair-alignment step that takes horse-level calibrated top2/top3 probabilities and aligns the existing popularity-based pair prior to those race-level marginals. Also test whether replacing calibrated top3 with the horse-specific integrated top3 improves final wide-pair probabilities.

## Corrected 2026 cohort
- Source: retained 2026 JRA result data used by the project.
- Classes: 3-win, OP, L, G3, G2, G1.
- Flat races only; named jump races are excluded in addition to explicit 障害/JG labels.
- Top 1/2/3 must each be uniquely determined.
- Races: 361
- Unordered horse pairs: 35,018

This clean cohort is used for all old-v1 vs aligned-v2 comparisons below.

## Quinella — calibrated top2 alignment
Procedure:
1. Existing Plackett-Luce popularity prior defines pair shape.
2. Calibrated horse top2 probabilities are normalized to total race mass 2.0.
3. Symmetric iterative pair scaling makes pair degrees match those horse marginals while pair total remains 1.0.

| Metric | v1 prior | aligned v2/v3 | Direction |
|---|---:|---:|---|
| Pair binary Log Loss | 0.0504691 | 0.0485083 | improved 3.89% |
| Pair Brier | 0.0099965 | 0.0098615 | improved 1.35% |
| Equal-frequency ECE10 | 0.3557 pt | 0.0994 pt | improved 72.1% |
| Winning-pair multiclass NLL | 3.91105 | 3.72792 | improved 4.68% |

Race-level paired bootstrap, 20,000 resamples:
- Log Loss difference aligned-v1: 95% CI [-0.002694, -0.001221].
- Brier difference aligned-v1: 95% CI [-0.0002025, -0.0000691].

Decision: **adopt calibrated-top2 alignment for quinella structure.**

## Wide — calibrated 10-year top3 alignment
The same prior is aligned to calibrated 10-year horse top3 probabilities, normalized to total top3 mass 3.0. Wide pair degrees are twice those top3 marginals and total pair mass remains 3.0.

| Metric | v1 prior | calibrated-top3 aligned | Direction |
|---|---:|---:|---|
| Pair binary Log Loss | 0.1191462 | 0.1149264 | improved 3.54% |
| Pair Brier | 0.0283915 | 0.0277305 | improved 2.33% |
| Equal-frequency ECE10 | 0.9728 pt | 0.1757 pt | improved 81.9% |

Race-level paired bootstrap, 20,000 resamples:
- Log Loss difference aligned-v1: 95% CI [-0.005560, -0.002871].
- Brier difference aligned-v1: 95% CI [-0.000902, -0.000429].

Decision: **adopt calibrated 10-year top3 alignment for wide structure.**

## Horse-specific integrated top3 replacement test
The deployed app had been replacing calibrated top3 with the horse-specific integrated top3 where available. The retained validation files do not contain every lower-class historical run used by TARGET for young horses, nor a directly persisted row-level final integrated-prediction table. Therefore an exact byte-for-byte reconstruction of every 2026 horse is not possible from the retained validation files alone.

A reproducible common cohort was reconstructed from the retained data using the current integrated-model formula and the available historical inputs. This recreation closely reproduces the stored integrated-model aggregate improvement relative to its own popularity-only market baseline, so it is suitable as a model-selection check.

### Horse-level top3 comparison on reproducible common flat cohort
- Horses: 3,989
- Races with reconstructed horse-specific probabilities: 340

| Metric | calibrated 10-year top3 | reconstructed horse-specific integrated |
|---|---:|---:|
| AUC | 0.77180 | 0.77002 |
| Log Loss | 0.41928 | 0.42123 |
| Brier | 0.13289 | 0.13353 |

Race-level paired bootstrap for Log Loss difference integrated-minus-calibrated, 20,000 resamples:
- 95% CI [0.000109, 0.003793].

Positive values mean the horse-specific replacement is worse. The interval is above zero for Log Loss.

### Wide-pair comparison after alignment
For races/horses lacking reconstructable horse-specific history, the calibrated top3 remains the fallback, matching the app's intended fallback behavior.

| Metric | calibrated-top3 wide | horse-specific-replaced wide |
|---|---:|---:|
| Pair binary Log Loss | 0.1149264 | 0.1153101 |
| Pair Brier | 0.0277305 | 0.0277914 |
| Equal-frequency ECE10 | 0.1757 pt | 0.2134 pt |

Race-level paired bootstrap, 20,000 resamples:
- Log Loss difference horse-specific-minus-calibrated: 95% CI [0.000053, 0.000721].
- Brier difference: 95% CI [-0.000009, 0.000137].

The Log Loss result is consistently worse with the horse-specific replacement. The direction does not reverse when restricting to races with >=50%, >=80%, or 100% reconstructable horse-specific coverage.

## Model-selection conclusion
The earlier statement that the integrated horse-specific top3 was "better OOS" was only relative to its own simpler popularity-only market baseline. That is not sufficient for final-model selection because the stronger calibrated 10-year top3 model must be the comparator.

Final policy:
- **Win probability:** calibrated 10-year model.
- **Top2 probability:** calibrated 10-year model.
- **Top3 probability:** calibrated 10-year model.
- **Horse-specific integrated top3:** retain as explanatory/condition context only; do not replace final top3.
- **Quinella pair structure:** align to calibrated top2.
- **Wide pair structure:** align to calibrated top3.
- **EV / automatic buy signal:** not adopted.

This policy is implemented as joint-pair-probability-addon-v3 plus the validated-top3 display guard.
