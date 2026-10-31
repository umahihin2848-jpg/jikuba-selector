# Opponent Top2 current-code replay — 2025–2026 v1

Date: 2026-10-31
Status: **retrospective diagnostic / Shadow decision**

## Question

Evaluate the newly introduced max-2 opponent rule:

1. start from the top 4 opponents by final win-market order;
2. rank those horses by `Ability rank + M3 rank + P10 penalty`;
3. retain the best 2;
4. allow the best structural horse outside market Top4 to replace opponent #2 only when its structural score is strictly lower.

P10 penalty is frozen as:

- `<20%`: +0
- `20–49.9%`: +1
- `50–64.9%`: +2
- `>=65%`: +4

Market rank itself is not added to the structural score. Pair probability and Condition Edge are not used.

## Important inference status

The component models are frozen and use strictly prior history, but the **Top2 combination rule itself was designed on 2026-10-31 after historical outcomes were already available**. Therefore the replay below is not a pristine confirmatory OOS test of the new rule. It is a retrospective current-code-like diagnostic using OOS-era components.

True prospective evidence for this exact Top2 rule begins only after the 2026-10-31 freeze date.

## Replay basis

- JRA flat only
- actual starters >=12
- 3-win / OP / L / G3 / G2 / G1
- jumps excluded
- strictly prior history only
- current Ability v1 policy
- current M3 / remaining-600 family
- current PositionRisk P10 formula
- current Production axis semantics, including A1 / A2 conditional / double-structure routes
- final win odds used as the historical market proxy; exact T-15 odds snapshots are unavailable
- 2025 result data complete
- 2026 supplied result/payout data through **2026-10-04**

Raw target-race universe before axis eligibility:

- 2025: 402 races
- 2026: 296 races

Current-code-like races with a usable Production axis and complete final win market:

- 2025: **194**
- 2026: **134**
- pooled: **328**

This is a current-code-like replay rather than a byte-exact historical runtime replay. Older saved audits use slightly different eligible-axis samples because the codebase has version drift and additional integrity filters.

## Comparators

### New Top2
Market Top4 -> structural score Top2 -> optional outside-market structural rescue.

### No-rescue structural Top2
Market Top4 -> structural score Top2, with no outside-market replacement.

### Market Top2 baseline
The first two final-market opponents after excluding the axis.

### Old max5 candidate recall
Market Top4 + at most one structural rescue. This is evaluated only as **candidate recall**, not as a five-ticket ROI strategy, because the old shortlist was designed for manual selection rather than automatic purchase.

## Primary results

### 2025

| Method | Wide hit | Quinella hit | Wide flat ROI | Quinella flat ROI |
| --- | ---: | ---: | ---: | ---: |
| **New Top2** | **26.8%** | **11.3%** | **93.2%** | **74.5%** |
| No-rescue structural Top2 | 27.8% | 14.9% | 84.0% | 74.8% |
| **Market Top2 baseline** | **35.1%** | **19.6%** | **92.3%** | **86.0%** |
| Old max5 candidate recall | 44.8% | 29.4% | — | — |

New-rule rescue used in **49.0%** of eligible races.

### 2026 supplied period through 2026-10-04

| Method | Wide hit | Quinella hit | Wide flat ROI | Quinella flat ROI |
| --- | ---: | ---: | ---: | ---: |
| **New Top2** | **29.1%** | **11.2%** | **78.6%** | **60.4%** |
| No-rescue structural Top2 | 30.6% | 14.9% | 75.9% | 72.5% |
| **Market Top2 baseline** | **32.8%** | **17.9%** | **79.6%** | **84.6%** |
| Old max5 candidate recall | 43.3% | 23.1% | — | — |

New-rule rescue used in **56.7%** of eligible races.

### Pooled 2025–2026 supplied period

| Method | Wide hit | Quinella hit | Wide flat ROI | Quinella flat ROI |
| --- | ---: | ---: | ---: | ---: |
| **New Top2** | **27.7%** | **11.3%** | **87.2%** | **68.7%** |
| No-rescue structural Top2 | 29.0% | 14.9% | 80.7% | 73.8% |
| **Market Top2 baseline** | **34.1%** | **18.9%** | **87.1%** | **85.4%** |
| Old max5 candidate recall | 44.2% | 26.8% | — | — |

New-rule rescue used in **52.1%** of eligible races.

