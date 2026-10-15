# Late-race reserve / previous-race lap-shape validation v1

Created: 2026-10-16

## Question

Test whether race-level 200m lap shape from the **previous start** can predict that a horse will again outperform the production M3 closing expectation at the next start.

This is motivated by the physiological idea that useful late-race reserve is better represented by avoiding late deceleration after workload than by raw final-3F speed alone.

## Data and linkage

Sources:

- `lap2016_2026(1).csv`: 35,857 JRA race-level lap rows, 2016-2026.
- `umadete.csv`: runner history used to identify each target horse's strictly previous start and position/closing information.
- existing reconstructed M3 target universe / residual table for 2024-2026.

Target is the current-race closing residual:

`realized closing strength - production M3 predicted closing strength`

Positive means the horse closed better than M3 expected.

To avoid wrong race joins, previous races were linked to the lap file only when `date + venue + distance + normalized race name` gave a unique one-to-one match.

Clean previous-lap linkage coverage:

| Year | Target rows | Linked previous lap | Coverage |
|---|---:|---:|---:|
| 2024 | 6,009 | 5,119 | 85.19% |
| 2025 | 6,094 | 5,169 | 84.82% |
| 2026 | 4,515 | 3,903 | 86.45% |

The lap file itself covers 2016-2026, but the available runner-history export is not sufficiently complete for a canonical high-class M3 target reconstruction in the early years. Therefore the direct M3-residual test is 2024-2026; earlier lap rows can still appear as a target horse's prior race when linked.

## Predefined lap-shape features

No horse-level 200m GPS splits are available. The tested features are race-level workload proxies from the previous race:

- `late_decel_2f`: final 1F minus mean of the preceding two 1F laps. Positive = late slowdown.
- `last4_sd`: variability of the last 4F.
- `max_accel_last4`: largest adjacent lap-time drop in the last 4F.
- `pace_change_count_03`: number of >=0.3 sec adjacent changes in the last 4F.
- `pace_balance_5f`: first 5F time minus last 5F time. Positive = back 5F faster.

Horse-specific previous-race context was also available:

- previous race relative closing (`race median final3F - horse final3F`)
- actual remaining-600 gap
- first available corner frontness
- previous PCI-RPCI difference
- days since previous race
- surface/distance change
- existing leak-safe `末脚特性` continuous effect

## Models

All models predict the next-race M3 closing residual.

`Controls` contains horse/history/current-condition information but no race-level lap shape.

`+ Lap main` adds the five lap-shape features.

`+ Lap stress` additionally interacts front-position load with late deceleration / acceleration / pace-change demand.

`+ Lap coping` additionally asks whether a horse that closed well despite those workload proxies repeats that advantage next time.

Ridge regularization was selected only from 2024 race-grouped 5-fold CV. The conservative optimum was alpha=1000 for all main comparisons. 2025 and 2026 were then evaluated without refitting.

## 2024 development check

Race-grouped CV MAE / RMSE:

| Model | MAE | RMSE |
|---|---:|---:|
| Controls | **0.61012** | **0.90069** |
| + Lap main | 0.61049 | 0.90137 |
| + Lap stress | 0.61044 | 0.90150 |
| + Lap coping | 0.61100 | 0.90207 |

The previous-race lap features did **not** improve the development-year cross-validation.

A linked-only repeat (removing all missing lap joins rather than imputing them) gave the same result: Controls MAE 0.59533 vs +Lap main 0.59576, +Lap stress 0.59585, +Lap coping 0.59601.

## Later-year residual prediction

### 2025

| Model | MAE | RMSE |
|---|---:|---:|
| M3 residual=0 baseline | 0.61153 | 0.91630 |
| Controls | 0.60712 | 0.89808 |
| + Lap main | 0.60705 | 0.89798 |
| + Lap stress | **0.60694** | **0.89794** |
| + Lap coping | 0.60755 | 0.89917 |

### 2026

| Model | MAE | RMSE |
|---|---:|---:|
| M3 residual=0 baseline | **0.58109** | 0.88875 |
| Controls | 0.58254 | 0.88040 |
| + Lap main | 0.58252 | 0.88019 |
| + Lap stress | 0.58248 | 0.88018 |
| + Lap coping | 0.58208 | **0.87967** |

