# Condition Edge runtime fit (2026-10-17)

## Purpose
Freeze a browser-runtime coefficient set for the already validated Horse Condition Edge v1 factor family.

This is **not a new validation result**. The walk-forward validation remains the evidence source. This pass simply refits the frozen factor set on all historical data currently supplied so the app can calculate prospective values on future races.

## Frozen factors
No new variables or thresholds were introduced:

1. distance change versus the previous available high-class start,
2. age band,
3. sex x season.

P10, M3, Ability and QMD are deliberately excluded from the coefficient set.

## Runtime fit universe
- JRA flat races,
- current race 3-win class or higher,
- field size >=12,
- all-2yo races excluded,
- supplied 2016-2026 history available through 2026-10-17,
- **56,321 runner rows / 3,733 races**.

The fitted coefficients are stored in:

`data/condition_edge_runtime_v1.json`

## Win Edge runtime
Baseline:
- normalized inverse single-win closing odds,
- add the frozen condition correction on the logit scale,
- apply one common within-race logit shift so race probabilities sum to 1.

Display:

`Win Condition Edge = adjusted win probability / market win probability`.

## Top3 Edge runtime
Baseline:
- requires the complete wide pair list,
- uses the lower wide quote for each unordered pair,
- inverse-odds pair weights are normalized so pair probabilities sum to 3,
- each horse's market top-3 probability is `0.5 * sum(incident pair probabilities)`,
- add the frozen condition correction on the logit scale,
- apply one common within-race logit shift so horse top-3 probabilities sum to 3.

Display:

`Top3 Condition Edge = adjusted top3 probability / market top3 probability`.

The app must not substitute the single-win-derived Top3 market model for this baseline, because that would change the validated definition.

## Production policy
- Status remains **research / prospective only**.
- Do not interpret Edge > 1 as an automatic buy recommendation.
- Do not combine Win Edge, Top3 Edge, QMD, P10, M3 or Ability into a single synthetic score without separate OOS validation.
- The historical evidence uses closing prices; T-15 execution remains unvalidated.
- Future results should be recorded without retuning this v1 coefficient file. Any factor change creates a new version.
