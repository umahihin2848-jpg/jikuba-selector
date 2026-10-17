# Horse Condition Edge v1 — walk-forward screening (2026-10-17)

## Goal
Stop searching directly for a target ROI and instead test whether repeatable **market mispricing factors** exist.

Primary target is not profit yet. The target is:

> if the model says a horse is more under-valued than another horse, does its realized win frequency exceed the market-implied expectation by a similar amount, out of sample?

This follows the project's current direction: market first, then only small condition corrections.

## Data / universe
- JRA flat races from the supplied TARGET result files.
- Current-race class universe: 3-win class or higher.
- Field size >=12.
- all-2yo races excluded.
- 2016-2026 data; 2026 available through the supplied file (through early October).
- Closing win odds are used only as a market benchmark. They are not T-15 executable prices.
- Market probability is normalized inverse closing odds within each race, so race total = 1.

For prior-race features, this v1 uses the immediately previous race present in the same 3-win+ historical result universe. If a horse's previous start was below 3-win class, that start is not available in this v1 and the prior-race condition is treated as missing.

## Walk-forward protocol
Each evaluation year uses only earlier years for fitting:
- train 2016-2020 -> test 2021
- train 2016-2021 -> test 2022
- train 2016-2022 -> test 2023
- train 2016-2023 -> test 2024
- train 2016-2024 -> test 2025
- train 2016-2025 -> test 2026

Total walk-forward evaluation:
- 35,512 runners
- 2,354 races

The model predicts a small correction around the market probability and then applies a within-race logit shift so each race again sums to exactly 1.0.

## Factor-by-factor screening
Fixed coarse factors were tested one at a time. No ROI threshold was optimized.

The most useful individual factors were:

| Factor | Mean delta LogLoss vs market | Years improved / 6 | Top-edge 20% O/E | Top-edge 20% raw closing ROI |
|---|---:|---:|---:|---:|
| Distance change vs prior high-class start | -0.000175 | 5/6 | 1.142 | 93.8% |
| Sex × season | -0.000161 | 5/6 | 1.094 | 78.9% |
| Age | -0.000082 | 5/6 | 1.064 | 85.1% |
| Previous first-position band | -0.000047 | 4/6 | 1.073 | 90.7% |
| Gate quartile | -0.000035 | 4/6 | 1.040 | 74.5% |
| Same vs different venue | -0.000019 | 5/6 | 1.080 | 78.4% |

`O/E = observed wins / market-expected wins`.

The result we care about here is O/E, not raw ROI. A horse can be genuinely under-estimated versus the normalized market and still fail to overcome takeout at its actual closing price.

### Strongest single factor: distance change
Pooled 2021-2026 raw market residual by distance-change bucket:

| Distance change | n | Observed / expected | Raw closing ROI |
|---|---:|---:|---:|
| shorten 400m+ | 2,889 | 1.203 | 96.3% |
| extend 400m+ | 2,245 | 1.129 | 76.9% |
| shorten ~200m | 6,175 | 1.043 | 81.7% |
| extend ~200m | 5,682 | 0.970 | 72.5% |
| roughly same | 15,581 | 0.956 | 76.6% |

This is not a buy rule. For example, shorten-400m+ fell below O/E=1 in 2026, so the bucket itself is not stable enough to deploy alone.

## Candidate Condition Edge model
A simple additive candidate using only:
1. distance change,
2. age,
3. sex × season,

was then evaluated in the same rolling walk-forward fashion.

This is an **exploratory candidate**, not a final untouched validation, because the factor family was screened in the same research sequence.

### Year-by-year delta LogLoss vs raw market
| Year | Delta LogLoss | Delta Brier | Delta AUC |
|---|---:|---:|---:|
| 2021 | -0.000898 | -0.000207 | +0.002675 |
| 2022 | -0.000443 | -0.000137 | +0.001245 |
| 2023 | -0.000346 | -0.000056 | +0.001211 |
| 2024 | -0.000443 | -0.000104 | +0.001059 |
| 2025 | -0.000134 | -0.000036 | +0.000495 |
| 2026 | -0.000413 | -0.000103 | +0.001411 |

