# Race Scenario Analyzer V3 — component OOS audit (2026-10-15)

## Purpose
Audit the current market-independent structural chain used by `v3.html`: first-corner queue -> remaining-600 position -> M3 structural ranking/probability -> validated M3 probability corrections.

This report separates **validated structural information** from **market/value information**. No odds, popularity or payout is promoted into Ability/M3/queue/remaining-600 by this audit.

## Important protocol note: frozen OOS vs rolling refit
The production validation artifacts do **not** use a rolling annual refit.

- Queue: fit on 2019-2023, then evaluated on 2024, 2025 and 2026.
- Remaining-600: fit on 2019-2023, then evaluated on 2024, 2025 and 2026.
- Finish600/M3 core: fit on 2019-2023, 2024 used for model selection, 2025 confirmation, 2026 final OOS.
- M3 top-3 calibration and later probability corrections: developed on 2024, 2025 confirmation, 2026 final OOS.

This is a **frozen-model forward test**, not `2019-23 -> 2024`, `2019-24 -> 2025`, `2019-25 -> 2026` rolling retraining.

An exact rolling refit is not currently reproducible from committed artifacts because the original row-level training matrices / derivation scripts for these three components are not committed. The available TARGET history export also does not provide a complete canonical reconstruction of every historical training runner's lower-class prior history for 2019-2023. Therefore this report does not fabricate an approximate rolling result and label it exact.

The frozen test is still a strong stability test: later years are evaluated without adapting the model to them.

## Universe integrity
The exact M3 validation universe for 2024-2026 is JRA flat, 3-win class or higher, field size >=12. The earlier apparent denominator of 1,152 races contained 52 obstacle races. After excluding them, the exact flat universe is:

| Year | Flat eligible races |
|---|---:|
| 2024 | 400 |
| 2025 | 403 |
| 2026 | 297 |
| Total | 1,100 |

No flat race was lost from this M3 universe because of PCI/RPCI/-3F missingness.

Component validation denominators can differ because queue and remaining-600 have their own feature-availability/universe rules. Do not compare their `n_races` directly with the 1,100 M3 denominator.

## 1. First-corner queue — PASS
Current deployable model predicts continuous first-corner front/back position. Lower MAE is better.

| Year | History-only MAE | Scenario MAE | Delta | Race-bootstrap 95% CI |
|---|---:|---:|---:|---:|
| 2024 | 0.202612 | **0.198058** | -0.004104 | [-0.005655, -0.002557] |
| 2025 | 0.203997 | **0.199257** | -0.004106 | [-0.005567, -0.002598] |
| 2026 | 0.203003 | **0.197369** | -0.006242 | [-0.007881, -0.004616] |

All three intervals are below zero. Gate, first-turn distance and surrounding front pressure add reproducible first-corner positioning information beyond horse history alone.

**Deployment decision:** keep queue in the race map / scenario narrative. Do not interpret inside/middle/outside lateral lane as validated path prediction; the historical source does not contain measured rail/path width.

### Race-shape information from queue
Adding pre-race queue features to condition-only RPCI classification also improves log loss directionally:

| Evaluation | Conditions only | + Queue |
|---|---:|---:|
| 2023-2024 | 0.97509 | **0.96621** |
| 2025 | 1.01709 | **1.00945** |
| 2026 | 0.95123 | **0.93651** |

The 2026 structural split is also coherent: both-high pressure races had mean RPCI 47.88 vs 52.95 for both-low, with Welch p≈1.1e-8. This supports queue/pressure as race-shape information, not as a betting-edge claim.

## 2. Remaining-600 position — PASS
Current production code loads `scenario_component_validation_v2.json` and uses the four-input Ridge model: prior -3F gap median, prior frontness, field size and gate fraction. It explicitly does not alter win/top3 probability.

| Year | History-median MAE | Model MAE | Delta | Race-bootstrap 95% CI |
|---|---:|---:|---:|---:|
| 2024 | 0.419741 | **0.394520** | -0.025477 | [-0.032092, -0.019004] |
| 2025 | 0.416134 | **0.391118** | -0.027116 | [-0.033845, -0.020419] |
| 2026 | 0.414538 | **0.390147** | -0.026067 | [-0.036676, -0.016249] |

The gain is stable and statistically separated from zero in every OOS year.

