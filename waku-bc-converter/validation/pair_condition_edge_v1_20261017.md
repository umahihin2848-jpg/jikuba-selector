# Pair Condition Edge v1 — walk-forward validation (2026-10-17)

## Goal
Test whether horse-level Win Condition Edge for the axis and Top3 Condition Edge for the partner can be converted into a repeatable **pair-level market mispricing signal** for quinella / wide.

This follows the previous result that:
- Win Condition Edge orders horse-level win market residuals,
- Top3 Condition Edge orders horse-level top-3 market residuals,
- but simply combining one Win-Edge axis with Top3-Edge partners does not yet create a profitable ticket rule.

The target here is not ROI optimization. The target is whether a pair model learned only from prior years can improve the market probability and order pairs by realized market residual.

## Candidate universe
Use the previously generated axis-partner universe:
- one race axis selected from the positive Win Edge layer,
- partner must have positive Top3 Edge,
- quinella / wide market pair probability comes from normalized closing odds,
- no P10 or pressure filter,
- no ROI threshold.

Evaluation rows available from 2021-2026; the pair residual layer itself is evaluated walk-forward from 2022 onward:
- train 2021 -> test 2022,
- train 2021-2022 -> test 2023,
- ...
- train 2021-2025 -> test 2026.

2022-2026 evaluation:
- **5,871 candidate pairs**
- **1,773 races**

## Model
For each ticket type separately, fit a conservative L2-regularized logistic residual model with the market pair probability as a fixed offset.

Frozen inputs:
1. `log(axis Win Edge)`
2. `log(partner Top3 Edge)`
3. their interaction

Primary L2 penalty: lambda = 10.
Sensitivity checks were also run at lambda = 1 and 100; no conclusion below depends on selecting the primary lambda for better outcomes.

`Pair Edge = adjusted pair probability / market pair probability`.

No price or ROI variable is used as a predictor.

---

# Quinella

## Pooled predictive result, 2022-2026
- Market pair LogLoss: **0.043743**
- Pair Edge LogLoss: **0.044099**
- delta: **+0.000356** (worse)
- race-bootstrap 95% CI for delta: approximately **[-0.000064, +0.000830]**

The model does not improve the market baseline.

Year-by-year delta LogLoss:
- 2022: **-0.000771**
- 2023: **+0.000816**
- 2024: **+0.001259**
- 2025: **+0.000311**
- 2026: **-0.000026**

Only 2022 and essentially-flat 2026 improve. The effect does not replicate.

## Pair Edge ordering
Quintiles by walk-forward Pair Edge:

| Pair Edge quintile | Mean Pair Edge | Observed / market expected |
|---|---:|---:|
| lowest 20% | 0.757 | **1.487** |
| 20-40% | 0.890 | 1.098 |
| 40-60% | 0.969 | **1.561** |
| 60-80% | 1.027 | 1.065 |
| highest 20% | 1.297 | **0.972** |

This is the opposite of the required monotone structure: the model's highest-edge pairs do not outperform the market, while low / middle groups sometimes do.

The within-year top quintile is also unstable, including zero hits in 2023 and 2025.

## Sensitivity to shrinkage
The failure is not specific to lambda=10.

- lambda=1: pooled delta LogLoss **+0.000469**, top-quintile O/E **0.948**
- lambda=10: **+0.000356**, top O/E **0.972**
- lambda=100: **+0.000105**, top O/E **0.842**

No regularization strength creates the desired ordered residual.

---

# Wide

## Pooled predictive result, 2022-2026
- Market pair LogLoss: **0.101753**
- Pair Edge LogLoss: **0.102386**
- delta: **+0.000633** (worse)
- race-bootstrap 95% CI: approximately **[+0.000139, +0.001222]**

Here the interval is entirely above zero: the proposed pair residual model is **significantly worse than the closing wide market baseline** under this reconstruction.

Year-by-year delta LogLoss:
- 2022: +0.000863
- 2023: +0.001905
- 2024: +0.000084
- 2025: -0.000272
- 2026: +0.000503

Only 2025 improves.

## Pair Edge ordering

| Pair Edge quintile | Mean Pair Edge | Observed / market expected |
|---|---:|---:|
| lowest 20% | 0.837 | **1.549** |
| 20-40% | 0.972 | 0.932 |
| 40-60% | 1.010 | 1.013 |
| 60-80% | 1.048 | 1.273 |
| highest 20% | 1.145 | **0.848** |

Again, the desired monotone ordering fails. The highest predicted Pair Edge group underperforms the market expectation.

Sensitivity checks:
- lambda=1: delta LogLoss +0.000816, top O/E 0.927
- lambda=10: +0.000633, top O/E 0.848
- lambda=100: +0.000201, top O/E 1.065, but bottom O/E remains much higher at 1.683 and ordering is still invalid.

---

# Interpretation
The main lesson is important:

> **horse-level market mispricing does not combine multiplicatively into pair-level market mispricing.**

The market can correctly price the correlation between two horses even when each horse individually has a small Win / Top3 residual.

Therefore:
- Win Edge remains useful at the horse level,
- Top3 Edge remains useful at the horse level,
- but `axis Win Edge + partner Top3 Edge + interaction` is not enough to build a pair probability correction.

The pair market appears to contain substantial joint / correlation information that is missing from these horse-level edges.

This result also explains why the previous axis-partner candidate pool could beat market expected hit counts while still failing to produce a clean pair-edge ordering or sufficient raw ROI.

## Decision
### REJECT Pair Condition Edge v1 as a probability / buy layer.

Do not:
- deploy Pair Edge v1,
- rank quinella / wide tickets by this Pair Edge,
- add thresholds to rescue the result,
- optimize on 2025/2026 ROI.

Keep:
- Win Condition Edge v1 as a horse win-pricing layer,
- Top3 Condition Edge v1 as a horse partner-shortlist / overvaluation layer,
- P10 / dangerous favorite as separate race-context information.

## Best next validation
Do **not** add more coefficients to this failed pair model.

The next statistically cleaner route is to study the pair market's own recurring errors directly, using pre-race pair features that represent dependence rather than only two marginal horse edges. Candidate hypotheses to test one at a time:
1. **style compatibility / collision** — both horses need the same pace or position vs complementary paths,
2. **axis-partner market concentration** — pair price relative to the two horses' single-market probabilities,
3. **race favorite vulnerability** — whether pair prices excluding a structurally vulnerable favorite are systematically misallocated,
4. **course / distance × pair style** — whether specific joint running-style combinations are under/over-priced by venue-distance,
5. only after a factor shows walk-forward market residual ordering, combine it with horse-level Win / Top3 Edge.

The goal remains the same: find a repeatable market mistake first, then decide how to express it as a ticket.
