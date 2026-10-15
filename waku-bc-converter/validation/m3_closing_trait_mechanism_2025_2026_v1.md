# M3 closing trait mechanism check (2025-2026)

Created: 2026-10-16

## Question

Why does the display-only `末脚特性A` work? In particular:

- Is it merely a proxy for closer/hold-up style?
- Does the A effect remain when the horse has already used energy early?
- Does the effect survive across position styles?

The practical sample is limited to M3 ranks 1-6, because the current trait layer is most relevant there.

## Protocol / important limits

- Same approximate M3 replay / trait definition as the prior trait analyses.
- 2025-2026 only for the main stability check; these years have already been inspected elsewhere, so this is retrospective mechanism analysis, not pristine OOS confirmation.
- `Habitual position` uses the mean normalized first-available-corner frontness from the strictly prior 5 starts, so it is pre-race compatible.
- `Previous actual position` is also pre-race compatible for the next race.
- `Current actual position` and `current high effort` use realized current-race position / race PCI and are therefore ex-post explanatory checks only; they cannot be used directly as live-app rules.
- A vs B/C top-3 differences use race-cluster bootstrap confidence intervals.

## 1. Is Trait A just a closer-style label?

No.

Habitual position based on the prior 5 starts:

| Habitual position | A n | B/C n | A top-3 | B/C top-3 | Difference | 95% race-bootstrap CI | A-Close residual advantage |
|---|---:|---:|---:|---:|---:|---:|---:|
| Hold-up / closer | 206 | 233 | 28.6% | 12.9% | **+15.8 pt** | **+8.7 to +22.9 pt** | +0.350 sec |
| Mid-pack | 570 | 793 | 29.8% | 19.8% | **+10.0 pt** | **+5.5 to +14.6 pt** | +0.095 sec |
| Front-running | 263 | 443 | 36.1% | 29.3% | +6.8 pt | -0.5 to +13.7 pt | **+0.145 sec** |

Trait A remains a positive M3-closing residual signal in all three habitual-position groups.

For front-running horses the top-3 conversion is less stable, but the closing-residual separation itself remains positive; its pooled race-bootstrap interval is approximately +0.010 to +0.276 sec.

The A population is only modestly more hold-up oriented:

- Trait A prior-5 frontness mean: 0.518
- B/C prior-5 frontness mean: 0.554
- A composition: 19.8% hold-up / 54.9% mid / 25.3% front
- B/C composition: 15.9% hold-up / 54.0% mid / 30.2% front

So the A effect cannot be explained simply by A containing only closers.

A-vs-B-only sensitivity gives the same ordering rather than relying on Trait C to make B/C look weak:

- hold-up: +14.6 pt
- mid: +9.4 pt
- front: +6.1 pt

A covariate-adjusted clustered logistic sensitivity model (M3 rank, surface, distance, year included) also finds no clear evidence that the A effect is confined to a particular habitual style. Relative to the mid-pack baseline, the A x front-style interaction p-value is about 0.21 and the A x hold-up interaction p-value about 0.10.

## 2. Previous-race position

Using the strictly previous race's actual first-available-corner position:

| Previous position | A top-3 | B/C top-3 | Difference | 95% CI | Closing residual difference |
|---|---:|---:|---:|---:|---:|
| Rear | 29.0% | 14.4% | **+14.6 pt** | **+8.9 to +20.3 pt** | +0.235 sec |
| Mid | 32.7% | 21.1% | **+11.6 pt** | **+5.6 to +17.5 pt** | +0.146 sec |
| Front | 32.6% | 27.1% | +5.4 pt | -0.8 to +11.5 pt | +0.112 sec |

Again, the Trait A separation is largest for horses previously ridden farther back, but it is not zero for previously forward horses.

The previous-position interaction terms in a rank/surface/distance/year-adjusted clustered logistic sensitivity model are not clearly resolved (front interaction p about 0.09; rear interaction p about 0.19). This argues against hard-coding separate trait rules by previous position from the current data.

## 3. Does A remain when the horse uses energy early in the current race?

This is an **ex-post mechanism check only**.

Define a simple high-effort proxy:

- current first-available-corner position in the front third, and
- realized current race PCI < 50.

Within M3 ranks 1-6:

| Current race condition | A n | B/C n | A top-3 | B/C top-3 | Difference | 95% CI |
|---|---:|---:|---:|---:|---:|---:|
| Front third + PCI<50 | 192 | 267 | **40.6%** | 31.5% | **+9.2 pt** | **+0.7 to +17.6 pt** |
| Other | 847 | 1,202 | 29.0% | 19.4% | **+9.7 pt** | **+5.8 to +13.5 pt** |

Year split for the high-effort proxy:

- 2025: +5.6 pt
- 2026: +15.3 pt

So Trait A does **not** disappear when the horse is already forward in a faster race. This is evidence against the simple explanation `A = horses that only look good because they conserve energy at the back`.

The actual M3 closing residual is negative on average for both A and B/C in this high-effort slice, as expected from a demanding trip, but A is still about +0.110 sec less negative than B/C. The residual-difference interval is wide and crosses zero, so this part is supportive but not definitive.

A more severe realized PCI<45 slice shows A 42.1% vs B/C 27.3% (+14.8 pt), but the sample is small (A 57 / B-C 66) and this threshold inspection is exploratory; it must not be promoted.

## 4. Current actual position, regardless of pace

Also ex-post only:

| Current first-corner position | A top-3 | B/C top-3 | Difference | 95% CI | Residual difference |
|---|---:|---:|---:|---:|---:|
| Rear | 20.3% | 11.3% | **+9.0 pt** | **+4.1 to +14.0 pt** | +0.111 sec |
| Mid | 37.5% | 22.2% | **+15.3 pt** | **+9.0 to +21.6 pt** | +0.194 sec |
| Front | 38.2% | 32.2% | +6.0 pt | -0.9 to +13.1 pt | **+0.139 sec** |

The closing-residual advantage remains positive in all three realized-position groups, including the front group.

## Interpretation

The strongest explanation supported by the current data is **not** a specific running style and not simply energy conservation at the back.

`末脚特性A` behaves more like a persistent horse-specific M3 closing residual:

- M3 systematically under-predicts the closing performance of some horses;
- that under-prediction persists across hold-up, mid-pack and forward-running profiles;
- it remains visible even in races where the horse is forward in a relatively fast pace;
- it converts most clearly into top-3 advantage for hold-up / mid-position horses, but the underlying residual separation is not limited to those styles.

This supports the current interpretation of Trait A as `M3-relative closing tendency`, not `closer ability`, `stamina`, or `energy reserve`.

## What this does NOT prove

It does not identify a physiological mechanism.

Possible latent causes still include:

- true late-race efficiency / deceleration resistance;
- omitted class/course/surface suitability;
- recurring tactical features not in M3;
- gait / acceleration properties;
- stable model misspecification for particular horses.

The current data cannot distinguish those mechanisms cleanly.

## App decision

Keep `末脚特性A/B/C` as a display-only horse-specific layer.

Do **not** split Trait A into separate front/mid/rear versions yet, because the style interactions are not stable enough to justify extra rules.

Do **not** add a live `early-effort resistant` badge from the current-race check, because current position / current PCI are realized after the race.

A sensible future prospective field is simply to log predicted running-position category beside Trait A and test whether the future A advantage reproduces within each predicted style without retuning thresholds.

## Verdict

**Trait A is not just a closer proxy. Its M3-relative closing advantage survives across styles and is still visible when the horse has already been used forward in a faster race. The best current interpretation remains a persistent horse-specific closing residual, not a proven physiological reserve mechanism.**
