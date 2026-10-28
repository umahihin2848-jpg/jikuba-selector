# Opponent Diagnosis v2 — layer separation policy

Date: 2026-10-28
Status: **UI architecture / research policy**

## Purpose

Rebuild the opponent-diagnosis view so that evidence with different validation horizons is not blended into one score or ranking.

The app is a race-dissection tool. It must expose separate evidence layers and leave final ticket construction to the user.

## Layer A — long-horizon market / Condition Edge

### Win Condition Edge

Walk-forward evaluation uses only earlier years for each test year:

- train 2016-2020 -> test 2021
- train 2016-2021 -> test 2022
- train 2016-2022 -> test 2023
- train 2016-2023 -> test 2024
- train 2016-2024 -> test 2025
- train 2016-2025 -> test 2026

The frozen v1 factor family is distance change, age and sex x season.

Saved validation shows:

- LogLoss improved in all six walk-forward years;
- pooled delta LogLoss vs market = -0.000449;
- race-bootstrap 95% CI about [-0.000770, -0.000124];
- highest Edge quintile observed / market-expected wins = 1.212;
- lowest Edge quintile observed / market-expected wins = 0.829.

Interpretation: use Win Edge as a market-relative price/context ranking, not as an automatic partner rule.

### Top3 Condition Edge

Top3 Edge uses the same frozen factor family around a wide-market-derived top3 baseline.

Saved walk-forward evidence 2021-2026:

- LogLoss improved in all six years;
- highest Edge quintile observed / market-expected Top3 = 1.053, race-bootstrap CI about [1.008, 1.098];
- lowest Edge quintile = 0.918, CI about [0.864, 0.975];
- the highest quintile was above market expectation in every year 2021-2026;
- the lowest quintile was below market expectation in every year 2021-2026.

Interpretation: Top3 Edge is the preferred long-horizon **partner-context ranking** when complete wide odds are available. It is not an automatic wide or quinella buy rule.

### Pair translation caution

The existing Win-axis x Top3-partner walk-forward test does not justify automatic pair betting:

- broad positive-edge pairing had encouraging pooled O/E but 2023 was below expectation;
- closing ROI remained below 100%;
- the strict top-quintile x top-quintile interaction failed badly.

Therefore Layer A provides ranking/context only.

## Layer B — recent structural OOS support

The current structural opponent family uses:

`Ability rank + M3 rank + P10 penalty`

with the saved candidate-pool policy:

- market top4 excluding axis;
- at most one structural rescue outside that base;
- maximum five manual-review candidates.

Saved development / confirmation evidence:

- 2025 candidate5 quinella partner capture 68.18%, wide partner capture 96.77%;
- 2026 candidate5 quinella partner capture 75.00%, wide partner capture 78.95%;
- pooled descriptive quinella 71.05%, wide 90.00%.

These are shortlist recall rates, not ROI and not proof of an ordinal partner ranking.

The separate opponent-narrowability revalidation rejected turning structural-best popularity bands into `easy / medium / hard` because the ordering reversed in 2026. Pooled Spearman association between structural-best popularity and actual partner popularity was approximately -0.018 (p=0.881).

Interpretation: use Ability / M3 / P10 as a **structural watch / omission-control layer**, not as the primary opponent ranking and not as a race-difficulty score.

## UI policy v2

### Primary display

1. Market shape / market top4.
2. Win Condition Edge as price context.
3. Top3 Condition Edge as partner-context ranking when complete wide odds are present.

Do not automatically add or delete a horse because of an Edge value.

### Separate structural display

1. Show the current best structural horse as `構造注目`.
2. Show Ability rank, M3 rank and P10 separately.
3. Show whether it is inside market top2, inside market top4, or outside the market base only as descriptive text.
4. If Top3 Edge leader and structural-best horse agree, display `一致`; if not, display `別馬`. Neither state changes ticket logic.

### Explicitly prohibited

- no weighted sum across Condition Edge + Ability + M3 + P10;
- no automatic opponent ranking generated from the combined layers;
- no `相手の絞りやすさ 高/中/低` from market/structure agreement;
- no automatic candidate deletion;
- no automatic bet or stake;
- no ROI claim from the historical closing-market validations.

## Mobile policy

The mobile lean build should load the existing market-mispricing / Condition Edge module so the same long-horizon layer is available on iPhone. Top3 Edge remains optional because it requires a complete wide-odds pair list. Without complete wide odds, the UI must say `Top3 Edge待ち` and keep Win Edge as price context only.

## Decision

**ADOPT_LAYER_SEPARATION_FOR_OPPONENT_DIAGNOSIS_UI**

The opponent view should now be interpreted as:

`market support -> Condition Edge context -> separate structural watch -> manual decision`

not:

`market + Ability + M3 + P10 -> one combined opponent score`.

This change is display / interpretation architecture only and must not alter existing probability, Ability, M3, queue, Axis, BUY/PASS or staking calculations.
