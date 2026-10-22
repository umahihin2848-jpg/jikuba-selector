# M3 v2 Closing Shadow Protocol

Freeze date: 2026-10-22
Status: research / shadow only
Production impact: none

## Goal
Deepen only the Closing component of M3 while keeping the production M3 ranking unchanged. Compare production M3 v1 against a candidate Closing model in parallel. Do not alter Ability, Race Flow, Pair Survival, calibrated probabilities, or betting logic during this research phase.

## Current production M3
Production M3 ranks horses by:

`score = predicted remaining-600m gap - predicted closing strength`

The published `finish600_model_v1` uses up to 5 strictly prior starts and operational pre-race features including historical gap, PCI/RPCI, final 3F, frontness, same-surface summaries, field size, gate fraction, distance, and surface.

Published protocol in `finish600_model_v1`:
- train: 2019-2023
- model selection: 2024
- confirmation: 2025
- final OOS: 2026

## Candidate family frozen for research
The candidate must keep the production predicted remaining-600m gap unchanged and modify only predicted Closing.

Candidate Closing inputs are restricted to information available before the race and derived from the horse's latest 5 starts:
- all current production Closing features
- final-3F distribution: Q25, Q75, IQR, minimum, maximum
- recency-weighted final-3F mean
- PCI-RPCI distribution and recency-weighted mean
- remaining-600m-gap distribution and recency-weighted mean
- frontness distribution and recency-weighted mean
- first-corner to fourth-corner gain distribution and recency-weighted mean
- same-surface final-3F Q25/Q75/IQR/minimum
- position-conditioned final-3F summaries for front / middle / back historical positions

No current win odds, popularity, Ability rank, current Pair Survival result, or post-race information may enter the candidate Closing model.

## Frozen model form
The research candidate is fixed as:
- `HistGradientBoostingRegressor`
- `max_iter=180`
- `learning_rate=0.05`
- `max_leaf_nodes=31`
- `min_samples_leaf=40`
- `l2_regularization=1.0`
- `random_state=1`
- missing values: median imputation with missing indicators
- training years: 2019-2023
- candidate Closing is blended 50:50 with production Closing
- production predicted remaining-600m gap is unchanged

Do not change these hyperparameters, feature definitions, or the 50:50 blend after 2025/2026 results have been viewed.

## Statistical audit correction
The first reconstruction used the deduplicated `umadete.csv` history table as both the history source and the target-race result table. That table does not contain every runner in many early target races, especially 2019-2022, so it is not statistically appropriate as the complete outcome table.

The corrected audit uses:
- `umade.csv` as the complete target-race/result table
- deduplicated `umadete.csv` only as the all-class historical source
- a union keyed by race and horse so that target-race rows are complete while prior-start information is added when available
- strictly prior starts only for all historical features
- target Closing = race-median final 3F minus horse final 3F

This correction supersedes the earlier reconstruction numbers.

## Corrected historical audit
Primary endpoint: share of the actual top-3 finishers captured by predicted M3 Top3.

| Year | Role | Production reconstruction | Shadow candidate | Difference |
|---|---|---:|---:|---:|
| 2024 | model-selection year | 34.1% | 34.1% | +0.0 pt |
| 2025 | held-out historical check | 29.8% | 32.1% | +2.25 pt |
| 2026 | held-out historical check | 29.6% | 32.8% | +3.15 pt |
| 2025-2026 combined | diagnostic held-out summary | 29.74% | 32.38% | +2.63 pt |

Captured actual top-3 horses in 2025-2026 combined:
- production: 621 / 2088
- shadow: 676 / 2088
- net: +55 captures

### Uncertainty for the paired Top3 difference
Race-level paired bootstrap / sign-flip diagnostics:
- 2025: +2.25 pt; 95% bootstrap CI about +0.42 to +4.08 pt; paired sign-flip p about 0.020
- 2026: +3.15 pt; 95% bootstrap CI about +1.01 to +5.29 pt; paired sign-flip p about 0.006
- 2025-2026 combined: +2.63 pt; 95% bootstrap CI about +1.25 to +4.02 pt; paired sign-flip p about 0.0003

A more conservative race-day cluster bootstrap, which keeps same-day races together, gave a combined 95% interval of about +1.27 to +4.04 pt. The direction therefore does not depend on treating every race as fully independent.

### Closing MAE
Race-level mean absolute Closing error also improved:
- 2024: 0.622 -> 0.612
- 2025: 0.612 -> 0.601
- 2026: 0.595 -> 0.587
- 2025-2026 combined: 0.605 -> 0.595

The paired combined MAE improvement was about -0.0095, with a bootstrap 95% interval about -0.0115 to -0.0074.

## Interpretation
The corrected result supports the hypothesis that refining Closing is a sensible direction. The improvement is present in both 2025 and 2026 and survives race-level and race-day clustered uncertainty checks.

This is still not sufficient to replace production M3 because:
1. the candidate family and feature engineering were developed retrospectively;
2. 2025/2026 have now been viewed and cannot be reused for additional tuning;
3. subgroup behavior is not uniform;
4. production Pair Survival was validated with M3 v1, not this shadow model.

Therefore the only clean next step is prospective Shadow validation from the freeze date onward.

## Subgroup risk to monitor, not tune
Descriptive 2025-2026 audit:
- dirt: improvement about +1.35 pt
- turf: improvement about +3.46 pt
- <=1400m: about +3.63 pt
- 1401-1800m: about +2.85 pt
- 1801-2200m: about +2.58 pt
- >2200m: about -4.88 pt, but only 41 races

Do not exclude >2200m now. That would be post-hoc tuning. Keep the frozen candidate unchanged and log distance strata prospectively.

## Forward rules
1. Production M3 remains authoritative.
2. Shadow M3 v2 is displayed and logged separately.
3. Shadow output must not alter M3 v1 rank, Ability, Pair Survival, probabilities, or tickets.
4. Freeze the feature set, model form, hyperparameters, and 50:50 blend.
5. Record both v1 and v2 Top3 for every eligible race, including disagreements and no-bet races.
6. Primary endpoint: actual top-3 capture by predicted Top3.
7. Secondary endpoints: winner capture, rank agreement, Closing MAE after result joining, and Pair Survival classification-change diagnostics.
8. Log surface and distance strata, but do not create new thresholds from short-run subgroup results.
9. Avoid repeated significance-based decisions while the sample accumulates.

## Review milestones
Observed paired race-level SD of the Top3 difference in the historical audit is about 0.189. With an expected improvement near +2.6 pt, approximately 400 prospective races are needed for about 80% power at a conventional two-sided 5% level.

Predeclare:
- 200 races: descriptive interim review only; no promotion decision
- 400 races: primary Shadow promotion review

The app may show cumulative descriptive results, but model promotion must not occur before the predefined primary review unless there is a safety/data-integrity problem.

## Promotion criteria
Do not replace production M3 unless, at the 400-race prospective review:
- v2 Top3 capture exceeds v1 by a practically meaningful amount;
- the paired uncertainty interval does not indicate a material deterioration;
- Closing MAE is not worse;
- improvement is not obviously confined to a single narrow subgroup;
- Pair Survival classification is not materially destabilized.

Any promotion requires a new model version and a new freeze date. Pair Survival must then be revalidated separately under the promoted M3 version.