**Deployment decision:** keep as structural position information. Do not create a fixed `0.2-0.8 sec = buy` rule, lateral-lane claim, or direct probability correction from this result.

## 3. M3 structural top-3 probability — PASS, with scope limits
The calibrated probability layer is market-independent. 2024 is development GroupKFold; 2025 and 2026 are untouched forward OOS years.

| Evaluation | M3 calibrated log loss | Rank-only log loss | Delta vs rank-only | 95% CI |
|---|---:|---:|---:|---:|
| 2024 5-fold GroupKFold | 0.480206 | — | — | — |
| 2025 OOS | **0.482833** | 0.485817 | -0.003163 | [-0.005096, -0.001114] |
| 2026 final OOS | **0.481173** | 0.485765 | -0.004665 | [-0.006589, -0.002740] |

Pooled 2025-2026: log loss 0.482126, Brier 0.153766, AUC 0.622918, ECE10 0.00720. The probability is race-coherent by projecting each race to a total top-3 probability of exactly 3.0.

**Deployment decision:** M3 is supported as a structural ranking/probability layer. It is not a market-value probability and must not be averaged with market probability without separate OOS validation.

## 4. M3 history-amount correction — PASS
Developed on 2024; forward OOS improvement repeats in both later years.

| Year | Base log loss | Corrected | Delta | Race-bootstrap 95% CI |
|---|---:|---:|---:|---:|
| 2024 OOF | 0.479620 | **0.477491** | -0.002129 | — |
| 2025 OOS | 0.482833 | **0.481234** | -0.001600 | [-0.002763, -0.000460] |
| 2026 OOS | 0.481173 | **0.478805** | -0.002368 | [-0.003750, -0.001049] |

Production guard is appropriate: apply only when the upload demonstrates more than five strictly prior starts for at least one runner; otherwise fall back to base M3 calibration.

A 2026 G3 subgroup worsened after this correction, but that finding is post-hoc. Keep monitoring; do not introduce a G3 exception without a new future holdout.

## 5. M3 front-position correction — PASS
This correction operates on top of the history-amount-corrected M3 probability and does **not** change M3 rank.

| Year | Baseline log loss | Corrected | Delta | Race-bootstrap 95% CI |
|---|---:|---:|---:|---:|
| 2025 OOS | 0.481239 | **0.477532** | -0.003707 | [-0.006151, -0.001288] |
| 2026 final OOS | 0.478811 | **0.475620** | -0.003191 | [-0.006010, -0.000388] |

The effect repeats in both untouched years. The runtime guard that requires the validated history-amount baseline and matching Finish600 inputs should remain.

**Deployment decision:** keep the correction for structural top3 probability only. Do not call it an escape/lead-rate correction, and do not treat it as a value/betting signal.

## 6. What remains rejected / descriptive
- **Lateral lane/path (inner-middle-outer): descriptive only.** No measured path-width truth exists in the source.
- **Generic pace forecast as exact pace number: reference only.** Earlier race-bootstrap CIs for pace MAE improvement crossed zero.
- **Pace-mismatch horse probability correction: reject.** It slightly improved 2025 but worsened 2026; 2026 delta log loss was +0.000619 with CI [0.000027, 0.001216].
- **Scenario-conditioned/oracle corrections:** do not deploy as live probability corrections when they require realized pace information.
- **Market blending / buy rule / ROI claim:** not established by these component validations.

## Overall verdict
**Current structural chain passes the forward-stability audit for its intended roles.**

- Queue: validated for first-corner front/back refinement.
- Remaining-600: validated for continuous predicted gap / relative position.
- M3: validated as market-independent structural ranking/top3 probability.
- M3 history amount and prior front-position corrections: validated incremental probability corrections under their runtime guards.
- Pace/lane/value claims remain deliberately weaker or rejected where OOS evidence does not support promotion.

The current production policy — structure first, market last — should remain unchanged.

## Exact rolling-refit requirement for the next audit
To produce a true annual rolling refit rather than the current frozen-forward test, archive one canonical row-level training table (or deterministic builder) containing every eligible target runner and all strictly prior history needed to recreate queue, remaining-600 and Finish600 features. Then run:

- train <=2023 -> test 2024
- train <=2024 -> test 2025
- train <=2025 -> test 2026

The same universe, preprocessing, feature definitions, hyperparameters and race-level bootstrap must be frozen before looking at the later-year result.
