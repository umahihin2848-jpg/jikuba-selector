# Longshot Scout v1 — frozen display-only protocol

Created: 2026-10-19
Status: DISPLAY_ONLY / FORWARD CANDIDATE

## Purpose
Surface up to three lower-popularity horses when multiple pre-race structural layers point in the same direction. This is an interpretation aid only. It does not alter M3, Ability, probabilities, pair rankings, automatic wide candidates, quinella logic, trifecta/trio logic, or buy/no-buy decisions.

## Why this exists
Previous OOS work showed that a large M3-vs-market mismatch alone is not a stable value rule. In `m3_market_mismatch_oos_v1.json`, threshold sweeps for popularity 4-9 did not produce stable place ROI above 100%, so market mismatch alone must never qualify a horse.

A narrower structural-challenger screen was more promising: closing popularity 7-9 + main scenario rank <=3 + M3 rank <=3, paired with the closing 1st favorite in quinella. `market_challenger_roi_screen_v1.json` reported 2025-2026 pooled confirmation ROI 1.4696 on 273 tickets, but the race-bootstrap 95% ROI interval crossed 1.0 and historical prices were closing-odds proxies rather than T-15 snapshots. Therefore this pattern is a prospective candidate, not a production betting rule.

`structural-alerts-v1-validation.json` also supports M3 Top3 x Ability v1 Top3 as a stable-axis marker, while explicitly rejecting a value/buy interpretation. The front-running watch is display-only and its race-cluster intervals cross zero, so it is context rather than a standalone edge.

## Runtime universe
- JRA flat high-class workflow used by the app
- field size >=12
- grade input in G1 / G2 / G3 / L / OP / 3-win
- actual single-win odds entered so popularity order can be constructed
- candidates must be 5th favorite or lower

## Structural supports
The scout keeps these supports separate; it does not create a weighted composite score.

1. M3 support: M3 rank <=3
2. Ability support: Ability v1 rank <=3
3. Main-scenario support: rank <=3 under the currently highest-probability scenario
4. Strong front-watch support: existing Structural Alerts strong front-running watch only

Market popularity and market-vs-structure rank gap are context labels only. They are not structural supports and never qualify a horse by themselves.

## Candidate rule
A horse qualifies if either:

- existing screened pattern: popularity 7-9 AND M3 rank <=3 AND main-scenario rank <=3; or
- at least two of the four structural supports above are present.

Popularity 10+ is allowed only when the multi-layer rule above is satisfied. These horses are explicitly labeled `超穴監視` because this is a new, unvalidated region.

## Ordering without a composite score
Candidates are ordered lexicographically, not by a weighted score:

1. existing screened pattern first
2. M3 Top3 x Ability v1 Top3 agreement next
3. larger number of independent supports
4. larger market-vs-best-structural-rank gap as a tie-break only
5. then market popularity / horse number for deterministic output

Maximum display: 3 horses.

## UI labels
- `🔬 既存検証パターン`: 7-9 popularity + M3 Top3 + main-scenario Top3. Promising historical screen, still not a buy rule.
- `🟠 複合構造穴`: multiple structural layers agree.
- `🟣 超穴監視`: popularity 10+ with multiple structural supports. New / unvalidated longshot region.
- `🟡 穴候補`: other multi-layer lower-popularity candidates.

## Forward cutoff
The new combined scout idea was frozen on 2026-10-19 after historical diagnostics had already been inspected. Therefore races dated <=2026-10-19 are `retrospective_diagnostic`; only later races are `prospective_forward` for this combined scout.

## Prospective evaluation plan
Do not retune the rule during the forward phase. Record, separately by candidate slot and label:

- candidate frequency per race
- win rate and top-3 rate
- market-expected comparison
- wide ROI if manually paired/added under a pre-frozen partner rule
- trio third-row incremental hit and ROI under a pre-frozen axis rule
- quinella ROI only for the already frozen 7-9 structural-challenger pattern
- maximum losing streak and drawdown
- ROI with largest one / two / three hits removed
- race-bootstrap confidence intervals

No production promotion until forward evidence is adequate and not dominated by one jackpot.
