# Race Difficulty — Opponent Narrowability Revalidation v1

Date: 2026-10-28
Status: **diagnostic / Shadow**

## Purpose

Test whether the current race-difficulty Shadow can legitimately convert the location of the best structural opponent into an ordinal **相手の絞りやすさ** label.

The provisional UI hypothesis was:

- best structural opponent in final-popularity 1–2: easy / high narrowability;
- 3–4: middle;
- 5th or lower: difficult / low narrowability.

The goal is to test that ordering against actual partner outcomes, not to optimize betting ROI.

## Data and replay scope

Source basis:

- supplied TARGET-style history;
- supplied 2025 and 2026 result / final-win-odds files;
- current Ability v1 JRA-only history policy;
- current M3 / remaining-600 family;
- current structural opponent score used by the mobile opponent shortlist.

Universe:

- JRA flat;
- actual starters >=12;
- 3-win class / OP / L / G3 / G2 / G1;
- jumps excluded;
- strictly prior history only;
- final popularity is used only as the historical market proxy because exact T-15 snapshots are unavailable.

Runtime-like replay universe after current data-integrity filters:

- 2025: 402 races;
- 2026: 295 races;
- pooled: 697 races.

M3 Top3 replay overlap with actual Top3 was about 29.7% in 2025 and 29.5% in 2026, close to the saved pipeline-audit values (about 30.2% / 29.8%). This is a useful reproduction check, but the replay is still treated as runtime-like diagnostic rather than a byte-exact historical production replay because the current codebase has documented version drift in older M3 audits.

The old `opponent_rank_audit_v2` 105-race eligible-axis sample is **not reused as proof for the current difficulty UI**. The current runtime-like axis path produces a different eligible sample, so forcing the old 63 / 42 counts would mix versions.

## Current structural-opponent definition

For every non-axis horse:

`structural score = Ability rank + M3 rank + P10 penalty`

P10 penalty:

- `<20%`: +0
- `20–49.9%`: +1
- `50–64.9%`: +2
- `>=65%`: +4

Best structural opponent = lowest score, with Ability rank, M3 rank and horse number used as tie-break context, matching the current shortlist family.

Eligible-axis races in this runtime-like replay:

- 2025: 105
- 2026: 68
- pooled: 173

Conditional outcome samples:

- axis Top2: 2025 n=46 / 2026 n=24
- axis Top3: 2025 n=55 / 2026 n=32

## Primary test — best structural opponent popularity band

Groups use the **best structural opponent's final-popularity proxy**.

### 2025

| Structural-best pop band | Eligible races | Axis Top2 n | Market top2 captures quinella partner | Market top4 capture | Hybrid max5 capture | Actual partner 5th+ | Mean partner pop | Median partner pop | Other Top3 includes 8th+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1–2 | 34 | 14 | **78.6%** | 78.6% | 78.6% | 21.4% | 3.14 | 2 | 43.8% |
| 3–4 | 29 | 12 | 58.3% | 66.7% | 66.7% | 33.3% | 4.50 | 3 | 41.2% |
| 5+ | 42 | 20 | **45.0%** | 55.0% | 70.0% | 45.0% | 5.20 | 4 | 59.1% |

2025 alone looks compatible with the provisional easy → middle → difficult ordering.

### 2026 confirmation

| Structural-best pop band | Eligible races | Axis Top2 n | Market top2 captures quinella partner | Market top4 capture | Hybrid max5 capture | Actual partner 5th+ | Mean partner pop | Median partner pop | Other Top3 includes 8th+ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1–2 | 21 | 7 | **14.3%** | 57.1% | 57.1% | **71.4%** | 5.86 | 5 | 50.0% |
| 3–4 | 25 | 11 | 36.4% | 54.5% | 54.5% | 45.5% | 5.73 | 4 | 50.0% |
| 5+ | 22 | 6 | **66.7%** | 66.7% | 83.3% | **33.3%** | 3.00 | 1 | 60.0% |

