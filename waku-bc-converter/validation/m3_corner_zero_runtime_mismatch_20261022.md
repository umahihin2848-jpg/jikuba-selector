# M3 / queue TARGET corner-zero runtime mismatch audit

Date: 2026-10-22

## Status

**UPSTREAM BLOCKER — fix before restarting ticket validation.**

TARGET/JV-derived history can encode a nonexistent early corner as `0` and place the first real passing position in a later corner field. Current runtime parsers in `validated-queue-model-v1.js` and `finish600-simulator-v2.js` select the first numerically finite corner. Because `0` is finite, it is incorrectly interpreted as an actual passing position.

Example pattern:

- 1角 = 0
- 2角 = 0
- 3角 = 4
- 4角 = 4

Current runtime first-corner value: `0`.
Correct semantic value for the first observed passing position: `4`.

## Why this matters

Frontness is calculated approximately as:

`frontness = (field_size - passing_position) / (field_size - 1)`

If passing position is incorrectly read as `0`, frontness is clipped to `1.0`, falsely making the horse look maximally forward-positioned.

This value feeds the validated queue layer and M3 features (`hist_front_mean` / `frontness5`), so the error can change remaining-600 position, M3 score and ultimately `M3 Top3 × Ability Top3` structural selection.

## Evidence of runtime/training mismatch

Across the available historical data:

- Current-runtime-style mean frontness when zero is accepted as a position: **0.7963**
- Mean frontness when zero is treated as missing and the first positive passing position is used: **0.5322**
- M3 training-model scaler mean for `hist_front_mean`: **0.5503**

The corrected interpretation is close to the training distribution; the current browser interpretation is not.

In the 2024–2026 target universe, about **58.6%** of inspected runner-history rows had `通過1=0` while a later corner contained a positive passing position, making this a material issue rather than a rare edge case.

## Reconstruction check

Using the corrected first-positive-corner interpretation improved reconstructed M3 ranking diagnostics versus the zero-accepting runtime reconstruction:

| Year | Interpretation | M3 Top3 overlap | Winner Top1 |
|---|---|---:|---:|
| 2025 | zero accepted | 27.54% | 10.17% |
| 2025 | first positive corner | **30.19%** | **13.15%** |
| 2026 | zero accepted | 26.82% | 12.12% |
| 2026 | first positive corner | **29.74%** | **12.79%** |

These figures are reconstruction diagnostics, not a new frozen production validation claim. Their role is to demonstrate that the semantic correction moves runtime behavior toward the model-development distribution.

## Required code policy

A passing-position field is valid only when it is finite and `>=1`.

Recommended defense in depth:

1. TARGET compatibility transform: normalize `通過1..4` zero values to blank/missing when creating `1角..4角`.
2. Queue parser: choose the first finite **positive** corner position.
3. Finish600/M3 parser: choose the first finite **positive** corner position.
4. Add a regression fixture with `1角=0, 2角=0, 3角=4, 4角=4` and assert first observed position = 4, never 0.

## Consequence for ticket validation

Do not restart Wide / Quinella / Trio ROI validation until this runtime/training mismatch is fixed and M3 structural outputs are regenerated. Otherwise a new Ability model would be evaluated against a contaminated M3 runtime.
