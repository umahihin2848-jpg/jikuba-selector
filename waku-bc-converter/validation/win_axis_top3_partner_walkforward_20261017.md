# Win Condition Edge axis × Top3 Condition Edge partner — walk-forward test (2026-10-17)

## Goal
Test whether the two horse-level market-residual layers can be translated into pair tickets without fitting a new joint probability model:

- Win Condition Edge -> axis candidate
- Top3 Condition Edge -> partner candidate

The target is first **pair market O/E**, not ROI optimization.

This is a validation report only. No production buy rule is deployed from this result.

## Data / common setup
- JRA flat, 3-win class or higher, field size >=12, all-2yo races excluded.
- Walk-forward evaluation 2021-2026.
- Condition Edge factors kept fixed to the current v1 family: distance change, age, sex x season.
- Market probabilities use closing odds as benchmark.
- Wide market pair probabilities are normalized to total 3.0 per race using the lower quoted wide odds.
- Quinella market pair probabilities are normalized to total 1.0 per race.
- P10 / dangerous favorite are deliberately kept outside this test.
- Closing odds are not executable T-15 prices.

## Test A: strict previously-used top-quintile definition
A deliberately strict interpretation was tested first:

- `strong Win Edge` = Win Edge at or above the training-fold 80th percentile,
- race must contain exactly one such horse,
- `strong Top3 partner` = another horse at or above the training-fold Top3 Edge 80th percentile,
- pair all such axis-partner combinations.

This produced only 147 selected pair tickets across 2021-2026.

### Pooled result
- Wide: 147 bets / 2 hits / market-expected hits 4.81 / O/E **0.416** / closing ROI **18.7%**.
- Quinella: 147 bets / 0 hits / market-expected hits 1.65 / O/E **0.000** / closing ROI **0%**.

The strict top-quintile interaction clearly does not work in this reconstruction. It is also very sparse, so it should not be rescued by threshold tuning.

## Test B: natural market-neutral role translation
Because v1 Edge is a market multiplier where `1.0` is the natural neutral point, a second pre-specified translation was tested without searching an ROI cutoff:

1. in each race, use the horse with the highest Win Edge as axis if its Win Edge is >1.0,
2. partners are all remaining horses with Top3 Edge >1.0,
3. evaluate every such axis-partner pair,
4. separately check only the single highest Top3 Edge partner.

### All positive Top3 partners — year-by-year pair O/E

| Year | Wide O/E | Quinella O/E |
|---|---:|---:|
| 2021 | 1.121 | 1.051 |
| 2022 | 1.101 | 1.213 |
| 2023 | 0.855 | 0.868 |
| 2024 | 1.172 | 1.754 |
| 2025 | 1.237 | 1.120 |
| 2026 | 1.266 | 1.352 |

The direction is encouraging but not fully stable: **2023 is below market expectation for both tickets**.

### Pooled 2021-2026
Wide:
- 7,163 bets
- 191 hits
- market-expected hits 170.71
- O/E **1.119**
- closing ROI **72.1%**
- 2,150 races represented

Quinella:
- 7,163 bets
- 68 hits
- market-expected hits 55.61
- O/E **1.223**
- closing ROI **63.0%**
- 2,150 races represented

This is an important distinction: the pair selections beat the **normalized market expectation** in aggregate, especially for quinella, but not enough to overcome takeout / quoted closing prices.

## Highest Top3 Edge partner only
Selecting only one partner per axis did not improve stability.

### Pooled
- Wide: 1,186 bets / O/E **1.097** / closing ROI **81.9%**.
- Quinella: 1,186 bets / O/E **0.932** / closing ROI **68.4%**.

Year-to-year results were highly volatile. Therefore "take only the strongest Top3 partner" is not supported.

## Interpretation
The main finding is **not** that this is a profitable pair strategy.

What survives is weaker but useful:

1. Horse-level Win Edge and Top3 Edge contain repeatable marginal market-residual information individually.
2. A broad positive-edge axis/partner translation retains some pair-level market residual in aggregate.
3. The effect is not stable every year and does not overcome takeout at closing prices.
4. The very strict "top-quintile axis + top-quintile partner" interaction fails badly.
5. Therefore the two horse-level edges should **not be multiplied or thresholded aggressively** into a betting signal.

This is evidence that pair construction needs its own interaction logic rather than assuming two good marginal edges automatically make a good joint ticket.

## Production decision
KEEP:
- Win Edge as axis-context ranking.
- Top3 Edge as partner-context ranking.
- pair-level market O/E as the next research target.

DO NOT:
- auto-buy wide or quinella from the current combination,
- use 80th-percentile strong/strong rules,
- optimize a new Edge cutoff from these outcomes,
- mix P10 into the probability score to rescue pair ROI.

## Best next test
Build a **pair residual model** directly around the market pair probability, using only pre-race horse residual features already validated at horse level:

- market pair probability as baseline,
- axis Win Edge,
- partner Top3 Edge,
- interaction term `WinEdge_axis x Top3Edge_partner`,
- simple role labels (axis / partner),
- no new condition search initially.

Fit on earlier years and evaluate later years walk-forward. The target should be whether pair residual ordering is monotone and repeatable, not whether one arbitrary cutoff produces a high ROI.

Only after a genuine pair-level residual survives should actual wide / quinella buy rules be considered.
