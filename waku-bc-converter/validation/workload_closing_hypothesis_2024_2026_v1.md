# Race-workload → closing-strength hypothesis validation (2024–2026)

Created: 2026-10-15

## Question

Test the hypothesis that prior race workload is related to the horse's race-day Remaining600→finish closing performance that the current M3 model does not fully explain.

Important: this uses **race distance as a workload proxy**. It does not observe training mileage, workout intensity, heart/lung function or recovery physiology directly.

## Universe and target

- Same structural audit universe: JRA flat, field size >=12, 3-win class or higher.
- 2024 = 400 races / 6,046 runners.
- 2025 = 403 races / 6,095 runners.
- 2026 = 297 races / 4,528 runners.
- Total = 1,100 races / 16,669 runner-events.
- Prior-start workload was reconstructed from `umadete.csv` using strictly prior flat completed starts only; duplicate horse/start rows were deduplicated.
- 3,249 target horse names were present; prior-history coverage for age/last-start variables was 16,666/16,669 runner-events.

Target residual:

`close_error = realized closing strength - production M3 predicted closing strength`

Positive values mean M3 underestimated the horse's Remaining600→finish ability on that day.

## Frozen development protocol

The correction model is trained/tuned on 2024 only, then frozen and evaluated on 2025 and 2026.

Model type: standardized Ridge regression. Ridge alpha was selected by 5-fold GroupKFold by race on 2024 only.

Control variables:

- age / sex
- target distance
- turf/dirt
- field size
- production M3 closing forecast
- M3 historical coverage

Workload variables:

- career race km / career starts
- race km and starts in prior 30 / 60 / 90 / 180 days
- days since last race
- mean/max distance of last 5 starts
- same-surface km in prior 90 days
- 30d/180d and 60d/180d acute-to-chronic race-load ratios
- simple quadratic terms for 90d, 180d, career load, acute ratio and layoff days

This is intentionally a regularized exploratory model, not a production probability correction.

## Main OOS result

### Closing-strength error

| Year | Production M3 MAE | + workload MAE | Production RMSE | + workload RMSE |
|---|---:|---:|---:|---:|
| 2025 | 0.62648 | **0.62284** | 0.94063 | **0.92931** |
| 2026 | 0.60011 | **0.59936** | 1.06682 | **1.05743** |
| 2025–26 pooled | 0.61524 | **0.61283** | 0.99637 | **0.98596** |

Race-cluster bootstrap, pooled 2025–26:

- MAE difference (workload - production): mean **-0.00240 sec**, 95% CI **-0.00528 to +0.00042**. MAE improvement is small and the interval crosses zero.
- MSE difference (workload - production): mean **-0.02072 sec²**, 95% CI **-0.03079 to -0.01228**. Large-error reduction is statistically resolved in the favorable direction.
- Year-specific MSE improvement is favorable in both 2025 and 2026 with race-bootstrap 95% intervals below zero.

Interpretation: the workload variables appear more useful for reducing large M3 closing misses than for uniformly shrinking every absolute error.

## Incremental information beyond simple controls

A control-only recalibration (age/sex/current race/M3 coverage variables) had pooled 2025–26 MAE **0.61962**. Adding workload variables reduced it to **0.61283**.

Race-bootstrap difference (workload - control) in pooled 2025–26 MAE:

- mean **-0.00678 sec**
- 95% CI **-0.00888 to -0.00470**

Thus the signal is not explained only by age, target distance, surface, field size or the existing M3 closing forecast.

## Total lifetime distance vs recent race load

This is the most important distinction for the original hypothesis.

Pooled 2025–26 model comparison:

| Model | MAE | RMSE | Top3 recall after M3 rerank |
|---|---:|---:|---:|
| control only | 0.61962 | 0.99534 | 30.37% |
| + career total only | 0.61903 | 0.99486 | 30.56% |
| + recent load (90/180d, layoff, recent distance) | 0.61434 | 0.98678 | 30.70% |
| + full workload feature set | **0.61283** | **0.98596** | **31.37%** |

Conclusion: **lifetime total race mileage alone contributes very little**. The stronger signal comes from the amount and timing of racing in the recent 90–180 day window, together with recovery interval and recent race distance.

This supports reframing the hypothesis from `more lifetime distance = more stamina` to:

> `recent accumulated race workload + recovery pattern may carry information about race-day closing capacity that M3 currently misses.`

## Descriptive pattern

In pooled 2025–26 data, the lowest quintile of prior-180-day race load (0–2.4 km) had mean `close_error = -0.188 sec`, meaning the current M3 tended to overestimate closing strength in that lightly raced / often long-layoff group.

Middle/high recent-load groups were near zero or mildly positive. The pattern is not simply monotonic: very high load does not continue improving indefinitely. That is consistent with a possible fitness-vs-fatigue tradeoff rather than a simple `more is always better` rule.

Days since last race shows a similar pattern: the longest-layoff quintile (about 89+ days) had mean `close_error ≈ -0.159 sec`.

These are descriptive associations, not causal physiological proof.

## M3 ranking impact

After adding the 2024-frozen workload correction to the M3 closing estimate:

| Year | Production M3 Top3 recall | + workload Top3 recall | Difference |
|---|---:|---:|---:|
| 2025 | 30.20% | **32.01%** | +1.82 pt |
| 2026 | 29.82% | **30.49%** | +0.67 pt |
| 2025–26 pooled | 30.04% | **31.37%** | +1.33 pt |

Race-bootstrap pooled 95% CI for the Top3-recall difference is approximately **-0.19 to +2.85 percentage points**, so this ranking gain is promising but not statistically resolved yet.

Winner-at-rank1 did not improve consistently, so the workload feature should not be interpreted as a win-probability signal at this stage.

## Current verdict

**Promising, but candidate-only.**

What is supported:

- Recent race workload contains incremental information about the M3 closing residual.
- The effect replicates directionally in both 2025 and 2026 for RMSE/MSE.
- Recent 90–180 day load/recovery is more informative than lifetime total race mileage alone.
- A workload correction modestly improves M3 Top3 capture in both OOS years.

What is not yet supported:

- A causal claim that race mileage improves heart/lung function.
- A monotone `more distance = better closing` rule.
- A production probability correction or betting rule.
- A pristine idea-selection holdout: the workload hypothesis was proposed after the broader 2024–2026 M3 bottleneck audit had already been inspected.

## Recommended next step

Freeze this workload specification now and log it prospectively on genuinely future races. Keep the production M3 score unchanged until a future/prospective sample confirms improvement.

If future validation remains positive, the most defensible production use would be a small `workload/fitness context` correction to the M3 closing-strength layer, not a standalone Ability score and not a direct betting signal.
