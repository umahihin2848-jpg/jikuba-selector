# Race Difficulty — Center Clarity / HIGH AXIS audit v1

Date: 2026-10-28  
Status: **retrospective diagnostic / Shadow**  
Production betting impact: **none**

## Question

Can the current `HIGH AXIS` gate legitimately be used as the **中心候補の明確さ** component of the decomposed race-difficulty card?

The frozen current gate is:

- Ability rank = 1
- Ability projected Top3 probability >= 40%
- eligible high-class history >= 3 starts
- M3 rank <= 4

No threshold was changed in this audit.

## Critical validation-scope rule

The four-way HIGH AXIS gate was created after inspection of 2024–2026 behavior. Therefore 2024–2026 must **not** be described as a pristine untouched confirmation of the composite gate.

Component model chronology:

- Ability v1: development = 2024, confirmation = 2025, final OOS = 2026.
- M3 finish model: train = 2019–2023, model selection = 2024, confirmation = 2025, final OOS = 2026.
- HIGH AXIS composite: retrospective Shadow selected after looking at the 2024–2026 period; genuine confirmation starts only after the freeze date.

This audit asks a narrower question: does the already-frozen retrospective gate show sufficiently coherent discrimination to remain a Shadow clarity flag while it is forward-tested?

## Saved HIGH AXIS retrospective result

| Year | Universe races | HIGH races | HIGH Top3 | HIGH rate | Coverage |
|---|---:|---:|---:|---:|---:|
| 2024 | 400 | 62 | 38 | 61.3% | 15.5% |
| 2025 | 403 | 54 | 35 | 64.8% | 13.4% |
| 2026 | 297 | 33 | 19 | 57.6% | 11.1% |
| pooled | 1,100 | 149 | 92 | 61.7% | 13.5% |

Saved pooled Wilson 95% CI for HIGH Top3 = **53.7%–69.2%**.

The point estimate remains in the same broad range in all three years; there is no 2026 reversal analogous to the rejected opponent-narrowability rule.

## Stronger comparison — HIGH versus other Ability #1 horses

The current JRA-only Ability runtime audit gives exact Ability #1 Top3 counts for the two clean component-model evaluation years:

- 2025: Ability #1 = 175/403 Top3 = 43.42%
- 2026: Ability #1 = 118/297 Top3 = 39.73%

Because every HIGH horse is Ability #1, subtracting the saved HIGH counts gives the complementary `Ability #1 but HIGH not satisfied` group without inventing a new threshold.

### 2025

- HIGH: **35/54 = 64.8%**
- Ability #1, non-HIGH: **140/349 = 40.1%**
- risk difference: **+24.7 percentage points**
- Newcombe 95% CI for difference: **+10.4 to +37.1 pp**
- odds ratio: **2.75**
- Fisher exact p = **0.0010**

### 2026

- HIGH: **19/33 = 57.6%**
- Ability #1, non-HIGH: **99/264 = 37.5%**
- risk difference: **+20.1 percentage points**
- Newcombe 95% CI for difference: **+2.3 to +36.3 pp**
- odds ratio: **2.26**
- Fisher exact p = **0.0368**

### Pooled 2025–2026 descriptive comparison

- HIGH: **54/87 = 62.1%**
- Ability #1, non-HIGH: **239/613 = 39.0%**
- difference: **+23.1 pp**
- Newcombe 95% CI: **+11.9 to +33.3 pp**
- relative risk: **1.59**
- odds ratio: **2.56**
- Fisher exact p = **0.000066**

The effect direction is stable in 2025 and 2026. This supports the interpretation that the HIGH gate identifies a **more clearly supported center candidate inside the Ability #1 population**.

## Why the p-values are diagnostic, not confirmatory

The composite HIGH rule was selected after the broader 2024–2026 research sequence. Therefore the p-values and confidence intervals above describe retrospective separation; they do not erase selection bias or turn 2026 into a pristine untouched test of the composite rule.

The correct operational interpretation is:

> retrospective support is strong enough to keep a fixed Shadow flag; prospective / forward logging is still required before production promotion.

## Ability-only / M3-only context

Ability and M3 are complementary rather than interchangeable.

- JRA-only Ability #1 Top3 was 43.42% in 2025 and 39.73% in 2026.
- Existing Ability diagnostics show Ability #1 can remain useful even when M3 is weak; M3 disagreement must not be treated as a veto.
- The pipeline audit also found the Ability × M3 overlap useful as an **agreement label**, while warning against collapsing the two models into one score.

Therefore HIGH AXIS should be interpreted as **agreement / clarity**, not as a new calibrated probability and not as proof that non-HIGH Ability #1 horses are bad bets.

## What this audit does NOT establish

The saved HIGH audit retained the composite occurrence and Top3 hit counts, but not a version-exact per-race identity ledger containing all of:

- win / Top2 outcomes for each HIGH case,
- contemporaneous T-15 market probabilities,
- a horse-level market Top3 benchmark.

A fresh runtime-like replay can estimate those quantities, but it would introduce historical-version reconstruction error. They are therefore **not invented or back-filled here** merely to make the table more complete.

In particular, this audit does not establish:

- HIGH win ROI,
- HIGH quinella / wide ROI,
- market-adjusted Top3 O/E,
- profitability,
- an automatic axis bet.

## Can `高 / 中 / 低` be validated now?

### High
**SUPPORTED AS RETROSPECTIVE SHADOW CLARITY FLAG.**

The frozen HIGH gate separates from other Ability #1 horses in the same direction in both 2025 and 2026.

### Middle / Low
**NOT VALIDATED.**

No pre-specified, separately validated rule currently divides the non-HIGH population into an ordinal middle and low center-clarity scale. Reusing DecisionShell green/yellow/red for that purpose would silently promote a different heuristic into the race-difficulty layer.

Therefore:

- HIGH satisfied -> `中心候補の明確さ：高（Shadow）`
- HIGH not satisfied -> `中心候補の明確さ：判定保留｜HIGH条件未達`
- do not label non-HIGH as `中` or `低` yet.

## Decision

**KEEP_HIGH_AXIS_AS_CENTER_CLARITY_SHADOW**

**NO_VALIDATED_MID_LOW_CENTER_CLARITY_SCALE_YET**

**FORWARD_CONFIRMATION_REQUIRED**

## UI policy

1. The race-difficulty card may show HIGH as `高（Shadow）` / `明確候補あり`.
2. Non-HIGH must no longer inherit DecisionShell green/yellow/red as center-difficulty High/Mid/Low.
3. HIGH is an agreement/clarity label only; it must not alter Ability probability, M3 probability, ticket type, stake, or BUY/PASS.
4. Summary text may say `中心候補は比較的明確` only when the frozen HIGH gate is satisfied.
5. Keep prospective logging from the freeze date and review without threshold tuning.
