# Course-specific wide-trip geometry audit v1

Date: 2026-11-01
Status: retrospective diagnostic / geometry discovery only
Production impact: none

## Goal

Build evidence for a future display layer that explains `course geometry × gate × expected queue/position × acceleration × sustained ability` without collapsing the existing independent layers into one score.

The target concept is not `outer gate = bad`. It is to separate:

1. pure extra-distance exposure around turns,
2. corner/turning load while maintaining speed,
3. opportunity to settle inward before the first material turn.

## Data used

Historical result file: `umade.csv`.

Diagnostic universe:
- JRA flat only
- field size >= 12
- 3-win / former 1600万 / OP / L / G3 / G2 / G1 / 重賞
- 2016 through 2026-10-04
- 4,134 races
- 62,215 starters

Existing geometry input:
- `data/course_first_turn_distance_v1.json`
- 87 mapped course conditions

New geometry reference:
- `data/venue_geometry_v1.json`
- JRA official course dimensions, separated where inner/outer routes exist

New empirical diagnostic:
- `data/course_outer_gate_residual_diagnostic_v1.json`

## Important limitation

TARGET result data contains gate/horse number and passing positions, but not the horse's actual lateral lane or GPS path. Therefore this audit **does not measure actual meters lost by running wide**.

Gate effects are only empirical proxies. A horse drawn outside can tuck in; a horse drawn inside can be forced wide later. For that reason the result must not be named `distance-loss probability` or used as an automatic betting correction.

## Empirical method

For each course condition with enough races:

- outcome = Top3 finish
- market control = `log(final popularity rank)`
- gate exposure = `(horse number - 0.5) / field size`
- race-clustered standard errors for the continuous gate coefficient
- separate descriptive check for outer-third gates (`gate_fraction > 2/3`)
- outer-third residual = actual Top3 rate minus Top3 rate expected from the course-specific popularity model
- stability check: 2016-2021 vs 2022-2026

Popularity is used only as a control for the historical diagnostic. This is not a new Production market score.

## First findings

### Large / long-straight examples

**Tokyo turf 1600**
- 109 races / 1,719 starters
- continuous gate coefficient: +0.105, p=.712
- outer-third residual: **+1.08pp**
- 2016-21: +1.01pp
- 2022-26: +1.11pp

Interpretation: no evidence in this sample that an outside draw itself creates a material Top3 penalty after market adjustment. This is compatible with the geometry hypothesis, but it does not prove that actual wide trips are costless.

**Kyoto turf 1600 outer**
- 59 races / 882 starters
- continuous gate coefficient: +0.130, p=.745
- outer-third residual: **+0.14pp**

Again, no clear outside-gate penalty. The route has a long run before the first material turn in the existing course table, so an outside draw does not necessarily imply remaining wide.

### Compact / turn-sensitive examples

**Hanshin turf 1200 inner**
- 52 races / 784 starters
- continuous gate coefficient: **-1.262, p=.002**
- outer-third residual: **-6.23pp**
- 2016-21: -6.80pp
- 2022-26: -5.58pp

This is one of the clearest stable negative course signals in the audit.

**Chukyo turf 1200**
- 54 races / 903 starters
- continuous gate coefficient: **-1.028, p<.001**
- outer-third residual: **-4.61pp**
- 2016-21: -5.40pp
- 2022-26: -3.68pp

This also shows a stable outside-gate penalty in both time blocks.

**Nakayama turf 1600**
- 127 races / 1,895 starters
- continuous gate coefficient: -0.495, p=.065
- outer-third residual: **-2.07pp**
- both time blocks negative

The signal is weaker than Hanshin 1200 / Chukyo 1200 but directionally stable.

### Important counterexamples

Course size alone is not sufficient.

- Tokyo turf 2000: outer-third residual about -2.05pp despite Tokyo being a large venue.
- Tokyo turf 2400: overall near neutral, but the two time blocks change sign.
- Hanshin turf 1600 outer: modest negative residual even though the route is a large outer course.
- Niigata dirt 1200 and Nakayama dirt 1200 show positive outer-gate residuals.
- Niigata turf 1000 is a special straight-course case and must never be interpreted through corner-distance logic.

Therefore `big venue -> outside always safe` is rejected as a direct rule.

## Position interaction diagnostic

Actual first-corner position was used only as a retrospective diagnostic, not as a pre-race feature.

Outer-third horses showed the following market-adjusted Top3 residuals by first-position band:

- Tokyo turf 1600: front +0.84pp / middle +3.78pp / rear -0.65pp
- Nakayama turf 1600: front +1.45pp / middle -4.46pp / rear -3.86pp
- Hanshin turf 1200 inner: front -1.23pp / middle -4.32pp / rear **-12.48pp**
- Chukyo turf 1200: front -0.98pp / middle -3.56pp / rear **-9.83pp**
- Tokyo turf 2000: front -0.66pp / middle -0.75pp / rear -4.42pp

This is useful evidence for the planned interaction layer: gate should not be interpreted without likely position. However actual passing position is post-start information, so these numbers are diagnostic evidence only. Runtime must use the pre-race queue/P10 prediction instead.

## Geometry layer design decision

Do not create one `wide-trip score`.

Keep three outputs independent:

### A. Distance-loss exposure
Structural description of how costly remaining outside through the turns could be. Uses route geometry and the number/shape of material turns.

### B. Corner-load exposure
Whether maintaining speed around the relevant turns is likely to be demanding. This is geometry interpretation, not a measured physiological cost.

### C. Inward-settling opportunity
Uses `first_turn_distance_m` plus predicted queue/frontness to describe whether an outside horse has room to settle inward before the first material turn.

## Planned horse-level interaction

Runtime display only:

`course geometry × horse gate × predicted queue/P10 × acceleration × sustained ability`

Examples:
- outer + short run to turn + forward intent -> early positioning cost warning
- outer + long run to turn + non-forward intent -> outside draw may not imply an outside trip
- inner + rear + low acceleration -> trapped/clearance/re-acceleration risk
- outside route exposure + high sustained ability -> ability may tolerate a long sustained run, while distance loss remains separately visible

No composite score. No automatic opponent replacement. No ticket change.

## Decision after v1

1. **ACCEPT** geometry DB as a descriptive input layer.
2. **ACCEPT** course-specific outer-gate residuals as retrospective supporting evidence only.
3. **REJECT** a universal `large course = outside loss small` rule.
4. **REJECT** calling gate residuals actual distance loss.
5. Next: build a distance-specific geometry join (`venue + surface + distance + inner/outer`) using `venue_geometry_v1` + `course_first_turn_distance_v1`, then expose it to opponent analysis in Shadow/display-only mode.
6. Before any Production use, freeze the interpretation rules and evaluate prospectively; do not tune a betting rule on the same 2016-2026 outcomes.
