# P3-41 | M3 history replay input fidelity: date contract (research draft)

Date: 2026-11-17

## Basis and scope
P3-40 reported 271 graded flat races (2024 to 2026-10-04), 4,250 runners. Recomputed M3 rank equaled the saved research rank for only 290/4,250 (6.8%). This is a **rank-replay mismatch**, not evidence of a finished production backtest or M4 improvement.

This change does **not** claim to resolve the 6.8% mismatch, nor does it modify AxisAccessGate, skip locks, M3 model weights, M4, or betting criteria.

## Confirmed input-path issue
The raw user-supplied `umadete.csv` contains 439,416 rows. Reading the `日付` field (CP932 source) produced:
- 8 digits after removing punctuation: 87,138 (19.83%)
- 7 digits: 263,035 (59.86%)
- 6 digits: 89,243 (20.31%)
- **6 or 7 digits: 352,278 / 439,416 (80.17%)**

Examples: `2026.10. 4`, `2026. 6. 7`, `2025.11.30`.

Old `ShapeCore.dateVal` stripped punctuation and, for six digits, prefixed `20` to an already four-digit year (e.g. `2026. 6. 7` became `20202667`); for seven digits it could return `Date.parse` **milliseconds** (e.g. `2026.10. 4` produced `1791072000000`). Mixing milliseconds with integer `YYYYMMDD` makes history ordering and strictly-prior filters invalid **if untransformed raw data reaches the date parser**.

The existing `target-csv-compat-v1.js` normalizes TARGET date strings before the common parser in the normal UI upload path. Therefore the raw-file defect is a *confirmed vulnerability in the date function* but **its contribution to the P3-40 Python proxy mismatch is not established**. The proxy scripts/row-level saved ranks must be inspected to diagnose that discrepancy.

## Corner-position audit
In the supplied `umadete.csv` sample, `通過1..4` contained **zero literal '0' positions**. An earlier separate repo audit documented a zero-as-missing issue in other TARGET/JV histories. That issue is relevant to production input fidelity but is **not evidenced as a cause in this particular CSV**. Current `target-csv-compat-v1.js` and `finish600-simulator-v2.js` normalize or ignore zero corner positions.

## Research-only patch
`shape-core-v2.js`: parse padded, unpadded, compact YYMMDD, compact YYYYMMDD, and timestamp-prefixed digit dates into consistent calendar-validated `YYYYMMDD` integers. Return 0 for invalid dates. Do not use `Date.parse()` milliseconds for comparisons.

`tests/p3-41-m3-date-compat-smoke.cjs`: 14 date contracts plus a sample race verifying that five strictly-prior starts are ordered correctly, with race-day results excluded.

## Still required before production adoption
1. Access P3-40 `horse4250_m4_input_proxy.csv`, `race271_anchored_proxy.csv`, the original `parse_history.py`, `replay_pace_m4.py`, and frozen historical M3 ranks.
2. For each runner compare `hist_n`, original five dates/race IDs, `pred_gap`, `hist_front_mean`, each M3 feature, final `score`, M3 rank, and Top3 membership against a frozen **same-day browser** receipt.
3. Report rank agreement **and** Spearman/Kendall, top-3 overlap, top-1 agreement, year-wise and input-fidelity cohort performance; do not overinterpret 6.8% exact-rank equality alone.
4. Hold out race dates not used to choose thresholds. Compare conditional M4 opponent-vs-market+C opponent on discordant races only, paired, then verify fixed-stake ROI from pre-race odds.
5. Keep production gates unchanged until browser-versus-replay parity is demonstrated.

Status: **DATE PARSER HARDENED IN UNMERGED RESEARCH BRANCH; P3-40 271-RACE PARITY NOT YET ESTABLISHED.**
