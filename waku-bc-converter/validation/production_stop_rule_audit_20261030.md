# Production stop-rule audit — 2026-10-30

## Purpose
Audit the current Production “見送り” rules and separate:

1. evidence that the horse/ticket type is actually weaker,
2. a conservative route stop because the app cannot form a sufficiently clear automatic axis,
3. an out-of-validation-scope gate.

No model coefficients, Ability rank, M3 rank, or pair probability are changed by this audit.

## Sources
- `validation/single-axis-ability-rank-expansion-20261022.md`
- `validation/p10_position_market_roi_20261017.md`
- `validation/position_risk_probability_v3_20261016.md`
- `validation/m3_position_risk_incremental_20261016_v1.md`
- `validation/pipeline_final_verdict_2024_2026_v1.md`
- `validation/pipeline_drop_audit_2024_2026_v1.md`
- `validation/structural-ticket-engine-v3-unification-20261022.md`
- current runtime `data/position_risk_runtime_v2.json`
- local 2025/2026 result files used for a fresh replay of the current P10 runtime formula.

## 1. Ability #3 single-structural stop
The existing single-axis audit is directly relevant.

Among 534 reconstructed one-structural races:
- Ability #1: 223 races, Top3 52.9%, win 22.4%
- Ability #2: 175 races, Top3 48.0%, win 15.4%
- Ability #3: 136 races, Top3 34.6%, win 14.0%

Ability #3 vs #1 Top3 difference was material (two-proportion diagnostic p≈0.00071); #3 vs #2 p≈0.017.

Market-qualified ticket diagnostics for Ability #3:
- Wide ROI 74.8%
- Quinella ROI 62.3%
- Trio 122.6% was based on only 3 hits and was explicitly judged unstable.

### Decision
**KEEP Production stop for Ability #3 single-axis.**
This is the strongest current stop rule among the audited structural rules for Wide/Quinella production.

## 2. Ability #2
Ability #2 behaved closer to #1 than #3:
- Top3 48.0%
- Wide ROI 102.9%
- Quinella ROI 115.1%, but not year-stable.

### Decision
**Do not hard-stop Ability #2. Keep conditional/Shadow.**
Current app direction is appropriate.

## 3. P10 / position-risk stop
### Existing validation
Position risk is real and incremental to M3.

In the frozen M3 + PositionRisk audit, for M3 rank 1–3 horses:
- no PositionRisk: Top3 36.05% / 33.37% / 32.44% in 2024/25/26
- PositionRisk present: 20.79% / 22.73% / 24.23%

The continuous P10 model also showed smooth deterioration rather than a cliff at 50%.
2025–26 pooled, all runners:
- P10 <20%: Top3 23.92%
- 20–35%: 20.83%
- 35–50%: 20.07%
- 50–65%: 17.24%
- >=65%: 12.45%

For M3 rank 1–6:
- <20%: 31.40%
- 20–35%: 27.85%
- 35–50%: 25.08%
- 50–65%: 24.42%
- >=65%: 17.06%

The prior market/ROI audit concluded:
- P10 >=50% is reasonable as an additional **WIN risk brake / caution flag**.
- The same hard cutoff is **not supported for Wide/Quinella**.
- Do not use P10 as a standalone buy/sell signal.

### Fresh threshold replay using current runtime P10 formula
Replayed `position-risk-runtime-v2` on the 2025/2026 high-class flat universe and then restricted to final popularity 1–6 to approximate the current axis market scope.

| P10 threshold | Below threshold Top3 | High-P10 Top3 | Below threshold win | High-P10 win | adjusted Top3 OR (p) | adjusted win OR (p) |
|---|---:|---:|---:|---:|---:|---:|
| 30% | 37.0% | 33.8% | 15.0% | 10.7% | 0.963 (0.585) | 0.764 (0.005) |
| 40% | 37.1% | 32.3% | 14.6% | 9.9% | 0.902 (0.171) | 0.739 (0.006) |
| 50% | 36.6% | 32.3% | 14.3% | 9.3% | 0.953 (0.568) | 0.736 (0.018) |
| 60% | 36.6% | 29.8% | 13.9% | 8.9% | 0.881 (0.229) | 0.770 (0.109) |

