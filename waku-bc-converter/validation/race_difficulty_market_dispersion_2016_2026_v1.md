# Race Difficulty — Market Dispersion Validation v1

Date: 2026-10-28

## Purpose

Validate whether the existing market-shape helper used by `mobile-decision-core-v1.js` is useful as one decomposed component of **race difficulty**.

This validation does **not** create a BUY/PASS gate, automatic ticket count, or weighted total difficulty score.

## Scope

- JRA races in supplied historical results
- 2016–2026
- 12 runners or more
- 3-win class / OP / L / G3 / G2 / G1
- jump races excluded
- races requiring complete positive win odds

## Frozen market definition

For each horse:

- `q_i = (1 / win_odds_i) / sum(1 / win_odds)`
- `HHI = sum(q_i^2)`
- `Neff = 1 / HHI`
- `Neff ratio = Neff / runners`

Existing UI boundaries were used unchanged:

- Concentrated: `Neff ratio < 0.38`
- Middle: `0.38 <= Neff ratio <= 0.62`
- Dispersed: `Neff ratio > 0.62`

## 2016–2024 historical pattern

| Market shape | Races | Mean winner popularity | Winner 5th+ | Favorite Top3 | Top3 includes 8th+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Concentrated | 1,019 | 3.06 | 21.3% | 69.9% | 44.7% |
| Middle | 2,086 | 4.14 | 36.1% | 50.4% | 55.0% |
| Dispersed | 134 | 4.72 | 43.3% | 36.6% | 61.2% |

Dispersed vs concentrated:

- Winner 5th+ odds ratio: 2.82, Fisher exact p < 0.001
- Top3 includes 8th+ odds ratio: 1.96, p = 0.00032
- Favorite Top3 odds ratio: 0.25, p < 0.001
- Winner popularity Mann–Whitney one-sided p < 0.001
- Continuous Neff ratio vs winner popularity Spearman rho = 0.213, p < 0.001

## 2025 confirmation

| Market shape | Races | Mean winner popularity | Winner 5th+ | Favorite Top3 | Top3 includes 8th+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Concentrated | 123 | 3.47 | 26.0% | 66.7% | 42.3% |
| Middle | 268 | 4.06 | 35.1% | 53.6% | 56.7% |
| Dispersed | 14 | 6.00 | 50.0% | 50.0% | 85.7% |

Notes:

- Dispersed sample is small (n=14).
- Top3 includes 8th+: dispersed 12/14 vs concentrated 52/123, OR 8.19, p = 0.00328.
- Winner popularity is higher in dispersed races, Mann–Whitney one-sided p = 0.0218.

## 2026 confirmation

| Market shape | Races | Mean winner popularity | Winner 5th+ | Favorite Top3 | Top3 includes 8th+ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Concentrated | 88 | 2.91 | 23.9% | 77.3% | 43.2% |
| Middle | 177 | 4.26 | 38.4% | 50.3% | 62.1% |
| Dispersed | 31 | 5.61 | 61.3% | 51.6% | 74.2% |

Dispersed vs concentrated:

- Winner 5th+: 19/31 vs 21/88, OR 5.05, p = 0.000301
- Top3 includes 8th+: 23/31 vs 38/88, OR 3.78, p = 0.00347
- Favorite Top3: 16/31 vs 68/88, OR 0.314, p = 0.0111
- Winner popularity Mann–Whitney one-sided p = 0.00038
- Continuous Neff ratio vs winner popularity Spearman rho = 0.270, p = 2.5e-6

## Decision

**ADOPT_AS_DESCRIPTIVE_RACE_DIFFICULTY_COMPONENT**

Market dispersion is supported as a useful description of race difficulty:

- concentrated markets are associated with stronger favorite performance and more popular winners;
- dispersed markets are associated with higher winner popularity rank and more lower-popularity horses entering the Top3.

However:

1. Market dispersion is **not** an independent betting edge.
2. It must not automatically determine opponent count or ticket count.
3. It must not override Ability, M3, queue/position risk, or current-condition fit.
4. Do not create a weighted total difficulty score until the other difficulty components are independently validated.
5. The existing 0.38 / 0.62 boundaries were not retuned in this analysis; this is a validation of the currently implemented helper boundaries.

## UI policy

Display as one independent component:

- 市場の分散：低 / 中 / 高
- show Neff / runners and Top3 market share
- use it in the natural-language race-type diagnosis
- never use it alone for BUY/PASS or automatic betting construction
