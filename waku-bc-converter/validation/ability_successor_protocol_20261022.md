# Ability successor statistical validation protocol

Date: 2026-10-22
Status: FROZEN BEFORE NEXT CANDIDATE
Production change: none

## Purpose

Define the statistical acceptance rules for any successor to production `Ability v1` before another candidate is selected. The objective is not to maximize a single retrospective metric. A replacement must remain a useful independent complement to M3 and must avoid semantic pathologies such as sparse-history horses being promoted by counter-intuitive coefficient signs.

## Data roles

- **2024**: development only. Feature design, regularization choice and candidate selection may use this year.
- **2025**: original OOS confirmation, but now already inspected during repeated model research.
- **2026**: original final OOS, but now also already inspected during repeated model research.
- **2025+2026 pooled (700 races / 10,623 runners)**: diagnostic comparison set only from this point forward.
- **2027 forward races**: preserve as the next clean prospective holdout for production promotion.

Because 2025/2026 have already influenced model-family decisions, p-values or bootstrap intervals on those years are descriptive diagnostics, not pristine confirmatory inference.

## Frozen universe

- JRA flat races only.
- Field size >=12.
- Current race class 3-win or higher.
- Same race-universe convention as the frozen Ability/M3 validation artifacts.
- Historical Ability features use strictly prior high-class flat starts only, maximum five, unless a candidate explicitly pre-registers a different history definition on 2024 before OOS evaluation.

## Leakage rules

A successor must not use:

- current-race result,
- current-race final odds/popularity,
- post-race information,
- M3 score/rank as an Ability feature,
- ticket result/ROI as a model-training target,
- 2025/2026 outcomes to select hyperparameters after this protocol freeze.

Market information may only be evaluated after structural selection is frozen.

## Stage 1 — semantic validity

Before predictive metrics are considered, reject a candidate if its model semantics are internally contradictory without a strong pre-registered explanation. Examples:

- more historical wins directly lowering Ability,
- stronger class achievement directly lowering Ability,
- a larger losing margin directly improving Ability,
- history count acting as an unexplained mechanical ability bonus/penalty,
- arbitrary manually tuned G1 bonuses chosen from 2025/2026 outcomes.

Sparse-history uncertainty may be represented by shrinkage/reliability labels, but must not be tuned using the motivating Kikuka Sho example as an independent validation point.

## Stage 2 — standalone predictive diagnostics

Evaluate separately for 2025 and 2026, then pooled:

- Log Loss (primary probability metric),
- Brier score,
- ROC AUC,
- ECE10,
- calibration intercept and slope,
- Ability #1 Top3 rate and win rate,
- Ability Top3 overlap with actual Top3.

Use race-cluster bootstrap rather than runner-level iid bootstrap because runners within a race are dependent.

A candidate is not allowed to advance merely because AUC improves. Probability quality and calibration must not materially deteriorate.

## Stage 3 — M3 complementarity diagnostics

Freeze the M3 implementation while comparing Ability candidates.

Structural horse definition remains:

`M3 rank <=3 AND Ability rank <=3`

Compare, by year and pooled:

- number of structural horses,
- structural-horse Top3 rate,
- structural-horse win rate,
- number of exactly-one-structural races,
- single structural axis Top3/win rate,
- number of two-structural Pair Survival passes under the frozen production guard,
- probability that both structural horses finish Top3.

A standalone improvement that materially worsens these downstream structural outcomes is a rejection. Candidate B is the precedent: better standalone AUC did not justify replacing v1 because pair complementarity deteriorated sharply.

## Stage 4 — ticket diagnostics only after structure is frozen

Only candidates passing Stages 1–3 may be replayed through Wide / Quinella / Trio price rules.

For ticket evaluation report:

- opportunities and combinations,
- hit rate,
- stake and return,
- ROI,
- year-by-year ROI,
- race-cluster bootstrap ROI interval,
- largest payout contribution / concentration,
- maximum losing streak and bankroll drawdown under a fixed staking rule when relevant.

Do not tune ticket thresholds to rescue a weak Ability candidate.

ROI is heavy-tailed; a point estimate above 100% is not evidence of profitability when its interval is wide or the return is dominated by a few payouts.

## Multiple-testing policy

- Keep the number of Ability candidate families small and hypothesis-driven.
- Record every evaluated production-replacement candidate, including failures.
- Do not search hundreds of feature combinations against 2025/2026 and report only the best.
- If many related variants are explored, label them exploratory; do not interpret nominal p-values as confirmatory.
- Final promotion must rely on the frozen candidate evaluated prospectively in 2027, not on repeated retrospective selection.

## Promotion policy

### Retrospective / diagnostic promotion to Shadow
A candidate may enter Shadow only if:

1. semantic validity passes,
2. standalone metrics are at least competitive with v1 across both 2025 and 2026,
3. no material deterioration appears in M3 structural complementarity,
4. calibration remains acceptable,
5. the exact formula and parameters are frozen before forward observation.

### Production replacement
Do **not** replace Ability v1 using another 2025/2026 re-analysis alone.

Production replacement requires a genuinely prospective sample (next clean holdout: 2027) with the candidate frozen in advance. Judge the forward sample on the same standalone and structural metrics; ticket ROI is secondary and cannot override failed probability/structure diagnostics.

## Current baselines to preserve for comparison

Frozen Ability v1 pooled 2025–2026:

- AUC about 0.68495,
- Log Loss about 0.46345,
- Brier about 0.14762.

Current structural diagnostic with frozen M3 reconstruction:

- structural horses: 914,
- structural horse Top3 rate: 41.03%,
- structural horse win rate: 15.97%,
- production-style single routes: 141,
- single-axis Top3 rate: 46.10%,
- Pair Survival passes: 78,
- both structural horses Top3: 23.08%.

These are comparison baselines, not tuning targets.

## Decision rule for the next candidate

The next Ability candidate will be developed using 2024 only. 2025/2026 will be opened only for the frozen diagnostic report. If it passes retrospective diagnostics, it becomes a **Shadow candidate**, not an automatic production replacement. The 2027 forward log remains the decisive holdout.
