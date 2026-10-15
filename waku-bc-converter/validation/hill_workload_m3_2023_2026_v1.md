# Hill workload → M3 closing validation (2023–2026)

Created: 2026-10-16

## Source QA

Input hill file: `hill_2023_2026.csv`.

- 1,797,066 hill sessions
- 27,116 horses
- Date range: 2023-01-02 through 2026-10-11
- Center codes: 0=Miho / 1=Ritto
- 737 rows had invalid/zero 4F time and were retained as session-count information but excluded from time-intensity summaries.
- 78,667 horse-date groups had multiple hill sessions; maximum 3 sessions in one day.
- The extracted 2026-10-11 slice exactly matched the separately exported `tyou.csv`: 2,147 / 2,147 rows matched on horse id, date and time, and 4F time agreed for all matched rows.

## Race universe and replay

Same structural universe as the V3 audit:

- JRA flat only
- field size >=12
- 3-win class or higher
- 2024: 400 races / 6,046 runners
- 2025: 403 races / 6,095 runners
- 2026: 297 races / 4,528 runners
- Total: 1,100 races / 16,669 runner-events

Horse IDs were matched through blood-registration number. 16,666 / 16,669 target runner-events were matched; the three unmatched runners were overseas horses.

The current production M3 closing formula was replayed from strictly prior race history. The 2025 and 2026 M3 Top3 recall reproduction was close to the stored production validation (replay 29.79% / 29.71%; stored approximately 30.19% / 29.85%), sufficient for the hill OOS diagnostic. The 2024 replay differed more, so 2024 is treated only as development/tuning data, not as evidence for deployment.

## Hypothesis

Test whether recent hill workload explains the race-day Remaining600→finish closing residual left by current M3.

Target:

`close_error = realized closing strength - production M3 predicted closing strength`

Positive means M3 underestimated that day's closing performance.

## Pre-race hill features

Only hill sessions strictly before the target race date were used.

The frozen exploratory feature set included:

- session counts and distinct hill days in prior 7 / 14 / 30 / 60 days
- mean and fastest 4F times in prior 7 / 14 / 30 days
- mean and fastest final-1F times
- day-and-center relative 4F intensity (percentile and median-time delta)
- counts of top-20% / top-10% same-day-center times
- final-lap acceleration rate
- number of multi-session days
- days since last hill session and last top-20% session
- acute 7-day vs 30-day session ratio
- simple quadratic terms for recent load

Control variables were current M3 close forecast, predicted Remaining600 gap, age, sex, target distance, surface, field size, gate fraction and race-history coverage.

Model: standardized Ridge regression. Ridge alpha was selected by 5-fold GroupKFold by race on 2024 only, then frozen for 2025 and 2026.

## OOS closing-error result

| Year | Production M3 MAE | + hill MAE | Production RMSE | + hill RMSE |
|---|---:|---:|---:|---:|
| 2025 | 0.61340 | 0.62171 | 0.93304 | 0.92998 |
| 2026 | 0.59153 | 0.60083 | 1.06026 | 1.05913 |
| 2025–26 pooled | 0.60408 | 0.61281 | 0.98927 | 0.98710 |

Race-cluster bootstrap, pooled 2025–26:

- MAE difference (hill - production): +0.00862 sec, 95% CI +0.00640 to +0.01084. This is a statistically resolved deterioration in average absolute error.
- MSE difference (hill - production): -0.00432 sec², 95% CI -0.00972 to +0.00065. Large-error reduction is small and not statistically resolved.

A control-only recalibration performed better than the hill model on pooled MSE. Hill minus control MSE difference was +0.00229 sec², 95% CI +0.00039 to +0.00419, indicating the broad hill feature set did not add incremental predictive value beyond simple controls in this frozen test.

## M3 Top3 ranking impact

Actual-top3 recall:

| Year | Production M3 | + hill |
|---|---:|---:|
| 2025 | 29.79% | 30.36% |
| 2026 | 29.71% | 29.26% |
| 2025–26 pooled | 29.75% | 29.90% |

Pooled race-bootstrap difference was approximately +0.13 percentage points with 95% CI -1.29 to +1.57 points. There is no resolved Top3 improvement.

Winner-at-rank1 was also inconsistent across years, so there is no current evidence for a win-probability use.

## Verdict

**Do not add hill workload to production M3 yet.**

The file extraction itself is valid and high quality, but this first frozen 2024→2025/2026 OOS test does not support a broad hill-workload correction. It slightly worsened MAE, produced only a tiny/non-resolved pooled Top3 gain, and added no incremental MSE value over a simple control-only recalibration.

This is useful negative evidence: the earlier race-load proxy signal should not be assumed to transfer automatically to hill training data.

Possible explanations include:

- hill sessions mix easy maintenance and true high-intensity workouts;
- many horses are trained mainly on wood/turf/dirt rather than hill, so hill volume alone is incomplete training load;
- raw session quantity may not capture intended training purpose;
- stable/training-center practices can confound simple hill metrics;
- the physiologically relevant signal may be in specific pre-race workout patterns rather than total recent volume.

## Safe next step

Keep production M3 unchanged. If hill data is studied further, predefine a much narrower hypothesis before looking at 2025/2026 again—for example a final-14-day pattern based on one or two hard sessions plus recovery days—and validate it only on genuinely future races. Do not search many hill thresholds on 2025/2026 and then call the best one OOS.