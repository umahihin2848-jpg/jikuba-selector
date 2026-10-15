# M3 closing trait × pre-race context validation v1

Created: 2026-10-16

## Question

Test how the display-only `末脚特性A` behaves when combined with three pieces of information that are available before the race:

1. pre-race RPCI / pace-shape prediction
2. predicted running-position category
3. surface and distance

The practical sample is M3 ranks 1-6, where the trait layer is currently most relevant.

## Protocol / limitations

- Same approximate M3 replay and frozen `末脚特性` definition as the preceding trait reports.
- Main evaluation years are 2025 and 2026. These years have already been inspected elsewhere in the project, so this is a **retrospective interaction / stability analysis, not pristine untouched OOS confirmation**.
- Trait A/B/C is built only from strictly prior eligible horse/trainer residuals.
- Pre-race pace and queue features are reconstructed using the currently deployed `ShapeCore` logic and `rpci_browser_model_v1` coefficients.
- In the historical replay, horse history is explicitly truncated to starts strictly before the target race date.
- Horse identity uses blood-registration ID when available rather than horse name, which is safer for historical replay.
- Main practical outcome is actual top-3 rate. M3 closing residual is secondary.
- A-vs-B/C confidence intervals use race-cluster bootstrap (10,000 resamples).
- Raw top-3 differences were also checked after standardizing the A and B/C groups to the same M3-rank 1-6 distribution. Conclusions were unchanged.

Usable 2025-2026 M3-rank-1-6 sample with A/B/C classification:

- Trait A: 1,039 runners
- Trait B/C: 1,469 runners
- total: 2,508 runner-events

## Replay check for the existing pre-race pace model

The browser model uses only information available before the target race: current race metadata plus each entrant's prior history summaries. Its four RPCI classes are `<45`, `45-49.9`, `50-54.9`, `>=55`.

Historical replay quality:

| Year | Top-band hit rate | 90% conformal-set coverage | Mean set size |
|---|---:|---:|---:|
| 2024 | 55.7% | 88.7% | 2.17 bands |
| 2025 | 56.8% | 89.6% | 2.19 bands |
| 2026 | 57.8% | 91.9% | 2.21 bands |

These values are close to the deployed model's documented 2025/2026 conformal coverage, supporting that the replay is reproducing the live pre-race pace layer closely enough for this interaction check.

## 1. Trait A × pre-race pace prediction

The table groups races by the model's **most likely pre-race RPCI band**, not realized RPCI.

| Predicted RPCI top band | A n | B/C n | A top-3 | B/C top-3 | A-B/C | 95% race-bootstrap CI | 2025 diff | 2026 diff | A-Close residual advantage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `<45` | 193 | 172 | 29.5% | 19.8% | **+9.8 pt** | **+1.0 to +18.5 pt** | +8.7 | +9.8 | +0.082 sec |
| **`45-49`** | **535** | **699** | **33.3%** | **20.2%** | **+13.1 pt** | **+8.4 to +17.7 pt** | **+11.3** | **+15.9** | **+0.147 sec** |
| `50-54` | 281 | 559 | 29.5% | 23.4% | +6.1 pt | about 0.0 to +12.4 pt | +9.9 | +0.5 | +0.182 sec |
| `>=55` | 30 | 39 | 20.0% | 28.2% | -8.2 pt | -27.7 to +11.8 pt | -28.6 | -0.7 | +0.100 sec |

M3-rank standardization gives essentially the same pattern: approximately +9.2 pt, +12.7 pt, +5.7 pt and -9.7 pt respectively.

### Rank-band check for the strongest pre-race band (`45-49`)

| M3 rank band | A top-3 | B/C top-3 | Difference | 95% CI |
|---|---:|---:|---:|---:|
| **M3 1-3** | **39.5%** (258) | 22.4% (304) | **+17.2 pt** | **+10.0 to +24.5 pt** |
| **M3 4-6** | **27.4%** (277) | 18.5% (395) | **+9.0 pt** | **+2.8 to +15.3 pt** |

This is the cleanest pre-race interaction found in this analysis. It is present in both M3 roles: reliability among ranks 1-3 and rescue/watch among ranks 4-6.

A clustered logistic sensitivity model adjusting for M3 rank, year, surface and distance also suggests the A effect is smaller in predicted `50-54` than in `45-49` (interaction p about 0.044), and much smaller in the tiny predicted-slow group (p about 0.036). These are retrospective subgroup tests and should not be treated as confirmatory multiplicity-adjusted evidence.

### Interpretation

The earlier ex-post result had shown the best rescue conversion around realized RPCI 45-54. With the actual pre-race pace model, the **45-49 top prediction is the more stable actionable candidate**. Predicted `50-54` weakens sharply in 2026, so it should not be merged automatically with `45-49` yet.

The `>=55` group is very small and unstable. Do not create a negative penalty from it.

## 2. Trait A × predicted queue / running position

Predicted position uses the live `ShapeCore.position()` definition based on strictly prior five-start style probability and median remaining-600 gap:

- `前〜好位`
- `好位〜中団`
- `中団〜後方`

| Predicted position | A n | B/C n | A top-3 | B/C top-3 | Difference | 95% CI | 2025 diff | 2026 diff | Residual advantage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `前〜好位` | 224 | 389 | 32.6% | 25.7% | +6.9 pt | -0.4 to +14.2 pt | +3.9 | +9.7 | +0.066 sec |
| **`好位〜中団`** | **768** | **1,054** | **31.5%** | **20.4%** | **+11.1 pt** | **+7.3 to +15.0 pt** | **+11.4** | **+10.8** | **+0.185 sec** |
| `中団〜後方` | 47 | 26 | 19.1% | 7.7% | +11.5 pt | -4.5 to +25.7 pt | +16.2 | +4.2 | +0.312 sec |

