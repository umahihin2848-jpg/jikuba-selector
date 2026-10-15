# Final pipeline verification verdict (2024–2026)

Created: 2026-10-15

## Scope

This closes the structural audit of the current V3 architecture using the already frozen component validations plus the 1,100-race pipeline replay.

Universe: JRA flat, field size >=12, 3-win class or higher. 2024=400 races, 2025=403, 2026=297; total 1,100 races / 16,669 runner-events / 3,305 actual top-3 horse-events.

## Reproduction check

The reconstructed M3 Top3 actual-top3 recall is 31.7% (2024), 30.2% (2025), 29.8% (2026), closely reproducing the stored production validation values 31.75%, 30.19%, 29.85%. The pipeline replay is therefore sufficiently aligned for diagnostic use.

## Main bottleneck

Oracle substitution was used only as a diagnostic; it is not deployable pre-race information.

| ranking input | 2024 | 2025 | 2026 | pooled |
|---|---:|---:|---:|---:|
| production M3 | 31.7% | 30.2% | 29.8% | 30.7% |
| actual Remaining600 gap + predicted close | 31.4% | 32.1% | 35.2% | 32.7% |
| predicted Remaining600 gap + actual realized close | 55.2% | 53.4% | 50.6% | 53.3% |
| actual Remaining600 gap + actual realized close | 93.3% | 92.7% | 93.3% | 93.1% |

Conclusion: Remaining600 position prediction is not the dominant limitation. The larger uncertainty is the horse's race-day Remaining600-to-finish closing performance. This is stable across all three years.

Among 2,292 actual top-3 horse-events missed by M3 Top3 at a 0.3-second diagnostic threshold, 1,153 had closing strength underestimated only and 585 had both closing and position underestimated. Thus 1,738/2,292 (75.8%) of M3 misses included material closing-strength underestimation. This must not be interpreted as 75.8% being directly fixable: realized closing performance contains outcome information unavailable before the race.

## Ability and M3 relationship

The layers are complementary, but they are not symmetric as raw pre-race ranking signals.

The frozen Ability-v2 diagnostic on the same 2025–2026 700-race universe shows:

- Ability v2 rank 1 overall: top3 43.6%, win 18.4%.
- Ability v2 rank 1 even when M3 rank >=7: n=225, top3 39.6%, win 17.3%.
- Ability v2 top3 with M3 rank >=7: n=786, top3 32.1%, win 13.0%.
- M3 top3 with Ability v2 rank >=7: n=755, top3 19.9%, win 6.6%.

Therefore M3 disagreement should not be treated as disproving a strong Ability horse. Conversely, a structure-only uplift horse should remain a separate watch/opponent type rather than automatically replacing a strong Ability horse as the analysis center.

However, after adjusting the ground-keep vs structure-rise role comparison for final popularity rank, the estimated top3 difference is only +2.5 percentage points for ground-keep and the race-cluster 95% interval crosses zero. Therefore this raw predictive ordering is **not** a betting-value ordering. Price and EV must remain separate.

## Fixed-size shortlist diagnostic

At the same five-horse budget:

- M3 Top5 catches 45.4% of actual top-3 horse-events.
- M3 Top3 + best two Ability horses outside the M3 Top3 catches 50.9%.
- Mean gain = +0.163 actual top-3 horses per race; race-bootstrap 95% CI +0.122 to +0.204.
- Yearly gain per race: 2024 +0.160, 2025 +0.174, 2026 +0.152.

The direction is stable, but this rule was found after inspecting 2024–2026. It remains exploratory and must not be promoted into calibrated probability or betting logic without genuinely future/prospective validation.

## Preprocessing robustness check

The recent TARGET obstacle/non-finish hardening does not overturn the 1,100-race top3 conclusions. In the `umade.csv` replay source, only 25/16,669 target runner-events (0.15%) had an obstacle start inside the unsanitized recent-5/recent-10 history window, and none of those 25 runners finished in the actual top 3 of the audited target race. The master replay source contains numeric finish rows only, so the per-race TARGET non-finish exclusion cannot be reproduced from this master file; it remains covered by the dedicated CSV compatibility regression tests.

## Final architecture decision

1. Keep Ability independent from market.
2. Keep Queue as a structural/visual first-corner layer; do not make it a probability correction.
3. Keep Remaining600 as a structural position forecast; do not hard-threshold it into a buy rule.
4. Keep M3 as the finish-structure ranking and calibrated structural probability source.
5. Do not use M3 as a veto against a strong Ability horse.
6. Keep `地力残し` and `構造浮上` as visibly separate review roles. Do not convert their historical raw rates into the current horse's probability.
7. Do not change betting logic from this audit.
8. Freeze any Ability-rescue shortlist rule and log it prospectively before promotion.

## Current UI assessment

The present safe interpretation is: the Ability×M3 overlap may remain the strongest **agreement** label, while Ability-strong/M3-low horses stay visible as `地力残し` rather than being treated as disproven. The market and EV remain last-stage price checks. This matches the validated architecture better than collapsing Ability and M3 into one score.
