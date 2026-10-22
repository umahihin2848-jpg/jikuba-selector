# M3 v2 Multi-year Walk-forward Robustness Audit

Freeze date: 2026-10-22
Status: retrospective robustness test / proxy history
Production impact: none

## Why this is a proxy test
`umade.csv` contains target-class races from 2016-2026, but the all-class history export `umadete.csv` does not fully cover older retired horses. Approximate all-class history coverage of target-race runners is extremely low in 2016-2020, about 54% in 2022, about 92% in 2023, and essentially complete from 2024 onward.

Therefore an exact production-M3 walk-forward back to 2016 is not possible with the currently available all-class history file.

To test year-to-year robustness without changing data quality across years, this audit uses a common restricted history source for every year: prior 3-win-or-higher starts from `umade.csv` only. This is intentionally a proxy/stress test and is not mixed with the exact-history 2024-2026 validation.

## Protocol
- Eligible target races: JRA flat, field size >= 12, 3-win class or higher.
- Historical inputs for this audit: up to the latest 5 strictly prior target-class starts only.
- Expanding yearly walk-forward: all earlier years train, the next year is evaluated.
- First reported evaluation year: 2019, after a 2016-2018 build-up period.
- Both models receive the same history and the same remaining-600m prediction.
- v1 proxy Closing: regularized linear model using the production-style feature family.
- v2 proxy Closing: frozen nonlinear robust feature family (distribution, recency, positional gain, same-surface and position-conditioned Closing features), blended 50:50 with v1 Closing.
- No current odds, popularity, Ability, Pair Survival, or future outcome information is used as an input.

## Annual result
Primary endpoint: share of actual top-3 finishers captured by predicted M3 Top3.

| Year | Test races | v1 proxy | v2 proxy | Difference | Closing MAE v1 | Closing MAE v2 |
|---|---:|---:|---:|---:|---:|---:|
| 2019 | 326 | 29.96% | 30.67% | +0.72 pt | 0.5706 | 0.5637 |
| 2020 | 378 | 26.67% | 29.05% | +2.38 pt | 0.6350 | 0.6283 |
| 2021 | 395 | 28.31% | 28.31% | +0.00 pt | 0.6227 | 0.6155 |
| 2022 | 385 | 27.77% | 30.02% | +2.25 pt | 0.6280 | 0.6193 |
| 2023 | 407 | 28.95% | 31.64% | +2.70 pt | 0.6371 | 0.6292 |
| 2024 | 400 | 31.14% | 32.97% | +1.83 pt | 0.6362 | 0.6276 |
| 2025 | 403 | 28.96% | 30.78% | +1.82 pt | 0.6271 | 0.6183 |
| 2026 | 297 | 29.26% | 29.82% | +0.56 pt | 0.6010 | 0.5910 |

Result pattern:
- v2 improved Top3 capture in 7 of 8 years.
- 2021 was exactly tied.
- No year showed a lower Top3 capture rate for v2.
- Closing MAE improved in all 8 years.

## Aggregate paired result
2019-2026 combined:
- races: 2,991
- actual top-3 horse opportunities: 8,985
- v1 capture: 28.86%
- v2 capture: 30.44%
- difference: +1.58 pt
- net additional captured top-3 horses: +142

Uncertainty:
- race-level paired bootstrap 95% interval: about +0.95 to +2.23 pt
- race-day cluster bootstrap 95% interval: about +0.93 to +2.24 pt
- paired sign-flip diagnostic: p < 0.00005 with 20,000 random sign flips

The positive interval remains above zero even when same-day races are resampled as a cluster.

## Direct Top3 replacement quality
Across the 2,991 walk-forward races, v2 changed 2,205 Top3 slots relative to v1.

- horses newly added to Top3 by v2: 617 / 2,205 actually finished top-3 = 27.98%
- horses removed from Top3 by v2: 475 / 2,205 actually finished top-3 = 21.54%

Thus the improvement is not only an aggregate ranking effect: the direction of the individual Top3 replacements was favorable.

Annual added-vs-dropped top-3 rates:
- 2019: 28.57% vs 25.71%
- 2020: 29.70% vs 19.55%
- 2021: 21.77% vs 21.77%
- 2022: 29.67% vs 20.15%
- 2023: 31.58% vs 20.72%
- 2024: 28.42% vs 20.89%
- 2025: 28.35% vs 21.50%
- 2026: 25.24% vs 22.86%

Again, there was no year in which the removed group had a higher top-3 rate than the newly added group.

## Distance robustness in this proxy audit
Descriptive only; do not tune thresholds from this table.

| Distance | Races | v1 | v2 | Difference |
|---|---:|---:|---:|---:|
| <=1400m | 1,138 | 26.15% | 27.26% | +1.11 pt |
| 1401-1800m | 1,127 | 29.56% | 31.07% | +1.51 pt |
| 1801-2200m | 543 | 31.37% | 33.58% | +2.21 pt |
| >2200m | 183 | 34.00% | 37.09% | +3.09 pt |

This proxy walk-forward does not reproduce the previously observed small-sample >2200m weakness from the exact-history 2025-2026 audit, which is another reason not to create a post-hoc distance exclusion.

## Decision
This audit supports moving M3 v2 Closing to prospective Shadow display/logging.

It does NOT support replacing production M3 v1. Reasons:
1. historical inputs here are a deliberately restricted proxy rather than exact all-class 5-run history;
2. the candidate feature family was developed retrospectively;
3. Pair Survival was validated using production M3 v1;
4. final promotion still requires the frozen prospective review.

Operational decision:
- implement/display v2 as Shadow only;
- keep M3 v1 authoritative for Ability intersection, Pair Survival, probabilities, and tickets;
- log every eligible race, including v1/v2 disagreements;
- keep the predeclared 200-race descriptive interim and 400-race primary promotion review.