The direction reverses in 2026. The group that would have been labelled easiest (1–2) has the lowest market-top2 partner capture and the highest rate of an actual 5th-or-lower-popularity partner, while the 5+ group looks easier on those metrics.

## Statistical diagnostics

Comparing structural-best 1–2 vs 5+ among axis-Top2 races:

### 2025

- actual partner 5th+: OR 0.33, Fisher exact p = 0.275;
- market-top2 partner capture: OR 4.48, p = 0.079;
- partner-popularity one-sided Mann–Whitney p = 0.139;
- continuous structural-best popularity vs actual partner popularity: Spearman rho = +0.186, p = 0.216.

### 2026

- actual partner 5th+: OR 5.00, Fisher exact p = 0.286 — **reverse direction**;
- market-top2 partner capture: OR 0.083, p = 0.103 — **reverse direction**;
- partner-popularity one-sided Mann–Whitney p = 0.945;
- continuous structural-best popularity vs actual partner popularity: Spearman rho = -0.363, p = 0.081 — **reverse direction**.

Pooled continuous association:

- structural-best popularity vs actual partner popularity: Spearman rho = **-0.018**, p = **0.881**.

There is therefore no stable monotone relationship that supports turning these bands into an opponent-difficulty scale.

## Alternative test — market / structure overall agreement

A second exploratory definition grouped races by the overlap between:

- market top4 opponents; and
- structural-score top3 opponents.

Overlap 3 was treated as high agreement, overlap 2 as middle, overlap 0–1 as low agreement.

This also failed to produce a stable monotone ordering across 2025 and 2026.

Examples among axis-Top2 races:

### 2025

| Agreement | n | Market top2 capture | Market top4 capture | Partner 5th+ | Mean partner pop |
| --- | ---: | ---: | ---: | ---: | ---: |
| High | 13 | 61.5% | 76.9% | 23.1% | 3.62 |
| Middle | 21 | 57.1% | 61.9% | 38.1% | 4.76 |
| Low | 12 | 58.3% | 58.3% | 41.7% | 4.58 |

### 2026

| Agreement | n | Market top2 capture | Market top4 capture | Partner 5th+ | Mean partner pop |
| --- | ---: | ---: | ---: | ---: | ---: |
| High | 5 | 0.0% | 40.0% | 60.0% | 6.00 |
| Middle | 12 | 50.0% | 75.0% | 41.7% | 4.92 |
| Low | 7 | 42.9% | 42.9% | 57.1% | 4.71 |

The 2026 confirmation again breaks the intended ordinal interpretation.

## Decision

**REJECT_STRUCTUREBEST_POP_BAND_AS_ORDINAL_OPPONENT_DIFFICULTY**

and

**NO_VALIDATED_ORDINAL_OPPONENT_EASE_METRIC_YET**

Implications:

1. Do not display structural-best 1–2 / 3–4 / 5+ as `相手の絞りやすさ 高 / 中 / 低`.
2. Keep the market-versus-structure relationship as descriptive evidence only:
   - 市場本線と構造が一致;
   - 市場候補内で一致;
   - 市場外に構造候補.
3. The relationship must **not** drive the natural-language race-difficulty conclusion.
4. The existing max5 manual shortlist is not invalidated by this test. That shortlist was designed for candidate recall; this test is specifically about whether the relationship can be promoted into an ordinal race-difficulty label.
5. Keep forward T-15 logging. Historical final popularity remains a proxy and cannot establish live execution behavior.
6. Do not search additional thresholds on the same 2025–2026 outcomes merely to recover a monotone result.

## UI policy

For the race-difficulty card:

- show `相手の絞りやすさ：判定保留`;
- show the market / structural relationship as descriptive subtext;
- explicitly state that the 2025 / 2026 ordering did not reproduce;
- exclude this component from the type diagnosis until a separately frozen metric survives future validation.

Market dispersion remains a supported descriptive difficulty component under its separate 2016–2026 validation.