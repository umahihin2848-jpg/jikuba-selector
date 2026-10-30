# Market-free Ability + M3 pair probability audit — 2026-10-30

## Purpose
Test the proposed market-independent pair-probability path before any EV deployment:

`Ability + M3 -> horse Top2 / Top3 probability -> coherent quinella / wide pair probability -> market price later`

The key question is whether M3 adds reproducible pair-probability information beyond the already validated market-free Ability model.

## Data / universe
- Source: retained TARGET result/history exports used by the project (`umade.csv`).
- JRA flat only.
- Field size >= 12.
- 3-win class or higher.
- Complete race rows only.
- Local reconstructed cohorts:
  - 2024: 370 races / 5,615 runners.
  - 2025: 372 races / 5,637 runners.
  - 2026: 272 races / 4,170 runners.
- Pair evaluation excludes races without unique 1st/2nd/3rd finishers:
  - 2025 pair cohort: 365 races.
  - 2026 pair cohort: 268 races.

## Inputs
### Ability
Frozen `Ability v1` raw logit reconstructed from strictly prior 3-win+ starts. Ability is market-independent by design and excludes odds/popularity, PCI/RPCI, current running position, current scenario and M3.

### M3
M3 was reconstructed from the frozen `finish600_model_v1` + `m3_top3_probability_v1` definitions using strictly prior history. The local reconstruction is close to the committed canonical M3 OOS metrics but is not byte-identical to the original validation matrix, so this audit is diagnostic / Research Shadow evidence rather than a new pristine production holdout.

## Horse-probability construction
Separate models were fit for Top2 and Top3. No market feature was used.

Compared:
1. Ability only: `Ability raw logit`.
2. M3 only: `M3 calibrated raw logit`.
3. Ability + M3: both logits.

For each walk-forward fit:
- L2 logistic regression.
- `C` selected only in the fit year by 5-fold GroupKFold by race from `[0.03, 0.1, 0.3, 1, 3]`.
- After prediction, a common within-race logit shift enforces:
  - sum Top2 probability = 2.0,
  - sum Top3 probability = 3.0.

Walk-forward checks:
- fit/select on 2024 -> evaluate 2025.
- fit/select on 2025 -> evaluate 2026.

## Pair construction
No popularity, odds or market pair prior is used.

Starting from a neutral/uniform off-diagonal pair prior, symmetric iterative proportional fitting (raking) enforces the horse marginals:
- Quinella: horse pair-degree = Top2 probability; total unordered pair mass = 1.0.
- Wide: horse pair-degree = `2 x Top3 probability`; total unordered pair mass = 3.0.

The factor 2 for wide follows from each horse in the finishing Top3 belonging to two of the three winning unordered wide pairs.

## Horse-level walk-forward result
### 2024 fit -> 2025 evaluation
| Target | Ability LL | M3 LL | Ability+M3 LL | Combined - Ability |
|---|---:|---:|---:|---:|
| Top2 | 0.364414 | 0.379058 | 0.364327 | -0.000087 |
| Top3 | 0.462419 | 0.481325 | 0.462047 | -0.000371 |

M3 adds a very small positive point estimate in 2025.

### 2025 fit -> 2026 evaluation
| Target | Ability LL | M3 LL | Ability+M3 LL | Combined - Ability |
|---|---:|---:|---:|---:|
| Top2 | **0.365487** | 0.379374 | 0.365961 | **+0.000474** |
| Top3 | **0.461908** | 0.479956 | 0.462045 | **+0.000136** |

The direction reverses in 2026. Ability alone is better on both targets.

## Pair-level walk-forward result
### 2025 evaluation
| Bet | Ability LL | M3 LL | Ability+M3 LL | Combined - Ability |
|---|---:|---:|---:|---:|
| Quinella | **0.048771** | 0.050712 | 0.048791 | +0.000020 |
| Wide | 0.117327 | 0.121895 | **0.117260** | -0.000067 |

Race-bootstrap 95% CI for Ability+M3 minus Ability pair Log Loss:
- Quinella: `[-0.000158, +0.000178]`.
- Wide: `[-0.000439, +0.000246]`.

Neither excludes zero.

### 2026 evaluation
| Bet | Ability LL | M3 LL | Ability+M3 LL | Combined - Ability |
|---|---:|---:|---:|---:|
| Quinella | **0.048158** | 0.049966 | 0.048207 | +0.000049 |
| Wide | **0.115676** | 0.120095 | 0.115691 | +0.000015 |

2026 race-bootstrap 95% CI for Ability+M3 minus Ability pair Log Loss:
- Quinella: `[-0.000115, +0.000211]`.
- Wide: `[-0.000369, +0.000407]`.

Again, neither excludes zero and both point estimates are slightly worse with M3.

## Ability-only market-free pair sanity check
On the same 2026 diagnostic pair cohort:

| Bet | Uniform pair LL | Ability-only pair LL | Direction |
|---|---:|---:|---|
| Quinella | 0.051112 | **0.048158** | Ability better |
| Wide | 0.123420 | **0.115676** | Ability better |

Ability therefore contains useful market-independent ordering information for coherent pair probabilities. This does **not** establish a positive betting EV.

## Additional M3 pair-shape check
A secondary check used Ability horse marginals but an M3-derived Plackett-Luce pair shape before raking. It produced essentially no pair Log Loss improvement relative to the neutral-prior Ability construction. Therefore M3 is not promoted as a pair-dependence layer either.

## Relation to prior EV evidence
The project has already tested a market-independent Ability Plackett-Luce probability multiplied by historical closing pair odds. The apparent edge reversed by year (2025 negative, 2026 positive), with wide uncertainty. Therefore market independence + calibration is not enough to justify `p x odds` as a production BUY rule.

Also, prior market-residual tests found that adding Ability/M3 after the closing market produced essentially zero reproducible incremental gain for wide/quinella.

## Decision
### Reject for Production
- Do not deploy `Ability + M3` as the market-free pair probability.
- Do not connect `Ability + M3 pair probability x odds` to BUY/PASS.
- Do not tune an EV threshold on 2025/2026 after seeing these results.

### Keep
- Ability-only coherent pair probability is statistically valid as a **market-independent structural reference**.
- M3 remains an independent scenario / race-flow layer and should not be forced into pair probability when it does not add stable OOS information.
- Existing market-derived pair probability remains a separate reference layer.

### Forward policy
Freeze this result. If a market-independent EV path is revisited, the next valid evidence should come from genuinely forward purchase-time odds (for example T-15 snapshots) and future race outcomes. A 2027 forward sample can test whether Ability-only structural probability has conditional value versus the live pair market without retuning 2025/2026 thresholds.

## Status
**Ability+M3 market-free pair enhancement: REJECTED.**

**Ability-only market-free coherent pair probability: VALID AS STRUCTURAL REFERENCE, NOT VALIDATED AS BETTING EV.**
