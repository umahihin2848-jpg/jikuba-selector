# 最終◎を固定した3着内率検証（2026-11-19）
Status: Research instrumentation only; no production selection/bet changes.

## Source of truth
- Current live states: `DecisionShellV2State.structure.axis` final axis, `originalStructure.axis` original structural axis, `axisSelection.active/changed`.
- Actual Ability C only if `M3PureAbilityState.activeModel === 'C'`; do not silently substitute v1.
- M3/M4: `Finish600State`; P10: `PositionRiskState`; queue: `ValidatedQueueState`.
- Freeze export from `prediction-reliability-shadow-v1.js` includes `officialAxisNo` and `productionAxis` metadata, plus non-authoritative device timestamp.
- Actual finish recorded separately after the race, never used to choose any axis or pace scenario.

## Important distinction
The original single-structure axis must be in Ability Top3 ∩ M3 Top3, therefore its M3 rank is at most 3. An M3 rank >=4 on the FINAL axis can occur when AxisSelection reselects another horse. Do not use these as a single homogeneous subgroup.

## Main metric & controls
1. Original axis vs reselected final axis: paired Top3 outcomes in the exact same race, count net extra Top3s.
2. Final frozen axis Top3 by Ability rank, M3 rank, P10 >=0.50, queue history coverage, and predicted-top pace M4 rank, with counts and Wilson intervals.
3. Market favorite Top3 in the same race; skip-screen equal-coverage baseline matched on year × grade × field.
4. Year splits. n<30 flag for instability. Previous history-optimized rules are descriptive and NOT confirmation.
5. Do not promote a new PASS/BUY rule from these exploratory results; require future pre-result snapshots.

## Data integrity
Exclude duplicate same-race snapshots rather than choosing the profitable one. Verify race date, track, race name, runner count, race number, horse name, all win odds, all M4 bands, model C and frozen axis. Do not use final odds as a pre-race snapshot. Device clock is not a timestamp attestation.

## Implementation
- Source export: `prediction-reliability-shadow-v1.js` (research JSON metadata only).
- Study package: standalone `audit_frozen_axis_top3.py`, `convert_target_results.py`, tests, pre-converted user's TARGET results (2016-2026 to Oct 4).
- Test status: Python 10 tests, Node 12 checks, headless mobile Chromium export passed. Real pre-race C/final-axis snapshots not yet available for historical matching; therefore no new empirical final-axis Top3 rates claimed.

Next: collect unedited pre-start JSON on future G1-G3 races, match exactly to TARGET confirmed finishes, then compute year/market-adjusted performance.
