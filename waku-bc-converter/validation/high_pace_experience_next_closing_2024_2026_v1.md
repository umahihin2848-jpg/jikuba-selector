# High-pace experience -> next-race closing validation v1

Created: 2026-10-16

## Question

Test the hypothesis:

> A horse that experienced a demanding pace in its previous start, especially while tracking near the front, may be more likely to produce a stronger closing performance next time after recovery, regardless of whether the previous result was good or poor.

The live-app-compatible target is the next-race M3 closing residual:

`realized closing strength - production M3 predicted closing strength`

Positive means the horse closed better than M3 expected. A secondary binary target is `residual > 0`, treated here as a simple "next-race closing-above-M3" rate.

## Data / protocol

Reconstructed M3 target universe used in the existing trait analyses:

- 2024: 6,009 runner-events
- 2025: 6,094
- 2026: 4,515

For every target runner, the strictly previous start was recovered from the deduplicated `umadete.csv` history.

Previous-race pace was measured with TARGET `レースPCI` / RPCI-style race pace:

- `<45`: strong front-loaded pace
- `45-49`: front-loaded pace
- `50-54`: standard
- `>=55`: slow

Position exposure used the first available corner position normalized to field size. `front third` means normalized frontness >= 2/3.

Primary pace-experience definitions:

- `high pace`: previous race PCI < 50
- `strong high pace`: previous race PCI < 45
- `pace exposure`: `max(0, 50 - previous race PCI) * previous frontness`

Recovery bands were fixed before subgroup inspection:

- <=21 days
- 22-42 days
- 43-70 days
- >=71 days

Control variables included the existing leak-safe horse trait effect, M3 close / score, current and previous surface/distance, field/gate, previous relative closing, finish-position fraction, frontness, PCI-RPCI, remaining-600 gap proxy, and recovery days.

Ridge models were tuned only with 2024 race-grouped 5-fold CV, then frozen and evaluated on 2025/2026. Because 2025/2026 have already been inspected elsewhere in this project, all later-year checks are retrospective stability checks rather than pristine untouched OOS evidence.

## 1. Does previous pace improve residual prediction?

2024 grouped-CV selected alpha=100 for the main models.

### 2025

| Model | MAE | RMSE |
|---|---:|---:|
| Controls | 0.604785 | 0.895335 |
| + pace intensity only | 0.604768 | 0.895333 |
| + pace × frontness | 0.604753 | 0.895318 |
| + pace × frontness × recovery | 0.604970 | 0.895671 |

### 2026

| Model | MAE | RMSE |
|---|---:|---:|
| Controls | 0.578380 | 0.875938 |
| + pace intensity only | 0.578257 | 0.875826 |
| + pace × frontness | 0.578283 | 0.875813 |
| + pace × frontness × recovery | 0.579403 | 0.876988 |

Pooled 2025-2026 race-cluster bootstrap vs Controls:

- pace intensity only: MAE diff **-0.000061 sec**, 95% CI -0.000092 to -0.000028; MSE diff -0.000086 sec^2, CI -0.000181 to -0.000007.
- pace × frontness: MAE diff -0.000059 sec, CI -0.000177 to +0.000047; MSE diff -0.000110, CI -0.000384 to +0.000127.
- pace × frontness × recovery: MAE diff **+0.000542 sec** (worse), CI -0.000229 to +0.001288; MSE diff +0.001129, CI -0.000468 to +0.002727.

Interpretation: previous race pace contains at most a statistically tiny amount of predictive information, but adding the horse's front-position exposure does not resolve a meaningful gain, and adding recovery interaction makes the frozen model worse on average.

The effect size of the pace-only gain is far too small for an app scoring layer.

## 2. Fair within-front comparison

A raw comparison of `high pace + front third` against all other horses is confounded because front-running style itself affects closing behavior. Therefore the cleaner descriptive comparison is restricted to horses already in the **front third** in the previous race.

Pooled 2025-2026:

| Previous front-third horses | n | Next M3 residual | residual>0 |
|---|---:|---:|---:|
| race PCI >=50 | 2,194 | -0.07915 sec | 54.79% |
| race PCI <50 | 2,394 | -0.07970 sec | 55.14% |
| difference | | **-0.00055 sec** | **+0.35 pt** |

Race-cluster bootstrap:

- residual difference: 95% CI **-0.0546 to +0.0569 sec**
- residual>0 rate difference: 95% CI **-2.57 to +3.20 pt**

