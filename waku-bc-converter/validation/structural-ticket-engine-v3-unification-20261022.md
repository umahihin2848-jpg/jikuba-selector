# StructuralTicketEngine v3 — production unification

Date: 2026-10-22
Status: production code-path cleanup
Prediction-model change: none
Bet-rule change: intended none

## Purpose
Unify the production ticket decision chain into one authoritative runtime file and one authoritative state. The previous page executed `structural-ticket-auto-v1.js`, then dynamically loaded v2 plus separate mutation guards for axis popularity, ticket price, and exact-two Pair Survival. That architecture made it possible for the visible ticket result and the underlying frozen rule description to drift.

Production authority is now:

- runtime file: `structural-ticket-engine-v3.js`
- canonical state: `window.StructuralTicketEngineV3State`
- page build: `20261022ste4`

The legacy files remain in the repository for audit/history but are no longer loaded by `v3.html`.

## Rules preserved inside v3

### Scope
- JRA flat app scope inherited from `LongshotScoutState.race.eligible`
- field size >=12
- 3-win class or higher
- structural horse = `M3 rank <=3 AND Ability v1 rank <=3`

### Zero structural horses
- all three ticket types STOP

### One structural horse — production single-axis route
- exactly one structural horse
- structural horse must be Ability #1
- complete win market required
- axis must be win-popularity 1–6
- when axis is 6th favorite, 6th→7th win-odds gap must be >10%; otherwise HOLD until 5-minute confirmation, then STOP if still unstable
- opponents = top two win-popularity horses excluding the axis
- opponent #2→#3 odds gap must be >10% for Quinella and Trio; otherwise HOLD until 5-minute confirmation, then STOP if still unstable

Ticket policy:
- Wide: axis × top two market opponents, 2 tickets
- Quinella: axis × top two market opponents, 2 tickets
- Trio: axis + the two market opponents, 1 ticket

Single-route price gates:
- Wide: both entered Wide prices must be >=4.0
- Quinella: both entered Quinella prices must be >=7.0
- Trio: no hard minimum-price gate

### Two structural horses — production double route
- exactly two structural horses
- Ability #1 must be included
- Wide: the two structural horses, 1 ticket
- Quinella: Ability #1 structural axis × best Ability v1 horse outside the structural pair, 1 ticket
- no hard price gate for Wide or Quinella

Pair Survival for Trio:
- exactly two structural horses
- Ability #1 included
- field size <=15
- structural pair includes M3 #1

When Pair Survival passes and the complete win market is present:
- Trio third legs = top four win-popularity horses excluding the structural pair
- 4 Trio tickets

### Three or more structural horses
- do not force a two-horse pair
- all production ticket routes STOP

## Stake policy preserved
Reference bankroll defaults to ¥50,000 per ticket type and remains stored under the previous localStorage keys.

Double route:
- Wide: 2.0%
- Quinella: 1.0%
- Trio: 1.6% total, split across four tickets

Single route:
- Wide: 1.0% per ticket ×2
- Quinella: 0.4% per ticket ×2
- Trio: 0.4% ×1

## Shadow separation
The following are explicitly outside the production engine:
- Ability #2 single-axis Shadow
- M3 v2 / Closing-v2 research Shadow
- other research displays

They may listen to production-ready events but must not mutate `StructuralTicketEngineV3State`.

## Compatibility aliases
To avoid breaking existing Forward logging while the surrounding UI migrates, v3 publishes read-compatible aliases:
- `window.StructuralTicketAutoState`
- `window.StructuralTicketAutoV2State`

Both point to the v3 production decision snapshot. v3 also emits legacy ready events for downstream readers only. No legacy ticket engine is loaded.

## Legacy production files no longer loaded by v3.html
- `structural-ticket-auto-v1.js`
- `structural-ticket-auto-v2.js`
- `single-axis-pop-boundary-v1.js`
- `structural-ticket-price-gate-v1.js`
- `structural-ticket-exact-pair-guard-v1.js`

`analysis-ready-reconcile-v1.js` was reduced to state/event reconciliation and no longer dynamically loads the legacy production ticket chain.

## Regression invariants for the next automated test
A future automated regression suite should freeze at least these outcomes:
1. field <12 -> out of scope / all STOP
2. structural count 0 -> all STOP
3. structural count 1 + Ability #2 -> production STOP, Shadow may display separately
4. structural count 1 + Ability #1 + incomplete win market -> WAIT
5. single axis popularity >6 -> STOP
6. single axis 6/7 boundary <=10% -> HOLD, then STOP after final-five confirmation
7. single opponent #2/#3 boundary <=10% -> Quinella/Trio HOLD; Wide independent of that boundary
8. single Wide price <4.0 -> Wide STOP
9. single Quinella price <7.0 -> Quinella STOP
10. structural count exactly 2 + Ability #1 + field<=15 + M3 #1 -> Pair Survival PASS
11. exact pair with field>15 -> Trio STOP while Wide/Quinella remain independently evaluated
12. structural count >=3 -> do not form double route

## Deployment note
This change is an architectural consolidation, not evidence for a new betting edge. Historical validation numbers remain attached to the frozen rules that were consolidated here.