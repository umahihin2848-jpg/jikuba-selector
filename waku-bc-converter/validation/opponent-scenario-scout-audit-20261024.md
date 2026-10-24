# Opponent Scenario Scout Audit — 2026-10-24

## Question
Should manual-bet mode add at most one extra opponent outside the Ability-ranked core when the horse satisfies:

- Ability rank >= 4
- M3 rank <= 3
- predicted main-scenario M4 rank <= 3

The proposed extra horse is called the **scenario scout** below.

## Protocol
- Universe: same eligible-axis sample used by `opponent_rank_audit_v1`.
- JRA flat, field size >=12, 3-win class or higher.
- 2025 and 2026 complete result races from the uploaded TARGET exports.
- Eligible-axis sample: 141 races total (2025: 89, 2026: 52).
- Axis eligibility is unchanged from the prior opponent-rank audit.
- Ability v1, M3 core and M4 scenario ranks were reconstructed from strictly prior histories using the deployed frozen model parameters.
- The predicted main RPCI scenario was reconstructed with deployed `rpci_browser_model_v2` and course geometry; realized target-race pace was not used.
- If multiple scenario-scout horses existed, exactly one was selected deterministically by: main-scenario rank, then M3 rank, then Ability rank, then horse number.
- Final popularity is not used to order or select the scenario scout.

## Broad rule result
Rule: **Ability >=4 x M3 Top3 x predicted-main M4 Top3**.

| Year | Eligible axis races | Scout opportunities | Scout Top3 hits | Scout Top3 rate |
|---|---:|---:|---:|---:|
| 2025 | 89 | 80 | 9 | 11.25% |
| 2026 | 52 | 50 | 1 | 2.00% |
| Pooled | 141 | 130 | 10 | 7.69% |

The rule fires in 130/141 races (92.2%), so it is not selective enough for an additional betting opponent.

## Incremental capture vs Ability core
Conditional on the axis surviving the relevant ticket condition:

### Quinella — Ability Top2 core
| Year | Axis Top2 n | Ability Top2 | Ability Top2 + scout | Incremental rescues |
|---|---:|---:|---:|---:|
| 2025 | 44 | 79.55% | 88.64% | 4 |
| 2026 | 28 | 89.29% | 92.86% | 1 |
| Pooled | 72 | 83.33% | 90.28% | 5 |

The extra scout adds 6.94 percentage points pooled, but requires carrying an extra opponent in almost every race. Its own Top3 rate is only 7.69%, with severe year instability.

### Wide — Ability Top2 core
| Year | Axis Top3 n | Ability Top2 | Ability Top2 + scout | Incremental rescues |
|---|---:|---:|---:|---:|
| 2025 | 54 | 98.15% | 98.15% | 0 |
| 2026 | 33 | 96.97% | 96.97% | 0 |
| Pooled | 87 | 97.70% | 97.70% | 0 |

There is no observed incremental Wide capture from the scenario scout.

### Trio — Ability Top3 primary pool
| Year | Axis Top3 n | Ability Top3 captures both other Top3 | Ability Top3 + scout | Incremental rescues |
|---|---:|---:|---:|---:|
| 2025 | 54 | 68.52% | 77.78% | 5 |
| 2026 | 33 | 75.76% | 78.79% | 1 |
| Pooled | 87 | 71.26% | 78.16% | 6 |

The gain is modest relative to adding a fourth opponent candidate in almost every race, and it weakened sharply in 2026.

## Simple stricter filters (exploratory only)
These were checked only as diagnostics and were not used to select a production rule.

| Filter | Pooled opportunities | Scout Top3 rate | Quinella rescues |
|---|---:|---:|---:|
| M3 Top2 x main Top2 | 113 | 7.08% | 5 |
| M3 #1 x main Top2 | 67 | 7.46% | 3 |
| M3 Top2 x main #1 | 63 | 6.35% | 3 |
| Ability 4-6 x M3 Top3 x main Top3 | 15 | 6.67% | 0 |
| Ability 4-8 x M3 Top2 x main Top2 | 14 | 0.00% | 0 |

No simple narrowing produced a stable high-value rescue profile.

## Decision
**REJECT_AS_BETTING_OPPONENT_EXPANSION**

- Keep opponent ordering **Ability-primary**.
- Keep Ability ranks 1-2 as CORE and rank 3 as BACKUP.
- Do **not** add an automatic fourth betting opponent solely because it is Ability>=4 x M3 Top3 x predicted-main Top3.
- M3/main-scenario/P10 remain valuable as explanatory traits and warnings.
- If desired, show such a horse only as a non-betting informational label such as `展開浮上注目`, without promoting it into the ticket pool.

## Caveats
- This audit evaluates capture, not ROI of the added horse. Because the scout fires in 92.2% of eligible races, the point-cost burden is already large before price is considered.
- The 2026 Top3 rate (2.0%) is materially weaker than 2025 (11.25%), so the broad rule fails year-stability.
- Any future expansion should start as a separately frozen Shadow rule and should require a new predeclared feature or price condition rather than post-hoc threshold tuning.