Essentially no pooled benefit.

Year-by-year the sign also flips:

- 2025: residual +0.0259 sec / residual>0 +2.57 pt
- 2026: residual -0.0381 sec / residual>0 -2.89 pt

So the apparent 2025 benefit does not reproduce in 2026.

### Strong pace sensitivity (<45)

Within previous front-third horses, PCI<45 vs >=45:

- pooled residual difference: **-0.0523 sec**, 95% CI -0.1393 to +0.0340
- residual>0 difference: **-1.87 pt**, 95% CI -6.03 to +2.35 pt

A more severe pace experience does not produce a stronger next-race closing signal.

## 3. Recovery-day interaction

Within previous front-third horses, comparing PCI<50 vs >=50:

| Recovery | Residual difference | residual>0 difference | Interpretation |
|---|---:|---:|---|
| <=21d | +0.060 sec | +2.84 pt | uncertain; year effect flips |
| 22-42d | +0.014 sec | -1.32 pt | no benefit |
| 43-70d | +0.068 sec | +2.67 pt | interesting pooled point estimate, but not stable historically |
| >=71d | -0.099 sec | -1.61 pt | no positive effect |

All positive-rate confidence intervals cross zero.

The 43-70d slice initially looks interesting because 2025 and 2026 are both positive:

- 2025 residual +0.077 sec / +3.11 pt
- 2026 residual +0.051 sec / +1.19 pt

However the same predefined slice in 2024 development was **negative**:

- 2024 residual -0.073 sec / -2.69 pt

Therefore it fails temporal stability and must not be promoted.

The <=21d slice also fails stability: 2025 is positive but 2026 residual turns negative.

## 4. Previous good run vs poor run

To test the user's specific idea that the effect might work regardless of whether the demanding previous race was a good or poor result, the comparison was again restricted to previous **front-third** horses and split by previous top-3 finish.

### Previous race was NOT top-3

Pooled 2025-2026, PCI<50 vs >=50:

- residual difference: **-0.032 sec**, 95% CI -0.103 to +0.044
- residual>0 difference: **-1.92 pt**, 95% CI -5.69 to +1.84 pt

Year direction is not positive; 2026 is notably worse.

This does **not** support a "hard previous pace trains the horse even after a poor result" effect.

### Previous race WAS top-3

Pooled 2025-2026:

- residual difference: +0.060 sec, 95% CI -0.027 to +0.148
- residual>0 difference: +4.09 pt, 95% CI -0.35 to +8.37 pt

But this is unstable:

- 2025: +0.115 sec / +7.57 pt
- 2026: -0.024 sec / -1.10 pt

So the 2025 signal does not reproduce.

## 5. Binary 'closing-above-M3' prediction

A logistic sensitivity check used `residual > 0` as the outcome.

Adding pace/front/recovery produced only tiny changes in Brier score / AUC. For example, the recovery interaction improved 2025 slightly but worsened 2026, matching the subgroup instability above.

This confirms that the main conclusion is not an artifact of using a continuous residual target.

## Interpretation

The appealing physiological story is:

> experiencing a hard pace -> adaptation / experience -> stronger late-race response next time after recovery.

The current JRA/TARGET data do **not** show a stable predictive version of that story.

What the data support instead:

1. Previous race pace by itself contains a *very small* predictive signal.
2. The signal is not a reliable positive boost to next-race closing.
3. Once position and recovery are considered, the effect does not reproduce consistently by year.
4. Previous poor-run horses do not show a rebound advantage after front-running through a high pace.
5. A few recovery subgroups look favorable after inspection, but fail earlier-year stability and are therefore exploratory only.

This is also consistent with the earlier race-level-lap validation: race context is not granular enough to establish a horse-specific adaptation / reserve mechanism.

## Deployment decision

**Do not add a `high-pace experience` score or UI badge.**

Specifically:

- do not change M3 rank;
- do not change calibrated top-3 probability;
- do not change betting logic;
- do not display a 'hard pace experience = positive' label.

The existing `末脚特性` remains much stronger and more stable.

If this hypothesis is revisited, the next useful upgrade would be individual-horse sectional / tracking data or a genuinely prospective post-freeze sample, not additional subgroup threshold mining on the same 2024-2026 data.

## Verdict

**Hypothesis is plausible physiologically, but not supported as a stable next-race closing boost in the current data.**
