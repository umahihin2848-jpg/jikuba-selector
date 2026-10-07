# Joint Pair Probability v2 — 2026 OOS validation

Date: 2026-10-07

## Purpose
Validate the v2 pair-alignment step that takes horse-level calibrated top2/top3 probabilities and aligns the existing popularity-based pair prior to those race-level marginals.

## Cohort
- Source: 2026 JRA result data used by the project.
- Classes: 3-win, OP, L, G3, G2, G1.
- Flat races only (obstacle/JG excluded).
- Top 1/2/3 must each be uniquely determined (top-three dead heats excluded).
- Races: 364
- Horses: 5,139
- Unordered horse pairs: 35,137

This is an independently reconstructed clean 2026 flat holdout cohort. It is not asserted to be identical to the older v1 stored holdout cohort (383 races / 36,071 pairs), because the exact old row-filter recipe was not persisted.

## Fair comparison
Old v1 and new v2 were both evaluated on the exact same 364-race cohort.

### Quinella
v2 uses the current deployed procedure:
1. Existing Plackett-Luce popularity prior defines pair shape.
2. Calibrated horse top2 probabilities are normalized to total race mass 2.0.
3. Iterative symmetric pair scaling makes pair degrees match those horse marginals while pair total remains 1.0.

| Metric | v1 prior | v2 aligned | Direction |
|---|---:|---:|---|
| Pair binary Log Loss | 0.0506723 | 0.0487285 | improved 3.84% |
| Pair Brier | 0.0100439 | 0.0099089 | improved 1.34% |
| Equal-frequency ECE10 | 0.3614 pt | 0.1032 pt | improved 71.4% |
| Winning-pair multiclass NLL | 3.90690 | 3.72631 | improved 4.62% |

Race-level paired bootstrap (20,000 resamples):
- Log Loss difference v2-v1 = -0.0023485; 95% CI [-0.0034495, -0.0012501].
- Brier difference v2-v1 = -0.0002054; 95% CI [-0.0003644, -0.0000586].

Interpretation: the v2 quinella alignment is a robust OOS improvement over the old popularity-only pair prior on this clean 2026 holdout cohort.

### Wide — base-top3 alignment layer
For a clean layer-by-layer comparison, calibrated 10-year horse top3 probabilities were used as the v2 wide marginals (before the horse-specific integrated top3 correction).

| Metric | v1 prior | v2 aligned | Direction |
|---|---:|---:|---|
| Pair binary Log Loss | 0.1194698 | 0.1151311 | improved 3.63% |
| Pair Brier | 0.0284985 | 0.0278073 | improved 2.43% |
| Equal-frequency ECE10 | 0.9735 pt | 0.1833 pt | improved 81.2% |

Race-level paired bootstrap (20,000 resamples):
- Log Loss difference v2-v1 = -0.0061444; 95% CI [-0.0081799, -0.0041744].
- Brier difference v2-v1 = -0.0011634; 95% CI [-0.0016802, -0.0006615].

Interpretation: the pair-alignment transformation itself materially improves OOS wide calibration when the validated base top3 model supplies the marginals.

## Important limitation for current deployed wide display
The deployed app uses the horse-specific integrated top3 probability where available, rather than the base top3 probability used in the wide comparison above. The integrated horse-specific top3 model has separately shown 2026 OOS improvement, but the exact combined chain:

integrated horse-specific top3 -> v2 pair alignment -> wide pair probability

has not yet been reproduced end-to-end on the same row-level holdout in this report. Therefore:
- Quinella v2: OOS validated directly.
- Wide pair-alignment core: OOS validated.
- Exact deployed wide v2 final pair probability: keep labeled as validation pending until the integrated per-horse holdout predictions are recreated end-to-end.

## Betting interpretation
This validation concerns probability quality/calibration, not profitability. Previous pair-odds EV tests did not establish a stable return-on-investment edge, so these probabilities should remain race-structure/reference information rather than an automatic buy signal.
