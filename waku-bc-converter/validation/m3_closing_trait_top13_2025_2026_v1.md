# M3 closing trait — M3 ranks 1–3 check (2025–2026)

Created: 2026-10-16

## Question

Does the display-only `末脚特性A` also raise actual top-3 performance inside the **M3 top 1–3**, rather than only acting as a rescue signal for M3 ranks 4–6?

## Protocol limits

- Uses the same approximate TARGET replay / trait definition as `m3_closing_trait_validation_v1`.
- Approximate eligible universe is 2025 = 403 races / 6,094 runner-events and 2026 = 296 races / 4,515 runner-events.
- Trait A/B/C is based only on strictly prior eligible residual observations, with trainer adjustment and shrinkage.
- 2025/2026 have already been inspected in this project. This is a **retrospective stability / sensitivity analysis**, not pristine untouched OOS confirmation.
- Race-cluster bootstrap is used for A-vs-B/C rate differences.

## 1. All surfaces / distances

### Actual top-3 rate by M3 rank and trait

| M3 rank | Trait A | Trait B | Trait C | B/C combined | A - B/C | 95% race-bootstrap CI |
|---|---:|---:|---:|---:|---:|---:|
| 1 | **34.1%** (n=164) | 28.8% (153) | 16.0% (25) | 27.0% (178) | +7.2 pt | -2.7 to +16.6 pt |
| 2 | **37.5%** (160) | 21.3% (183) | 17.1% (35) | 20.6% (218) | **+16.9 pt** | **+7.6 to +25.9 pt** |
| 3 | **33.7%** (181) | 26.4% (212) | 19.4% (36) | 25.4% (248) | +8.3 pt | -0.5 to +17.2 pt |
| **1–3 pooled** | **35.0%** (505) | 25.4% (548) | 17.7% (96) | **24.2%** (644) | **+10.8 pt** | **+5.5 to +16.2 pt** |

The pooled M3 top-3 result is the main finding: `末脚特性A` is associated with a materially higher actual top-3 rate even among horses that M3 already ranks 1–3.

### Year stability for M3 ranks 1–3 pooled

| Year | Trait A top-3 | B/C top-3 | Difference |
|---|---:|---:|---:|
| 2025 | **36.1%** (n=288) | 25.0% (384) | **+11.1 pt** |
| 2026 | **33.6%** (217) | 23.1% (260) | **+10.6 pt** |

The direction and effect size are unusually similar across the two later years.

### Win rate

| M3 rank | Trait A win | B/C win | Difference | 95% race-bootstrap CI |
|---|---:|---:|---:|---:|
| 1 | 12.2% | 7.9% | +4.3 pt | -2.0 to +10.7 pt |
| 2 | 8.8% | 8.7% | +0.0 pt | -5.6 to +5.9 pt |
| 3 | 8.8% | 8.1% | +0.8 pt | -4.5 to +6.3 pt |
| **1–3 pooled** | **9.9%** | 8.2% | +1.7 pt | -1.6 to +4.9 pt |

The signal is therefore much clearer for **top-3 retention / reliability** than for winning. Do not promote `末脚特性A` as a win-probability correction from this result.

## 2. Direct comparison: Trait-A M3 ranks 1–3 vs 4–6

Across all surfaces / distances:

- A × M3 1–3 actual top-3 rate: **35.0%**
- A × M3 4–6 actual top-3 rate: **27.5%**
- Difference: **+7.5 pt**
- 95% race-bootstrap CI: **+1.8 to +13.1 pt**

So the user's intuition is correct in the broad sample: absolute top-3 rate is higher when `末脚特性A` is already inside M3 ranks 1–3.

The win-rate difference is only +1.3 pt and its confidence interval crosses zero.

## 3. 1800–2100m check

This distance band behaved differently.

| M3 rank | Trait A top-3 | B/C top-3 | Difference | 95% race-bootstrap CI |
|---|---:|---:|---:|---:|
| 1 | 34.8% (46) | 40.5% (37) | -5.8 pt | -27.3 to +15.0 pt |
| 2 | **41.2%** (51) | 15.4% (52) | **+25.8 pt** | **+9.2 to +42.8 pt** |
| 3 | 24.2% (62) | 22.7% (75) | +1.5 pt | -12.5 to +15.9 pt |
| **1–3 pooled** | **32.7%** (159) | 24.4% (164) | +8.3 pt | -1.1 to +17.9 pt |

For Trait A itself:

- M3 1–3: **32.7%**
- M3 4–6: **32.1%**
- Difference: +0.6 pt, 95% CI roughly -9.6 to +10.6 pt

This is important: in 1800–2100m the strong rescue effect for M3 4–6 means Trait-A horses ranked 4–6 perform almost as well as Trait-A horses ranked 1–3. That pattern should not be simplified into `M3 top3 + A is always best`.

The very large M3-rank-2 effect is interesting but is a subgroup discovered after inspection and must remain exploratory.

## Interpretation

Current retrospective evidence supports two distinct roles:

1. **M3 top 1–3 + 末脚特性A = reliability flag.** Pooled actual top-3 rate is 35.0% vs 24.2% for B/C, with similar +11 pt gaps in 2025 and 2026.
2. **M3 4–6 + 末脚特性A = rescue/watch flag.** This is especially notable in 1800–2100m, where A horses in ranks 4–6 reach about the same top-3 rate as A horses already in ranks 1–3.

The evidence does **not** support a win-probability correction yet.

## Deployment decision

Do not change M3 rank, calibrated top-3 probability, or betting rules.

A sensible display-only prospective scheme is:

- `M3 1–3 × 末脚特性A` -> **末脚特性・信頼注目**
- `M3 4–6 × 末脚特性A` -> **末脚特性・浮上注目**
- log 1800–2100m separately

Freeze these labels before evaluating future races. Promote them only if new post-freeze races reproduce the separation.