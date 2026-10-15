# M3 closing trait interaction analysis v1

Created: 2026-10-16

## Question

For the display-only `末脚特性` A/B/C layer, test whether the historical A signal is stronger or weaker by:

- surface (芝 / ダート)
- distance band
- race pace shape (realized RPCI band)

The main practical diagnostic is an **M3 rescue slice**: horses ranked M3 4th-6th, comparing `末脚特性A` with `B/C` on actual top-3 rate. This keeps the question close to how the layer might eventually be used without changing the current production rank or probability.

## Important protocol limits

- The A/B/C definition is the frozen v1 rule: trainer-adjusted, horse-specific M3 closing residual with shrinkage; minimum 3 prior observations.
- 2025 and 2026 have already been inspected in this project. These results are therefore **retrospective stability / sensitivity checks, not pristine untouched OOS confirmation**.
- Pace groups below use **realized race RPCI**, so they are ex-post descriptive interaction checks. They must not be used directly as a live pre-race rule. A future live rule would need to use the existing pre-race RPCI distribution and then be prospectively validated.
- Race-cluster bootstrap is used for the M3 4th-6th top-3 rate differences.

## 1. Surface

### Horse-specific closing residual separation (A minus C)

| Surface | A-C residual gap | 95% race-bootstrap CI | 2025 | 2026 |
|---|---:|---:|---:|---:|
| ダート | **+0.393 sec** | **+0.286 to +0.507** | +0.441 | +0.319 |
| 芝 | **+0.184 sec** | **+0.109 to +0.260** | +0.232 | +0.123 |

The A/C ordering is present on both surfaces but materially stronger on dirt.

### M3 ranks 4-6: actual top-3 rescue

| Surface | A top-3 | B/C top-3 | Difference | 95% race-bootstrap CI | 2025 diff | 2026 diff |
|---|---:|---:|---:|---:|---:|---:|
| ダート | **26.8%** (306) | 15.2% (224) | **+11.6 pt** | **+4.6 to +18.4 pt** | +13.5 | +8.9 |
| 芝 | **29.1%** (234) | 21.2% (599) | **+7.9 pt** | **+1.5 to +14.5 pt** | +5.3 | +11.2 |

Both surfaces are directionally favorable, with the cleaner residual separation on dirt.

## 2. Distance

Distance bands were fixed before reading subgroup outcomes:

- <=1400m
- 1500-1700m
- 1800-2100m
- >=2200m

### M3 ranks 4-6: actual top-3 rescue

| Distance | A top-3 | B/C top-3 | Difference | 95% race-bootstrap CI | 2025 diff | 2026 diff |
|---|---:|---:|---:|---:|---:|---:|
| <=1400m | 24.9% (185) | 18.3% (350) | +6.6 pt | -0.3 to +13.4 pt | +4.1 | +9.7 |
| 1500-1700m | 30.1% (93) | 21.8% (165) | +8.3 pt | -3.2 to +19.9 pt | +11.2 | +4.3 |
| **1800-2100m** | **31.8% (195)** | **19.0% (253)** | **+12.8 pt** | **+4.7 to +21.0 pt** | **+12.7** | **+13.3** |
| >=2200m | 20.9% (67) | 23.6% (55) | -2.7 pt | -17.4 to +12.1 pt | -6.9 | +5.0 |

The most stable practical interaction is **1800-2100m**. The >=2200m group does not show a usable top-3 rescue effect despite a large A/C closing-residual separation; sample size is small and the residual difference does not convert reliably into finishing-position gain.

A rank-stratified check within M3 ranks 4, 5 and 6 leaves the 1800-2100m effect essentially unchanged (~+12.5 pt), so the result is not explained by A horses merely having more M3 rank-4 runners.

## 3. Pace shape (realized RPCI; descriptive only)

RPCI bands use the app's existing scenario labels:

- strong front-loaded: RPCI <45
- front-loaded: 45-49
- standard: 50-54
- slow: >=55

### M3 ranks 4-6: actual top-3 rescue

| Realized RPCI | A top-3 | B/C top-3 | Difference | 95% race-bootstrap CI | 2025 diff | 2026 diff |
|---|---:|---:|---:|---:|---:|---:|
| strong front-loaded <45 | 22.0% (100) | 15.7% (121) | +6.3 pt | -4.0 to +16.4 pt | +11.5 | +0.5 |
| **front-loaded 45-49** | **30.0% (230)** | **20.1% (329)** | **+9.9 pt** | **+2.8 to +17.0 pt** | +7.9 | +13.4 |
| **standard 50-54** | **31.1% (151)** | **20.3% (276)** | **+10.8 pt** | **+2.2 to +19.8 pt** | +9.1 | +13.1 |
| slow >=55 | 20.3% (59) | 20.6% (97) | -0.3 pt | -13.3 to +11.6 pt | +2.4 | -3.4 |

The conversion from A trait to an actual top-3 rescue is clearest in **moderately front-loaded to standard races (RPCI 45-54)**. Strongly front-loaded races show a larger A/C closing-residual difference, but the M3 4th-6th finishing-position rescue is unstable across years. Slow races show essentially no rescue effect.

Because these are realized RPCI groups, this is an explanatory pattern, not a deployable pre-race switch.

## 4. Combined surface-distance exploratory check

This is lower-priority because it introduces another level of subgrouping.

For M3 ranks 4-6:

- Dirt 1800-2100m: +13.8 pt pooled (2025 +16.5 / 2026 +9.9), bootstrap CI about +1.4 to +25.6 pt.
- Turf 1800-2100m: +14.9 pt pooled (2025 +14.3 / 2026 +16.6), bootstrap CI about +3.0 to +27.5 pt.
- Dirt 1500-1700m: +18.2 pt pooled, but sample is small (A 61 / B-C 31).

This supports the broader 1800-2100m finding rather than proving a separate dirt-only rule.

## 5. Interpretation

The strongest current retrospective pattern is:

1. `末脚特性A` is a real M3-relative horse characteristic on both surfaces; the residual separation is larger on dirt.
2. For practical M3 rescue, **1800-2100m** is the most stable distance band.
3. By realized pace, the rescue converts best in **RPCI 45-54**, not in extreme slow or extreme front-loaded races.
4. >=2200m should **not** be promoted despite a large raw A/C residual gap because it does not translate into stable top-3 rescue.

A useful candidate hypothesis for prospective logging is therefore:

> M3 rank 4-6 + 末脚特性A, especially 1800-2100m; and when the pre-race RPCI distribution concentrates on 45-54, mark as a display-only `末脚特性注目` candidate.

## Deployment decision

**Do not change M3 rank, calibrated probability, or betting logic from this analysis.**

Reason:

- 2025/2026 are retrospective, already-inspected years.
- pace interaction currently uses realized RPCI.
- multiple subgroup views were inspected, so subgroup selection itself is exploratory.

Allowed next step:

- add a prospective log field for `末脚特性A × M3 4-6 × 1800-2100m`.
- separately log the pre-race RPCI probability mass on 45-54.
- do not use these fields to alter the selection until new future races confirm the effect.