The rear-prediction sample is too small to use. The strongest stable evidence is `好位〜中団`.

However, a clustered interaction model does **not** show clear evidence that Trait A is statistically confined to one predicted-position category. The A signal remains directionally favorable in the front group as well. Therefore the current data do not justify splitting Trait A into separate front/mid/rear trait definitions or penalizing forward-predicted A horses.

### App interpretation

Predicted queue can be used as **context**, but not yet as a hard modifier. The most defensible descriptive statement is:

> Trait A remains useful across predicted positions; the clearest 2025-2026 conversion occurs when the horse is predicted `好位〜中団`.

## 3. Trait A × surface / distance

### Surface

| Surface | A n | B/C n | A top-3 | B/C top-3 | Difference | 95% CI | 2025 diff | 2026 diff | Residual advantage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| ダート | 586 | 367 | 30.9% | 20.7% | **+10.2 pt** | **+4.9 to +15.5 pt** | +9.4 | +11.2 | +0.160 sec |
| 芝 | 453 | 1,102 | 31.6% | 21.9% | **+9.7 pt** | **+4.8 to +14.7 pt** | +10.7 | +8.7 | +0.113 sec |

A × surface interaction p is about 0.83 after basic adjustment. In practical terms, **the top-3 benefit is almost the same on turf and dirt**. Although earlier analyses showed larger raw A-C closing-residual separation on dirt, there is no reason here to create different surface-specific Trait-A rules.

### Distance

Distance buckets were kept the same as the prior trait interaction report:

| Distance | A n | B/C n | A top-3 | B/C top-3 | Difference | 95% CI | 2025 diff | 2026 diff | Residual advantage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **<=1400m** | 387 | 644 | **31.3%** | 19.4% | **+11.9 pt** | **+6.4 to +17.2 pt** | +10.5 | +13.5 | +0.072 sec |
| 1500-1700m | 175 | 310 | 30.9% | 24.8% | +6.0 pt | -1.8 to +14.1 pt | +4.1 | +8.6 | +0.152 sec |
| **1800-2100m** | 352 | 420 | **32.4%** | 21.0% | **+11.4 pt** | **+5.5 to +17.5 pt** | **+12.2** | **+11.2** | **+0.239 sec** |
| >=2200m | 125 | 95 | 28.0% | 28.4% | -0.4 pt | -11.6 to +11.5 pt | +3.6 | -5.9 | +0.236 sec |

M3-rank-standardized top-3 differences are approximately +11.2, +5.7, +10.8 and -1.5 pt respectively, so the pattern is not explained by different M3-rank composition.

The most internally coherent distance result is **1800-2100m** because both actual top-3 conversion and current-race M3 closing-residual separation are large and repeat in both years.

`<=1400m` also shows a strong top-3 reliability association, but its residual separation is much weaker and the interval includes roughly zero. That suggests it should be treated as a practical reliability observation rather than evidence that short races amplify the physiological/closing mechanism.

`>=2200m` repeats the earlier anomaly: Trait A retains a positive closing-residual difference but it does not convert into a top-3 gain. Therefore it should not receive an A-context bonus.

## Overall interpretation

The three pre-race-compatible checks produce a useful simplification:

1. **Pre-race pace:** the strongest current candidate is `predicted RPCI top = 45-49`.
2. **Predicted queue:** `好位〜中団` shows the cleanest conversion, but A remains useful outside it; do not make queue a hard gate.
3. **Surface:** no meaningful need for separate turf/dirt Trait-A rules.
4. **Distance:** `1800-2100m` is the strongest coherent distance interaction; `<=1400m` also has a strong top-3 association; `>=2200m` should not be promoted.

The most tempting combined rule after looking at these results would be something like:

`Trait A × predicted RPCI 45-49 × predicted 好位〜中団 × 1800-2100m`

**Do not evaluate and optimize that combined rule on the same 2025-2026 data and then call it validated.** The three components were selected after subgroup inspection, so such a combination would be post-hoc and vulnerable to overfitting.

## App decision

For now:

- keep `末脚特性A/B/C` display-only;
- do not alter M3 rank or calibrated top-3 probability;
- do not create turf/dirt-specific trait grades;
- do not create a hard predicted-position bonus;
- do not add a `>=2200m` penalty from the current small sample;
- freeze the following **prospective logging fields** for future races:
  - pre-race RPCI top band and probability vector;
  - predicted position category;
  - surface and fixed distance bucket;
  - M3 rank band (1-3 / 4-6);
  - Trait A/B/C;
  - actual top-3 outcome and realized M3 closing residual.

The most important prospective hypothesis to freeze is:

> `末脚特性A` should retain an especially strong top-3 advantage when the pre-race RPCI model's top band is `45-49`, with `1800-2100m` as the strongest distance context and predicted `好位〜中団` as a secondary contextual marker.

Promote any `今回末脚が活きやすい` UI badge only after new post-freeze races reproduce the effect without threshold retuning.

## Verdict

**Yes, the three-way context can be taken this far with current data. The strongest deployable-looking research signal is Trait A × pre-race RPCI 45-49; 1800-2100m is the strongest distance context; predicted 好位〜中団 is supportive but not strong enough to be a hard rule. Surface does not need a separate rule. Keep all of this out of scoring until prospective confirmation.**