It improved LogLoss in all 6 walk-forward years.

### Pooled 2021-2026
- Market LogLoss: **0.203092**
- Condition Edge LogLoss: **0.202643**
- delta: **-0.000449**
- race-bootstrap 95% CI for delta: approximately **[-0.000770, -0.000124]**
- Market Brier: **0.055677**
- Condition Edge Brier: **0.055570**
- Market AUC: **0.80671**
- Condition Edge AUC: **0.80799**

The improvement is numerically small, as expected when starting from a strong market baseline, but it is directionally consistent across years.

## The most important result: edge ordering is calibrated
Runners were sorted by the walk-forward `Condition Edge = adjusted probability / market probability` and split into five equal groups.

| Edge quintile | Mean predicted market multiplier | Observed / market-expected wins | Raw closing ROI |
|---|---:|---:|---:|
| lowest 20% | 0.818 | 0.829 | 69.4% |
| 20-40% | 0.937 | 0.932 | 72.2% |
| 40-60% | 1.000 | 1.020 | 79.0% |
| 60-80% | 1.063 | 1.023 | 66.9% |
| highest 20% | **1.198** | **1.212** | **96.8%** |

The key point is not the 96.8% ROI. It is that the model says the highest group should win about 19.8% more often than the market baseline, and it actually won about 21.2% more often.

This is the first result in this sequence that looks like a usable **condition mispricing layer** rather than a direct betting rule.

## Why raw ROI can still be below 100%
Normalized inverse odds represent the market's relative probability after removing the race overround. Actual payouts still contain takeout.

Therefore an O/E around 1.10-1.20 can be real predictive value without being enough to create positive raw ROI.

In the pooled data, the extreme candidate band `Condition Edge >=1.25` had:
- 1,457 runners
- observed / expected = 1.375
- raw closing ROI = 113.6%

But this band was unstable by year, including 2026 ROI below 100%. It must **not** be turned into a threshold buy rule now.

## Factors that did not help reliably
The following were weak, unstable, or negative as standalone residual factors in this screening:
- current popularity band,
- current odds band,
- previous finish percentile,
- previous top-3 × field-size bucket,
- previous RPCI bucket,
- previous running style,
- surface switch,
- layoff bucket.

This does not prove they contain no information. It means the simple v1 definitions did not add stable information after the market benchmark.

## Interpretation
The current evidence supports a shift in architecture:

`market probability -> small historical condition correction -> Condition Edge`

rather than:

`standalone horse model -> convert directly to EV`.

The useful signal is currently small and distributed across ordinary conditions, which is consistent with the idea that profitable information in a mature pari-mutuel market is more likely to be a repeated small pricing error than a huge obvious miss.

## Decision
### Keep and freeze as a research candidate
Freeze the current candidate inputs for prospective validation:
- distance change,
- age,
- sex × season.

Do not add/remove factors based on future results without starting a new version.

Do not yet use Condition Edge as an automatic buy rule.

### Next tests
1. Add richer strictly pre-race prior-history data so first-time 3-win entrants do not fall into missing prior-start buckets.
2. Test the same frozen candidate on future races / new data without retuning.
3. Build a separate `Top3 Condition Edge` for wide/quinella partner selection.
4. Only after horse-level edge calibration survives, test whether combining one strong Win Edge horse with Top3 Edge partners improves pair-ticket returns.
5. Keep dangerous-favorite / P10 as a separate race-context layer rather than mixing it into the first v1 score.

## Cautions
- Closing odds are a benchmark, not an executable T-15 backtest.
- The candidate factor family was screened in this research sequence; future data is still needed for a genuinely untouched confirmation.
- Multiple factor screening can create selection bias even when each yearly prediction is walk-forward.
- The purpose of v1 is to establish **ordered market mispricing**, not to optimize ROI.