Adjusted models include final popularity category (1–6) and year, with race-cluster robust standard errors.

Interpretation:
- High P10 retained a clear independent negative association with **winning** around 30–50% cutoffs.
- For **Top3**, the residual threshold effect was not statistically clear after popularity/year adjustment.
- Therefore a hard all-ticket stop at 50% is stronger than the evidence supports.
- Do not retrospectively optimize 30/40/50/60 to a new “best” cutoff from the same 2025–26 data. The existing 50% threshold can remain as a frozen operational warning/brake.

### Decision
**CHANGE semantics, not P10 model:**
- P10 >=50%: WIN = stop / strong caution.
- Wide/Quinella: do not stop solely because P10 >=50%; retain manual/conditional evaluation if other Production structure passes.
- P10 >=65%: show stronger danger warning, but do not promote to an all-ticket hard veto without prospective evidence.

## 4. Zero structural overlap: M3 Top3 × Ability Top3 = 0
There is no clean evidence that “no overlap” means the strong Ability horse is bad.

The 2025–26 frozen diagnostic shows:
- Ability #1 overall: Top3 43.6%, win 18.4%
- Ability #1 even when M3 rank >=7: n=225, Top3 39.6%, win 17.3%
- Ability Top3 with M3 rank >=7: n=786, Top3 32.1%, win 13.0%

Thus M3 disagreement does not disprove strong Ability. The pipeline audit also found Ability and M3 complementary.

### Decision
**Do not describe zero overlap as a validated “bad race”.**
For Production automation it is still reasonable to stop the automatic-axis route because no validated alternative ticket route exists.
Recommended wording:
- `構造一致なし｜自動軸なし`
not
- `能力不足で見送り`.

## 5. Structural overlap >=3
The current rule stops the automatic route because the axis cannot be narrowed. The unification audit explicitly states that its consolidation is architectural and is not evidence of a new betting edge.

### Decision
**KEEP route stop, but classify it as selectivity/ambiguity, not negative expectancy.**
Recommended wording:
- `軸を絞れず見送り（構造一致3頭以上）`

Do not claim these races are statistically poor unless a dedicated future ticket replay demonstrates that.

## 6. Axis popularity >=7
The current single-axis ticket audit was explicitly market-qualified at popularity 1–6. That proves the tested route is scoped to 1–6; it does **not** prove every 7+ axis is bad.

No dedicated current-Ability single-axis audit was found that establishes a statistically validated negative edge for axis popularity 7+.

### Decision
Treat 7+ as **out of validated Production scope**, not as a proven bad horse.
Recommended wording:
- `検証レンジ外（7番人気以下）`
not
- `市場的に弱いので見送り`.

## Final classification
| Current stop reason | Evidence classification | Recommended action |
|---|---|---|
| Ability #3 single-axis | Supported stop | KEEP |
| Ability #2 | Not supported as hard stop | Conditional/Shadow |
| P10 >=50% | Supported as WIN risk brake; not all-ticket veto | CHANGE to WIN-only stop/caution |
| overlap = 0 | No validated automatic route; not proof of weakness | KEEP route stop, reword |
| overlap >=3 | Axis ambiguity/selectivity rule | KEEP route stop, reword |
| axis popularity >=7 | Outside validated 1–6 scope | KEEP scope gate, reword |

## Recommended Production semantics
Use three distinct concepts instead of one generic `見送り`:

1. **見送り（根拠あり）** — e.g. Ability #3 single-axis for current Wide/Quinella route.
2. **自動軸なし** — overlap 0 or >=3; app cannot form a validated clear axis.
3. **検証レンジ外** — axis popularity >=7.

And for P10:
- `P10 >=50% → 単勝見送り / 位置取りリスク高`
- Wide/Quinella remain separately evaluable.

## Forward policy
Do not optimize a new P10 cutoff on the already-inspected 2025–26 sample. Freeze the operational 50% warning threshold and prospectively log future qualifying races. Any promotion of >=65% to a hard all-ticket veto should require future-period evidence.