Flat ROI assumes two ¥100 combinations per race for each Top2 method. Historical HR payout records were used. This is a diagnostic ticket simulation, not a claim that the live app currently has pair-price EV connected.

## Conditional partner capture

A cleaner opponent-selection diagnostic conditions on the axis itself having done enough to make the ticket hittable.

### Axis Top3 races — Wide partner capture

Pooled:

- New Top2: **55.2%**
- No-rescue structural Top2: **57.6%**
- Market Top2: **67.9%**
- Old max5 candidate recall: **87.9%**

### Axis Top2 races — Quinella partner capture

Pooled:

- New Top2: **28.2%**
- No-rescue structural Top2: **37.4%**
- Market Top2: **47.3%**
- Old max5 candidate recall: **67.2%**

Thus the new structural Top2 does not merely suffer from axis misses; it captures the actual partner less often when the axis succeeds.

## Paired diagnostics against Market Top2

On the same pooled races:

- Wide: New-only hits 18 vs Market-only hits 39; paired exact p ≈ **0.0075**.
- Quinella: New-only hits 12 vs Market-only hits 37; paired exact p ≈ **0.00047**.

These p-values are diagnostic only because the Top2 rule was selected after historical inspection. They nevertheless show that the hit-rate loss is not explained by a few isolated races in this replay.

## Structural rescue diagnosis

The outside-market rescue is the clearest failure mode.

Among the 171 pooled races where a rescue actually replaced opponent #2:

- rescue horse Top3: **16.4%**
- displaced market-gate horse Top3: **35.1%**
- rescue horse Top2: **8.8%**
- displaced market-gate horse Top2: **25.7%**

Paired diagnostics:

- Top3: rescue-only 17 vs displaced-only 49; p ≈ **0.00010**
- Top2: rescue-only 14 vs displaced-only 43; p ≈ **0.00015**

The current rule therefore uses the structural score too aggressively as a **market replacement** signal. The score can remain useful as descriptive structure, but this replay does not support allowing it to displace a market opponent automatically.

## ROI uncertainty

Race bootstrap 95% intervals, pooled:

- New Top2 Wide ROI: **87.2%**, CI about **68.6–107.3%**
- Market Top2 Wide ROI: **87.1%**, CI about **71.6–103.9%**
- New Top2 Quinella ROI: **68.7%**, CI about **43.7–97.5%**
- Market Top2 Quinella ROI: **85.4%**, CI about **64.5–108.2%**

The New Top2 Wide ROI being nearly equal to Market Top2 despite materially lower hit rate is payout-driven. It does not provide a stable improvement signal, and both yearly New Top2 Wide ROI values are below 100%.

For Quinella, the new rule is worse in both capture and point-estimate ROI.

## Single-axis sensitivity check

To reduce concern that the double-structure route is driving the result, restricting to current single A1/A2 routes still gives the same overall direction.

Pooled A1/A2 sample: n=195.

- New Top2 Wide: hit **28.2%**, ROI **89.5%**
- Market Top2 Wide: hit **34.4%**, ROI **96.2%**
- New Top2 Quinella: hit **12.8%**, ROI **81.4%**
- Market Top2 Quinella: hit **19.0%**, ROI **93.9%**

## Decision

**REJECT_PRODUCTION_TOP2_STRUCTURE_SORT_WITH_OUTSIDE_RESCUE**

The new Top2 rule should **not** be promoted as a validated Production opponent selector.

Recommended policy:

1. If Production must display exactly two opponents, keep **market Top2 opponents as the conservative baseline** for now.
2. Keep Ability / M3 / P10 structural ordering as a separate descriptive or Shadow layer.
3. Do **not** automatically replace a market Top2 opponent with a structural horse from outside the market gate based on the current score.
4. Keep the old max5 logic only when the goal is candidate recall / manual comparison; do not interpret its higher recall as five-ticket profitability.
5. Do not search a new rescue-score threshold on the same 2025–2026 outcomes. That would be retrospective threshold optimization.
6. Freeze any next Top2 candidate before results and evaluate it prospectively from the freeze date.

## Relation to prior opponent validation

This result is consistent with `race_difficulty_opponent_ease_2025_2026_v1.md`, which already found that market-versus-structure agreement and structural-best popularity did not produce a stable ordinal opponent-narrowability relationship across 2025 and 2026.

The structural layer remains useful for explaining why a horse is interesting; the current evidence does not support using it as an automatic two-horse market replacement rule.
