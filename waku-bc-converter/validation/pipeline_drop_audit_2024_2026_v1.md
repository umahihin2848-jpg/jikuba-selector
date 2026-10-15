# Ability → Queue → Remaining600 → M3 drop audit (2024–2026)

Created: 2026-10-15

## Universe

- JRA flat only
- 12 runners or more
- 3-win class or higher
- 2024: 400 races
- 2025: 403 races
- 2026: 297 races
- Total: 1,100 races / 16,669 runner-events
- Actual top-3 horse-events: 3,305
- Obstacle races are excluded using the previously audited 52-race exclusion universe.

## Replay method

The audit replays the production structural logic from strictly prior history only.

- Ability: production Ability v3 coefficients. Historical opponent-strength lookup is intentionally set to the documented model-median fallback, so this is a conservative Ability replay rather than a claim of exact opponent-Elo reproduction.
- Queue: production `validated_queue_model_v1` formula.
- Remaining 600m: production deployable formula from `scenario_component_validation_v2`.
- M3: production `finish600_model_v1` core M3 formula.

The M3 replay is internally consistent with the stored validation. Actual top-3 recall from an M3 Top3 set is 31.7% in 2024, 30.2% in 2025 and 29.8% in 2026, closely matching the stored production overlap figures 31.75%, 30.19% and 29.85%.

## Important architecture note

This is **not a literal causal chain**. Ability and validated Queue do not directly enter the production M3 score. Therefore “where a horse is dropped” is interpreted as a diagnostic trace showing where the model views diverge from the eventual top-3 horse.

## First diagnostic mismatch for actual top-3 horses

Using Ability A+B as “still alive”, and a 0.20 field-rank-fraction pessimism threshold for Queue / Remaining600:

| First mismatch | Horse-events | Share |
|---|---:|---:|
| Ability weak / history insufficient | 1,275 | 38.6% |
| Queue materially too pessimistic | 364 | 11.0% |
| Remaining600 materially too pessimistic | 261 | 7.9% |
| M3 finish conversion leaves horse outside Top3 | 866 | 26.2% |
| M3 Top3 captures horse after earlier checks | 539 | 16.3% |

The percentages above are diagnostic attribution only, not causal contribution percentages.

## What is actually limiting M3?

A stronger decomposition replaces one uncertain production component at a time with the realized race value. This is an oracle diagnostic and must not be used as a live predictor.

| M3 ranking | Actual top-3 recall |
|---|---:|
| Production M3 | 30.7% |
| Perfect Remaining600 position, current closing model retained | 32.7% |
| Production Remaining600 position, perfect realized closing strength | 53.3% |
| Perfect Remaining600 + perfect realized closing strength | 93.1% |

The key result is that **Remaining600 position is not the main bottleneck**. Knowing the true Remaining600 position only raises Top3 recall by about 2 points overall. The much larger uncertainty is the horse's Remaining600-to-finish closing performance on that day.

Among 2,292 actual top-3 horse-events missed by M3 Top3, using a 0.3-second diagnostic threshold:

- closing strength was underestimated only: 1,153
- both position and closing strength were underestimated: 585
- Remaining600 position was underestimated only: 389
- neither large error: 165

This does not mean the closing model is “bad”; realized closing performance contains race-day outcome information unavailable pre-race. It means that this is where most irreducible / not-yet-captured variation sits.

## Ability and M3 are complementary

M3 Top3 alone catches 30.7% of actual top-3 horse-events. M3 Top5 catches 45.4%.

A simple diagnostic union, Ability A + M3 Top3, averages about 5.02 candidates and catches 50.9%. More importantly, a fixed-size five-horse exploratory rule — **M3 Top3 plus the best two Ability horses outside that Top3** — catches 50.9%, versus 45.4% for M3 Top5 at the same five-horse budget.

Race-bootstrap comparison of actual top-3 horses caught per race:

- mean gain: +0.163 top-3 horses per race
- 95% bootstrap CI: +0.122 to +0.204
- yearly gain per race: 2024 +0.160 / 2025 +0.174 / 2026 +0.152

The effect is directionally stable across all three years. However, this rescue rule was discovered after looking at the 2024–2026 audit, so it is **exploratory only**. It must not be promoted into probability or betting logic without a new future/prospective holdout.

## Rescue observation

Of the 2,292 actual top-3 horses missed by M3 Top3:

- 669 were Ability A
- 588 were Ability B
- 718 were only M3 ranks 4–6

This suggests the UI should not visually treat a strong-Ability horse as disproven simply because M3 puts it fourth or lower. A non-scoring “Ability rescue/watch” label is statistically defensible as a review aid, provided it is clearly separated from calibrated probability and betting decisions.

## Current decision

- Do not change calibrated probability logic.
- Do not change betting logic.
- Keep Queue as a structural/visual layer.
- Keep Remaining600 as a structural position feature.
- Keep M3 as the main finish-structure ranking.
- Consider a display-only Ability rescue/watch marker, then log it prospectively before any promotion into selection logic.
