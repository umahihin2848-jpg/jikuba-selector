# Ability v1 — low-history rank warning validation (2026-10-17)

## Question
When an Ability v1 top-ranked horse has only 0–2 prior starts at 3-win class or higher, should production **penalize its Ability score/rank**, or should it **keep the frozen rank and show a history-amount warning only**?

This was prompted by a live case where ミトノオルフェ ranked Ability v1 #1 with only one qualifying prior high-class start.

## Frozen model scope
The deployed Ability v1 model is market-independent and uses up to five strictly-prior 3-win-or-higher starts. Its frozen feature set already contains `hist_n`; therefore an extra low-history penalty would be a new post-model correction and requires separate forward validation.

Committed Ability v1 OOS reference:
- 2025: 403 races / 6,095 runners
- 2026: 297 races / 4,528 runners
- pooled: 700 races / 10,623 runners

## Reconstruction protocol
The exact 2025–26 target-race universe was rebuilt from the TARGET result exports using:
- JRA flat only, identified via TARGET/JV track code `< 50`
- 3-win class or higher (`67, 115, 131, 163, 179, 195`)
- declared field size `>=12`

This reproduces the exact committed OOS denominator: 403 races / 6,095 runners in 2025 and 297 / 4,528 in 2026.

Strictly-prior high-class histories were reconstructed from the available `umadete.csv` export and the frozen Ability v1 coefficients. This history export is not the original canonical row-level training matrix, so the resulting predictions are a **close reconstruction, not an exact replay**. For example, reconstructed log loss was 0.464827 in 2025 and 0.463456 in 2026 versus the committed 0.464462 and 0.462090. Therefore this test is suitable for deciding whether a large ad-hoc history penalty is justified, but should not be presented as an exact replacement validation artifact.

## Ability #1 performance by available high-class history
Pooled 2025–26 reconstructed Ability #1 horses:

| Prior 3-win+ history | n | Top-3 rate | Win rate |
|---|---:|---:|---:|
| 0 | 23 | 60.9% | 47.8% |
| 1 | 153 | 41.8% | 18.3% |
| 2 | 104 | 34.6% | 20.2% |
| 3 | 86 | 41.9% | 15.1% |
| 4 | 59 | 62.7% | 33.9% |
| 5 | 275 | 41.5% | 16.4% |

For the planned warning boundary:
- history 1–2: n=257, Top-3 38.9%, Win 19.1%
- history 3–5: n=420, Top-3 44.5%, Win 18.6%

Two-sided Fisher exact tests:
- Top-3: p=0.173
- Win: p=0.919

The 1–2 run group is directionally lower on Top-3 but **not statistically separated** from 3+ histories in this sample, and its win rate is essentially the same. In particular, a one-run Ability #1 is not empirically a failed category: 153 cases produced 41.8% Top-3 and 18.3% wins.

## Forward penalty test
A simple score penalty was allowed only for `hist_n=1` and `hist_n=2`. Penalty size was selected on 2025 using runner-level AUC, then evaluated once on 2026.

2025 selection preferred:
- `hist_n=1`: **0 penalty**
- `hist_n=2`: subtract 0.20 logit

So the development year itself did **not** support penalizing one-run horses such as the triggering case.

### 2026 final evaluation

| Metric | Frozen Ability rank | + selected low-history penalty |
|---|---:|---:|
| Log loss | **0.463456** | 0.463918 |
| Brier | **0.147294** | 0.147430 |
| AUC | **0.679460** | 0.677722 |
| Ability #1 Top-3 | 40.4% | **41.4%** |
| Ability #1 Win | **18.5%** | 18.2% |
| Ability Top-3-set hit rate | 38.16% | **38.83%** |

The penalty improved some discrete rank-capture summaries but worsened all three runner-level probability/ranking metrics and slightly reduced #1 win rate. The 2026 log-loss delta was `+0.000462` (positive = worse); race-bootstrap 95% CI was approximately `[-0.000177, +0.001129]`, crossing zero.

This is mixed, non-replicated evidence, not a deployable correction.

## Decision
**Do not change Ability v1 rank or probability for low-history horses.**

Production policy:
1. Keep the frozen Ability v1/v2 calculations unchanged.
2. For Ability leaders with 0–2 qualifying 3-win+ histories, show a prominent **history-amount warning**.
3. Wording should describe **data amount**, not claim proven low predictive reliability.
4. Do not label a one-run Ability leader as false or automatically downgrade it.
5. A future rank/probability correction requires a newly frozen development rule and untouched forward holdout.

Recommended UI examples:
- `⚠ 3勝+履歴なし｜順位は参考`
- `⚠ 3勝+履歴1走｜履歴量が少ない`
- `△ 3勝+履歴2走｜履歴量が少ない`

The UI should also say `順位補正なし` so users do not assume the warning changed the model score.

## Important interpretation
Ability v1 is a latent historical result-strength estimate, not a direct statement that the displayed #1 horse is the most likely winner. Low history increases uncertainty about how much evidence lies behind the displayed estimate, but the current OOS reconstruction does not support mechanically pushing those horses down the ranking.