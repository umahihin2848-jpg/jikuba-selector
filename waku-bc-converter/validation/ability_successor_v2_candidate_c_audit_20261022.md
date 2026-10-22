# Ability successor audit — v2 / Candidate C

Date: 2026-10-22
Status: diagnostic / research only
Production change: **none**

This report follows `ability_successor_protocol_20261022.md`. It records both favorable and unfavorable findings. 2025–2026 are parameter-OOS but have already been inspected during model-family research, so all intervals below are diagnostic rather than pristine confirmatory inference. The next clean promotion holdout remains 2027.

## 1. Data and frozen rules

Evaluation universe:
- JRA flat only
- current field size >= 12
- current class 3-win or higher
- 2025: 403 races / 6,095 runners
- 2026: 297 races / 4,528 runners
- pooled: 700 races / 10,623 runners

Ability history is strictly prior high-class flat history, maximum five starts. M3 remains a separate layer. Structural horse definition is unchanged:

`M3 rank <= 3 AND Ability rank <= 3`

No current odds/popularity, result, ticket payout, M3 score, or current scenario was used to train Ability.

## 2. Ability v2 exact Elo reconstruction

The existing frozen v2 specification was independently reconstructed from the uploaded historical results:
- initial Elo 1500
- K = 512
- pairwise scale = 400
- Elo standardized by frozen 2024 mean/sd
- `v2_logit = v1_logit + 0.4062284404659212 * elo_z`

The local reconstruction closely reproduced the stored v2 validation.

Pooled 2025–2026 local reconstruction:

| Model | AUC | Log Loss | Brier |
|---|---:|---:|---:|
| Ability v1 | 0.68526 | 0.46337 | 0.14759 |
| Ability v2 | 0.68888 | 0.46118 | 0.14680 |

Ability #1 Top3 rate:
- v1: 42.29%
- v2: 43.86%

The stored formal validation remains the source of truth for v2 probability performance; this local reconstruction is a consistency check.

## 3. v2 × current corrected-M3 paired diagnostic

M3 was reconstructed with the current corner-position rule: corner rank `0` is missing; only ranks >=1 are valid. Both Ability candidates were compared against the **same** reconstructed M3 ranks.

### Pooled point estimates

| Diagnostic | v1 | v2 |
|---|---:|---:|
| Structural horses | 812 | 755 |
| Structural Top3 | 42.24% | 43.97% |
| Structural win | 15.89% | 16.16% |
| Production-style single routes | 136 | 132 |
| Single-axis Top3 | 47.06% | 46.21% |
| Single-axis win | 22.06% | 19.70% |
| Pair Survival passes | 50 | 50 |
| Both pair horses Top3 | 30.00% | 34.00% |

### Year check

2025:
- structural Top3: 40.55% -> 41.96%
- single-axis Top3: 42.86% -> 42.31%
- Pair both Top3: 29.03% -> 32.26%

2026:
- structural Top3: 44.57% -> 46.91%
- single-axis Top3: 52.54% -> 51.85%
- Pair both Top3: 31.58% -> 36.84%

### Race-cluster bootstrap, 5,000 resamples

Differences are v2 minus v1.

| Metric | Point delta | 95% diagnostic interval |
|---|---:|---:|
| Structural Top3 | +1.73 pt | -0.04 to +3.50 pt |
| Structural win | +0.27 pt | -0.75 to +1.28 pt |
| Single-axis Top3 | -0.85 pt | -8.19 to +6.47 pt |
| Single-axis win | -2.36 pt | -7.54 to +2.84 pt |
| Pair both Top3 | +4.00 pt | -5.43 to +13.56 pt |

Opportunity-count differences:
- structural horses: -57, bootstrap interval -83 to -32
- single routes: -4, interval -24 to +16
- Pair Survival passes: 0, interval -9 to +9

Interpretation: unlike rejected Candidate B, v2 does **not** show a clear collapse in M3 complementarity in this paired reconstruction. The structural-horse Top3 point estimate is higher, while the single-axis point estimate is slightly lower and uncertain. Pair Survival is higher as a point estimate but very imprecise.

### Important reconstruction caveat

This corrected-M3 local reconstruction does **not** reproduce the older frozen structural baseline count (914 structural horses); it produces 812 for v1. Therefore these absolute counts must not silently replace the older baseline and must not yet be used as the official ticket backtest population. The paired v1-v2 comparison is still informative because both candidates use the identical M3 reconstruction, but an exact production-runtime replay is required before automatic-ticket rebaselining.

## 4. Why v2 is still not a full Ability replacement

Although v2 improves probability metrics and does not show Candidate-B-style M3 complementarity failure, it is built on the original v1 linear predictor. Therefore the original semantic pathologies remain inside the base score, including direct coefficients whose signs are counter-intuitive for an Ability interpretation.

The Kikuka Sho diagnostic is illustrative but is **not** an acceptance test: v2 moves Robchen above the sparse-history horse, but this occurs through Elo compensation rather than removal of the contradictory base coefficients.

Decision:
- v1: keep stable production baseline for now
- v2: keep frozen parallel / Shadow candidate
- full replacement now: **NO**
- ticket logic switch to v2: **NO**
- 2027 remains the clean promotion holdout

## 5. Candidate C — pre-specified semantic repair

One hypothesis-driven semantic repair was tested without using 2025–2026 to choose its formula.

Definition:
- keep the frozen v1 standardization
- set direct `hist_n` contribution to zero
- set v1 contributions with directionally contradictory signs to zero
- retain only v1 contributions whose direction is semantically valid
- add the already-frozen v2 Elo term with beta = 0.4062284404659212
- no sparse-history ability bonus/penalty; history count is reliability metadata only

Zeroed v1 direct contributions:
- `hist_n`
- `best5_finish_pct`
- `win_rate5`
- `mean_class5`
- `last1_class`
- `last1_margin`

No 2025–2026 retuning was performed after defining the formula.

### Candidate C pooled diagnostic

| Model | AUC | Log Loss | Brier | ECE10 | calibration slope |
|---|---:|---:|---:|---:|---:|
| v1 | 0.68509 | 0.46342 | 0.14761 | 1.14% | 1.178 |
| v2 | 0.68870 | 0.46123 | 0.14683 | 0.93% | 0.904 |
| Candidate C | 0.68886 | 0.46259 | 0.14693 | 1.82% | 0.818 |

Candidate C Ability #1:
- Top3 rate: 46.0%
- win rate: 20.0%

Candidate C ranks the Kikuka Sho example more naturally (Robchen #1, Audacia #2, Sea to Summit #3), but that example was **not** used as validation evidence.

### Candidate C decision

**REJECT AS CURRENT PRODUCTION SUCCESSOR.**

Reason: discrimination and point-ranking improve, but calibration becomes materially more overconfident (slope about 0.82 and ECE about 1.82%). After opening 2025–2026, it would be invalid to tune a calibration correction on those same years to rescue the candidate. Record the failure and do not post-hoc repair it.

## 6. Next action

1. Keep v1 production and v2 parallel.
2. Do not tune Candidate C using 2025–2026.
3. Reproduce the corrected M3 runtime exactly enough to establish a new official production baseline.
4. Re-run the existing Wide / Quinella / Trio automatic-ticket policies from the new baseline before trusting old ROI figures.
5. Preserve any next Ability family as a genuinely frozen prospective Shadow candidate; 2027 remains decisive for full promotion.
