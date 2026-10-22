# M3 v2 Ticket Impact Validation — Wide / Quinella / Trio

Date: 2026-10-22
Status: retrospective diagnostic only
Production change: none

## Goal
Compare current production M3 v1 against the frozen Closing-v2 shadow candidate while keeping all non-M3 ticket rules fixed. Evaluate only the three ticket types currently used by the app: Wide, Quinella, Trio.

## Data / scope
- Historical races: 2024–2026 available TARGET/JV-Data history in the current project files
- Universe for this diagnostic: JRA flat, field size >= 12, 3-win class or higher; jump graded races excluded
- Payouts: JV-Data HR payout records; actual payoff records used for dead heats as well
- Market ordering: final win odds from the uploaded odds data
- Ability: ability_minimal_v1 reconstruction using strictly prior starts only
- M3 v1: production finish600 reconstruction
- M3 v2: fixed Closing shadow candidate; predicted Remaining600 component unchanged

This is a retrospective diagnostic. It is not clean prospective evidence and must not be used alone to promote v2 into production.

## Ticket rules held fixed
### Single structural route
- exactly one M3 Top3 × Ability Top3 horse
- horse must be Ability #1
- axis must be win-popularity 1–6
- Wide: axis × top two market opponents
- Quinella/Trio: only when opponent #2 vs #3 odds boundary exceeds 10%

### Double structural route
- exactly two structural horses
- includes Ability #1 as structural axis
- Wide: structural pair
- Quinella: Ability #1 structural axis × best Ability horse outside the structural set
- Trio: only when field <=15 and the structural pair includes M3 #1; third legs are top four win-popularity horses outside the pair

Structural sets of 3+ are not forced into a two-horse route.

## Main result — current stake policy
Stake normalization uses the app's 50,000-yen reference bankroll policy. This is for strategy comparison; no bankroll compounding is used.

| Bet | Version | Bet races | Hits | Hit rate | ROI | Net | Max losing streak | Max drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Wide | v1 | 431 | 108 | 25.06% | 81.24% | -80,850 | 15 | 86,400 |
| Wide | v2 | 483 | 112 | 23.19% | 77.41% | -109,100 | 16 | 109,100 |
| Quinella | v1 | 382 | 41 | 10.73% | 66.25% | -58,820 | 43 | 76,450 |
| Quinella | v2 | 433 | 40 | 9.24% | 51.89% | -95,980 | 35 | 101,700 |
| Trio | v1 | 241 | 14 | 5.81% | 52.63% | -43,860 | 59 | 44,460 |
| Trio | v2 | 267 | 20 | 7.49% | 72.47% | -30,720 | 41 | 30,720 |

## Equal-100-yen-per-ticket sensitivity
The direction is unchanged when every ticket is normalized to 100 yen:
- Wide: 80.39% -> 76.54%
- Quinella: 75.83% -> 57.98%
- Trio: 52.63% -> 72.47%

Therefore the direction is not an artifact of the route-specific stake sizing.

## Year-by-year ROI
### Wide
- 2024: v1 76.6% / v2 83.4%
- 2025: v1 91.4% / v2 78.4%
- 2026: v1 71.8% / v2 67.5%

### Quinella
- 2024: v1 65.0% / v2 67.0%
- 2025: v1 51.5% / v2 47.9%
- 2026: v1 92.1% / v2 37.7%

### Trio
- 2024: v1 26.0% / v2 84.3%
- 2025: v1 87.0% / v2 87.6%
- 2026: v1 42.8% / v2 24.3%

Trio has the best aggregate v2 direction but is not year-stable.

## Route diagnostics
### Wide ROI
- double: v1 83.81% -> v2 79.73%
- single: v1 78.68% -> v2 74.64%

### Quinella ROI
- double: v1 49.95% -> v2 42.59%
- single: v1 92.49% -> v2 69.88%

### Trio ROI
- double: v1 57.97% -> v2 74.30%
- single: v1 43.17% -> v2 68.29%

The positive Trio direction appears in both route types in aggregate.

## Added-bet diagnostic
Among races where v2 creates a bet but v1 does not:
- Wide ROI: 65.31%
- Quinella ROI: 31.34%
- Trio ROI: 100.24%

The v2 Trio improvement is driven substantially by additional v2-only opportunities. Those v2-only Trio races are not year-stable: 204.6% (2024), 59.0% (2025), 51.6% (2026).

## Uncertainty — race-day clustered bootstrap
Difference is v2 ROI minus v1 ROI:
- Wide: -3.83 pt; 95% interval about -18.3 to +10.1 pt
- Quinella: -14.36 pt; 95% interval about -41.7 to +9.7 pt
- Trio: +19.84 pt; 95% interval about -15.4 to +62.0 pt

All intervals include zero. The payout distribution is heavy-tailed, so point-estimate ROI changes alone are insufficient for production promotion.

## Decision
- **Wide:** keep M3 v1 production ticket judgment. v2 is worse on aggregate ROI, hit rate and drawdown.
- **Quinella:** keep M3 v1 production ticket judgment. v2 deterioration is large enough that it should not be promoted.
- **Trio:** keep v1 production judgment for now, but log a v2 Shadow Trio decision in parallel. v2 improves aggregate hit rate, ROI, losing streak and drawdown, but year instability and wide confidence intervals prevent production promotion.

Do not alter Pair Survival or the production ticket rules from this retrospective analysis.

## Forward rule
For future races, record both:
1. production Trio ticket from M3 v1;
2. hypothetical Shadow Trio ticket from M3 v2.

Wide and Quinella do not need a v2 buying override. Review Trio only after a predeclared prospective sample; do not promote based on isolated high-payout races.