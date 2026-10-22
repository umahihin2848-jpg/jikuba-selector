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

## Model-selection rule
Candidate choice must be made using 2024 only. 2025 and 2026 are confirmation/OOS and must not be used to tune thresholds, feature weights, blending weights, or model form after results are viewed.

The current leading candidate selected on 2024 is:
- nonlinear robust Closing candidate using the frozen operational features above
- blended 50:50 with production Closing
- production predicted remaining-600m gap is unchanged

## Reconstruction / validation result
Using deduplicated all-class horse histories from the available TARGET export and the same target definition (race-median final 3F minus horse final 3F), the production reconstruction was close to the published OOS behavior in 2025-2026.

Top-3 capture rate (share of actual top-3 horses captured by M3 Top3):

| Year | Production reconstruction | Shadow candidate |
|---|---:|---:|
| 2024 (selection) | 34.1% | 34.9% |
| 2025 (confirmation) | 29.8% | 31.4% |
| 2026 (OOS) | 29.6% | 33.3% |

Closing MAE also improved in all three evaluation years in the same reconstruction:
- 2024: 0.620 -> 0.612
- 2025: 0.614 -> 0.606
- 2026: 0.593 -> 0.588

Important limitation: the locally reconstructed 2024 production Top3 rate is higher than the published production validation, while 2025-2026 are close. Therefore this is promising evidence, not sufficient evidence to replace production M3.

## Forward rules
1. Production M3 remains authoritative.
2. Shadow M3 v2 must be displayed and logged separately.
3. Shadow output must not alter M3 v1 rank, Ability, Pair Survival, probabilities, or tickets.
4. Freeze candidate feature set and blending rule before prospective results are accumulated.
5. Record both v1 and v2 Top3 for every eligible race, including disagreements and no-bet races.
6. Primary endpoint: actual top-3 capture by predicted Top3.
7. Secondary endpoints: winner capture, rank agreement, Closing MAE when result data is later joined, and Pair Survival classification-change diagnostics.
8. Do not promote v2 based on a short winning streak or repeated peeking. Review after a predefined sample milestone.

## Promotion criteria
Do not replace production M3 unless the shadow candidate shows sustained improvement on prospective races and does not materially destabilize Pair Survival classification. Any promotion requires a new model version and a new freeze date.