The lap increments are extremely small. They do not reproduce as a meaningful MAE improvement.

Pooled 2025-2026, `+ Lap stress` vs Controls:

- MAE difference: about **-0.00013 sec**, race-bootstrap 95% CI **-0.00031 to +0.00005**.
- MSE difference: about **-0.00032 sec^2**, 95% CI **-0.00064 to +0.00002**.

This is too small and too uncertain for a deployable horse-level reserve score.

`+ Lap main` showed a tiny pooled MSE reduction (bootstrap interval slightly below zero) but no MAE or ranking benefit. This looks like a very small tail-error effect rather than a useful selection signal.

## M3 ranking impact

Applying predicted residual as an adjustment to M3 score gives:

| Model | 2025 Top3 capture | 2026 Top3 capture |
|---|---:|---:|
| Production-style M3 replay | 29.78% | 29.84% |
| Controls | 31.43% | 30.18% |
| + Lap main | 31.35% | 30.18% |
| + Lap stress | 31.68% | 30.29% |
| + Lap coping | 31.93% | 30.74% |

The apparently best `+ Lap coping` ranking gain over Controls is only about +0.50 to +0.56 percentage points by year and is not statistically resolved:

- pooled Top3 difference vs Controls: about **+0.52 pt**
- race-bootstrap 95% CI about **-0.14 to +1.24 pt**

It also worsened 2025 MSE, so it is not a stable improvement.

## Direct high-workload pattern check

A second, more interpretable test used 2024-fixed upper-quartile workload definitions. It asked:

> If a horse was close to the pace, encountered high late deceleration / acceleration / repeated pace changes, and still closed faster than the race median, does it perform better next time than another horse that also closed faster than the median but did not face that high workload?

Result: **no stable incremental effect**.

Examples:

- High front-position + late-deceleration coping vs other positive previous closers: +0.05 sec next residual in 2025 but -0.04 sec in 2026; both bootstrap intervals cross zero.
- High front-position + acceleration-demand coping: -0.03 sec in 2025, +0.07 sec in 2026; intervals cross zero.
- High front-position + multiple pace-change coping: -0.07 sec in 2025, +0.05 sec in 2026; intervals cross zero.

The horse's **previous closing performance itself** persists somewhat, but the race-level lap workload does not reliably add to it.

## Interpretation

The physiological hypothesis remains plausible, but the current CSV is not granular enough to measure the intended horse-level quantity.

The key limitation is that `lap2016_2026` contains **race-level 200m splits**, not each horse's individual 600-400 / 400-200 / 200-0 split. Therefore we cannot observe directly whether a specific horse:

- decelerated less than rivals,
- was drafting behind another horse,
- covered extra ground outside,
- accelerated multiple times itself,
- maintained stride frequency / stride length.

The same race-level final deceleration is assigned to every runner even though individual energy use can be very different. Actual remaining-600 position and final3F help, but they do not recover the missing individual sectional path.

## Deployment decision

**Do not create a horse-level `直線余力指数` from this lap CSV yet.**

Specifically:

- do not change M3 rank;
- do not change calibrated top-3 probability;
- do not add a betting rule;
- do not label a horse as high/low reserve from race-level lap shape alone.

The existing `末脚特性` remains the stronger horse-specific layer.

A safe use of the lap CSV is a **race-context label** such as `前走終盤負荷: 高/中/低`, clearly separated from horse ability. It can be logged prospectively but should not score the horse.

## What would be needed for a real reserve index

The hypothesis becomes directly testable with individual-horse sectionals or GPS / tracking information, especially:

1. each horse's 600-400, 400-200 and 200-0 speeds;
2. path / distance covered through turns;
3. relative position to a horse in front (drafting proxy);
4. individual acceleration count / timing;
5. stride-frequency / stride-length change if available.

Then the correct target would be an individual **late-deceleration residual** after controlling for race, going, distance, position and path. That would be much closer to the scientific concept of late-race reserve than the current race-level lap proxy.

## Verdict

**Theory: promising. Current race-level lap data: insufficient for promotion.**

The validation does not support adding a new scoring layer now. The next meaningful data upgrade is horse-level sectional/tracking data, not additional threshold tuning on the same race-level lap CSV.