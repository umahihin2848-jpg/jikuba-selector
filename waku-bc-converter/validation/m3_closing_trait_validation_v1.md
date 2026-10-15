# M3 horse-specific closing trait validation v1

Created: 2026-10-16

## Purpose

Create a display-only horse characteristic that does **not** imply physiological stamina or basal fitness.

Label: `末脚特性`

Definition: a horse-specific long-run tendency for

`realized Remaining600->finish closing strength - production M3 predicted closing strength`

after partial adjustment for the trainer's average residual tendency.

Positive values mean the horse has historically closed better than M3 expected; negative values mean worse than M3 expected.

## Replay source and scope

Source: TARGET history export `umadete.csv`.

Approximate replay universe after JRA / flat / field>=12 / 3-win+ / valid finish-3F filtering:

- 2024: 397 races / 6,009 runner-events
- 2025: 403 races / 6,094 runner-events
- 2026: 296 races / 4,515 runner-events

The export does not reproduce the canonical production denominator exactly (400 / 403 / 297), so this is a trait-specific diagnostic rather than a replacement for the canonical M3 audit.

Production M3 closing was replayed from strictly prior race history with the committed `finish600_model_v1` formula.

## Hierarchical shrinkage

For each target race only information available before that race was used.

1. Trainer prior residual mean is shrunk toward the global prior mean.
2. Horse prior residual mean is compared with that trainer baseline.
3. Horse-specific deviation is shrunk toward zero.

2024 development selected conservative shrinkage constants:

- trainer k = 100
- horse k = 12

At least 3 prior eligible residual observations are required for an A/B/C display.

This is intentionally strong shrinkage so one or two unusual performances cannot create a strong trait label.

## Display bands

The cut points were fixed from the 2024 development distribution, not optimized on 2025/2026 results.

- A: horse-specific residual >= +0.09 sec
- B: -0.05 sec < residual < +0.09 sec
- C: residual <= -0.05 sec
- `—`: fewer than 3 usable prior observations / no frozen classification

Interpretation:

- A = M3 predictionを継続的に上回る側
- B = approximately neutral
- C = M3 predictionを継続的に下回る側

These are not stamina grades and are not direct probability estimates.

## Later-year stability check

Mean realized M3 closing residual by frozen trait band:

| Year | A | B | C |
|---|---:|---:|---:|
| 2025 | +0.122 sec | -0.029 sec | -0.173 sec |
| 2026 | +0.092 sec | -0.043 sec | -0.127 sec |

A-minus-C race-cluster bootstrap:

- 2025: +0.296 sec, 95% CI +0.213 to +0.376
- 2026: +0.220 sec, 95% CI +0.128 to +0.314

The ordering A > B > C repeats in both later years.

Because 2025/2026 have already been inspected elsewhere in this project, treat these as retrospective stability checks rather than pristine untouched OOS evidence.

## Deployment policy

- DISPLAY ONLY.
- Do not change M3 rank.
- Do not change calibrated top-3 probability.
- Do not change betting rules.
- Use the label `末脚特性`, not `基礎体力`, `スタミナ`, or `持続力`.
- Explain it as an M3-relative horse-specific closing tendency.

A live snapshot built from results through 2026-10-04 may be shown only for target dates after 2026-10-04. For earlier race dates it must be hidden to prevent future-information leakage.

The first runtime snapshot is limited to horses with at least one recorded race since 2025-01-01 so the browser payload remains small; older/inactive horses fall back to `—` until the snapshot is refreshed.

## Hill / current fitness note

A simple horse-relative composite of recent hill count, active hill days and days since last hill session did not show a stable directional relationship with the M3 closing residual across 2024-2026 in this follow-up.

Therefore `今回Fitness` is **not** promoted in this change. Hill data remains a separate prospective research layer until a frozen definition reproduces reliably.
