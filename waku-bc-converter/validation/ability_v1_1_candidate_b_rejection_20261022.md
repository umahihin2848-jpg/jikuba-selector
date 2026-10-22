# Ability v1.1 candidate B — structural validation and rejection

Date: 2026-10-22

## Status

**REJECT FOR PRODUCTION.**

Candidate B fixed the semantic pathology seen in Ability v1 (sparse-history horses could rank too high and `win_rate5` / `hist_n` had counter-intuitive negative coefficients), and improved standalone Ability discrimination. However, when combined with the frozen M3 Top3 intersection used by the production structural selector, downstream complementarity worsened materially. It must not replace Ability v1 in production.

The production app remains on the existing Ability v1 until a successor passes both standalone and downstream structural validation.

## Candidate B design

- Removed `hist_n` from direct ability scoring.
- Sign constraints:
  - finish/top3/win/class/trend/achievement coefficients >= 0
  - margin coefficients <= 0
- Sparse-history shrinkage: `w = n / (n + 2)` and `logit = intercept + w * linear`.
- Added explicit historical achievement candidates (`g1_win_count5`, `g1_top3_count5`, `graded_win_count5`, `elite_top3_count5`) with coefficients learned from development data; no manual G1 bonus.
- Model selection was performed on 2024 only.

Frozen research artifact: `data/ability_model_v1_1_candidate.json`.

## Standalone Ability OOS

| Year | Model | AUC | Log Loss | Brier | Ability #1 Top3 | Ability #1 Win |
|---|---|---:|---:|---:|---:|---:|
| 2025 | v1 | 0.685871 | 0.464462 | 0.148221 | — | — |
| 2025 | candidate B | **0.691515** | **0.462852** | **0.147742** | 40.94% | 16.63% |
| 2026 | v1 | 0.683768 | **0.462090** | **0.146807** | — | — |
| 2026 | candidate B | **0.686167** | 0.462287 | 0.147061 | 44.11% | 22.56% |

Candidate B improved AUC in both unknown years and strongly reduced sparse-history horses becoming Ability #1. The tiny 2026 Log Loss/Brier deterioration is noted.

## Semantic sanity check: 2026 Kikuka Sho input

Candidate B ranks the supplied Kikuka Sho field approximately as:

1. Robuchen — history n=5; three G1 wins in the last-five high-class history
2. Audacia
3. Ask Edinbara
4. Going to Sky
5. Justin Chicago
6. Sea to Summit — high-class history n=1

This removes the old-v1 failure where a one-run G2 third-place history could rank above an established multiple-G1 winner.

## Downstream structural validation

Structural horse = `M3 rank <= 3 AND Ability rank <= 3`.

The comparison below used the corrected M3 reconstruction described in the separate corner-zero audit. It is a route/structure diagnostic; it is not yet a full historical replay of every production market-price gate.

### 2025

| Metric | Ability v1 | Candidate B |
|---|---:|---:|
| Structural horses | 530 | 564 |
| Structural horse Top3 rate | **40.38%** | 40.07% |
| Structural horse win rate | **16.04%** | 14.36% |
| Production-style single routes | 91 | 86 |
| Single-axis Top3 rate | **45.05%** | 41.86% |
| Pair Survival passes | 49 | 49 |
| Both structural horses Top3 | **18.37%** | 12.24% |

### 2026

| Metric | Ability v1 | Candidate B |
|---|---:|---:|
| Structural horses | 384 | 394 |
| Structural horse Top3 rate | **41.93%** | 41.12% |
| Structural horse win rate | **15.89%** | 15.48% |
| Production-style single routes | 50 | 65 |
| Single-axis Top3 rate | **48.00%** | 43.08% |
| Pair Survival passes | 29 | 25 |
| Both structural horses Top3 | **31.03%** | 16.00% |

### Pooled 2025–2026

| Metric | Ability v1 | Candidate B |
|---|---:|---:|
| Structural horses | 914 | 958 |
| Structural horse Top3 rate | **41.03%** | 40.50% |
| Structural horse win rate | **15.97%** | 14.82% |
| Production-style single routes | 141 | 151 |
| Single-axis Top3 rate | **46.10%** | 42.38% |
| Pair Survival passes | 78 | 74 |
| Both structural horses Top3 | **23.08%** | 13.51% |

## Decision

Candidate B is rejected despite better standalone Ability AUC because the production system does not use Ability in isolation. It uses Ability as an independent view that must complement M3. Candidate B increased overlap without improving the quality of that overlap and substantially weakened the two-horse simultaneous-survival signal.

A successor Ability model must therefore satisfy **both**:

1. Semantic validity / standalone prediction quality.
2. Complementarity with M3 and preservation or improvement of structural-route outcomes.

Do not tune ticket thresholds to rescue Candidate B.

## Validation policy going forward

- Fix upstream feature-semantics mismatches before further ticket backtests.
- Fit/select Ability candidates on development data without looking at ticket ROI.
- Evaluate `M3 Top3 × Ability Top3`, single-axis route and Pair Survival before any price/ROI layer.
- Only after the structural layer is frozen should Wide / Quinella / Trio be re-backtested from scratch.
- Because 2025–2026 have now been inspected during candidate development, future live Forward data is the strongest final confirmation set.
