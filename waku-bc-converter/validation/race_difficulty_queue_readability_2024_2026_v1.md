# Race Difficulty — Queue Readability Validation v1

Date: 2026-10-28
Status: **validated descriptive component with scope limitation**

## Purpose

Validate the current race-difficulty UI assumption that a race is easier to read positionally when every runner has enough prior corner-position history for `ValidatedQueueState`.

This test specifically validates **queue / early-position readability**. It does not prove that the entire pace/RPCI scenario is easy to predict.

## Frozen UI rule tested

The existing rule was tested without tuning after outcomes were viewed:

- `High`: every runner has `hist_n5 >= 2` and therefore every queue row is validated.
- `Middle`: some, but not all, runners have `hist_n5 >= 2`.
- `Low`: no runner has enough history.

No new cutoff was searched on 2025 or 2026.

## Replay

Universe:

- JRA flat races;
- 3-win class / OP / L / G3 / G2 / G1;
- 12 or more actual result rows in the supplied result files;
- jumps excluded using the audited flat-race universe logic;
- 2024 / 2025 / 2026;
- only strictly prior horse history;
- repeated TARGET snapshots deduplicated by race identity x horse before history construction.

Current `validated_queue_model_v1` formula was replayed, including:

- up to five prior valid corner-position records;
- gate fraction;
- first-turn distance / turn urgency;
- leave-one-out front/lead pressure;
- stored model coefficients and medians.

Primary outcome:

`race-level MAE = mean absolute error between predicted and actual normalized first-available-corner position among validated runners`.

Secondary outcome:

within-race Spearman correlation between predicted and actual early-position ordering.

### Replay fidelity check

Horse-level MAE in this runtime-like replay:

- 2024: 0.1962
- 2025: 0.1989
- 2026: 0.1971

Saved Queue OOS scenario MAE is approximately:

- 2024: 0.1981
- 2025: 0.1993
- 2026: 0.1974

The close agreement supports use of this replay for the readability comparison. Race/runner counts are not byte-identical to the original training audit because this test uses the current live-style 12+ actual-runner universe and current TARGET deduplication policy.

## Primary result

| Year | High races | Middle races | High MAE | Middle MAE | Middle - High | bootstrap 95% CI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 370 | 25 | 0.1949 | 0.2292 | **+0.0343** | **[+0.0147, +0.0547]** |
| 2025 | 372 | 30 | 0.1974 | 0.2234 | **+0.0260** | **[+0.0089, +0.0436]** |
| 2026 | 276 | 20 | 0.1965 | 0.2108 | **+0.0144** | **[+0.0005, +0.0289]** |

The direction defined in 2024 reproduces in both 2025 and 2026: complete queue-history coverage is associated with lower realized queue-position error.

One-sided Mann-Whitney tests for `Middle MAE > High MAE`:

- 2024: p = 0.00012
- 2025: p = 0.00067
- 2026: p = 0.0383

## Ordering correlation

Mean within-race Spearman correlation between predicted and actual early position:

| Year | High | Middle | High - Middle | bootstrap 95% CI |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 0.620 | 0.367 | +0.253 | [+0.097, +0.444] |
| 2025 | 0.605 | 0.492 | +0.112 | [+0.025, +0.202] |
| 2026 | 0.607 | 0.525 | +0.083 | [-0.025, +0.202] |

Ordering accuracy points in the same direction in all three years, although the 2026 interval crosses zero. The MAE result is therefore the primary evidence.

## Important limitation — no Low sample

There were no qualifying 2024–2026 races in this replay where **zero** runners had `hist_n5 >= 2`.

Therefore:

- `High = complete history` versus `Middle = partial history` is supported as a queue-readability distinction.
- `Low = no history` is **not empirically validated as an ordinal third level** by this sample.
- If no runner has enough history in live use, the statistically honest label is `判定不能 / 材料不足`, not a validated `低` rating.

## Pace/RPCI scope

This validation does not convert Queue history coverage into a claim about the full race pace.

Separate existing evidence supports:

- Queue features improve RPCI multiclass prediction over conditions-only models in 2023–24, 2025 and 2026.
- RPCI first-turn model has its own 2025 validation and 2026 holdout / conformal coverage.

But this test did not show that `all queue rows validated` directly implies smaller RPCI forecast error. Therefore the UI should call this component **隊列の読みやすさ** (or `展開の読みやすさ（隊列）`) rather than implying that every part of the pace scenario is validated by this rule.

## Decision

**ADOPT_COMPLETE_VS_PARTIAL_QUEUE_READABILITY**

and

**REPLACE_ZERO_HISTORY_LOW_WITH_INSUFFICIENT_DATA**

UI policy:

1. all runners validated -> `隊列の読みやすさ：高`;
2. partial coverage -> `隊列の読みやすさ：中` and show validated / total runners;
3. zero validated -> `判定不能｜材料不足`;
4. do not use this rule as a BUY/PASS gate;
5. do not claim it measures the entire RPCI / pace scenario;
6. continue to show pressure and RPCI uncertainty separately.

This component can now be retained in the decomposed race-difficulty card, with its name narrowed to the empirically validated scope.